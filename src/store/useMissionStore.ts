import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import { invokeEdgeFunctionJson, invokeEdgeFunctionVoid } from '../lib/invokeEdgeFunction'
import { useAuthStore } from './useAuthStore'
import { useProfileStore } from './useProfileStore'

export interface Task {
  id: string
  title: string
  description: string
  status: 'planned' | 'in_progress' | 'completed'
  agent: string
  reasoning?: string
  result?: string
  /** Coché par l’utilisateur : étape considérée comme faite (hors IA) */
  userValidated?: boolean
  dependencies?: string[]
}

export interface MissionSummary {
  id: string
  objective: string
  status: string
  createdAt: string
}

export interface Mission {
  id: string
  objective: string
  tasks: Task[]
  status: 'planning' | 'executing' | 'completed'
  createdAt: string
  /** JSON complet du planner (relecture / audit du graphe généré) */
  plannerSnapshot?: unknown
}

interface MissionStore {
  currentMission: Mission | null
  /** Panneau détail tâche (graphe compact) */
  taskDetailOpenId: string | null
  openTaskDetail: (taskId: string) => void
  closeTaskDetail: () => void
  /** Erreur lors du dernier chargement (RLS, réseau, etc.) */
  missionLoadError: string | null
  missionList: MissionSummary[]
  agents: Array<{
    id: string
    name: string
    status: 'idle' | 'thinking' | 'executing' | 'done'
  }>
  setMission: (mission: Mission) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  updateAgentStatus: (agentId: string, status: string) => void
  createMission: (objective: string) => Promise<void>
  fetchMissionList: () => Promise<void>
  loadMissionById: (missionId: string) => Promise<void>
  fetchMissionStatus: (missionId: string) => Promise<void>
  triggerExecutionStep: (missionId: string) => Promise<void>
  setTaskUserValidated: (taskId: string, value: boolean) => Promise<void>
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  currentMission: null,
  taskDetailOpenId: null,
  openTaskDetail: (taskId) => set({ taskDetailOpenId: taskId }),
  closeTaskDetail: () => set({ taskDetailOpenId: null }),
  missionLoadError: null,
  missionList: [],
  agents: [
    { id: 'planner', name: 'Mission Planner', status: 'idle' },
    { id: 'executor', name: 'Task Executor', status: 'idle' },
    { id: 'analyst', name: 'Analyst', status: 'idle' },
  ],
  setMission: (mission) => set({ currentMission: mission }),
  updateTask: (taskId, updates) => {
    const mission = get().currentMission
    if (!mission) return
    const updatedTasks = mission.tasks.map((task) =>
      task.id === taskId ? { ...task, ...updates } : task
    )
    set({
      currentMission: { ...mission, tasks: updatedTasks },
    })
  },
  updateAgentStatus: (agentId, status) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? { ...agent, status: status as any }
          : agent
      ),
    }))
  },
  createMission: async (objective) => {
    try {
      const data = await invokeEdgeFunctionJson<Mission>('create-mission', { objective })
      if (!data) {
        throw new Error('La fonction create-mission n’a renvoyé aucune donnée.')
      }
      set({ currentMission: data })
      void useProfileStore.getState().loadProfile()
    } catch (error) {
      console.error('Failed to create mission:', error)
      throw error
    }
  },
  fetchMissionList: async () => {
    const { userId } = useAuthStore.getState()
    if (!userId) return
    const { data, error } = await supabase
      .from('missions')
      .select('id, objective, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('fetchMissionList:', error)
      return
    }
    set({
      missionList: (data || []).map((row) => ({
        id: row.id,
        objective: row.objective,
        status: row.status,
        createdAt: row.created_at,
      })),
    })
  },
  loadMissionById: async (missionId) => {
    set({ currentMission: null, missionLoadError: null, taskDetailOpenId: null })
    await get().fetchMissionStatus(missionId)
  },
  fetchMissionStatus: async (missionId) => {
    try {
      const { userId } = useAuthStore.getState()
      if (!userId) throw new Error('Missing user session')

      const { data: missionRow, error: missionError } = await supabase
        .from('missions')
        .select('id, objective, status, created_at, planner_snapshot')
        .eq('id', missionId)
        .eq('user_id', userId)
        .single()

      if (missionError) throw missionError
      if (!missionRow) throw new Error('Mission not found')

      const { data: tasksRows, error: tasksError } = await supabase
        .from('tasks')
        .select(
          'id, title, description, status, agent, reasoning, result, created_at, user_validated'
        )
        .eq('mission_id', missionId)
        .order('created_at', { ascending: true })

      if (tasksError) throw tasksError

      const taskIds = (tasksRows || []).map((t) => t.id)
      const { data: depsRows, error: depsError } = taskIds.length
        ? await supabase
            .from('task_dependencies')
            .select('task_id, depends_on_task_id')
            .in('task_id', taskIds)
        : { data: [], error: null }

      if (depsError) throw depsError

      const dependenciesByTaskId = new Map<string, string[]>()
      for (const row of depsRows || []) {
        const existing = dependenciesByTaskId.get(row.task_id) || []
        existing.push(row.depends_on_task_id)
        dependenciesByTaskId.set(row.task_id, existing)
      }

      const row = missionRow as typeof missionRow & { planner_snapshot?: unknown }

      const missionResponse: Mission = {
        id: row.id,
        objective: row.objective,
        status: row.status as Mission['status'],
        createdAt: row.created_at,
        plannerSnapshot: row.planner_snapshot ?? undefined,
        tasks: (tasksRows || []).map((t) => {
          const tr = t as typeof t & { user_validated?: boolean }
          return {
            id: tr.id,
            title: tr.title,
            description: tr.description,
            status: tr.status as Task['status'],
            agent: tr.agent,
            reasoning: tr.reasoning ?? undefined,
            result: tr.result ?? undefined,
            userValidated: Boolean(tr.user_validated),
            dependencies: dependenciesByTaskId.get(tr.id) || [],
          }
        }),
      }

      set({ currentMission: missionResponse, missionLoadError: null })
    } catch (error) {
      console.error('Failed to fetch mission status:', error)
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Impossible de charger la mission.'
      set({ currentMission: null, missionLoadError: msg })
    }
  },
  triggerExecutionStep: async (missionId) => {
    try {
      await invokeEdgeFunctionVoid('start-execution', { missionId })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.warn('start-execution:', msg)
      if (/429|Limite Mistral|RATE_LIMIT|rate/i.test(msg)) {
        window.alert(
          `Limite Mistral (requêtes / minute ou quota). Pause 1–2 min puis réessaie.\n\n${msg.slice(0, 200)}`
        )
      }
    }
  },
  setTaskUserValidated: async (taskId, value) => {
    const mission = get().currentMission
    if (!mission) return
    const { error } = await supabase
      .from('tasks')
      .update({ user_validated: value })
      .eq('id', taskId)
    if (error) {
      console.error(error)
      window.alert(error.message)
      return
    }
    await get().fetchMissionStatus(mission.id)
  },
}))
