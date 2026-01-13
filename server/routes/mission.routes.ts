import express from 'express'
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator.js'
import { MissionStore } from '../store/MissionStore.js'

const router = express.Router()
const orchestrator = new AgentOrchestrator()
const missionStore = new MissionStore()

router.post('/', async (req, res) => {
  try {
    const { objective } = req.body
    
    if (!objective) {
      return res.status(400).json({ error: 'Objective is required' })
    }

    const mission = await orchestrator.createMission(objective)
    missionStore.save(mission)
    
    res.json(mission)
    
    setTimeout(() => {
      startMissionExecution(mission.id)
    }, 1000)
  } catch (error) {
    console.error('Error creating mission:', error)
    res.status(500).json({ error: 'Failed to create mission' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const mission = missionStore.get(req.params.id)
    
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' })
    }
    
    res.json(mission)
  } catch (error) {
    console.error('Error fetching mission:', error)
    res.status(500).json({ error: 'Failed to fetch mission' })
  }
})

async function startMissionExecution(missionId: string) {
  let mission = missionStore.get(missionId)
  if (!mission) return

  mission.status = 'executing'
  missionStore.save(mission)

  while (true) {
    mission = missionStore.get(missionId)
    if (!mission) break

    const nextTask = await orchestrator.getNextTask(mission)
    
    if (!nextTask) {
      const allCompleted = mission.tasks.every(
        (t) => t.status === 'completed'
      )
      
      if (allCompleted) {
        mission.status = 'completed'
        missionStore.save(mission)
        break
      }
      
      await new Promise((resolve) => setTimeout(resolve, 2000))
      continue
    }

    nextTask.status = 'in_progress'
    mission.tasks = mission.tasks.map((t) =>
      t.id === nextTask.id ? nextTask : t
    )
    missionStore.save(mission)

    try {
      const completedTask = await orchestrator.executeTask(nextTask, mission)
      
      mission = missionStore.get(missionId)
      if (!mission) break
      
      mission.tasks = mission.tasks.map((t) =>
        t.id === completedTask.id ? completedTask : t
      )
      missionStore.save(mission)
    } catch (error) {
      console.error(`Error executing task ${nextTask.id}:`, error)
      nextTask.status = 'planned'
      mission.tasks = mission.tasks.map((t) =>
        t.id === nextTask.id ? nextTask : t
      )
      missionStore.save(mission)
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

export default router
