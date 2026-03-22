import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const SYSTEM_MISSION_PLANNER = `You are a Mission Planner Agent. Your role is to break down high-level objectives into structured, actionable tasks.
When given an objective, you must:
1. Analyze the objective briefly
2. Break it down into 5-8 specific, sequential tasks (prefer fewer, clearer tasks — speed matters)
3. Identify dependencies between tasks (use "dependencies" as 0-based indexes into the tasks array, e.g. ["index-0"] for the first task)
4. Assign each task to TaskExecutor or Analyst
5. Short descriptions (1-3 sentences per task)
6. For EACH task, add a "guidance" field: 4-7 lines in French with concrete, actionable tips (what to search, what to deliver, pitfalls to avoid). Plain text or short bullet lines.

Return your response as a JSON object with a "tasks" array only — no extra text.
Each task object must include at least: title, description, agent, dependencies (array), guidance.`

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY') || ''
const MISTRAL_MODEL = Deno.env.get('MISTRAL_MODEL')?.trim() || 'mistral-small-latest'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MISTRAL_API_KEY) {
  console.error('Missing required env vars for create-mission Edge function.')
}

function supabaseAdminHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

function restUrl(table: string, query: string) {
  return `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`
}

async function restInsertSingle<T>(
  table: string,
  query: string,
  row: Record<string, unknown>
): Promise<T> {
  const res = await fetch(restUrl(table, query), {
    method: 'POST',
    headers: {
      ...supabaseAdminHeaders(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`REST INSERT failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as T[]
  if (!data?.[0]) throw new Error('REST INSERT returned empty')
  return data[0]
}

/** Insertion groupée PostgREST (une requête HTTP au lieu de N). */
async function restInsertMany<T>(
  table: string,
  query: string,
  rows: Record<string, unknown>[]
): Promise<T[]> {
  if (rows.length === 0) return []
  const res = await fetch(restUrl(table, query), {
    method: 'POST',
    headers: {
      ...supabaseAdminHeaders(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`REST bulk INSERT failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as T[]
  return Array.isArray(data) ? data : []
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
  return (await res.json()) as T[]
}

async function restPatchSingle<T>(
  table: string,
  query: string,
  body: Record<string, unknown>
): Promise<T | null> {
  const res = await fetch(restUrl(table, query), {
    method: 'PATCH',
    headers: {
      ...supabaseAdminHeaders(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`REST PATCH failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as T[]
  return data?.[0] ?? null
}

const FREE_MONTHLY_PLANNER_RUNS = 10

function currentQuotaMonthUtc(): string {
  return new Date().toISOString().slice(0, 7)
}

type ProfileRow = {
  subscription_tier: string
  ai_runs_used: number
  ai_quota_month: string | null
}

/** Si on a changé de mois (UTC), remet le compteur à 0 et aligne ai_quota_month. */
async function ensureMonthlyQuota(userId: string, profile: ProfileRow): Promise<ProfileRow> {
  const month = currentQuotaMonthUtc()
  if (profile.ai_quota_month === month) return profile
  const patched = await restPatchSingle<ProfileRow>('profiles', `id=eq.${userId}`, {
    ai_runs_used: 0,
    ai_quota_month: month,
    updated_at: new Date().toISOString(),
  })
  if (!patched) throw new Error('Failed to reset monthly AI quota')
  return patched
}

async function getOrCreateProfile(userId: string): Promise<ProfileRow> {
  let rows = await restGet<ProfileRow>(
    'profiles',
    `id=eq.${userId}&select=subscription_tier,ai_runs_used,ai_quota_month`
  )
  if (rows.length) return rows[0]
  try {
    await restInsertSingle<ProfileRow>('profiles', 'select=subscription_tier,ai_runs_used,ai_quota_month', {
      id: userId,
      subscription_tier: 'free',
      ai_runs_used: 0,
      ai_quota_month: null,
    })
  } catch {
    /* ligne créée entre-temps (trigger) ou doublon */
  }
  rows = await restGet<ProfileRow>(
    'profiles',
    `id=eq.${userId}&select=subscription_tier,ai_runs_used,ai_quota_month`
  )
  if (!rows.length) throw new Error('Profile not found')
  return rows[0]
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
      `Limite Mistral (429) — trop de requêtes par minute ou quota. Réessaie dans 1–2 min. Détail : ${detail.slice(0, 280)}`
    ) as Error & { code?: string }
    err.code = 'RATE_LIMIT'
    throw err
  }
  if (status === 503) {
    const err = new Error(
      `Mistral indisponible (503). ${errText.slice(0, 200)}`
    ) as Error & { code?: string }
    err.code = 'RATE_LIMIT'
    throw err
  }
}

async function callMistralChat(messages: Array<{ role: string; content: string }>): Promise<string> {
  const bodyBase = {
    model: MISTRAL_MODEL,
    messages,
    temperature: 0.55,
    max_tokens: 6144,
  }

  const parseCompletion = (text: string): string => {
    const json = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> }
    return (json?.choices?.[0]?.message?.content as string | undefined) || ''
  }

  let res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...bodyBase,
      response_format: { type: 'json_object' },
    }),
  })

  let text = await res.text()

  if (!res.ok) {
    throwIfMistralRateLimited(res.status, text)
    // 2e essai sans response_format (certains modèles / erreurs transitoires)
    res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyBase),
    })
    text = await res.text()
    if (!res.ok) {
      throwIfMistralRateLimited(res.status, text)
      throw new Error(`Mistral ${res.status}: ${text.slice(0, 400)}`)
    }
  }

  const content = parseCompletion(text)
  if (!content.trim()) {
    throw new Error(
      'Réponse Mistral vide (souvent quota / rate limit ou modèle saturé). Réessaie plus tard.'
    )
  }
  return content
}

function parsePlannerJson(content: string): unknown {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence?.[1]) return JSON.parse(fence[1].trim())
    throw new Error('Planner response is not valid JSON')
  }
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

  // GoTrue exige `apikey` (clé anon) en plus du Bearer — sinon réponse "Invalid JWT".
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
    const { objective } = await req.json()
    if (!objective || typeof objective !== 'string' || !objective.trim()) {
      return new Response(JSON.stringify({ error: 'objective is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = await getUserIdFromAuthHeader(req)
    const objectiveText = objective.trim()

    let profile = await getOrCreateProfile(userId)
    profile = await ensureMonthlyQuota(userId, profile)

    if (profile.subscription_tier === 'free' && profile.ai_runs_used >= FREE_MONTHLY_PLANNER_RUNS) {
      return new Response(
        JSON.stringify({
          error: 'FREE_AI_RUN_EXHAUSTED',
          message: `Quota gratuit atteint (${FREE_MONTHLY_PLANNER_RUNS} générations de plan par mois). Réessaie le mois prochain ou passe en Premium.`,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1) Call planner
    const content = await callMistralChat([
      { role: 'system', content: SYSTEM_MISSION_PLANNER },
      { role: 'user', content: `Objective: ${objectiveText}` },
    ])

    if (!content) {
      return new Response(JSON.stringify({ error: 'Planner returned empty response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let parsed: unknown
    try {
      parsed = parsePlannerJson(content)
    } catch (e) {
      return new Response(
        JSON.stringify({ error: (e as Error).message, raw: content.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const tasks = parsed.tasks || parsed
    if (!Array.isArray(tasks)) {
      return new Response(JSON.stringify({ error: 'Planner returned invalid tasks format' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Create mission (+ snapshot JSON complet du planner pour relecture / audit)
    const missionRow = await restInsertSingle<{
      id: string
      objective: string
      status: string
      created_at: string
    }>('missions', 'select=id,objective,status,created_at', {
      user_id: userId,
      objective: objectiveText,
      status: 'executing',
      planner_snapshot: parsed as Record<string, unknown>,
    })

    // 3) Create tasks (insert groupé = 1 aller-retour HTTP au lieu de N)
    const taskRows = (tasks as any[]).map((pt) => ({
      mission_id: missionRow.id,
      title: String(pt.title || ''),
      description: pt.description != null ? String(pt.description) : '',
      status: 'planned',
      agent: pt.agent ? String(pt.agent) : null,
    }))

    const createdTasks = await restInsertMany<{ id: string }>('tasks', 'select=id', taskRows)
    if (createdTasks.length !== tasks.length) {
      throw new Error('Bulk task insert count mismatch')
    }

    const taskIdByIndex = createdTasks.map((c) => c.id)
    const tasksForResponse: Array<{
      id: string
      title: string
      description: string
      status: 'planned'
      agent: string | null
      dependencies: string[]
    }> = (tasks as any[]).map((pt, index) => ({
      id: taskIdByIndex[index],
      title: String(pt.title || ''),
      description: pt.description != null ? String(pt.description) : '',
      status: 'planned' as const,
      agent: pt.agent ? String(pt.agent) : null,
      dependencies: [] as string[],
    }))

    // 4) Task dependencies — insert groupé
    const depRows: Record<string, unknown>[] = []
    const depSeen = new Set<string>()
    for (let index = 0; index < tasks.length; index++) {
      const pt = tasks[index] as any
      const currentTaskId = taskIdByIndex[index]

      const dependencyIndexes = (pt.dependencies || [])
        .map((d: string) => String(d).replace('index-', ''))
        .map((n: string) => parseInt(n, 10))
        .filter((n: number) => Number.isFinite(n))

      for (const depIndex of dependencyIndexes) {
        const dependsOnTaskId = taskIdByIndex[depIndex]
        if (!dependsOnTaskId) continue

        const depKey = `${currentTaskId}-${dependsOnTaskId}`
        if (depSeen.has(depKey)) continue
        depSeen.add(depKey)

        depRows.push({
          task_id: currentTaskId,
          depends_on_task_id: dependsOnTaskId,
        })

        const taskForResp = tasksForResponse.find((t) => t.id === currentTaskId)
        if (taskForResp && !taskForResp.dependencies.includes(dependsOnTaskId)) {
          taskForResp.dependencies.push(dependsOnTaskId)
        }
      }
    }

    if (depRows.length > 0) {
      await restInsertMany('task_dependencies', 'select=id', depRows)
    }

    if (profile.subscription_tier === 'free') {
      const month = currentQuotaMonthUtc()
      await restPatchSingle('profiles', `id=eq.${userId}`, {
        ai_runs_used: profile.ai_runs_used + 1,
        ai_quota_month: month,
        updated_at: new Date().toISOString(),
      })
    }

    return new Response(
      JSON.stringify({
        id: missionRow.id,
        objective: missionRow.objective,
        status: missionRow.status,
        createdAt: missionRow.created_at,
        tasks: tasksForResponse.map((t) => ({
          ...t,
          agent: t.agent ?? '',
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-mission error:', error)
    const err = error as Error & { code?: string }
    if (err.code === 'RATE_LIMIT') {
      return new Response(
        JSON.stringify({
          error: 'RATE_LIMIT',
          message: err.message,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

