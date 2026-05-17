import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StateBadge } from './StatusDot'
import { STATE_META } from '../data/inventory'

const ACTIONS = {
  running:   [{ to:'snoozed', label:'⏸ Snooze', s:'#FFFBEB', c:'#92400E', b:'#FCD34D' }, { to:'destroyed', label:'✕ Destroy', s:'#FFF1F2', c:'#9F1239', b:'#FECDD3' }],
  snoozed:   [{ to:'running', label:'▶ Start',   s:'#F0FBF2', c:'#166534', b:'#86EFAC' }, { to:'destroyed', label:'✕ Destroy', s:'#FFF1F2', c:'#9F1239', b:'#FECDD3' }],
  destroyed: [{ to:'running', label:'▶ Reprovision', s:'#F0FBF2', c:'#166534', b:'#86EFAC' }],
  offline:   [],
}

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div key={i} className="absolute w-1 h-1 rounded-full"
          style={{ background: '#1EA03C', left: `${18 + i * 15}%`, top: '65%' }}
          animate={{ y: [0, -20, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: 1.8 + i * 0.3, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }} />
      ))}
    </div>
  )
}

function SleepZs() {
  return (
    <div className="absolute right-1 top-0 pointer-events-none" style={{ width: 22, height: 26 }}>
      {['Z', 'z', 'z'].map((z, i) => (
        <motion.span key={i} className="absolute font-black select-none"
          style={{ fontSize: 6 + i * 2, color: '#F59E0B', right: i * 3, top: i * 5, opacity: 0 }}
          animate={{ y: [-3, -14], opacity: [0, 0.9, 0], scale: [0.7, 1.1, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.55, ease: 'easeOut' }}>
          {z}
        </motion.span>
      ))}
    </div>
  )
}

function Debris() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div key={i} className="absolute w-0.5 h-0.5 rounded-sm"
          style={{ background: '#BE0032', left: `${22 + i * 15}%`, top: '40%' }}
          animate={{ y: [0, 10], x: [i % 2 === 0 ? -3 : 3], opacity: [0.7, 0], rotate: [0, 45] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.35, ease: 'easeIn' }} />
      ))}
    </div>
  )
}

function VMIcon({ state, meta }) {
  if (state === 'running') return (
    <motion.div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0d6e26,#1EA03C)', border: '1px solid #86EFAC' }}
      animate={{ boxShadow: ['0 0 0px #1EA03C33', '0 0 10px #1EA03C66', '0 0 0px #1EA03C33'] }}
      transition={{ duration: 2, repeat: Infinity }}>
      <motion.div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.15) 0%,transparent 55%)' }} />
      <span className="relative z-10 text-white text-[14px]">▶</span>
      <Particles />
    </motion.div>
  )
  if (state === 'snoozed') return (
    <motion.div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-visible"
      style={{ background: 'linear-gradient(135deg,#b45309,#D97706)', border: '1px solid #FCD34D' }}
      animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
      <span className="text-white text-[14px]">⏸</span>
      <SleepZs />
    </motion.div>
  )
  if (state === 'destroyed') return (
    <motion.div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#7f0020,#BE0032)', border: '1px solid #FECDD3' }}>
      <motion.div className="absolute inset-0"
        style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.12) 3px,rgba(0,0,0,0.12) 4px)' }} />
      <span className="relative z-10 text-white text-[12px] font-black">✕</span>
      <Debris />
    </motion.div>
  )
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
      <span style={{ color: meta.color }}>{meta.icon}</span>
    </div>
  )
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0 gap-2">
      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide flex-shrink-0">{label}</span>
      <span className="text-[10px] font-semibold text-right truncate" style={{ color: accent || '#374151', maxWidth: 110 }}>{value}</span>
    </div>
  )
}

function MeterBar({ label, pct, color, delay }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-8 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <motion.div className="h-1.5 rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <span className="text-[10px] text-gray-500 w-6 text-right flex-shrink-0">{pct}%</span>
    </div>
  )
}

export default function VMCard({ vm, index, onRequestStateChange }) {
  const [open, setOpen] = useState(false)
  const meta    = STATE_META[vm.state] || STATE_META.offline
  const dummy   = vm.state === 'offline'
  const actions = ACTIONS[vm.state] || []
  const cpuPct  = vm.state === 'running' ? 42 : vm.state === 'snoozed' ? 8 : 0
  const memPct  = vm.state === 'running' ? 61 : vm.state === 'snoozed' ? 12 : 0
  const diskPct = vm.state !== 'offline' ? 38 : 0

  const glowColor = vm.state === 'running' ? '#1EA03C' : vm.state === 'snoozed' ? '#F59E0B' : vm.state === 'destroyed' ? '#BE0032' : 'transparent'
  const cardBg = vm.state === 'running' ? 'linear-gradient(180deg,#f8fffe,#f0fbf2)'
    : vm.state === 'snoozed'   ? 'linear-gradient(180deg,#fffdf5,#fffbeb)'
    : vm.state === 'destroyed' ? 'linear-gradient(180deg,#fffbfb,#fff1f2)'
    : 'linear-gradient(180deg,#F9FAFB,#F3F4F6)'

  return (
    <motion.div layout
      initial={{ opacity: 0, x: -10, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`rack-unit state-${vm.state} mb-2 relative overflow-visible`}
      style={{ background: cardBg, boxShadow: open ? `0 4px 16px ${glowColor}22, 0 1px 3px rgba(0,0,0,0.05)` : `0 1px 3px rgba(0,0,0,0.04)`, transition: 'box-shadow 0.3s ease' }}>

      <motion.div className="absolute top-0 left-8 right-8 h-px rounded-full"
        style={{ background: `linear-gradient(90deg,transparent,${glowColor}55,transparent)` }}
        animate={vm.state === 'running' ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.25 }}
        transition={{ duration: 2.5, repeat: Infinity }} />

      <motion.button
        onClick={() => !dummy && setOpen(o => !o)} disabled={dummy}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 text-left ${dummy ? 'cursor-default opacity-35' : 'cursor-pointer'}`}>
        <div className="screw" />
        <VMIcon state={vm.state} meta={meta} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-bold text-gray-900 truncate">{vm.alias}</span>
            {vm.priority === 'critical' && (
              <span className="text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded flex-shrink-0"
                style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>CRIT</span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 truncate mt-0.5 leading-tight">{vm.purpose}</div>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
          <div className="led-row">
            {Array.from({ length: 10 }).map((_, i) => {
              const on  = vm.state === 'running' ? 9 : vm.state === 'snoozed' ? 4 : vm.state === 'destroyed' ? 2 : 0
              const cls = vm.state === 'running' ? 'on-green' : vm.state === 'snoozed' ? 'on-amber' : vm.state === 'destroyed' ? 'on-red' : ''
              const active = i < on
              return (
                <motion.div key={i} className={`led ${active ? cls : ''}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, opacity: active && vm.state === 'snoozed' ? [1, 0.3, 1] : 1 }}
                  transition={{ scale: { delay: i * 0.025, type: 'spring', stiffness: 500 }, opacity: active && vm.state === 'snoozed' ? { duration: 2, repeat: Infinity, delay: i * 0.15 } : {} }} />
              )
            })}
          </div>
          <StateBadge state={vm.state} />
        </div>

        {!dummy && (
          <div className="flex-shrink-0 text-right ml-1 min-w-[52px]">
            <div className="text-[8px] text-gray-400 uppercase tracking-wide leading-tight">opt/mo</div>
            <div className="text-[12px] font-black leading-tight" style={{ color: '#1A4780' }}>
              ₹{(vm.optimisedMonthlyInr||0).toLocaleString()}
            </div>
            {vm.savingsInr > 0 && (
              <div className="text-[8px] font-bold leading-tight" style={{ color: '#1EA03C' }}>
                -₹{vm.savingsInr.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {!dummy && (
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
            className="text-gray-400 ml-1 flex-shrink-0 text-[11px]">▾</motion.div>
        )}
        <div className="screw" />
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}>

            <div className="px-3 pb-4 pt-2 border-t border-gray-100 bg-white/80">

              {/* State banner */}
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 relative overflow-hidden"
                style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                {vm.state === 'running' && (
                  <motion.div className="absolute inset-0 opacity-15"
                    style={{ background: 'linear-gradient(90deg,transparent,#1EA03C33,transparent)' }}
                    animate={{ x: ['-100%', '100%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                )}
                <span className="text-[13px] relative z-10 flex-shrink-0">{meta.icon}</span>
                <div className="relative z-10 min-w-0 flex-1">
                  <span className="text-[11px] font-bold" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="text-[11px] text-gray-600"> — {meta.labelLong}</span>
                  {vm.snooze && (
                    <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                      🌙 {vm.snooze.sleep} – {vm.snooze.wake} · {vm.snooze.days}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Specs + Cost grid */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }} className="mb-3">
                <div className="grid grid-cols-2 gap-x-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Specs</p>
                    <InfoRow label="CPU"  value={`${vm.cpu} vCPU`} />
                    <InfoRow label="RAM"  value={`${vm.memGb} GB`} />
                    <InfoRow label="Disk" value={`${vm.diskGb} GB`} />
                    <InfoRow label="Env"  value={vm.environment} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Cost</p>
                    <InfoRow label="Hrly"    value={`₹${vm.costHrInr}`} accent="#1A4780" />
                    <InfoRow label="Full/mo" value={`₹${(vm.monthlyInr||0).toLocaleString()}`} accent="#1A4780" />
                    <InfoRow label="Opt/mo"  value={`₹${(vm.optimisedMonthlyInr||0).toLocaleString()}`} accent="#166534" />
                    <InfoRow label="Saves"   value={`₹${(vm.savingsInr||0).toLocaleString()}`} accent="#1EA03C" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100 gap-2">
                  <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wide flex-shrink-0">Size</span>
                  <span className="text-[9px] font-semibold text-gray-600 text-right truncate">{vm.size}</span>
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 truncate">{vm.contact} · {vm.unit}</div>
              </motion.div>

              {/* Utilisation */}
              {(vm.state === 'running' || vm.state === 'snoozed') && (
                <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Utilisation</p>
                  <div className="space-y-1.5">
                    <MeterBar label="CPU"  pct={cpuPct}  color="#1A4780" delay={0.12} />
                    <MeterBar label="RAM"  pct={memPct}  color="#00ABA9" delay={0.15} />
                    <MeterBar label="Disk" pct={diskPct} color="#1EA03C" delay={0.18} />
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              {!dummy && actions.length > 0 && onRequestStateChange && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.13 }}
                  className="mb-3 pt-2.5 border-t border-gray-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Change state</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {actions.map(a => (
                      <motion.button key={a.to}
                        whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
                        onClick={() => onRequestStateChange(vm, a.to)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide shadow-sm"
                        style={{ background: a.s, color: a.c, border: `1.5px solid ${a.b}` }}>
                        {a.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Business need */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }}
                className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-[10px] text-gray-500 leading-relaxed">{vm.businessNeed}</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}