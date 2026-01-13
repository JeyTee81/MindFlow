import { useState } from 'react'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import { useMissionStore } from './store/useMissionStore'

function App() {
  const { currentMission } = useMissionStore()
  const [missionStarted, setMissionStarted] = useState(false)

  const handleMissionStart = () => {
    setMissionStarted(true)
  }

  if (missionStarted && currentMission) {
    return <Dashboard />
  }

  return <Home onStartMission={handleMissionStart} />
}

export default App
