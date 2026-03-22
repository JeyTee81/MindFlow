import { motion } from 'framer-motion'
import { useMissionStore } from '../store/useMissionStore'

export default function AgentPanel() {
  const { currentMission, agents } = useMissionStore()

  const statusColors = {
    idle: 'bg-gray-600',
    thinking: 'bg-yellow-500',
    executing: 'bg-blue-500',
    done: 'bg-green-500',
  }

  const statusLabels = {
    idle: 'Idle',
    thinking: 'Thinking...',
    executing: 'Executing...',
    done: 'Done',
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-8">
        <h2 className="text-white text-2xl font-bold mb-2">Mission</h2>
        <p className="text-gray-400 text-sm line-clamp-3">
          {currentMission?.objective}
        </p>
      </div>

      <div className="flex-1">
        <h3 className="text-white text-lg font-semibold mb-4">Agents</h3>
        <div className="space-y-4">
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-dark-blue rounded-lg p-4 border border-blue-500/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{agent.name}</span>
                <motion.div
                  className={`w-3 h-3 rounded-full ${statusColors[agent.status]}`}
                  animate={{
                    scale: agent.status === 'thinking' ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 1,
                    repeat:
                      agent.status === 'thinking' ? Infinity : 0,
                  }}
                />
              </div>
              <p className="text-gray-400 text-xs">
                {statusLabels[agent.status]}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {currentMission?.plannerSnapshot != null && (
        <details className="mt-4 rounded-lg border border-blue-500/20 bg-dark-blue/50 p-3 text-left">
          <summary className="cursor-pointer text-xs font-medium text-gray-300">
            Plan IA (snapshot JSON)
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto text-[10px] leading-snug text-gray-500">
            {JSON.stringify(currentMission.plannerSnapshot, null, 2)}
          </pre>
        </details>
      )}

      <div className="mt-6 pt-6 border-t border-blue-500/20">
        <div className="text-gray-400 text-xs space-y-1">
          <p>Status: {currentMission?.status}</p>
          <p>Tasks: {currentMission?.tasks.length || 0}</p>
        </div>
      </div>
    </div>
  )
}
