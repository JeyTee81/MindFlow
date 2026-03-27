import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Mission } from '../store/useMissionStore'
import { useMissionStore } from '../store/useMissionStore'
import { groupTasksByPhase, isTaskDoneForFlow } from '../lib/missionInsights'

export default function MissionRoadmap({ mission }: { mission: Mission }) {
  const openTaskDetail = useMissionStore((s) => s.openTaskDetail)
  const phases = useMemo(() => groupTasksByPhase(mission.tasks), [mission.tasks])

  if (mission.tasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-400">
        Aucune tâche dans ce plan.
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 pb-24 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pb-8">
      <div className="mx-auto max-w-xl">
        <p className="mb-6 text-center text-xs leading-relaxed text-gray-500 sm:text-sm">
          Parcours en <strong className="text-gray-300">grandes étapes</strong>, chacune découpée en{' '}
          <strong className="text-gray-300">petites actions</strong> (environ{' '}
          <strong className="text-amber-200/90">3 par jour</strong> dans l’onglet Calendrier). Ouvre une action pour le
          détail et l’aide.
        </p>

        <div className="space-y-8">
          {phases.map((phase, pIdx) => (
            <motion.section
              key={`${phase.phaseIndex}-${phase.phaseTitle}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: pIdx * 0.05 }}
              className="rounded-2xl border border-blue-500/20 bg-night-blue/50 p-4 shadow-lg sm:p-5"
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {phase.phaseIndex + 1}
                </span>
                <div>
                  <h2 className="text-base font-semibold leading-snug text-white sm:text-lg">{phase.phaseTitle}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {phase.tasks.filter(isTaskDoneForFlow).length} / {phase.tasks.length} action(s) validée(s) par toi
                  </p>
                </div>
              </div>

              <ol className="space-y-2">
                {phase.tasks.map((t, i) => {
                  const done = isTaskDoneForFlow(t)
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => openTaskDetail(t.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition sm:px-4 ${
                          done
                            ? 'border-emerald-500/35 bg-emerald-500/10'
                            : 'border-white/10 bg-dark-blue/60 hover:border-blue-500/40 hover:bg-dark-blue/80'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                            done ? 'bg-emerald-500 text-white' : 'bg-blue-500/30 text-blue-200'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-100">{t.title}</span>
                          <span className="mt-0.5 line-clamp-2 text-xs text-gray-500">{t.description}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </motion.section>
          ))}
        </div>
      </div>
    </div>
  )
}
