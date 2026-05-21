import { useState } from 'react'
import { motion } from 'framer-motion'

const STATE_COLOR = {
  running:   { fill: '#1EA03C', glow: '#1EA03C44', pulse: true  },
  snoozed:   { fill: '#F59E0B', glow: '#F59E0B44', pulse: true  },
  destroyed: { fill: '#BE0032', glow: 'none',       pulse: false },
  offline:   { fill: '#CBD5E1', glow: 'none',       pulse: false },
}

function RackBlock({ rack, index }) {
  const hasVms = rack.vms.some(v => v.state !== 'offline')
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.15, duration: 0.4, ease: [0.22,1,0.36,1] }}
      className="flex flex-col items-center gap-2"
    >
      {/* Chassis — Nouryon blue-grey light theme */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: 58, minHeight: 76,
          background: '#EFF4FB',
          border: '1px solid #BDD0EA',
          boxShadow: 'inset 0 1px 3px rgba(26,71,128,0.10), 0 2px 8px rgba(26,71,128,0.08)',
        }}
      >
        {/* Chassis top rail */}
        <div className="flex justify-between items-center px-2 pt-2 pb-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7FA8CC' }} />
          <div className="h-px flex-1 mx-1" style={{ background: '#BDD0EA' }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7FA8CC' }} />
        </div>

        {/* VM blocks */}
        <div className="flex flex-col gap-1.5 px-2 pb-2">
          {rack.vms.length === 0 && (
            <>
              <div className="h-3 rounded-sm" style={{ background: '#DDE8F3', border: '1px dashed #BDD0EA' }} />
              <div className="h-3 rounded-sm" style={{ background: '#DDE8F3', border: '1px dashed #BDD0EA' }} />
            </>
          )}
          {rack.vms.map((vm, i) => {
            const cfg = STATE_COLOR[vm.state] || STATE_COLOR.offline
            const isRunning = vm.state === 'running'
            const isSnoozed = vm.state === 'snoozed'
            const isOffline = vm.state === 'offline'
            return (
              <motion.div
                key={vm.id}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: isOffline ? 0.4 : 1 }}
                transition={{ delay: index * 0.1 + i * 0.07 + 0.25, duration: 0.32, ease: 'backOut' }}
                style={{ transformOrigin: 'top' }}
              >
                <motion.div
                  style={{
                    height: 12, borderRadius: 3,
                    background: isOffline ? '#DDE8F3' : cfg.fill,
                    border: isOffline ? '1px dashed #BDD0EA' : 'none',
                    position: 'relative', overflow: 'hidden',
                    boxShadow: isRunning ? `0 0 6px ${cfg.glow}` : 'none',
                  }}
                  animate={
                    isRunning ? { boxShadow: [`0 0 3px ${cfg.glow}`, `0 0 10px ${cfg.glow}`, `0 0 3px ${cfg.glow}`] }
                    : isSnoozed ? { opacity: [1, 0.5, 1] }
                    : {}
                  }
                  transition={{ duration: isRunning ? 1.8 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {isRunning && (
                    <motion.div
                      style={{ position:'absolute', top:0, left:0, right:0, height:'50%', background:'rgba(255,255,255,0.25)', borderRadius:2 }}
                      animate={{ y: [-8, 16, -8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  <div style={{ position:'absolute', right:3, top:'50%', transform:'translateY(-50%)', width:3, height:3, borderRadius:'50%', background: isOffline ? 'transparent' : 'rgba(255,255,255,0.7)' }} />
                </motion.div>
              </motion.div>
            )
          })}
        </div>

        {/* Chassis bottom rail */}
        <div className="flex justify-between items-center px-2 pb-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7FA8CC' }} />
          <div className="h-px flex-1 mx-1" style={{ background: '#BDD0EA' }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7FA8CC' }} />
        </div>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">
        {rack.label.replace(' VMs','').replace('Disaster Recovery','DR')}
      </span>
    </motion.div>
  )
}

export default function DatacenterCard({ dc, isSelected, onClick, onRemove }) {
  const allVms     = dc.racks.flatMap(r => r.vms)
  const running    = allVms.filter(v => v.state === 'running').length
  const snoozed    = allVms.filter(v => v.state === 'snoozed').length
  const destroyed  = allVms.filter(v => v.state === 'destroyed').length
  const monthlyCost = allVms.reduce((a, v) => a + (v.optimisedMonthlyInr || 0), 0)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
      whileHover={{ y: -3 }}
      onClick={() => onClick(dc)}
      className="cursor-pointer rounded-2xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: isSelected ? '2px solid #1A4780' : `2px solid ${dc.active ? '#BDD0EA' : '#E5E7EB'}`,
        boxShadow: isSelected
          ? '0 8px 24px rgba(26,71,128,0.18)'
          : dc.active ? '0 2px 12px rgba(26,71,128,0.08)' : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.25s ease, border-color 0.2s ease',
      }}
    >
      {/* Nouryon blue header */}
      <div
        style={{
          background: dc.active ? '#1A4780' : '#F1F5F9',
          padding: '12px 16px 10px',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={dc.active
                  ? { background: '#1EA03C', color: '#fff' }
                  : { background: '#E5E7EB', color: '#6B7280', border: '1px solid #D1D5DB' }
                }
              >
                {dc.active ? '● Active' : 'Planned'}
              </span>
            </div>
            <h3 className={`font-bold text-[14px] ${dc.active ? 'text-white' : 'text-gray-600'}`}>{dc.name}</h3>
            <p className={`text-[11px] mt-0.5 ${dc.active ? 'text-blue-200' : 'text-gray-400'}`}>📍 {dc.location}</p>
          </div>
          {!dc.active && onRemove && (
            <button
              onClick={e => { e.stopPropagation(); onRemove(dc.id) }}
              className="w-6 h-6 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center text-xs transition-colors"
            >✕</button>
          )}
        </div>
      </div>

      {/* Rack visual — white background with Nouryon-blue chassis */}
      <div className="px-4 py-4" style={{ background: '#F8FAFD', borderBottom: '1px solid #EEF2F8' }}>
        <div className="flex justify-center gap-5">
          {dc.racks.map((rack, i) => (
            <RackBlock key={rack.id} rack={rack} index={i} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#fff' }}>
        <div className="flex flex-wrap gap-2">
          {running > 0 && (
            <div className="flex items-center gap-1.5">
              <motion.span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: '#1EA03C' }}
                animate={{ boxShadow: ['0 0 0 0 #1EA03C44','0 0 0 5px #1EA03C00','0 0 0 0 #1EA03C44'] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <span className="text-[11px] text-gray-600">{running} running</span>
            </div>
          )}
          {snoozed > 0 && (
            <div className="flex items-center gap-1.5">
              <motion.span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: '#F59E0B' }}
                animate={{ boxShadow: ['0 0 0 0 #F59E0B44','0 0 0 5px #F59E0B00','0 0 0 0 #F59E0B44'] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <span className="text-[11px] text-gray-600">{snoozed} snoozed</span>
            </div>
          )}
          {destroyed > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#BE0032' }} />
              <span className="text-[11px] text-gray-600">{destroyed} destroyed</span>
            </div>
          )}
          {running === 0 && snoozed === 0 && destroyed === 0 && (
            <span className="text-[11px] text-gray-400">No active VMs</span>
          )}
        </div>
        <motion.span
          className="text-[11px] font-bold flex items-center gap-1"
          style={{ color: '#1A4780' }}
          animate={{ x: [0, 2, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {isSelected ? 'Viewing →' : 'Open →'}
        </motion.span>
      </div>
    </motion.div>
  )
}
