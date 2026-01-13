import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMissionStore } from '../store/useMissionStore'

interface HomeProps {
  onStartMission: () => void
}

export default function Home({ onStartMission }: HomeProps) {
  const [objective, setObjective] = useState('')
  const [loading, setLoading] = useState(false)
  const { createMission } = useMissionStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!objective.trim()) return

    setLoading(true)
    try {
      await createMission(objective)
      onStartMission()
    } catch (error) {
      console.error('Error starting mission:', error)
      alert('Failed to start mission. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen bg-dark-blue flex items-center justify-center relative overflow-hidden">
      {/* Animated particles background */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-30"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
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
        <h1 className="text-6xl font-bold text-white text-center mb-12">
          What is your mission?
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Ex: Je veux lancer un produit SaaS..."
            className="w-full h-32 px-6 py-4 bg-night-blue border border-blue-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 resize-none"
          />

          <motion.button
            type="submit"
            disabled={loading || !objective.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Starting Mission...' : 'Start Mission'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
