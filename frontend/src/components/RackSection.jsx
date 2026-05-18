import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VMCard from './VMCard'

const RACK_ICONS = {
  'rack-primary':   '🖥️',
  'rack-secondary': '🔄',
  'rack-dr':        '🛡️',
}

export default function RackSection({ rack, dcActive, selectedVmId, onSelectVm }) {
  const [open, setOpen] = useState(rack.vms.some(v => v.state !== 'offline'))

  const activeVms = rack.vms.filter(v => v.state !== 'offline')
  const running   = activeVms.filter(v => v.state === 'running').length
  const snoozed   = activeVms.filter(v => v.state === 'snoozed').length
  const destroyed = activeVms.filter(v => v.state === 'destroyed').length

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      !dcActive ? 'bg-gray-50 border-gray-200 opacity-50'
        : 'bg-white border-gray-200 shadow-sm'}`}>

      {/* Rack header */}
      <motion.button
        whileTap={dcActive ? { scale:0.995 } : {}}
        onClick={() => dcActive && setOpen(o => !o)}
        disabled={!dcActive}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left
          ${!dcActive ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50/60 transition-colors'}`}>

        <span className="text-[18px] flex-shrink-0">{RACK_ICONS[rack.id] || '🗄️'}</span>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-gray-900">{rack.label}</span>
          <span className="text-[11px] text-gray-400 ml-2">{rack.sublabel}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {running > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ background:'#dcfce7', color:'#166534', border:'1px solid #86efac' }}>
              {running} running
            </span>
          )}
          {snoozed > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ background:'#fef3c7', color:'#92400e', border:'1px solid #fcd34d' }}>
              {snoozed} snoozed
            </span>
          )}
          {destroyed > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ background:'#f1f5f9', color:'#64748b', border:'1px solid #e2e8f0' }}>
              {destroyed} dest.
            </span>
          )}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration:0.22 }}
            className="text-gray-400 text-[13px] ml-1">▾</motion.span>
        </div>
      </motion.button>

      {/* VM cards */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }}
            transition={{ duration:0.28, ease:[0.22,1,0.36,1] }}
            style={{ overflow:'hidden' }}>
            <div className="px-3 pb-3">
              {/* rail */}
              <div className="flex items-center gap-2 mb-2 py-1">
                <div className="h-2 w-2 rounded-full bg-gray-300 flex-shrink-0" />
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">{rack.id}</span>
                <div className="h-px flex-1 bg-gray-200" />
                <div className="h-2 w-2 rounded-full bg-gray-300 flex-shrink-0" />
              </div>

              {rack.vms.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-[11px] text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  No VMs provisioned
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                  {rack.vms.map((vm, i) => (
                    <VMCard
                      key={vm.id}
                      vm={vm}
                      index={i}
                      selected={selectedVmId === vm.id}
                      onSelect={onSelectVm}
                    />
                  ))}
                </div>
              )}

              {/* bottom rail */}
              <div className="flex items-center gap-2 mt-1 py-1">
                <div className="h-2 w-2 rounded-full bg-gray-300 flex-shrink-0" />
                <div className="h-px flex-1 bg-gray-200" />
                <div className="h-2 w-2 rounded-full bg-gray-300 flex-shrink-0" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}