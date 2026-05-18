import { motion, AnimatePresence } from 'framer-motion'

const TRANSITIONS = {
  running:   [
    { to:'snoozed',   label:'⏸ Snooze VM',     bg:'#fffbeb', color:'#92400e', border:'#fcd34d' },
    { to:'destroyed', label:'✕ Destroy VM',     bg:'#fef2f2', color:'#991b1b', border:'#fca5a5' },
  ],
  snoozed:   [
    { to:'running',   label:'▶ Start VM',       bg:'#f0fdf4', color:'#166534', border:'#86efac' },
    { to:'destroyed', label:'✕ Destroy VM',     bg:'#fef2f2', color:'#991b1b', border:'#fca5a5' },
  ],
  destroyed: [
    { to:'running',   label:'⚡ Reprovision VM', bg:'#eff6ff', color:'#1d4ed8', border:'#93c5fd' },
  ],
  offline: [],
}

const DOT_COLOR = { running:'#34c47c', snoozed:'#e8a020', destroyed:'#c8d4e4', offline:'#e5e7eb' }
const STATE_LABEL = { running:'online', snoozed:'snoozed', destroyed:'offline', offline:'—' }

const usd = v => `$${(+(v||0)).toFixed(2)}`

export default function VMActionPanel({ selectedVm, onRequestStateChange, onClear }) {
  const actions = selectedVm ? (TRANSITIONS[selectedVm.state] || []) : []
  const optUsd  = selectedVm ? (selectedVm.optimisedMonthlyUsd ?? (selectedVm.optimisedMonthlyInr||0)/84) : 0

  return (
    <div className="rounded-xl border bg-white mb-4 overflow-hidden transition-all"
      style={{ borderColor: selectedVm ? '#bdd4f0' : '#e5e7eb', minHeight:56 }}>

      <AnimatePresence mode="wait">
        {!selectedVm ? (
          /* Empty state */
          <motion.div key="empty"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="flex items-center justify-center py-4">
            <p className="text-[10px] font-mono tracking-wider" style={{ color:'#94a3b8' }}>
              select a vm to see available actions
            </p>
          </motion.div>
        ) : (
          /* Selected VM */
          <motion.div key={selectedVm.id}
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            transition={{ duration:0.2 }}>

            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor:'#e8f2ff', background:'#f8fbff' }}>
              <div className="flex items-center gap-2.5">
                <motion.div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: DOT_COLOR[selectedVm.state] }}
                  animate={{ scale:[1,1.4,1] }}
                  transition={{ duration: selectedVm.state==='running'?1.2:3, repeat:Infinity }} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono" style={{ color:'#1a4780' }}>
                      {selectedVm.id}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{
                        background: selectedVm.state==='running'?'#dcfce7':selectedVm.state==='snoozed'?'#fef3c7':'#f1f5f9',
                        color: selectedVm.state==='running'?'#166534':selectedVm.state==='snoozed'?'#92400e':'#64748b',
                      }}>
                      {STATE_LABEL[selectedVm.state]}
                    </span>
                    {selectedVm.priority==='critical' && (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{ background:'#fef3c7', color:'#92400e', border:'1px solid #fcd34d' }}>
                        crit
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] mt-0.5 font-mono" style={{ color:'#8ab0d4' }}>
                    {selectedVm.alias} · {usd(optUsd)}/mo · {selectedVm.environment}
                  </div>
                </div>
              </div>
              <button onClick={onClear}
                className="text-[9px] font-mono px-2 py-1 rounded transition-colors"
                style={{ border:'1px solid #d4e5f7', color:'#8ab0d4', background:'transparent' }}
                onMouseEnter={e=>{e.target.style.borderColor='#4a7ab5';e.target.style.color='#1a4780'}}
                onMouseLeave={e=>{e.target.style.borderColor='#d4e5f7';e.target.style.color='#8ab0d4'}}>
                [ deselect ]
              </button>
            </div>

            {/* actions */}
            <div className="flex items-center gap-2.5 px-4 py-3 flex-wrap">
              <span className="text-[9px] font-mono tracking-wider flex-shrink-0" style={{ color:'#8ab0d4' }}>
                change state →
              </span>
              {actions.map(a => (
                <motion.button key={a.to}
                  whileHover={{ scale:1.03, y:-1 }} whileTap={{ scale:0.97 }}
                  onClick={() => onRequestStateChange(selectedVm, a.to)}
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{ background:a.bg, color:a.color, border:`1px solid ${a.border}`, fontFamily:'var(--font-mono)' }}>
                  {a.label}
                </motion.button>
              ))}
              {actions.length === 0 && (
                <span className="text-[10px]" style={{ color:'#94a3b8' }}>
                  no transitions available for {selectedVm.state} state
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}