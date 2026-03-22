import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMissionStore } from '../store/useMissionStore'

export default function MissionList() {
  const { missionList } = useMissionStore()

  useEffect(() => {
    void useMissionStore.getState().fetchMissionList()
  }, [])

  return (
    <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-2"
      >
        Mes missions
      </motion.h1>
      <p className="text-gray-400 mb-8 text-sm">
        Clique sur une mission pour ouvrir le tableau de bord et le graphe.
      </p>

      {missionList.length === 0 ? (
        <p className="text-gray-500">Aucune mission pour l’instant. Crée-en une depuis l’accueil.</p>
      ) : (
        <ul className="space-y-3">
          {missionList.map((m) => (
            <li key={m.id}>
              <Link
                to={`/mission/${m.id}`}
                className="block rounded-lg border border-blue-500/20 bg-night-blue/50 px-4 py-3 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex justify-between gap-4 items-start">
                  <span className="text-white font-medium line-clamp-2">{m.objective}</span>
                  <span className="shrink-0 text-xs uppercase text-blue-300/80">{m.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
