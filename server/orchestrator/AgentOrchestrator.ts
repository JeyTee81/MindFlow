import { MissionPlannerAgent } from '../agents/MissionPlannerAgent.js'
import { TaskExecutorAgent } from '../agents/TaskExecutorAgent.js'
import { AnalystAgent } from '../agents/AnalystAgent.js'
import type { Task, Mission } from '../types/mission.types.js'

export class AgentOrchestrator {
  private planner: MissionPlannerAgent
  private executor: TaskExecutorAgent
  private analyst: AnalystAgent

  constructor() {
    this.planner = new MissionPlannerAgent()
    this.executor = new TaskExecutorAgent()
    this.analyst = new AnalystAgent()
  }

  async createMission(objective: string): Promise<Mission> {
    const missionId = `mission-${Date.now()}`
    
    const plannedTasks = await this.planner.planMission(objective)
    
    const tasks: Task[] = plannedTasks.map((pt, index) => {
      const taskId = `task-${missionId}-${index}`
      const dependencies = (pt.dependencies || []).map((dep: string) => {
        const depIndex = parseInt(dep.replace('index-', ''))
        return `task-${missionId}-${depIndex}`
      })
      
      return {
        id: taskId,
        title: pt.title,
        description: pt.description,
        status: 'planned' as const,
        agent: pt.agent,
        dependencies,
      }
    })

    return {
      id: missionId,
      objective,
      tasks,
      status: 'planning',
      createdAt: new Date().toISOString(),
    }
  }

  async executeTask(task: Task, mission: Mission): Promise<Task> {
    const completedTasks = mission.tasks.filter((t) => t.status === 'completed')
    const context = completedTasks
      .map((t) => `${t.title}: ${t.result || 'Completed'}`)
      .join('\n')

    let result: {
      reasoning: string
      result: string
      nextSteps: string
    }

    if (task.agent === 'TaskExecutor') {
      result = await this.executor.executeTask(
        task.title,
        task.description,
        context
      )
    } else {
      const analysis = await this.analyst.analyzeProgress(
        mission.objective,
        completedTasks,
        mission.tasks.filter((t) => t.status === 'in_progress')
      )
      result = {
        reasoning: analysis.analysis,
        result: analysis.insights,
        nextSteps: analysis.recommendations.join(', '),
      }
    }

    return {
      ...task,
      status: 'completed',
      reasoning: result.reasoning,
      result: result.result,
    }
  }

  async getNextTask(mission: Mission): Promise<Task | null> {
    const plannedTasks = mission.tasks.filter((t) => t.status === 'planned')
    
    for (const task of plannedTasks) {
      if (!task.dependencies || task.dependencies.length === 0) {
        return task
      }
      
      const allDepsCompleted = task.dependencies.every((depId) => {
        const depTask = mission.tasks.find((t) => t.id === depId)
        return depTask?.status === 'completed'
      })
      
      if (allDepsCompleted) {
        return task
      }
    }
    
    return null
  }
}
