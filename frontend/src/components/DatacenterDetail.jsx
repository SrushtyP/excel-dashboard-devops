import { useState } from 'react'
import { motion } from 'framer-motion'
import VMActionPanel from './VMActionPanel'

const ENV_CONFIG = {
  production:  { label: 'Production',  color: '#1A4780', lightBg: '#EFF4FB', border: '#BDD0EA', tag: '#1A4780' },
  quality:     { label: 'Quality',     color: '#92400E', lightBg: '#FFFBEB', border: '#FCD34D', tag: '#D97706' },
  development: { label: 'Development', color: '#5B21B6', lightBg: '#F5F3FF', border: '#C4B5FD', tag: '#6D28D9' },
}

const STATE_CONFIG = {
  running:   { dot: '#1EA03C', bg: '#F0FBF2', badgeBg: '#DCFCE7', badgeColor: '#166534', label: 'running'   },
  snoozed:   { dot: '#F59E0B', bg: '#FFFDF0', badgeBg: '#FEF3C7', badgeColor: '#92400E', label: 'snoozed'   },
  destroyed: { dot: '#BE0032', bg: '#FFF1F2', badgeBg: '#FFE4E6', badgeColor: '#9F1239', label: 'destroyed' },
  offline:   { dot: '#CBD5E1', bg: '#F9FAFB', badgeBg: '#F1F5F9', badgeColor: '#64748B', label: 'offline'   },
}

const usd = v => `$${(+(v || 0)).toFixed(2)}`

function VMRow({ vm, index, selected, onSelect, dcActive }) {
  const sc  = STATE_CONFIG[vm.state] || STATE_CONFIG.offline
  const optUsd = vm.optimisedMonthlyUsd ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 + 0.05, duration: 0.24 }}
      onClick={() => dcActive && onSelect(vm)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all
        ${dcActive ? 'cursor-pointer hover:border-blue-200' : 'cursor-default'}`}
      style={{
        background:   selected ? '#EFF6FF' : sc.bg,
        borderColor:  selected ? '#93C5FD' : '#E5E7EB',
        outline:      selected ? '2px solid #3B82F6' : 'none',
        outlineOffset: selected ? '1px' : '0',
      }}
    >
      {/* State dot */}
      <motion.span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: sc.dot }}
        animate={vm.state === 'running' || vm.state === 'snoozed'
          ? { boxShadow: [`0 0 0 0 ${sc.dot}44`, `0 0 0 5px ${sc.dot}00`, `0 0 0 0 ${sc.dot}44`] }
          : {}}
        transition={{ duration: vm.state === 'running' ? 1.6 : 2.4, repeat: Infinity }}
      />

      {/* VM ID — primary label */}
      <div className="min-w-0 flex-shrink-0 w-36">
        <div className="text-[12px] font-mono font-semibold text-gray-800 truncate">{vm.id}</div>
        <div className="text-[10px] text-gray-400 truncate">{vm.alias}</div>
      </div>

      {/* State badge */}
      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: sc.badgeBg, color: sc.badgeColor }}>
        {sc.label}
      </span>

      {/* Size */}
      <span className="text-[10px] text-gray-400 hidden sm:block flex-shrink-0">{vm.size || '—'}</span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Cost */}
      {vm.state !== 'destroyed' && (
        <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: '#1A4780' }}>
          {usd(optUsd)}<span className="text-[9px] font-normal text-gray-400">/mo</span>
        </span>
      )}
      {vm.state === 'destroyed' && (
        <span className="text-[10px] text-gray-400 flex-shrink-0">$0.00/mo</span>
      )}

      {/* Select arrow */}
      {dcActive && (
        <span className="text-[10px] flex-shrink-0" style={{ color: selected ? '#3B82F6' : '#CBD5E1' }}>
          {selected ? '●' : '○'}
        </span>
      )}
    </motion.div>
  )
}

function EnvSection({ env, vms, index, selectedVmId, onSelectVm, dcActive }) {
  const cfg = ENV_CONFIG[env] || ENV_CONFIG.development
  if (vms.length === 0) return null

  const running   = vms.filter(v => v.state === 'running').length
  const snoozed   = vms.filter(v => v.state === 'snoozed').length
  const destroyed = vms.filter(v => v.state === 'destroyed').length
  const cost      = vms.reduce((a, v) => a + (v.optimisedMonthlyUsd || 0), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 + 0.05, duration: 0.28 }}
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${cfg.border}` }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: cfg.lightBg, borderBottom: `1px solid ${cfg.border}` }}>
        <div className="flex items-center gap-2.5">
          {/* Colour swatch */}
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: cfg.tag }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-[10px] text-gray-400">{vms.length} VM{vms.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* State summary dots */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            {running   > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{running}</span>}
            {snoozed   > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{snoozed}</span>}
            {destroyed > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"   />{destroyed}</span>}
          </div>
          <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>
            {usd(cost)}/mo
          </span>
        </div>
      </div>

      {/* VM rows */}
      <div className="p-3 flex flex-col gap-2" style={{ background: '#FAFBFC' }}>
        {vms.map((vm, i) => (
          <VMRow
            key={vm.id}
            vm={vm}
            index={i}
            selected={selectedVmId === vm.id}
            onSelect={onSelectVm}
            dcActive={dcActive}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default function DatacenterDetail({ dc, onClose, onRequestStateChange }) {
  const [selectedVm, setSelectedVm] = useState(null)

  const allVms         = dc.vms || []
  const running        = allVms.filter(v => v.state === 'running').length
  const snoozed        = allVms.filter(v => v.state === 'snoozed').length
  const destroyed      = allVms.filter(v => v.state === 'destroyed').length
  const monthlyCostUsd = allVms.reduce((a, v) => a + (v.optimisedMonthlyUsd || 0), 0)

  const byEnv = {
    production:  allVms.filter(v => v.env === 'production'),
    quality:     allVms.filter(v => v.env === 'quality'),
    development: allVms.filter(v => v.env === 'development'),
  }

  function handleSelectVm(vm) {
    setSelectedVm(prev => prev?.id === vm.id ? null : vm)
  }

  function handleRequestStateChange(vm, targetState) {
    setSelectedVm(null)
    onRequestStateChange(vm, targetState)
  }

  return (
    <div>
      {/* DC header */}
      <div className="bg-nouryon-blue rounded-xl px-5 py-4 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.07, type: 'spring', stiffness: 300 }}
              className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl flex-shrink-0">
              🏢
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-[16px]">{dc.name}</h2>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase
                  ${dc.active ? 'bg-nouryon-green text-white' : 'bg-gray-400 text-white'}`}>
                  {dc.active ? 'Active' : 'Planned'}
                </span>
              </div>
              <p className="text-blue-200 text-[11px] mt-0.5">📍 {dc.location} · {dc.region}</p>
            </motion.div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            {dc.active && monthlyCostUsd > 0 && (
              <div className="text-right">
                <div className="text-[10px] text-blue-200">Est. monthly (USD)</div>
                <div className="text-[15px] font-bold text-white">{usd(monthlyCostUsd)}</div>
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.25)' }}
              whileTap={{ scale: 0.9 }} onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/15 text-white flex items-center justify-center text-sm">
              ✕
            </motion.button>
          </div>
        </div>

        {dc.active && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="flex items-center gap-5 mt-3 flex-wrap">
            {running > 0 && (
              <div className="flex items-center gap-1.5">
                <motion.span className="w-2 h-2 rounded-full bg-nouryon-green flex-shrink-0"
                  animate={{ boxShadow: ['0 0 0 0 #1EA03C44', '0 0 0 5px #1EA03C00', '0 0 0 0 #1EA03C44'] }}
                  transition={{ duration: 1.8, repeat: Infinity }} />
                <span className="text-[11px] text-blue-100">{running} running</span>
              </div>
            )}
            {snoozed > 0 && (
              <div className="flex items-center gap-1.5">
                <motion.span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
                  animate={{ boxShadow: ['0 0 0 0 #F59E0B44', '0 0 0 5px #F59E0B00', '0 0 0 0 #F59E0B44'] }}
                  transition={{ duration: 2.5, repeat: Infinity }} />
                <span className="text-[11px] text-blue-100">{snoozed} snoozed</span>
              </div>
            )}
            {destroyed > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-[11px] text-blue-100">{destroyed} destroyed</span>
              </div>
            )}
            <span className="text-[11px] text-blue-300 ml-auto">
              {allVms.filter(v => v.state !== 'offline').length} VMs total
            </span>
          </motion.div>
        )}
      </div>

      {/* VM Action Panel */}
      {dc.active && (
        <VMActionPanel
          selectedVm={selectedVm}
          onRequestStateChange={handleRequestStateChange}
          onClear={() => setSelectedVm(null)}
        />
      )}

      {/* Environment sections */}
      <div className="space-y-4">
        {Object.entries(byEnv).map(([env, vms], i) => (
          <EnvSection
            key={env}
            env={env}
            vms={vms}
            index={i}
            selectedVmId={selectedVm?.id}
            onSelectVm={handleSelectVm}
            dcActive={dc.active}
          />
        ))}
      </div>

      {!dc.active && (
        <div className="mt-5 p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-center">
          <p className="text-[12px] text-gray-500">Planned datacenter — VMs provisioned when needed.</p>
        </div>
      )}
    </div>
  )
}