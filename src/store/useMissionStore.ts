import { create } from 'zustand'
import axios from 'axios'

export interface Task {
  id: string
  title: string
  description: string
  status: 'planned' | 'in_progress' | 'completed'
  agent: string
  reasoning?: string
  dependencies?: string[]
}

export interface Mission {
  id: string
  objective: string
  tasks: Task[]
  status: 'planning' | 'executing' | 'completed'
  createdAt: string
}

interface MissionStore {
  currentMission: Mission | null
  agents: Array<{
    id: string
    name: string
    status: 'idle' | 'thinking' | 'executing' | 'done'
  }>
  setMission: (mission: Mission) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  updateAgentStatus: (agentId: string, status: string) => void
  createMission: (objective: string) => Promise<void>
  fetchMissionStatus: (missionId: string) => Promise<void>
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  currentMission: null,
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
      const response = await axios.post('/api/missions', { objective })
      set({ currentMission: response.data })
    } catch (error) {
      console.error('Failed to create mission:', error)
      throw error
    }
  },
  fetchMissionStatus: async (missionId) => {
    try {
      const response = await axios.get(`/api/missions/${missionId}`)
      set({ currentMission: response.data })
    } catch (error) {
      console.error('Failed to fetch mission status:', error)
    }
  },
}))
