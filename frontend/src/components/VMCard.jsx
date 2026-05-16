import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StateBadge } from './StatusDot'
import { STATE_META } from '../data/inventory'

const ACTIONS = {
  running:   [{ to:'snoozed', label:'⏸ Snooze', s:'#FFFBEB', c:'#92400E', b:'#FCD34D' }, { to:'destroyed', label:'✕ Destroy', s:'#FFF1F2', c:'#9F1239', b:'#FECDD3' }],
  snoozed:   [{ to:'running', label:'▶ Start',   s:'#F0FBF2', c:'#166534', b:'#86EFAC' }, { to:'destroyed', label:'✕ Destroy', s:'#FFF1F2', c:'#9F1239', b:'#FECDD3' }],
  destroyed: [{ to:'running', label:'▶ Reprovision', s:'#F0FBF2', c:'#166534', b:'#86EFAC' }],
  offline:   [],
}

// Animated particle effect for running state
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ background: '#1EA03C', left: `${15 + i * 14}%`, top: '60%' }}
          animate={{ y: [-0, -24, -0], opacity: [0, 0.7, 0] }}
          transition={{ duration: 1.8 + i * 0.3, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

// Floating Z's for snoozed state
function SleepZs() {
  return (
    <div className="absolute right-2 top-1 overflow-hidden pointer-events-none" style={{ width: 24, height: 28 }}>
      {['Z', 'z', 'z'].map((z, i) => (
        <motion.span
          key={i}
          className="absolute font-black select-none"
          style={{ fontSize: 7 + i * 2, color: '#F59E0B', right: i * 4, top: i * 6, opacity: 0 }}
          animate={{ y: [-4, -16], opacity: [0, 0.85, 0], scale: [0.7, 1.1, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.55, ease: 'easeOut' }}
        >{z}</motion.span>
      ))}
    </div>
  )
}

// Crumbling debris for destroyed state
function Debris() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-sm"
          style={{ background: '#BE0032', left: `${20 + i * 13}%`, top: '40%' }}
          animate={{ y: [0, 10], x: [(i % 2 === 0 ? -3 : 3)], opacity: [0.7, 0], rotate: [0, 45] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.35, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

function MeterBar({ label, pct, color, delay }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-500 w-12">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <motion.div className="h-1.5 rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <span className="text-[11px] text-gray-600 w-7 text-right">{pct}%</span>
    </div>
  )
}

// VM icon with state-specific animated visual
function VMIcon({ state, meta }) {
  if (state === 'running') {
    return (
      <motion.div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[15px] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0d6e26,#1EA03C)', border: '1px solid #86EFAC', boxShadow: '0 0 0 #1EA03C33' }}
        animate={{ boxShadow: ['0 0 0px #1EA03C33', '0 0 12px #1EA03C77', '0 0 0px #1EA03C33'] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <motion.div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 60%)' }} />
        <span className="relative z-10 text-white">▶</span>
        <Particles />
      </motion.div>
    )
  }
  if (state === 'snoozed') {
    return (
      <motion.div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[15px] relative overflow-visible"
        style={{ background: 'linear-gradient(135deg,#b45309,#D97706)', border: '1px solid #FCD34D' }}
        animate={{ opacity: [1, 0.6, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-white">⏸</span>
        <SleepZs />
      </motion.div>
    )
  }
  if (state === 'destroyed') {
    return (
      <motion.div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[15px] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7f0020,#BE0032)', border: '1px solid #FECDD3' }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.15) 3px,rgba(0,0,0,0.15) 4px)' }}
        />
        <span className="relative z-10 text-white text-[12px] font-black">✕</span>
        <Debris />
      </motion.div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[15px]"
      style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
      <span style={{ color: meta.color }}>{meta.icon}</span>
    </div>
  )
}

export default function VMCard({ vm, index, onRequestStateChange }) {
  const [open, setOpen] = useState(false)
  const [justChanged, setJustChanged] = useState(false)
  const meta = STATE_META[vm.state] || STATE_META.offline
  const dummy = vm.state === 'offline'
  const actions = ACTIONS[vm.state] || []
  const cpuPct  = vm.state === 'running' ? 42 : vm.state === 'snoozed' ? 8 : 0
  const memPct  = vm.state === 'running' ? 61 : vm.state === 'snoozed' ? 12 : 0
  const diskPct = vm.state !== 'offline' ? 38 : 0

  // Glow color per state
  const glowColor = vm.state === 'running' ? '#1EA03C'
    : vm.state === 'snoozed' ? '#F59E0B'
    : vm.state === 'destroyed' ? '#BE0032'
    : 'transparent'

  // Card background based on state
  const cardBg = vm.state === 'running'
    ? 'linear-gradient(180deg,#f8fffe 0%,#f0fbf2 100%)'
    : vm.state === 'snoozed'
    ? 'linear-gradient(180deg,#fffdf5 0%,#fffbeb 100%)'
    : vm.state === 'destroyed'
    ? 'linear-gradient(180deg,#fffbfb 0%,#fff1f2 100%)'
    : 'linear-gradient(180deg,#F9FAFB 0%,#F3F4F6 100%)'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -14, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`rack-unit state-${vm.state} mb-2.5 relative overflow-visible`}
      style={{
        background: cardBg,
        boxShadow: open
          ? `0 4px 20px ${glowColor}22, 0 1px 3px rgba(0,0,0,0.06)`
          : `0 1px 4px rgba(0,0,0,0.05)`,
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Top accent line */}
      <motion.div
        className="absolute top-0 left-8 right-8 h-px rounded-full"
        style={{ background: `linear-gradient(90deg,transparent,${glowColor}66,transparent)` }}
        animate={vm.state === 'running' ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.3 }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />

      <motion.button
        onClick={() => !dummy && setOpen(o => !o)}
        disabled={dummy}
        whileHover={!dummy ? { backgroundColor: 'rgba(248,250,253,0.9)' } : {}}
        whileTap={!dummy ? { scale: 0.999 } : {}}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${dummy ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
      >
        <div className="screw" />

        <VMIcon state={vm.state} meta={meta} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-gray-900 truncate">{vm.alias}</span>
            {vm.priority === 'critical' && (
              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>CRIT</span>
            )}
          </div>
          <div className="text-[11px] text-gray-400 truncate mt-0.5">{vm.purpose}</div>
        </div>

        {/* LED row */}
        <div className="hidden sm:flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="led-row">
            {Array.from({ length: 12 }).map((_, i) => {
              const on = vm.state === 'running' ? 10 : vm.state === 'snoozed' ? 5 : vm.state === 'destroyed' ? 2 : 0
              const cls = vm.state === 'running' ? 'on-green' : vm.state === 'snoozed' ? 'on-amber' : vm.state === 'destroyed' ? 'on-red' : ''
              const isActive = i < on
              return (
                <motion.div key={i} className={`led ${isActive ? cls : ''}`}
                  initial={{ scale: 0 }}
                  animate={{
                    scale: 1,
                    opacity: isActive && vm.state === 'snoozed' ? [1, 0.3, 1] : 1,
                  }}
                  transition={{
                    scale: { delay: i * 0.025, type: 'spring', stiffness: 500 },
                    opacity: isActive && vm.state === 'snoozed' ? { duration: 2, repeat: Infinity, delay: i * 0.15 } : {},
                  }}
                />
              )
            })}
          </div>
          <StateBadge state={vm.state} />
        </div>

        {!dummy && (
          <div className="flex-shrink-0 text-right ml-1">
            <div className="text-[9px] text-gray-400 uppercase tracking-wide">Optimised/mo</div>
            <div className="text-[13px] font-black" style={{ color: '#1A4780' }}>
              ₹{vm.optimisedMonthlyInr.toLocaleString()}
            </div>
            {vm.savingsInr > 0 && (
              <div className="text-[9px] font-bold" style={{ color: '#1EA03C' }}>
                saves ₹{vm.savingsInr.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {!dummy && (
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            className="text-gray-400 ml-1 flex-shrink-0 text-[12px]"
          >▾</motion.div>
        )}
        <div className="screw" />
      </motion.button>

      {/* Expanded detail panel */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-white/80">

              {/* State banner */}
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className="flex items-start gap-2.5 rounded-xl p-3 mb-3 text-[12px] relative overflow-hidden"
                style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
              >
                {vm.state === 'running' && (
                  <motion.div
                    className="absolute inset-0 opacity-20"
                    style={{ background: 'linear-gradient(90deg,transparent 0%,#1EA03C22 50%,transparent 100%)' }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                )}
                <span className="text-base relative z-10">{meta.icon}</span>
                <div className="relative z-10">
                  <span className="font-bold" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="text-gray-600 ml-1">— {meta.labelLong}</span>
                  {vm.snooze && (
                    <div className="mt-1 text-[11px] text-gray-500 flex items-center gap-1.5">
                      <span>🌙</span>
                      <span>Sleeps <strong>{vm.snooze.sleep}</strong> · Wakes <strong>{vm.snooze.wake}</strong> · {vm.snooze.days} · {vm.snooze.tz}</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Specs + Cost */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Specs</p>
                  {[['CPU', `${vm.cpu} vCPU`], ['Memory', `${vm.memGb} GB`], ['Disk', `${vm.diskGb} GB`], ['Size', vm.size], ['Env', vm.environment]].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wide">{k}</span>
                      <span className="text-[11px] font-semibold text-gray-800">{v}</span>
                    </div>
                  ))}
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.09 }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Cost</p>
                  {[['Per hour', `₹${vm.costHrInr}`], ['Full/mo', `₹${vm.monthlyInr.toLocaleString()}`], ['Optimised', `₹${vm.optimisedMonthlyInr.toLocaleString()}`], ['Savings', `₹${vm.savingsInr.toLocaleString()}`]].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wide">{k}</span>
                      <span className="text-[11px] font-semibold" style={{ color: '#1A4780' }}>{v}</span>
                    </div>
                  ))}
                  <p className="text-[10px] font-bold mt-2" style={{ color: '#1A4780' }}>{vm.contact}</p>
                  <p className="text-[10px] text-gray-400">{vm.unit}</p>
                </motion.div>
              </div>

              {/* Utilisation meters */}
              {(vm.state === 'running' || vm.state === 'snoozed') && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Utilisation</p>
                  <div className="space-y-2">
                    <MeterBar label="CPU"    pct={cpuPct}  color="#1A4780" delay={0.14} />
                    <MeterBar label="Memory" pct={memPct}  color="#00ABA9" delay={0.17} />
                    <MeterBar label="Disk"   pct={diskPct} color="#1EA03C" delay={0.20} />
                  </div>
                </motion.div>
              )}

              {/* Action buttons */}
              {!dummy && actions.length > 0 && onRequestStateChange && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                  className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">Change state</p>
                  <div className="flex gap-2 flex-wrap">
                    {actions.map(a => (
                      <motion.button key={a.to}
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onRequestStateChange(vm, a.to)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-black tracking-wide shadow-sm"
                        style={{ background: a.s, color: a.c, border: `1.5px solid ${a.b}` }}
                      >
                        {a.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
                className="mt-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-[11px] text-gray-500 leading-relaxed">{vm.businessNeed}</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}