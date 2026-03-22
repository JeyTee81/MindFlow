import express from 'express'
import { MissionPlannerAgent } from '../agents/MissionPlannerAgent.js'
import { getSupabaseAdmin } from '../supabaseAdmin.js'
import { getUserIdFromRequest } from '../auth/getUserId.js'

const router = express.Router()

let plannerInstance: MissionPlannerAgent | null = null
function getPlanner(): MissionPlannerAgent {
  if (!plannerInstance) plannerInstance = new MissionPlannerAgent()
  return plannerInstance
}

router.post('/', async (req, res) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const { objective } = req.body as { objective?: unknown }

    if (!objective || typeof objective !== 'string' || !objective.trim()) {
      return res.status(400).json({ error: 'Objective is required' })
    }

    const plannedTasks = await getPlanner().planMission(objective.trim())

    // 1) Create mission
    const { data: missionRow, error: missionError } = await getSupabaseAdmin()
      .from('missions')
      .insert({
        user_id: userId,
        objective: objective.trim(),
        status: 'planning',
      })
      .select('id, objective, status, created_at')
      .single()

    if (missionError || !missionRow) {
      throw missionError || new Error('Failed to create mission')
    }

    // 2) Create tasks (preserve planned order)
    const taskIdByIndex: string[] = []
    const tasksForResponse: any[] = []

    for (let index = 0; index < plannedTasks.length; index++) {
      const pt = plannedTasks[index]
      const { data: taskRow, error: taskError } = await getSupabaseAdmin()
        .from('tasks')
        .insert({
          mission_id: missionRow.id,
          title: pt.title,
          description: pt.description,
          status: 'planned',
          agent: pt.agent,
        })
        .select('id')
        .single()

      if (taskError || !taskRow) {
        throw taskError || new Error('Failed to create task')
      }

      taskIdByIndex[index] = taskRow.id
      tasksForResponse.push({
        id: taskRow.id,
        title: pt.title,
        description: pt.description,
        status: 'planned',
        agent: pt.agent,
      })
    }

    // 3) Create task dependencies + build dependencies[] for UI
    const dependencyRows: Array<{
      task_id: string
      depends_on_task_id: string
    }> = []

    for (let index = 0; index < plannedTasks.length; index++) {
      const pt = plannedTasks[index]
      const currentTaskId = taskIdByIndex[index]
      const dependencyIndexes = (pt.dependencies || [])
        .map((d) => d.replace('index-', ''))
        .map((n) => parseInt(n, 10))
        .filter((n) => Number.isFinite(n))

      for (const depIndex of dependencyIndexes) {
        const dependsOnTaskId = taskIdByIndex[depIndex]
        if (!dependsOnTaskId) continue

        dependencyRows.push({
          task_id: currentTaskId,
          depends_on_task_id: dependsOnTaskId,
        })
      }
    }

    if (dependencyRows.length > 0) {
      const { error: depsError } = await getSupabaseAdmin()
        .from('task_dependencies')
        .insert(dependencyRows)

      if (depsError) {
        throw depsError
      }
    }

    // build dependencies array for each task for the API response
    const dependenciesByTaskId = new Map<string, string[]>()
    for (const row of dependencyRows) {
      const existing = dependenciesByTaskId.get(row.task_id) || []
      existing.push(row.depends_on_task_id)
      dependenciesByTaskId.set(row.task_id, existing)
    }

    const missionResponse = {
      id: missionRow.id,
      objective: missionRow.objective,
      status: missionRow.status as 'planning' | 'executing' | 'completed',
      createdAt: missionRow.created_at,
      tasks: tasksForResponse.map((t) => ({
        ...t,
        dependencies: dependenciesByTaskId.get(t.id) || [],
      })),
    }

    res.json(missionResponse)

    // Fire-and-forget: orchestration step execution in the Edge function.
    setTimeout(() => {
      void startExecutionLoop(missionRow.id, userId)
    }, 1000)
  } catch (error) {
    console.error('Error creating mission:', error)
    res.status(500).json({ error: 'Failed to create mission' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const missionId = req.params.id

    const { data: missionRow, error: missionError } = await getSupabaseAdmin()
      .from('missions')
      .select('id, objective, status, created_at')
      .eq('id', missionId)
      .eq('user_id', userId)
      .single()

    if (missionError || !missionRow) {
      return res.status(404).json({ error: 'Mission not found' })
    }

    const { data: tasksRows, error: tasksError } = await getSupabaseAdmin()
      .from('tasks')
      .select('id, title, description, status, agent, reasoning, result')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: true })

    if (tasksError) throw tasksError

    const taskIds = (tasksRows || []).map((t) => t.id)
    let dependencyRows: Array<{
      task_id: string
      depends_on_task_id: string
    }> = []

    if (taskIds.length > 0) {
      const { data: deps, error: depsError } = await getSupabaseAdmin()
        .from('task_dependencies')
        .select('task_id, depends_on_task_id')
        .in('task_id', taskIds)

      if (depsError) throw depsError
      dependencyRows = deps || []
    }

    const dependenciesByTaskId = new Map<string, string[]>()
    for (const row of dependencyRows) {
      const existing = dependenciesByTaskId.get(row.task_id) || []
      existing.push(row.depends_on_task_id)
      dependenciesByTaskId.set(row.task_id, existing)
    }

    const missionResponse = {
      id: missionRow.id,
      objective: missionRow.objective,
      status: missionRow.status as 'planning' | 'executing' | 'completed',
      createdAt: missionRow.created_at,
      tasks: (tasksRows || []).map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        agent: t.agent,
        reasoning: t.reasoning ?? undefined,
        result: t.result ?? undefined,
        dependencies: dependenciesByTaskId.get(t.id) || [],
      })),
    }

    res.json(missionResponse)
  } catch (error) {
    console.error('Error fetching mission:', error)
    res.status(500).json({ error: 'Failed to fetch mission' })
  }
})

async function startExecutionLoop(missionId: string, userId: string) {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL env var')
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env var')

  const url = `${supabaseUrl}/functions/v1/start-execution`
  const delayMs = 1000
  const maxAttempts = 600

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ missionId, userId }),
    })

    if (!response.ok) {
      console.error(
        `Edge invocation failed (attempt ${attempt + 1}/${maxAttempts})`,
        await response.text().catch(() => '')
      )
    } else {
      const json = (await response.json()) as {
        completed?: boolean
        progress?: boolean
        taskId?: string
      }

      if (json.completed) return
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

export default router
