import { motion, AnimatePresence } from 'framer-motion'

interface ReasoningModalProps {
  reasoning: string
  onClose: () => void
}

export default function ReasoningModal({
  reasoning,
  onClose,
}: ReasoningModalProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-night-blue border border-blue-500/30 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-semibold">AI Reasoning</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {reasoning.split('\n').map((line, index) => (
              <motion.p
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-gray-300 leading-relaxed"
              >
                {line || '\u00A0'}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
