import { motion } from 'framer-motion'
import { STATE_META } from '../data/inventory'

export function StatusDot({ state, size = 10 }) {
  const meta = STATE_META[state] || STATE_META.offline
  const s = size

  return (
    <span className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: s, height: s }}>
      {(state === 'running' || state === 'snoozed') && (
        <motion.span
          className="absolute rounded-full"
          style={{ width: s, height: s, background: meta.color }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{
            duration: state === 'snoozed' ? 2.5 : 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      <span
        className="rounded-full"
        style={{ width: s * 0.7, height: s * 0.7, background: meta.color, display: 'block', position: 'relative' }}
      />
    </span>
  )
}

export function StateBadge({ state }) {
  const meta = STATE_META[state] || STATE_META.offline
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.tailwind}`}
    >
      <StatusDot state={state} size={7} />
      {meta.label}
    </span>
  )
}
