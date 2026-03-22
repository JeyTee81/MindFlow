import { useState } from 'react'
import { motion } from 'framer-motion'
import { Handle, Position, NodeProps } from 'reactflow'
import { Task, useMissionStore } from '../store/useMissionStore'

interface TaskNodeData extends Task {
  statusColor: string
}

export default function TaskNode({ data }: NodeProps<TaskNodeData>) {
  const [validating, setValidating] = useState(false)
  const setTaskUserValidated = useMissionStore((s) => s.setTaskUserValidated)
  const openTaskDetail = useMissionStore((s) => s.openTaskDetail)

  const statusLabels: Record<string, string> = {
    planned: 'Planifiée',
    in_progress: 'En cours',
    completed: 'Terminée',
  }
  const statusLabel = statusLabels[data.status] ?? String(data.status ?? '—')

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-night-blue border-2 rounded-xl px-3 py-2.5 shadow-lg w-[min(100%,260px)] max-w-[260px]"
      style={{ borderColor: data.statusColor }}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-white font-semibold text-xs leading-snug line-clamp-2 min-w-0 flex-1">
            {data.title}
          </h3>
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${data.statusColor}22`,
              color: data.statusColor,
            }}
          >
            {statusLabel}
          </span>
        </div>

        <p className="text-gray-500 text-[11px] line-clamp-2 leading-snug">
          {data.description || '—'}
        </p>

        <button
          type="button"
          onClick={() => openTaskDetail(data.id)}
          className="w-full rounded-lg bg-blue-600/25 py-1.5 text-center text-[11px] font-medium text-blue-100 ring-1 ring-blue-500/40 transition hover:bg-blue-600/40"
        >
          Ouvrir les détails & l’aide
        </button>

        <label className="flex items-center gap-2 cursor-pointer select-none border-t border-white/5 pt-2">
          <input
            type="checkbox"
            checked={Boolean(data.userValidated)}
            disabled={validating}
            onChange={async (e) => {
              e.stopPropagation()
              setValidating(true)
              try {
                await setTaskUserValidated(data.id, e.target.checked)
              } finally {
                setValidating(false)
              }
            }}
            className="rounded border-blue-500/50 text-blue-600 focus:ring-blue-500 shrink-0"
          />
          <span className="text-gray-400 text-[10px] leading-tight">Fait (perso)</span>
        </label>

        <p className="text-blue-400/90 text-[10px] truncate">Agent : {data.agent}</p>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </motion.div>
  )
}
