import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const usd = v => `$${(+(v||0)).toFixed(2)}`

// ── Server slot animations ────────────────────────────────────────────────────
function ServerIcon({ state }) {
  const colors = {
    running:   { body:'#e0fff0', border:'#34c47c', slot:'#34c47c', dot:'#34c47c' },
    snoozed:   { body:'#fff8e0', border:'#e8a020', slot:'#e8a020', dot:'#e8a020' },
    destroyed: { body:'#f0f4fa', border:'#c8d4e4', slot:'#c8d4e4', dot:'#c8d4e4' },
    offline:   { body:'#f5f5f5', border:'#e0e0e0', slot:'#e0e0e0', dot:'#e0e0e0' },
  }
  const c = colors[state] || colors.offline
  return (
    <div className="w-11 h-11 rounded-lg flex items-center justify-center mx-auto mb-2 relative"
      style={{ background: c.body, border: `1.5px solid ${c.border}` }}>
      <div className="w-7 h-6 rounded relative" style={{ background: 'transparent' }}>
        {/* slots */}
        <div className="space-y-0.5 pt-1 px-1">
          {[0,1,2].map(i => (
            <motion.div key={i} className="h-1 rounded-sm"
              style={{ background: c.slot }}
              animate={state==='running' ? { opacity:[0.4,1,0.4] } : { opacity: state==='snoozed' ? 0.4 : 0.25 }}
              transition={{ duration:1.5, repeat:Infinity, delay:i*0.3 }} />
          ))}
        </div>
        {/* status dot */}
        <motion.div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
          style={{ background: c.dot }}
          animate={state==='running' ? { scale:[1,1.6,1] } : state==='snoozed' ? { scale:[1,1.4,1] } : { scale:1 }}
          transition={{ duration: state==='running'?1.2:3, repeat:Infinity }} />
      </div>
      {/* scan line for running */}
      {state==='running' && (
        <motion.div className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ background:'#34c47c', opacity:0 }}
          animate={{ top:['0%','100%'], opacity:[0.5,0.5,0] }}
          transition={{ duration:4, repeat:Infinity, ease:'linear' }} />
      )}
    </div>
  )
}

const STATE_LABEL = { running:'online', snoozed:'snoozed', destroyed:'offline', offline:'—' }
const PILL_STYLE  = {
  running:   { bg:'#dcfce7', color:'#166534' },
  snoozed:   { bg:'#fef3c7', color:'#92400e' },
  destroyed: { bg:'#f1f5f9', color:'#64748b' },
  offline:   { bg:'#f5f5f5', color:'#aaa' },
}

export default function VMCard({ vm, index, selected, onSelect }) {
  const dummy  = vm.state === 'offline'
  const pill   = PILL_STYLE[vm.state]  || PILL_STYLE.offline
  const optUsd = vm.optimisedMonthlyUsd ?? (vm.optimisedMonthlyInr||0)/84

  const borderColor = vm.state==='running' ? '#34c47c'
    : vm.state==='snoozed'   ? '#e8a020'
    : vm.state==='destroyed' ? '#c8d4e4'
    : '#e5e7eb'

  const bgColor = vm.state==='running'  ? '#f0fff8'
    : vm.state==='snoozed'   ? '#fffdf0'
    : vm.state==='destroyed' ? '#f8f9fc'
    : '#fafafa'

  return (
    <motion.div
      layout
      initial={{ opacity:0, scale:0.95 }}
      animate={{ opacity: dummy ? 0.35 : 1, scale:1 }}
      transition={{ delay: index*0.05, duration:0.25 }}
      onClick={() => !dummy && onSelect(vm)}
      className={`relative rounded-xl border-[1.5px] p-3 text-center overflow-hidden transition-all duration-200
        ${dummy ? 'cursor-default' : 'cursor-pointer hover:-translate-y-0.5'}`}
      style={{
        background: bgColor,
        borderColor: selected ? '#3b82f6' : borderColor,
        outline: selected ? '2.5px solid #3b82f6' : 'none',
        outlineOffset: selected ? '2px' : '0',
        boxShadow: selected ? '0 0 0 3px #bfdbfe' : 'none',
      }}>

      {/* corner accents */}
      {['top-1 left-1 border-t border-l', 'bottom-1 right-1 border-b border-r'].map((pos,i) => (
        <div key={i} className={`absolute w-2 h-2 ${pos}`}
          style={{ borderColor: selected ? '#3b82f6' : borderColor }} />
      ))}

      {/* scan line running */}
      {vm.state==='running' && (
        <motion.div className="absolute left-0 right-0 h-px pointer-events-none z-10"
          style={{ background:'#34c47c', opacity:0 }}
          animate={{ top:['0%','100%'], opacity:[0.4,0.4,0] }}
          transition={{ duration:4, repeat:Infinity, ease:'linear' }} />
      )}

      <ServerIcon state={vm.state} />

      <div className="text-[10px] font-mono mb-0.5 truncate" style={{ color:'#4a7ab5' }}>{vm.id}</div>
      <div className="text-[9px] mb-1.5 truncate" style={{ color:'#8ab0d4' }}>{vm.alias}</div>

      <span className="inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
        style={{ background: pill.bg, color: pill.color }}>
        {STATE_LABEL[vm.state]}
      </span>

      {!dummy && (
        <div className="text-[11px] font-semibold" style={{ color: pill.color }}>
          {usd(optUsd)}<span className="text-[8px] font-normal ml-0.5" style={{ color:'#94a3b8' }}>/mo</span>
        </div>
      )}

      {/* selected indicator */}
      {selected && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
      )}
    </motion.div>
  )
}