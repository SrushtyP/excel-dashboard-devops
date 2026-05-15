import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

// Toast shown after state-change request is accepted
// Auto-dismisses after 4s
export default function RequestToast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.32, ease: [0.22,1,0.36,1] }}
      className="fixed bottom-6 left-1/2 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl"
      style={{ transform: 'translateX(-50%)', background: '#fff', border: '1.5px solid #BDD0EA',
               boxShadow: '0 8px 32px rgba(26,71,128,0.15)', maxWidth: 420, width: 'calc(100% - 32px)' }}
    >
      {/* Spinning gear → means pipeline kicked off */}
      <motion.span
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        className="text-xl flex-shrink-0 mt-0.5"
      >⚙️</motion.span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-gray-900">Request accepted</p>
        <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">{msg}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <motion.span
            className="w-2 h-2 rounded-full bg-nouryon-blue flex-shrink-0"
            animate={{ opacity: [1,0.3,1] }} transition={{ duration: 0.8, repeat: Infinity }}
          />
          <span className="text-[11px] text-nouryon-blue font-semibold">Waiting for pipeline to start…</span>
        </div>
      </div>
      <button onClick={onDone} className="text-gray-400 hover:text-gray-700 text-sm flex-shrink-0 transition-colors">✕</button>
    </motion.div>
  )
}
