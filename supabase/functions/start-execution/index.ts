import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const SYSTEM_MISSION_PLANNER = `You are a Mission Planner Agent. Your role is to break down high-level objectives into structured, actionable tasks.
When given an objective, you must:
1. Analyze the objective thoroughly
2. Break it down into 5-10 specific, sequential tasks
3. Identify dependencies between tasks
4. Assign each task to the appropriate agent (TaskExecutor or Analyst)
5. Provide clear descriptions for each task
Return your response as a JSON object with a "tasks" array.`

const SYSTEM_TASK_EXECUTOR = `You are a Task Executor Agent. Your role is to execute specific tasks and provide detailed reasoning for your actions.
When given a task, you must:
1. Understand the task requirements
2. Execute the task (generate content, create plans, write code, etc.)
3. Provide clear reasoning for your approach
4. Return actionable results
Your response should include:
- Reasoning
- Result
- Next steps
Be thorough, practical, and explain your reasoning clearly.`

const SYSTEM_ANALYST = `You are an Analyst Agent. Your role is to analyze mission progress, identify improvements, and suggest iterations.
When analyzing a mission, you must:
1. Review completed tasks and their results
2. Assess overall progress toward the objective
3. Identify gaps or areas for improvement
4. Suggest new tasks or modifications if needed
5. Provide strategic insights
Your response should include:
- Progress Analysis
- Gaps Identified
- Recommendations
- Strategic Insights
Be analytical, constructive, and forward-thinking.`

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY') || ''
const MISTRAL_MODEL = Deno.env.get('MISTRAL_MODEL')?.trim() || 'mistral-small-latest'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MISTRAL_API_KEY) {
  console.error('Missing required env vars for Edge function.')
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

function restUrl(table: string, query: string) {
  const q = query ? `?${query}` : ''
  return `${SUPABASE_URL}/rest/v1/${table}${q}`
}

async function restGet<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(restUrl(table, query), {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`REST GET failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as T[]
  return data
}

async function restPatchSingle<T>(
  table: string,
  query: string,
  body: Record<string, unknown>
): Promise<T | null> {
  const res = await fetch(restUrl(table, query), {
    method: 'PATCH',
    headers: {
      ...supabaseHeaders(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`REST PATCH failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as T[]
  if (!data || data.length === 0) return null
  return data[0]
}

function extractReasoning(content: string): string {
  const reasoningMatch = content.match(/Reasoning:?\s*(.+?)(?=Result:|$)/is)
  return reasoningMatch ? reasoningMatch[1].trim() : content
}

function extractResult(content: string): string {
  const resultMatch = content.match(/Result:?\s*(.+?)(?=Next steps:|$)/is)
  return resultMatch ? resultMatch[1].trim() : 'Task completed'
}

function extractNextSteps(content: string): string {
  const nextMatch = content.match(/Next steps:?\s*(.+?)$/is)
  return nextMatch ? nextMatch[1].trim() : 'Continue with next task'
}

function extractSection(content: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}:?\\s*(.+?)(?=\\n[A-Z][^:]+:|$)`, 'is')
  const match = content.match(regex)
  return match ? match[1].trim() : ''
}

function extractList(content: string, sectionName: string): string[] {
  const section = extractSection(content, sectionName)
  return section
    .split('\n')
    .filter((line) => line.trim().startsWith('-') || /^\d+\./.test(line.trim()))
    .map((line) => line.replace(/^[-•]\s*|\d+\.\s*/, '').trim())
    .filter((line) => line.length > 0)
}

async function getUserIdFromAuthHeader(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  if (!SUPABASE_URL || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in Edge env')
  }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      apikey: anonKey,
    },
  })

  if (!userRes.ok) {
    const errText = await userRes.text()
    throw new Error(`Auth verification failed: ${userRes.status} ${errText}`)
  }

  const body = (await userRes.json()) as { id?: string; user?: { id?: string } }
  const userId = body.user?.id ?? body.id
  if (!userId) throw new Error('User not found in auth response')
  return userId
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function throwIfMistralRateLimited(status: number, errText: string): void {
  if (status === 429) {
    let detail = errText
    try {
      const j = JSON.parse(errText) as { message?: string; error?: { message?: string } }
      detail = j.message ?? j.error?.message ?? errText
    } catch {
      /* brut */
    }
    const err = new Error(
      `Limite Mistral (429). Réessaie dans 1–2 min. ${detail.slice(0, 200)}`
    ) as Error & { code?: string }
    err.code = 'RATE_LIMIT'
    throw err
  }
  if (status === 503) {
    const err = new Error(`Mistral indisponible (503). ${errText.slice(0, 200)}`) as Error & {
      code?: string
    }
    err.code = 'RATE_LIMIT'
    throw err
  }
}

async function callMistralChat(messages: Array<{ role: string; content: string }>) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages,
      temperature: 0.7,
    }),
  })
  const text = await res.text()
  if (!res.ok) {
    throwIfMistralRateLimited(res.status, text)
    throw new Error(`Mistral ${res.status}: ${text.slice(0, 400)}`)
  }
  const json = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> }
  const content = json?.choices?.[0]?.message?.content as string | undefined
  if (!content?.trim()) {
    throw new Error('Réponse Mistral vide.')
  }
  return content
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { missionId } = await req.json()
    if (!missionId) {
      return new Response(JSON.stringify({ error: 'missionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = await getUserIdFromAuthHeader(req)

    const profs = await restGet<{ subscription_tier: string }>(
      'profiles',
      `id=eq.${userId}&select=subscription_tier`
    )
    if (!profs.length || profs[0].subscription_tier !== 'premium') {
      return new Response(
        JSON.stringify({
          error: 'PREMIUM_REQUIRED',
          message:
            "L'exécution des tâches par l'IA est réservée au plan Premium. Le gratuit permet jusqu'à 10 générations de plan par mois.",
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify mission ownership (safe even with service role)
    const missions = await restGet<{ id: string; status: string }>(
      'missions',
      `id=eq.${missionId}&user_id=eq.${userId}&select=id,status`
    )
    if (!missions || missions.length === 0) {
      return new Response(JSON.stringify({ error: 'Mission not found' }), { status: 404 })
    }

    const mission = missions[0]

    // Step 1: Claim mission execution if still in planning.
    if (mission.status === 'planning') {
      await restPatchSingle<{ id: string; status: string }>(
        'missions',
        `id=eq.${missionId}&user_id=eq.${userId}&status=eq.planning&select=id,status`,
        { status: 'executing' }
      )
    }

    // Step 2: Find next eligible planned task (respect dependencies).
    const plannedTasks = await restGet<{
      id: string
      title: string
      description: string | null
      agent: string | null
      status: string
      created_at: string
    }>(
      'tasks',
      `mission_id=eq.${missionId}&status=eq.planned&select=id,title,description,agent,status,created_at&order=created_at.asc`
    )

    const plannedTaskIds = plannedTasks.map((t) => t.id)
    const depsRows = plannedTaskIds.length
      ? await restGet<{ task_id: string; depends_on_task_id: string }>(
        'task_dependencies',
        `task_id=in.(${plannedTaskIds.join(',')})&select=task_id,depends_on_task_id`
      )
      : []

    const depsByTaskId = new Map<string, string[]>()
    for (const d of depsRows) {
      const existing = depsByTaskId.get(d.task_id) || []
      existing.push(d.depends_on_task_id)
      depsByTaskId.set(d.task_id, existing)
    }

    const allDependsOnIds = Array.from(
      new Set(depsRows.map((d) => d.depends_on_task_id))
    )
    const depStatuses = allDependsOnIds.length
      ? await restGet<{ id: string; status: string }>(
        'tasks',
        `id=in.(${allDependsOnIds.join(',')})&select=id,status`
      )
      : []

    const completedSet = new Set(depStatuses.filter((t) => t.status === 'completed').map((t) => t.id))

    const nowEligible = plannedTasks.find((t) => {
      const deps = depsByTaskId.get(t.id) || []
      if (deps.length === 0) return true
      return deps.every((depId) => completedSet.has(depId))
    })

    if (!nowEligible) {
      // No eligible planned task right now: safe no-op.
      return new Response(
        JSON.stringify({
          progress: false,
          completed: mission.status === 'completed',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: Claim the task (idempotent update).
    const claimed = await restPatchSingle<{ id: string; status: string }>(
      'tasks',
      `id=eq.${nowEligible.id}&mission_id=eq.${missionId}&status=eq.planned&select=id,status`,
      { status: 'in_progress' }
    )

    if (!claimed) {
      // Someone else claimed it.
      return new Response(
        JSON.stringify({
          progress: false,
          completed: mission.status === 'completed',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Step 4: Execute with Mistral (directly in Edge).
    try {
      const objectiveRows = await restGet<{ objective: string }>(
        'missions',
        `id=eq.${missionId}&user_id=eq.${userId}&select=objective`
      )
      const objective = objectiveRows[0]?.objective || ''

      const completedTaskRows = await restGet<{
        title: string
        result: string | null
      }>(
        'tasks',
        `mission_id=eq.${missionId}&status=eq.completed&select=title,result`
      )

      const context = completedTaskRows
        .map((t) => `${t.title}: ${t.result || 'Completed'}`)
        .join('\n')

      const taskDescription = nowEligible.description || ''
      const taskAgent = nowEligible.agent || 'Analyst'

      let reasoning = ''
      let result = ''

      if (taskAgent === 'TaskExecutor') {
        const contextText = context ? `\n\nContext from previous tasks:\n${context}` : ''
        const content = await callMistralChat([
          { role: 'system', content: SYSTEM_TASK_EXECUTOR },
          {
            role: 'user',
            content: `Task: ${nowEligible.title}\nDescription: ${taskDescription}${contextText}`,
          },
        ])
        const responseContent = content || ''
        reasoning = extractReasoning(responseContent)
        result = extractResult(responseContent)
        // nextSteps is currently not stored (kept for parity with server)
        extractNextSteps(responseContent)
      } else {
        const inProgressTaskRows = await restGet<{ title: string }>(
          'tasks',
          `mission_id=eq.${missionId}&status=eq.in_progress&select=title`
        )

        const completedText = completedTaskRows
          .map((t) => `- ${t.title}: ${t.result || 'Completed'}`)
          .join('\n')
        const inProgressText = inProgressTaskRows.map((t) => `- ${t.title}`).join('\n')

        const content = await callMistralChat([
          { role: 'system', content: SYSTEM_ANALYST },
          {
            role: 'user',
            content: `Objective: ${objective}\n\nCompleted Tasks:\n${completedText}\n\nIn Progress:\n${inProgressText}\n\nAnalyze the progress and provide recommendations.`,
          },
        ])

        const responseContent = content || ''
        reasoning = extractSection(responseContent, 'Progress Analysis')
        result = extractSection(responseContent, 'Strategic Insights')

        // recommendations extracted for parity, but not persisted
        extractList(responseContent, 'Recommendations')
      }

      await restPatchSingle(
        'tasks',
        `id=eq.${nowEligible.id}&mission_id=eq.${missionId}&status=eq.in_progress&select=id`,
        {
          status: 'completed',
          reasoning,
          result,
        }
      )

      // Step 5: Mark mission completed if all tasks are completed.
      const taskStatuses = await restGet<{ status: string }>(
        'tasks',
        `mission_id=eq.${missionId}&select=status`
      )
      const allCompleted = taskStatuses.length > 0 && taskStatuses.every((t) => t.status === 'completed')
      if (allCompleted) {
        await restPatchSingle(
          'missions',
          `id=eq.${missionId}&user_id=eq.${userId}&select=id`,
          { status: 'completed' }
        )
      }

      return new Response(
        JSON.stringify({ progress: true, completed: allCompleted, taskId: nowEligible.id }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } catch (e) {
      console.error('Task execution failed:', e)
      const err = e as Error & { code?: string }
      await restPatchSingle(
        'tasks',
        `id=eq.${nowEligible.id}&mission_id=eq.${missionId}&status=eq.in_progress&select=id`,
        { status: 'planned' }
      )
      if (err.code === 'RATE_LIMIT') {
        return new Response(
          JSON.stringify({ error: 'RATE_LIMIT', message: err.message, progress: false }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      return new Response(JSON.stringify({ progress: false, completed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
  } catch (error) {
    console.error('start-execution error:', error)
    const err = error as Error & { code?: string }
    if (err.code === 'RATE_LIMIT') {
      return new Response(
        JSON.stringify({ error: 'RATE_LIMIT', message: err.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

