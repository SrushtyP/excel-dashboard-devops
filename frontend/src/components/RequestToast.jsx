import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

const STATE_ICON = {
  running:   '▶',
  snoozed:   '⏸',
  destroyed: '✕',
}

const STATE_COLOR = {
  running:   { bg: '#F0FBF2', border: '#86EFAC', color: '#166534', dot: '#1EA03C' },
  snoozed:   { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', dot: '#D97706' },
  destroyed: { bg: '#FFF1F2', border: '#FECDD3', color: '#9F1239', dot: '#BE0032' },
}

// Toast shown after a state-change request is submitted
// Tells user the request is logged and admin will action it
// Auto-dismisses after 6s
export default function RequestToast({ msg, targetState, vmAlias, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 6000)
    return () => clearTimeout(t)
  }, [])

  const sc = STATE_COLOR[targetState] || STATE_COLOR.running
  const icon = STATE_ICON[targetState] || '⚙️'

  return (
    <motion.div
      initial={{ opacity: 0, y: 48, scale: 0.93 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: 24, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-6 left-1/2 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl"
      style={{
        transform: 'translateX(-50%)',
        background: '#fff',
        border: '1.5px solid #BDD0EA',
        boxShadow: '0 8px 32px rgba(26,71,128,0.15)',
        maxWidth: 440,
        width: 'calc(100% - 32px)',
      }}
    >
      {/* State icon badge */}
      <motion.div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-[14px] font-black flex-shrink-0 mt-0.5"
        style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, color: sc.color }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {icon}
      </motion.div>

      <div className="flex-1 min-w-0">
        {/* Title */}
        <p className="text-[13px] font-black text-gray-900">
          Request submitted ✓
        </p>

        {/* VM + state */}
        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
          <span className="font-semibold text-gray-700">{vmAlias}</span>
          {' → '}
          <span className="font-bold" style={{ color: sc.color }}>{targetState}</span>
          {' has been logged for review.'}
        </p>

        {/* Admin action message */}
        <div className="mt-2 p-2 rounded-lg flex items-start gap-2"
          style={{ background: '#F0F4FB', border: '1px solid #BDD0EA' }}>
          <span className="text-[13px] flex-shrink-0">👤</span>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            <span className="font-bold text-gray-800">No automatic pipeline.</span>
            {' '}The admin will review this request and trigger the deployment manually via a git push.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mt-2 flex items-center gap-1.5">
          <motion.span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: sc.dot }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[10px] font-semibold" style={{ color: '#1A4780' }}>
            Waiting for admin to action…
          </span>
        </div>
      </div>

      <button
        onClick={onDone}
        className="text-gray-400 hover:text-gray-700 text-sm flex-shrink-0 transition-colors ml-1 mt-0.5"
      >✕</button>
    </motion.div>
  )
}