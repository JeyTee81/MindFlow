import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import MissionGraph from '../components/MissionGraph'
import MissionRoadmap from '../components/MissionRoadmap'
import AgentPanel from '../components/AgentPanel'
import TaskDetailModal from '../components/TaskDetailModal'
import MissionViewTabs, { type MissionWorkspaceTab } from '../components/MissionViewTabs'
import MissionCalendarView from '../components/MissionCalendarView'
import MissionTodayView from '../components/MissionTodayView'
import { useMissionStore } from '../store/useMissionStore'
import { useProfileStore } from '../store/useProfileStore'

export default function Dashboard() {
  const { missionId } = useParams<{ missionId: string }>()
  const { currentMission, missionLoadError, fetchMissionStatus, triggerExecutionStep, loadMissionById } =
    useMissionStore()
  /** Toujours avant tout return — sinon « Rendered fewer hooks than expected » */
  const isPremium = useProfileStore((s) => s.profile?.subscription_tier === 'premium')
  const [workspaceTab, setWorkspaceTab] = useState<MissionWorkspaceTab>('parcours')

  useEffect(() => {
    if (!missionId) return
    void loadMissionById(missionId)
  }, [missionId, loadMissionById])

  useEffect(() => {
    setWorkspaceTab('parcours')
  }, [missionId])

  useEffect(() => {
    if (!currentMission?.id || !missionId) return
    if (currentMission.id.toLowerCase() !== missionId.toLowerCase()) return
    const id = currentMission.id

    const interval = setInterval(() => {
      void (async () => {
        await fetchMissionStatus(id)
        if (useProfileStore.getState().profile?.subscription_tier !== 'premium') return
        const st = useMissionStore.getState().currentMission?.status
        if (st === 'executing') {
          await triggerExecutionStep(id)
        }
      })()
    }, 2000)

    return () => clearInterval(interval)
  }, [currentMission?.id, missionId, fetchMissionStatus, triggerExecutionStep])

  if (missionLoadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-dark-blue px-6 text-center">
        <p className="max-w-lg text-red-300">{missionLoadError}</p>
        <p className="max-w-md text-sm text-gray-400">
          Vérifie les politiques RLS sur <code className="text-gray-500">missions</code> /{' '}
          <code className="text-gray-500">tasks</code> et que tu es connecté avec le bon compte.
        </p>
        <Link to="/missions" className="text-blue-300 underline">
          Retour à la liste
        </Link>
      </div>
    )
  }

  const idMismatch =
    missionId &&
    currentMission &&
    currentMission.id.toLowerCase() !== missionId.toLowerCase()

  if (!currentMission || idMismatch) {
    return (
      <div className="flex flex-1 items-center justify-center bg-dark-blue">
        <p className="text-gray-200">Chargement de la mission…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-dark-blue">
      {!isPremium && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-100 sm:text-sm">
          Mode gratuit : le plan est affiché ci-dessous. L’
          <strong>exécution des tâches par l’IA</strong> nécessite le{' '}
          <Link to="/upgrade" className="underline font-medium">
            Premium
          </Link>
          .
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="order-2 flex max-h-[38vh] w-full shrink-0 flex-col overflow-y-auto border-t border-blue-500/20 bg-night-blue md:order-1 md:max-h-none md:h-auto md:w-80 md:border-r md:border-t-0"
        >
          <AgentPanel />
        </motion.div>

        <div className="relative order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:order-2">
          <MissionViewTabs active={workspaceTab} onChange={setWorkspaceTab} />
          <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
            {workspaceTab === 'parcours' && currentMission && <MissionRoadmap mission={currentMission} />}
            {workspaceTab === 'graph' && <MissionGraph />}
            {workspaceTab === 'calendar' && currentMission && <MissionCalendarView mission={currentMission} />}
            {workspaceTab === 'today' && currentMission && <MissionTodayView mission={currentMission} />}
          </div>
        </div>
      </div>
      <TaskDetailModal />
    </div>
  )
}
