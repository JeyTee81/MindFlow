import { useState } from 'react'
import { motion } from 'framer-motion'
import { Handle, Position, NodeProps } from 'reactflow'
import { Task } from '../store/useMissionStore'
import ReasoningModal from './ReasoningModal'

interface TaskNodeData extends Task {
  statusColor: string
}

export default function TaskNode({ data }: NodeProps<TaskNodeData>) {
  const [showReasoning, setShowReasoning] = useState(false)

  const statusLabels = {
    planned: 'Planned',
    in_progress: 'In Progress',
    completed: 'Completed',
  }

  return (
    <>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-night-blue border-2 rounded-lg p-4 min-w-[250px] shadow-lg"
        style={{ borderColor: data.statusColor }}
      >
        <Handle type="target" position={Position.Top} />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">{data.title}</h3>
            <span
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: `${data.statusColor}20`,
                color: data.statusColor,
              }}
            >
              {statusLabels[data.status]}
            </span>
          </div>

          <p className="text-gray-400 text-xs line-clamp-2">
            {data.description}
          </p>

          <div className="flex items-center justify-between mt-3">
            <span className="text-blue-400 text-xs">Agent: {data.agent}</span>
            {data.reasoning && (
              <button
                onClick={() => setShowReasoning(true)}
                className="text-blue-400 hover:text-blue-300 text-xs underline"
              >
                View Reasoning
              </button>
            )}
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} />
      </motion.div>

      {showReasoning && data.reasoning && (
        <ReasoningModal
          reasoning={data.reasoning}
          onClose={() => setShowReasoning(false)}
        />
      )}
    </>
  )
}
