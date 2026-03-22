import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMissionStore } from '../store/useMissionStore'
import {
  getPlannerTaskAtIndex,
  extractGuidanceFromPlannerTask,
  buildFallbackGuidance,
} from '../lib/plannerSnapshot'

const statusLabels: Record<string, string> = {
  planned: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
}

export default function TaskDetailModal() {
  const taskDetailOpenId = useMissionStore((s) => s.taskDetailOpenId)
  const closeTaskDetail = useMissionStore((s) => s.closeTaskDetail)
  const currentMission = useMissionStore((s) => s.currentMission)
  const setTaskUserValidated = useMissionStore((s) => s.setTaskUserValidated)

  const [validating, setValidating] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)

  const task = useMemo(
    () => currentMission?.tasks.find((t) => t.id === taskDetailOpenId),
    [currentMission, taskDetailOpenId]
  )

  const taskIndex = useMemo(() => {
    if (!currentMission || !task) return -1
    return currentMission.tasks.findIndex((t) => t.id === task.id)
  }, [currentMission, task])

  const guidanceText = useMemo(() => {
    if (!task || !currentMission || taskIndex < 0) return ''
    const raw = getPlannerTaskAtIndex(currentMission.plannerSnapshot, taskIndex)
    const fromPlanner = extractGuidanceFromPlannerTask(raw)
    return fromPlanner || buildFallbackGuidance(currentMission.objective, task.description)
  }, [task, currentMission, taskIndex])

  const hasPlannerGuidance = useMemo(() => {
    if (!currentMission || taskIndex < 0) return false
    const raw = getPlannerTaskAtIndex(currentMission.plannerSnapshot, taskIndex)
    return Boolean(extractGuidanceFromPlannerTask(raw))
  }, [currentMission, taskIndex])

  useEffect(() => {
    if (!taskDetailOpenId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTaskDetail()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [taskDetailOpenId, closeTaskDetail])

  useEffect(() => {
    if (taskDetailOpenId && currentMission && !task) {
      closeTaskDetail()
    }
  }, [taskDetailOpenId, currentMission, task, closeTaskDetail])

  useEffect(() => {
    setShowReasoning(false)
  }, [taskDetailOpenId])

  if (!taskDetailOpenId || !task || !currentMission) return null

  const depTitles = (task.dependencies || [])
    .map((id) => currentMission.tasks.find((t) => t.id === id)?.title)
    .filter((t): t is string => Boolean(t))

  const statusLabel = statusLabels[task.status] ?? task.status

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeTaskDetail()
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="flex max-h-[min(90dvh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-blue-500/25 bg-night-blue shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-blue-500/20 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-300/90">
                  Étape
                </p>
                <h2 id="task-detail-title" className="mt-1 text-lg font-semibold text-white">
                  {task.title}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className="rounded-md px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#93c5fd',
                  }}
                >
                  {statusLabel}
                </span>
                <button
                  type="button"
                  onClick={closeTaskDetail}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white"
                  aria-label="Fermer"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm text-blue-200/80">
              Agent : <span className="text-white">{task.agent || '—'}</span>
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-200">Description</h3>
              <p className="text-sm leading-relaxed text-gray-300">{task.description || '—'}</p>
            </section>

            {depTitles.length > 0 && (
              <section className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-200">Dépend de</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-400">
                  {depTitles.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-emerald-100">Aide détaillée</h3>
                {hasPlannerGuidance ? (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-200">
                    Plan IA
                  </span>
                ) : (
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-100">
                    Conseils
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {guidanceText}
              </div>
            </section>

            {task.result && (
              <section className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-200">Résultat (IA)</h3>
                <div className="rounded-lg border border-blue-500/15 bg-dark-blue/80 p-3 text-sm text-gray-300">
                  {task.result}
                </div>
              </section>
            )}

            {task.reasoning && (
              <section className="mb-2">
                <button
                  type="button"
                  onClick={() => setShowReasoning((v) => !v)}
                  className="text-sm font-medium text-blue-300 underline decoration-blue-500/50 hover:text-blue-200"
                >
                  {showReasoning ? 'Masquer le raisonnement IA' : 'Voir le raisonnement IA'}
                </button>
                {showReasoning && (
                  <div className="mt-2 rounded-lg border border-blue-500/15 bg-dark-blue/80 p-3 text-sm text-gray-300">
                    {task.reasoning.split('\n').map((line, i) => (
                      <p key={i} className="mb-2 last:mb-0">
                        {line || '\u00A0'}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            )}

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-blue-500/20 bg-dark-blue/50 p-3 select-none">
              <input
                type="checkbox"
                checked={Boolean(task.userValidated)}
                disabled={validating}
                onChange={async (e) => {
                  setValidating(true)
                  try {
                    await setTaskUserValidated(task.id, e.target.checked)
                  } finally {
                    setValidating(false)
                  }
                }}
                className="mt-0.5 rounded border-blue-500/50 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-200">
                Je valide cette étape (obligatoire pour débloquer la suite) — indépendant du texte généré par l’IA.
              </span>
            </label>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
