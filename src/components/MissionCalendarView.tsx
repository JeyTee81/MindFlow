import { useMemo } from 'react'
import type { Mission } from '../store/useMissionStore'
import {
  groupTasksByScheduledDay,
  missionAnchorYmd,
  sortedDayKeys,
} from '../lib/missionInsights'

const TASKS_PER_DAY = 3

function formatDayHeader(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export default function MissionCalendarView({ mission }: { mission: Mission }) {
  const anchor = missionAnchorYmd(mission.createdAt)
  const byDay = useMemo(
    () => groupTasksByScheduledDay(mission.tasks, anchor, TASKS_PER_DAY),
    [mission.tasks, anchor]
  )

  const days = useMemo(() => sortedDayKeys([...byDay.keys()]), [byDay])

  if (mission.tasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-gray-400 text-sm">
        Aucune tâche à afficher.
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 text-xs text-gray-500">
          Planning automatique : jusqu’à {TASKS_PER_DAY} tâches par jour, dans l’ordre du plan (du haut vers le bas du
          graphe). Ajuste ton rythme en cochant les étapes réalisées.
        </p>
        <div className="space-y-6">
          {days.map((ymd) => {
            const list = byDay.get(ymd) ?? []
            return (
              <section
                key={ymd}
                className="rounded-xl border border-blue-500/20 bg-night-blue/40 p-4 shadow-sm"
              >
                <h3 className="mb-3 text-sm font-semibold capitalize text-blue-200">
                  {formatDayHeader(ymd)}
                </h3>
                <ul className="space-y-2">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-3 rounded-lg border border-white/5 bg-dark-blue/60 px-3 py-2 text-sm"
                    >
                      <span
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                          t.userValidated
                            ? 'bg-emerald-500'
                            : t.status === 'completed'
                              ? 'bg-violet-500'
                              : t.status === 'in_progress'
                                ? 'bg-amber-400'
                                : 'bg-blue-500'
                        }`}
                        title={
                          t.userValidated
                            ? 'Validé par toi'
                            : t.status === 'completed'
                              ? 'Réponse IA — pas encore validée'
                              : undefined
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-100">{t.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
