import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMissionStore } from '../store/useMissionStore'
import { useProfileStore } from '../store/useProfileStore'
import {
  FREE_MONTHLY_AI_RUNS,
  effectiveAiRunsUsed,
  freePlannerRunsRemaining,
} from '../lib/billing'

export default function Home() {
  const [objective, setObjective] = useState('')
  const [loading, setLoading] = useState(false)
  const { createMission } = useMissionStore()
  const { profile } = useProfileStore()
  const navigate = useNavigate()

  const canUseFreePlanner =
    !profile ||
    profile.subscription_tier === 'premium' ||
    effectiveAiRunsUsed(profile) < FREE_MONTHLY_AI_RUNS

  const runsLeftFree = profile ? freePlannerRunsRemaining(profile) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!objective.trim()) return

    setLoading(true)
    try {
      await createMission(objective)
      const id = useMissionStore.getState().currentMission?.id
      if (id) {
        void useMissionStore.getState().fetchMissionList()
        navigate(`/mission/${id}`, { replace: true })
      }
    } catch (error) {
      console.error('Error starting mission:', error)
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Échec du démarrage de la mission.'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-full flex items-center justify-center relative overflow-hidden py-12">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-blue/95 backdrop-blur-sm px-6"
          >
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-white text-lg font-medium text-center">Génération du plan par l’IA…</p>
            <p className="text-gray-400 text-sm text-center max-w-md mt-2">
              C’est souvent <strong className="text-gray-300">30 à 60 secondes</strong>, parfois plus si l’API Mistral
              est chargée ou si la fonction Edge redémarre (cold start).
            </p>
            <p className="text-gray-500 text-xs text-center max-w-md mt-4">
              Après la première étape, la suite est plus rapide (insertions en base optimisées).
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-30"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 600),
            }}
            animate={{
              y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 600)],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 w-full max-w-2xl px-6"
      >
        <h1 className="text-5xl sm:text-6xl font-bold text-white text-center mb-4">
          Quel est ton projet ?
        </h1>
        <p className="text-center text-gray-400 text-sm mb-8">
          Plan Freemium :{' '}
          <span className="text-amber-200/90">
            {FREE_MONTHLY_AI_RUNS} générations de plan par mois
          </span>{' '}
          pour l’usage complet et illimité,{' '}
          <Link to="/upgrade" className="text-blue-300 underline hover:text-blue-200">
            passez en Premium
          </Link>
          .
        </p>

        {profile?.subscription_tier === 'free' && runsLeftFree !== null && (
          <p className="text-center text-xs text-gray-500 mb-4">
            Ce mois-ci :{' '}
            <span className="text-gray-300">
              {runsLeftFree} / {FREE_MONTHLY_AI_RUNS} génération(s) restante(s)
            </span>
          </p>
        )}

        {!canUseFreePlanner && (
          <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Quota gratuit du mois atteint ({FREE_MONTHLY_AI_RUNS} plans). Réessaie le mois prochain ou{' '}
            <Link to="/upgrade" className="font-semibold underline">
              passe en Premium
            </Link>{' '}
            pour continuer sans limite côté planner et exécuter les tâches par l’IA.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Ex : lancer un produit SaaS…"
            disabled={!canUseFreePlanner}
            className="w-full h-32 px-6 py-4 bg-night-blue border border-blue-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 resize-none disabled:opacity-50"
          />

          <motion.button
            type="submit"
            disabled={loading || !objective.trim() || !canUseFreePlanner}
            whileHover={{ scale: canUseFreePlanner ? 1.05 : 1 }}
            whileTap={{ scale: canUseFreePlanner ? 0.95 : 1 }}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Démarrage…' : 'Démarrer la mission'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
