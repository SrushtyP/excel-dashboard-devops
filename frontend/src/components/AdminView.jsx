import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STATE_CFG = {
  running:   { icon: '▶', label: 'Start',   bg: '#F0FBF2', color: '#166534', border: '#86EFAC', dot: '#1EA03C' },
  snoozed:   { icon: '⏸', label: 'Snooze',  bg: '#FFFBEB', color: '#92400E', border: '#FCD34D', dot: '#D97706' },
  destroyed: { icon: '✕', label: 'Destroy', bg: '#FFF1F2', color: '#9F1239', border: '#FECDD3', dot: '#BE0032' },
}

const STATUS_CFG = {
  pending:    { label: 'Open',        bg: '#EFF6FF', color: '#1A4780', border: '#BFDBFE' },
  accepted:   { label: 'In Progress', bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' },
  actioned:   { label: 'Closed',      bg: '#F0FBF2', color: '#166534', border: '#86EFAC' },
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
//sample text
// ── Steps indicator ────────────────────────────────────────────────────────────
function StepTrail({ status }) {
  const steps = [
    { key: 'pending',  label: 'Requested' },
    { key: 'accepted', label: 'Accepted'  },
    { key: 'actioned', label: 'Closed'    },
  ]
  const idx = steps.findIndex(s => s.key === status)

  return (
    <div className="flex items-center gap-0 mt-3">
      {steps.map((step, i) => {
        const done    = i <= idx
        const current = i === idx
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all
                ${done ? 'bg-nouryon-blue text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                {done ? (i < idx ? '✓' : '●') : i + 1}
              </div>
              <span className={`text-[8px] mt-0.5 font-semibold whitespace-nowrap
                ${current ? 'text-nouryon-blue' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-[2px] mb-3 mx-0.5 rounded-full transition-all
                ${i < idx ? 'bg-nouryon-blue' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Single request card ────────────────────────────────────────────────────────
function RequestCard({ req, index, onUpdate }) {
  const [acting,  setActing]  = useState(false)
  const [note,    setNote]    = useState('')
  const [showNote,setShowNote]= useState(false)

  const cfg    = STATE_CFG[req.new_state]  || STATE_CFG.running
  const stCfg  = STATUS_CFG[req.status]   || STATUS_CFG.pending
  const isClosed   = req.status === 'actioned'
  const isAccepted = req.status === 'accepted'
  const isPending  = req.status === 'pending'

  async function updateStatus(newStatus) {
    setActing(true)
    try {
      const res = await fetch('/api/admin/update-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vm_id:         req.vm_id,
          new_state:     req.new_state,
          requested_at:  req.requested_at,
          status:        newStatus,
          admin_note:    note || undefined,
        }),
      })
      const data = await res.json()
      if (data.ok) onUpdate()
      else alert(data.error || 'Failed to update')
    } catch (e) {
      alert(`Network error: ${e.message}`)
    }
    setActing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border bg-white overflow-hidden"
      style={{ borderColor: isClosed ? '#E5E7EB' : cfg.border,
               opacity: isClosed ? 0.75 : 1 }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b"
        style={{ background: isClosed ? '#F9FAFB' : cfg.bg,
                 borderColor: isClosed ? '#F3F4F6' : cfg.border }}>
        <div className="flex items-center gap-2">
          <span className="text-[13px]" style={{ color: cfg.color }}>{cfg.icon}</span>
          <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: cfg.color }}>
            {req.vm_id}
          </span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: stCfg.bg, color: stCfg.color, border: `1px solid ${stCfg.border}` }}>
            {stCfg.label}
          </span>
        </div>
        <span className="text-[10px] text-gray-400">{timeAgo(req.requested_at)}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Request detail */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] text-gray-500">Requested state:</span>
              <span className="text-[12px] font-bold px-2 py-0.5 rounded-md"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                {cfg.icon} {cfg.label}
              </span>
            </div>

            <p className="text-[10px] text-gray-400">
              {new Date(req.requested_at).toLocaleString()}
              {req.actioned_at && (
                <span className="ml-2 text-green-600">· Closed {timeAgo(req.actioned_at)}</span>
              )}
            </p>

            {/* Admin note if exists */}
            {req.admin_note && (
              <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Admin note</p>
                <p className="text-[11px] text-gray-600">{req.admin_note}</p>
              </div>
            )}

            {/* Step trail */}
            <StepTrail status={req.status} />
          </div>

          {/* Actions */}
          {!isClosed && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              {isPending && (
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => updateStatus('accepted')}
                  disabled={acting}
                  className="px-4 py-2 rounded-lg text-[11px] font-black text-white disabled:opacity-60"
                  style={{ background: '#1A4780' }}>
                  {acting ? '…' : '✓ Accept'}
                </motion.button>
              )}

              {isAccepted && (
                <>
                  <button
                    onClick={() => setShowNote(v => !v)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                    {showNote ? '↑ Hide note' : '+ Add note'}
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => updateStatus('actioned')}
                    disabled={acting}
                    className="px-4 py-2 rounded-lg text-[11px] font-black text-white disabled:opacity-60"
                    style={{ background: '#166534' }}>
                    {acting ? '…' : '✓ Close Request'}
                  </motion.button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Note input */}
        <AnimatePresence>
          {showNote && isAccepted && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Updated inventory.yml, pushed to main branch at 14:32 IST..."
                rows={2}
                className="w-full text-[11px] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 text-gray-700 placeholder-gray-300"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Main AdminView ─────────────────────────────────────────────────────────────
export default function AdminView() {
  const [requests, setRequests] = useState([])
  const [loading,  setLoad]     = useState(true)
  const [tab,      setTab]      = useState('open') // 'open' | 'closed'

  async function load() {
    setLoad(true)
    try {
      const res  = await fetch('/api/vms/pending-requests')
      const data = await res.json()
      setRequests(Array.isArray(data) ? data : [])
    } catch {
      setRequests([])
    }
    setLoad(false)
  }

  useEffect(() => { load() }, [])

  const open   = requests.filter(r => r.status !== 'actioned')
  const closed = requests.filter(r => r.status === 'actioned')
  const shown  = tab === 'open' ? open : closed

  return (
    <div className="px-6 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">Admin — VM Requests</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Review user requests · accept · make changes in Git · close
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={load}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold text-white"
          style={{ background: '#1A4780' }}>
          ↻ Refresh
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-0">
        {[
          ['open',   `Open`,   open.length],
          ['closed', `Closed`, closed.length],
        ].map(([val, label, count]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`relative px-4 py-2.5 text-[12px] font-semibold transition-colors flex items-center gap-1.5
              ${tab === val ? 'text-nouryon-blue' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
            {count > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full
                ${tab === val
                  ? val === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            )}
            {tab === val && (
              <motion.div layoutId="adminTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-nouryon-blue rounded-t"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <motion.div
            className="w-6 h-6 rounded-full border-2 border-gray-200"
            style={{ borderTopColor: '#1A4780' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        </div>
      ) : shown.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">
            {tab === 'open' ? '📭' : '✅'}
          </span>
          <p className="text-[14px] font-bold text-gray-700">
            {tab === 'open' ? 'No open requests' : 'No closed requests yet'}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {tab === 'open'
              ? 'When users request VM state changes, they will appear here.'
              : 'Closed requests will appear here after you action them.'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {shown.map((req, i) => (
              <RequestCard
                key={`${req.vm_id}-${req.requested_at}`}
                req={req}
                index={i}
                onUpdate={load}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pending badge reminder */}
      {open.length > 0 && tab === 'open' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-3 rounded-xl text-[10px] text-center"
          style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E' }}>
          💡 {open.length} open request{open.length > 1 ? 's' : ''} waiting —
          accept, make the Git change, then close to keep the queue clean.
        </motion.div>
      )}
    </div>
  )
}