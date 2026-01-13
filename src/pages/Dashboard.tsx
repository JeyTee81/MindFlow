import { useEffect } from 'react'
import { motion } from 'framer-motion'
import MissionGraph from '../components/MissionGraph'
import AgentPanel from '../components/AgentPanel'
import { useMissionStore } from '../store/useMissionStore'

export default function Dashboard() {
  const { currentMission, fetchMissionStatus } = useMissionStore()

  useEffect(() => {
    if (!currentMission) return

    const interval = setInterval(() => {
      fetchMissionStatus(currentMission.id)
    }, 2000)

    return () => clearInterval(interval)
  }, [currentMission, fetchMissionStatus])

  if (!currentMission) {
    return (
      <div className="w-full h-screen bg-dark-blue flex items-center justify-center">
        <p className="text-white">No mission found</p>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-dark-blue flex">
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-80 bg-night-blue border-r border-blue-500/20"
      >
        <AgentPanel />
      </motion.div>

      <div className="flex-1 relative">
        <MissionGraph />
      </div>
    </div>
  )
}
