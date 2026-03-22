import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Mission } from '../store/useMissionStore'
import { useMissionStore } from '../store/useMissionStore'
import {
  buildDailyDebrief,
  findNextBestTask,
  isTaskDoneForFlow,
  missionAnchorYmd,
  toYmdLocal,
} from '../lib/missionInsights'

const TASKS_PER_DAY = 3

export default function MissionTodayView({ mission }: { mission: Mission }) {
  const openTaskDetail = useMissionStore((s) => s.openTaskDetail)
  const todayYmd = useMemo(() => toYmdLocal(new Date()), [])
  const anchor = missionAnchorYmd(mission.createdAt)

  const nba = useMemo(() => findNextBestTask(mission.tasks), [mission.tasks])
  const debrief = useMemo(
    () => buildDailyDebrief(mission.objective, mission.tasks, anchor, todayYmd, TASKS_PER_DAY),
    [mission.objective, mission.tasks, anchor, todayYmd]
  )

  const progress = useMemo(() => {
    const total = mission.tasks.length
    const done = mission.tasks.filter(isTaskDoneForFlow).length
    return total ? Math.round((done / total) * 100) : 0
  }, [mission.tasks])

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
          <h2 className="text-lg font-semibold text-amber-100">Prochaine action recommandée</h2>
          <p className="mt-1 text-xs text-amber-200/70">
            Basée sur les dépendances du graphe : la première tâche débloquée (ou celle déjà « en cours »).
          </p>
          {nba && !isTaskDoneForFlow(nba) ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-white">{nba.title}</p>
              <p className="text-xs text-gray-400 line-clamp-3">{nba.description}</p>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openTaskDetail(nba.id)}
                className="w-full rounded-lg bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-night-blue shadow-lg shadow-amber-500/20"
              >
                Ouvrir cette étape (détails & aide)
              </motion.button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-400">
              {mission.tasks.every(isTaskDoneForFlow)
                ? 'Toutes les tâches sont terminées ou validées. Bravo !'
                : 'Aucune action clairement « suivante » — vérifie le graphe ou valide les prérequis.'}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-emerald-100">Debrief du jour</h2>
            <span className="text-xs capitalize text-emerald-200/80">{debrief.dateLabel}</span>
          </div>
          <p className="mt-2 text-xs text-emerald-200/60">
            Synthèse automatique (sans appel IA) — pour un futur enrichissement Mistral, voir Mindflow.md.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-200">{debrief.summary}</p>
          <ul className="mt-4 space-y-2 text-sm text-gray-400">
            {debrief.bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-500/80">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-dark-blue">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs text-gray-500">Avancement global du plan : {progress} %</p>
        </section>
      </div>
    </div>
  )
}
