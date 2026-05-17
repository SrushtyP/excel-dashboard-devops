import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STATE_CFG = {
  running:   { icon:'▶', label:'Start',    bg:'#F0FBF2', color:'#166534', border:'#86EFAC' },
  snoozed:   { icon:'⏸', label:'Snooze',   bg:'#FFFBEB', color:'#92400E', border:'#FCD34D' },
  destroyed: { icon:'✕', label:'Destroy',  bg:'#FFF1F2', color:'#9F1239', border:'#FECDD3' },
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)  return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

function RequestCard({ req, index, onAction }) {
  const [acting, setActing]   = useState(false)
  const [done, setDone]       = useState(req.status === 'actioned')
  const [result, setResult]   = useState(null)
  const cfg = STATE_CFG[req.new_state] || STATE_CFG.running

  async function handleAction() {
    setActing(true)
    try {
      const res = await fetch('/api/admin/action-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vm_id: req.vm_id, new_state: req.new_state, request_index: index }),
      })
      const data = await res.json()
      if (data.ok) {
        setResult({ ok: true, msg: 'Request actioned — inventory.yml updated and pushed. Pipeline triggered.' })
        setDone(true)
        onAction()
      } else {
        setResult({ ok: false, msg: data.error || 'Action failed' })
      }
    } catch (e) {
      setResult({ ok: false, msg: `Network error: ${e.message}` })
    }
    setActing(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-xl border p-4 transition-all ${done ? 'opacity-50' : ''}`}
      style={{ background: done ? '#F9FAFB' : '#fff', borderColor: done ? '#E5E7EB' : cfg.border }}>

      <div className="flex items-start gap-3">
        {/* State icon */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[14px] font-black"
          style={{ background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}` }}>
          {cfg.icon}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold text-gray-900">{req.vm_id}</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
              → {cfg.label}
            </span>
            {done && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                ✓ actioned
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
            <span>Requested {timeAgo(req.requested_at)}</span>
            <span>·</span>
            <span>{new Date(req.requested_at).toLocaleString()}</span>
          </div>
          {result && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-1.5 text-[10px] font-semibold"
              style={{ color: result.ok ? '#166534' : '#9F1239' }}>
              {result.ok ? '✓' : '✕'} {result.msg}
            </motion.p>
          )}
        </div>

        {/* Action button */}
        {!done && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleAction} disabled={acting}
            className="flex-shrink-0 px-3.5 py-2 rounded-lg text-[11px] font-black text-white transition-opacity disabled:opacity-60"
            style={{ background: acting ? '#9CA3AF' : '#1A4780' }}>
            {acting ? (
              <span className="flex items-center gap-1.5">
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="inline-block w-3 h-3 border-2 border-white/30 rounded-full" style={{ borderTopColor: '#fff' }} />
                Pushing…
              </span>
            ) : '🚀 Trigger Pipeline'}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

export default function AdminView() {
  const [requests, setRequests] = useState([])
  const [loading, setLoad]      = useState(true)
  const [filter, setFilter]     = useState('pending') // 'pending' | 'all'

  async function load() {
    try {
      const res  = await fetch('/api/vms/pending-requests')
      const data = await res.json()
      setRequests(Array.isArray(data) ? data : [])
    } catch { setRequests([]) }
    setLoad(false)
  }

  useEffect(() => { load() }, [])

  const pending  = requests.filter(r => r.status !== 'actioned')
  const shown    = filter === 'pending' ? pending : requests
  const hasAny   = requests.length > 0

  return (
    <div className="px-6 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">Admin — Pending Requests</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Users have requested VM state changes. Review and trigger the pipeline.
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={load}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold text-white"
          style={{ background: '#1A4780' }}>
          ↻ Refresh
        </motion.button>
      </div>

      {/* How it works */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
        <p className="text-[11px] font-black text-blue-700 mb-1.5">How this works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-blue-600">
          {[
            ['1. User requests', 'When a user clicks Snooze/Destroy/Start on a VM, the request is logged here instead of auto-triggering.'],
            ['2. Admin reviews', 'You (admin) see the request here with the VM, state, and timestamp. Review and decide to action it.'],
            ['3. Pipeline triggered', 'Click "Trigger Pipeline" — the backend updates inventory.yml and pushes to Git, starting the GitHub Actions pipeline.'],
          ].map(([title, desc]) => (
            <div key={title} className="p-2.5 rounded-lg bg-white/70 border border-blue-100">
              <p className="font-black mb-1">{title}</p>
              <p className="leading-relaxed opacity-80">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      {hasAny && (
        <div className="flex gap-2">
          {[['pending', `Pending (${pending.length})`], ['all', `All (${requests.length})`]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${filter===val
                ? 'bg-nouryon-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Request list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <motion.div className="w-6 h-6 rounded-full border-2 border-gray-200" style={{ borderTopColor: '#1A4780' }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        </div>
      ) : shown.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">{pending.length === 0 && requests.length > 0 ? '✅' : '📭'}</span>
          <p className="text-[14px] font-bold text-gray-700">
            {pending.length === 0 && requests.length > 0 ? 'All requests actioned' : 'No pending requests'}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {pending.length === 0 && requests.length > 0
              ? 'Nothing left to action. Switch to "All" to see history.'
              : 'When users request VM state changes, they will appear here for your review.'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {shown.map((req, i) => (
              <RequestCard key={`${req.vm_id}-${req.requested_at}`} req={req} index={i} onAction={load} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Sidebar reminder */}
      {pending.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-3 rounded-xl text-[10px] text-center"
          style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E' }}>
          💡 The sidebar badge shows the pending count at all times — you'll always know when action is needed.
        </motion.div>
      )}
    </div>
  )
}