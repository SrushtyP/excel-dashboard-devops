import { motion } from 'framer-motion'

const ENV_CONFIG = {
  production:  { label: 'Production',  color: '#1A4780', bg: '#EFF4FB', border: '#BDD0EA' },
  quality:     { label: 'Quality',     color: '#92400E', bg: '#FFFBEB', border: '#FCD34D' },
  development: { label: 'Development', color: '#5B21B6', bg: '#F5F3FF', border: '#C4B5FD' },
}

const STATE_DOT = {
  running:   { fill: '#1EA03C', pulse: true  },
  snoozed:   { fill: '#F59E0B', pulse: true  },
  destroyed: { fill: '#BE0032', pulse: false },
  offline:   { fill: '#CBD5E1', pulse: false },
}

function EnvBucket({ env, vms, index }) {
  const cfg = ENV_CONFIG[env] || ENV_CONFIG.development
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 + 0.1, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 rounded-lg overflow-hidden"
      style={{ border: `1px solid ${cfg.border}`, background: cfg.bg, minWidth: 0 }}
    >
      {/* Bucket header */}
      <div className="px-2.5 py-1.5 border-b" style={{ borderColor: cfg.border }}>
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>

      {/* VM slots */}
      <div className="px-2.5 py-2 flex flex-col gap-1.5">
        {vms.length === 0 ? (
          <div className="h-5 rounded" style={{ background: 'rgba(0,0,0,0.05)', border: `1px dashed ${cfg.border}` }} />
        ) : vms.map((vm, i) => {
          const dot = STATE_DOT[vm.state] || STATE_DOT.offline
          return (
            <motion.div key={vm.id}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 + i * 0.05 + 0.18 }}
              className="flex items-center gap-1.5"
            >
              <motion.span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: dot.fill }}
                animate={dot.pulse
                  ? { boxShadow: [`0 0 0 0 ${dot.fill}44`, `0 0 0 4px ${dot.fill}00`, `0 0 0 0 ${dot.fill}44`] }
                  : {}}
                transition={{ duration: vm.state === 'running' ? 1.6 : 2.4, repeat: Infinity }}
              />
              <span className="text-[9px] font-mono truncate" style={{ color: cfg.color, opacity: 0.85 }}>
                {vm.id}
              </span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

export default function DatacenterCard({ dc, isSelected, onClick, onRemove }) {
  const allVms  = dc.vms || []
  const running   = allVms.filter(v => v.state === 'running').length
  const snoozed   = allVms.filter(v => v.state === 'snoozed').length
  const destroyed = allVms.filter(v => v.state === 'destroyed').length
  const monthlyCost = allVms.reduce((a, v) => a + (v.optimisedMonthlyUsd || 0), 0)

  const byEnv = {
    production:  allVms.filter(v => v.env === 'production'),
    quality:     allVms.filter(v => v.env === 'quality'),
    development: allVms.filter(v => v.env === 'development'),
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      onClick={() => onClick(dc)}
      className="cursor-pointer rounded-2xl overflow-hidden w-full"
      style={{
        background: '#FFFFFF',
        border: isSelected ? '2px solid #1A4780' : `2px solid ${dc.active ? '#BDD0EA' : '#E5E7EB'}`,
        boxShadow: isSelected
          ? '0 8px 24px rgba(26,71,128,0.18)'
          : dc.active ? '0 2px 12px rgba(26,71,128,0.08)' : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.25s ease, border-color 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{ background: dc.active ? '#1A4780' : '#F1F5F9', padding: '12px 14px 10px' }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={dc.active
                  ? { background: '#1EA03C', color: '#fff' }
                  : { background: '#E5E7EB', color: '#6B7280', border: '1px solid #D1D5DB' }}>
                {dc.active ? '● Active' : 'Planned'}
              </span>
            </div>
            <h3 className={`font-bold text-[13px] leading-snug ${dc.active ? 'text-white' : 'text-gray-600'}`}>
              {dc.name}
            </h3>
            <p className={`text-[11px] mt-0.5 ${dc.active ? 'text-blue-200' : 'text-gray-400'}`}>
              📍 {dc.location}
            </p>
          </div>
          {!dc.active && onRemove && (
            <button onClick={e => { e.stopPropagation(); onRemove(dc.id) }}
              className="w-6 h-6 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center text-xs transition-colors">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Environment buckets */}
      <div className="px-3 py-3 flex gap-2" style={{ background: '#F8FAFD', borderBottom: '1px solid #EEF2F8' }}>
        {Object.entries(byEnv).map(([env, vms], i) => (
          <EnvBucket key={env} env={env} vms={vms} index={i} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#fff' }}>
        <div className="flex flex-wrap gap-2.5">
          {running > 0 && (
            <div className="flex items-center gap-1.5">
              <motion.span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#1EA03C' }}
                animate={{ boxShadow: ['0 0 0 0 #1EA03C44', '0 0 0 5px #1EA03C00', '0 0 0 0 #1EA03C44'] }}
                transition={{ duration: 1.8, repeat: Infinity }} />
              <span className="text-[11px] text-gray-600">{running} running</span>
            </div>
          )}
          {snoozed > 0 && (
            <div className="flex items-center gap-1.5">
              <motion.span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#F59E0B' }}
                animate={{ boxShadow: ['0 0 0 0 #F59E0B44', '0 0 0 5px #F59E0B00', '0 0 0 0 #F59E0B44'] }}
                transition={{ duration: 2.5, repeat: Infinity }} />
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
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11px] font-semibold text-gray-500">
            ${monthlyCost.toFixed(0)}/mo
          </span>
          <motion.span className="text-[11px] font-bold flex items-center gap-1" style={{ color: '#1A4780' }}
            animate={{ x: [0, 2, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
            {isSelected ? 'Viewing →' : 'Open →'}
          </motion.span>
        </div>
      </div>
    </motion.div>
  )
}