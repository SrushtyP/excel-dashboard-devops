import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DatacenterCard from './DatacenterCard'
import DatacenterDetail from './DatacenterDetail'
import AddDatacenterModal from './AddDatacenterModal'
import VMStateOverlay from './VMStateOverlay'
import RequestToast from './RequestToast'
import PipelineView from './PipelineView'
import { StatusDot } from './StatusDot'
import { useAzureVMs } from '../hooks/useAzureVMs'

const SUB_TABS = [
  { id: 'infra',    label: 'Infrastructure', icon: '🏢' },
  { id: 'pipeline', label: 'Pipeline',        icon: '⚙️'  },
]

// ─── Initial datacenter structure ─────────────────────────────────────────────
// Three fixed datacenters, each with production / development / quality racks.
// Primary has real Azure VM IDs; Secondary and DR are demo/dummy.

export const INITIAL_DATACENTERS = [
  // ── PRIMARY ──────────────────────────────────────────────────────────────
  {
    id:       'dc-primary',
    name:     'Primary — South Africa North',
    location: 'Johannesburg, ZA',
    region:   'southafricanorth',
    active:   true,
    role:     'primary',
    racks: [
      {
        id:       'rack-primary-prod',
        label:    'Production',
        sublabel: 'Live compliance & R&D workloads',
        env:      'production',
        active:   true,
        vms: [
          {
            id:                  'vm-running',
            alias:               'Compliance reporting portal',
            state:               'running',
            env:                 'production',
            environment:         'production',
            contact:             'compliance-team@chemcore.com',
            unit:                'Global Compliance',
            priority:            'critical',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrUsd:           0.096,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 62.50,
            savingsUsd:          0,
            businessNeed:        '24/7 availability for regulatory bodies across 82 countries.',
          },
          {
            id:                  'vm-snoozed',
            alias:               'Mumbai R&D lab',
            state:               'snoozed',
            env:                 'production',
            environment:         'production',
            contact:             'rnd-mumbai@chemcore.com',
            unit:                'R&D Mumbai',
            priority:            'medium',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrUsd:           0.096,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 23.40,
            savingsUsd:          39.10,
            businessNeed:        'Active 8am–8pm IST weekdays only. Snoozed overnight and weekends.',
          },
        ],
      },
      {
        id:       'rack-primary-dev',
        label:    'Development',
        sublabel: 'Dev & testing workloads',
        env:      'development',
        active:   true,
        vms: [
          {
            id:                  'vm-destroyed',
            alias:               'CPCB audit generator',
            state:               'destroyed',
            env:                 'development',
            environment:         'development',
            contact:             'audit-team@chemcore.com',
            unit:                'India Audit Team',
            priority:            'low',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrUsd:           0,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 0,
            savingsUsd:          62.50,
            businessNeed:        'Ephemeral compute for India CPCB hazardous waste compliance report.',
          },
          {
            id:                  'vm-primary-dev2',
            alias:               'Feature branch runner',
            state:               'running',
            env:                 'development',
            environment:         'development',
            contact:             'dev-team@chemcore.com',
            unit:                'Engineering',
            priority:            'low',
            size:                'Standard_B2s',
            cpu:                 2,
            memGb:               4,
            diskGb:              20,
            costHrUsd:           0.042,
            monthlyUsd:          30.60,
            optimisedMonthlyUsd: 30.60,
            savingsUsd:          0,
            businessNeed:        'CI/CD feature branch test runner.',
          },
        ],
      },
      {
        id:       'rack-primary-quality',
        label:    'Testing',
        sublabel: 'QA & staging validation',
        env:      'quality',
        active:   true,
        vms: [
          {
            id:                  'vm-primary-qa1',
            alias:               'QA regression suite',
            state:               'snoozed',
            env:                 'quality',
            environment:         'testing',
            contact:             'qa-team@chemcore.com',
            unit:                'QA Engineering',
            priority:            'medium',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrUsd:           0.096,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 23.40,
            savingsUsd:          39.10,
            businessNeed:        'Runs nightly regression suite. Snoozed during day.',
          },
        ],
      },
    ],
  },

  // ── SECONDARY (DUMMY) ─────────────────────────────────────────────────────
  {
    id:       'dc-secondary',
    name:     'Secondary — South Africa West',
    location: 'Cape Town, ZA',
    region:   'southafricawest',
    active:   true,
    role:     'secondary',
    racks: [
      {
        id:       'rack-sec-prod',
        label:    'Production',
        sublabel: 'Failover & load sharing',
        env:      'production',
        active:   true,
        vms: [
          {
            id:                  'vm-sec-portal',
            alias:               'Compliance portal — failover',
            state:               'snoozed',
            env:                 'production',
            environment:         'production',
            contact:             'compliance-team@chemcore.com',
            unit:                'Global Compliance',
            priority:            'high',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrUsd:           0.096,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 23.40,
            savingsUsd:          39.10,
            businessNeed:        'Hot standby for compliance portal. Active only during primary failover.',
          },
          {
            id:                  'vm-sec-batch',
            alias:               'Batch report processor',
            state:               'running',
            env:                 'production',
            environment:         'production',
            contact:             'ops-team@chemcore.com',
            unit:                'Operations',
            priority:            'medium',
            size:                'Standard_D4s_v3',
            cpu:                 4,
            memGb:               16,
            diskGb:              64,
            costHrUsd:           0.192,
            monthlyUsd:          140.00,
            optimisedMonthlyUsd: 140.00,
            savingsUsd:          0,
            businessNeed:        'Processes compliance batch reports for 12 African regulatory bodies.',
          },
        ],
      },
      {
        id:       'rack-sec-dev',
        label:    'Development',
        sublabel: 'Secondary dev environment',
        env:      'development',
        active:   true,
        vms: [
          {
            id:                  'vm-sec-dev1',
            alias:               'R&D secondary node',
            state:               'snoozed',
            env:                 'development',
            environment:         'development',
            contact:             'rnd-mumbai@chemcore.com',
            unit:                'R&D Mumbai',
            priority:            'medium',
            size:                'Standard_B2s',
            cpu:                 2,
            memGb:               4,
            diskGb:              20,
            costHrUsd:           0.042,
            monthlyUsd:          30.60,
            optimisedMonthlyUsd: 10.43,
            savingsUsd:          20.17,
            businessNeed:        'Secondary R&D workloads. Mirrors primary lab data nightly.',
          },
        ],
      },
      {
        id:       'rack-sec-quality',
        label:    'Testing',
        sublabel: 'Secondary QA environment',
        env:      'quality',
        active:   false,
        vms:      [],
      },
    ],
  },

  // ── DISASTER RECOVERY (DUMMY) ─────────────────────────────────────────────
  {
    id:       'dc-dr',
    name:     'Disaster Recovery — Southeast Asia',
    location: 'Singapore',
    region:   'southeastasia',
    active:   true,
    role:     'dr',
    racks: [
      {
        id:       'rack-dr-prod',
        label:    'Production',
        sublabel: 'Cold standby production replicas',
        env:      'production',
        active:   true,
        vms: [
          {
            id:                  'vm-dr-portal',
            alias:               'Compliance portal — DR',
            state:               'snoozed',
            env:                 'production',
            environment:         'production',
            contact:             'compliance-team@chemcore.com',
            unit:                'Global Compliance',
            priority:            'critical',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrUsd:           0.096,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 23.40,
            savingsUsd:          39.10,
            businessNeed:        'Cold DR replica — activates within 4h of primary failure declaration.',
          },
          {
            id:                  'vm-dr-db',
            alias:               'Database replica — DR',
            state:               'snoozed',
            env:                 'production',
            environment:         'production',
            contact:             'dba-team@chemcore.com',
            unit:                'Global Compliance',
            priority:            'critical',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              128,
            costHrUsd:           0.096,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 23.40,
            savingsUsd:          39.10,
            businessNeed:        'Async database replica. RPO 1h. Snapshots synced every 6h.',
          },
        ],
      },
      {
        id:       'rack-dr-dev',
        label:    'Development',
        sublabel: 'DR dev/test environment',
        env:      'development',
        active:   true,
        vms: [
          {
            id:                  'vm-dr-infra',
            alias:               'Network infra — DR',
            state:               'running',
            env:                 'development',
            environment:         'development',
            contact:             'netops-team@chemcore.com',
            unit:                'Infrastructure',
            priority:            'high',
            size:                'Standard_B2s',
            cpu:                 2,
            memGb:               4,
            diskGb:              20,
            costHrUsd:           0.042,
            monthlyUsd:          30.60,
            optimisedMonthlyUsd: 30.60,
            savingsUsd:          0,
            businessNeed:        'Always-on: DNS, VPN gateway, health monitoring for DR site.',
          },
        ],
      },
      {
        id:       'rack-dr-quality',
        label:    'Testing',
        sublabel: 'DR validation & drill env',
        env:      'quality',
        active:   false,
        vms:      [],
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const usd = v => `$${(+(v || 0)).toFixed(2)}`

function KpiCard({ label, value, sub, accent, delay=0, live=false }) {
  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay}}
      className="bg-white rounded-xl border border-gray-200 shadow-card p-4" style={{borderLeft:`4px solid ${accent}`}}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{label}</p>
        {live && <span className="w-1.5 h-1.5 rounded-full bg-nouryon-green animate-pulse_green flex-shrink-0 mt-0.5" />}
      </div>
      <p className="text-[22px] font-bold mt-1 leading-none" style={{color:accent}}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
    </motion.div>
  )
}

// Merges live Azure VM states into the datacenter structure.
// Only updates `state` (and optionally alias) from live data — all cost/env
// fields are preserved from local config so the UI always has full data.
function mergeAzureStates(datacenters, azureVms) {
  if (!azureVms) return datacenters
  const stateMap = Object.fromEntries(azureVms.map(v => [v.id, v]))
  return datacenters.map(dc => ({
    ...dc,
    racks: dc.racks.map(rack => ({
      ...rack,
      vms: rack.vms.map(vm => {
        const live = stateMap[vm.id]
        if (!live) return vm
        // Only take state (and alias if present) from live — NEVER overwrite env/cost/rack fields
        return {
          ...vm,
          state: live.state ?? vm.state,
          alias: live.alias || vm.alias,
          // env, optimisedMonthlyUsd, size, etc. always come from local config
        }
      }),
    })),
  }))
}

// ─── Robust rack env resolver ─────────────────────────────────────────────────
// Handles both new racks (with explicit env field) and old racks (no env field).
// Falls back to inferring from rack.label or rack.id if env is missing.
function resolveRackEnv(rack) {
  if (rack.env) return rack.env
  // Infer from label
  const label = (rack.label || '').toLowerCase()
  if (label.includes('production') || label.includes('prod')) return 'production'
  if (label.includes('development') || label.includes('dev') || label.includes('ephemeral') || label.includes('feature') || label.includes('infra')) return 'development'
  if (label.includes('quality') || label.includes('qa') || label.includes('test') || label.includes('staging') || label.includes('dr standby') || label.includes('disaster')) return 'quality'
  // Infer from id
  const id = (rack.id || '').toLowerCase()
  if (id.includes('prod')) return 'production'
  if (id.includes('dev') || id.includes('ephemeral') || id.includes('batch') || id.includes('mgmt') || id.includes('infra')) return 'development'
  if (id.includes('quality') || id.includes('qa') || id.includes('test') || id.includes('dr')) return 'quality'
  return 'development'
}

// ─── Rack strip used inside the datacenter card preview ──────────────────────

const ENV_RACK_CFG = {
  production:  { label: 'PROD', color: '#1A4780', bg: '#EFF4FB', border: '#BDD0EA' },
  development: { label: 'DEV',  color: '#5B21B6', bg: '#F5F3FF', border: '#C4B5FD' },
  quality:     { label: 'TEST', color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
}

const STATE_COLOR = {
  running:   { fill: '#1EA03C', glow: '#1EA03C44' },
  snoozed:   { fill: '#F59E0B', glow: '#F59E0B44' },
  destroyed: { fill: '#BE0032', glow: 'none'       },
  offline:   { fill: '#CBD5E1', glow: 'none'       },
}

function RackStrip({ rack, index }) {
  const cfg = ENV_RACK_CFG[resolveRackEnv(rack)] || ENV_RACK_CFG.development
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.15, duration: 0.35, ease: [0.22,1,0.36,1] }}
      className="flex flex-col items-center gap-1.5"
    >
      {/* Chassis */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: 56, minHeight: 72,
          background: '#EFF4FB',
          border: `1.5px solid ${cfg.border}`,
          boxShadow: 'inset 0 1px 3px rgba(26,71,128,0.10), 0 2px 8px rgba(26,71,128,0.07)',
        }}
      >
        {/* top rail */}
        <div className="flex justify-between items-center px-1.5 pt-1.5 pb-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7FA8CC' }} />
          <div className="h-px flex-1 mx-1" style={{ background: cfg.border }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7FA8CC' }} />
        </div>

        {/* VM bars */}
        <div className="flex flex-col gap-1.5 px-2 pb-1.5">
          {rack.vms.length === 0 ? (
            <>
              <div className="h-2.5 rounded-sm" style={{ background: '#DDE8F3', border: '1px dashed #BDD0EA' }} />
              <div className="h-2.5 rounded-sm" style={{ background: '#DDE8F3', border: '1px dashed #BDD0EA' }} />
            </>
          ) : rack.vms.map((vm, i) => {
            const scfg = STATE_COLOR[vm.state] || STATE_COLOR.offline
            const isOff = vm.state === 'offline'
            return (
              <motion.div
                key={vm.id}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: isOff ? 0.35 : 1 }}
                transition={{ delay: index * 0.08 + i * 0.06 + 0.2, duration: 0.28, ease: 'backOut' }}
                style={{ transformOrigin: 'left' }}
              >
                <motion.div style={{
                  height: 10, borderRadius: 3,
                  background: isOff ? '#DDE8F3' : scfg.fill,
                  border: isOff ? '1px dashed #BDD0EA' : 'none',
                  position: 'relative', overflow: 'hidden',
                }}
                  animate={vm.state === 'running' ? { boxShadow: [`0 0 3px ${scfg.glow}`, `0 0 8px ${scfg.glow}`, `0 0 3px ${scfg.glow}`] }
                    : vm.state === 'snoozed' ? { opacity: [1, 0.5, 1] } : {}}
                  transition={{ duration: vm.state === 'running' ? 1.8 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div style={{ position:'absolute', right:2, top:'50%', transform:'translateY(-50%)', width:3, height:3, borderRadius:'50%', background: isOff ? 'transparent' : 'rgba(255,255,255,0.7)' }} />
                </motion.div>
              </motion.div>
            )
          })}
        </div>

        {/* bottom rail */}
        <div className="flex justify-between items-center px-1.5 pb-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7FA8CC' }} />
          <div className="h-px flex-1 mx-1" style={{ background: cfg.border }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7FA8CC' }} />
        </div>
      </div>

      {/* label */}
      <span className="text-[8px] font-black uppercase tracking-widest"
        style={{ color: cfg.color }}>{cfg.label}</span>
    </motion.div>
  )
}

// ─── Datacenter Card (horizontal layout) ─────────────────────────────────────

const ROLE_CFG = {
  primary:   { label: 'PRIMARY',   accent: '#1A4780', badge: 'bg-blue-100 text-blue-800',   liveTag: true  },
  secondary: { label: 'SECONDARY', accent: '#059669', badge: 'bg-green-100 text-green-800', liveTag: false },
  dr:        { label: 'DR',        accent: '#D97706', badge: 'bg-amber-100 text-amber-800', liveTag: false },
}

function DatacenterCardNew({ dc, isSelected, onClick }) {
  const allVms    = dc.racks.flatMap(r => r.vms)
  const running   = allVms.filter(v => v.state === 'running').length
  const snoozed   = allVms.filter(v => v.state === 'snoozed').length
  const destroyed = allVms.filter(v => v.state === 'destroyed').length
  const totalUsd  = allVms.reduce((a, v) => a + (v.optimisedMonthlyUsd || 0), 0)
  const role      = ROLE_CFG[dc.role] || ROLE_CFG.primary

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.38, ease: [0.22,1,0.36,1] }}
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(26,71,128,0.18)' }}
      onClick={() => onClick(dc)}
      className="cursor-pointer rounded-2xl overflow-hidden flex-1 min-w-0"
      style={{
        background: '#FFFFFF',
        border: isSelected ? `2px solid ${role.accent}` : '2px solid #E5E7EB',
        boxShadow: isSelected
          ? `0 8px 28px ${role.accent}30`
          : '0 1px 6px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.25s ease, border-color 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{ background: dc.active ? role.accent : '#F1F5F9', padding: '12px 16px 10px' }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full
            ${dc.active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {role.label}
          </span>
          {role.liveTag ? (
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-green-400/20 text-green-200 border border-green-400/30">
              ● Live
            </span>
          ) : (
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white/60">
              Demo
            </span>
          )}
        </div>
        <h3 className={`font-bold text-[13px] leading-tight ${dc.active ? 'text-white' : 'text-gray-700'}`}>{dc.name}</h3>
        <p className={`text-[10px] mt-0.5 ${dc.active ? 'text-white/60' : 'text-gray-400'}`}>📍 {dc.location}</p>
      </div>

      {/* Rack preview: 3 strips side by side */}
      <div className="px-4 py-4" style={{ background: '#F8FAFD', borderBottom: '1px solid #EEF2F8' }}>
        <div className="flex justify-center gap-4">
          {dc.racks.map((rack, i) => (
            <RackStrip key={rack.id} rack={rack} index={i} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-2" style={{ background: '#fff' }}>
        <div className="flex flex-wrap gap-2">
          {running   > 0 && (
            <div className="flex items-center gap-1">
              <motion.span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#1EA03C' }}
                animate={{ boxShadow: ['0 0 0 0 #1EA03C44','0 0 0 4px #1EA03C00','0 0 0 0 #1EA03C44'] }}
                transition={{ duration: 1.8, repeat: Infinity }} />
              <span className="text-[10px] text-gray-600">{running}</span>
            </div>
          )}
          {snoozed   > 0 && (
            <div className="flex items-center gap-1">
              <motion.span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F59E0B' }}
                animate={{ boxShadow: ['0 0 0 0 #F59E0B44','0 0 0 4px #F59E0B00','0 0 0 0 #F59E0B44'] }}
                transition={{ duration: 2.4, repeat: Infinity }} />
              <span className="text-[10px] text-gray-600">{snoozed}</span>
            </div>
          )}
          {destroyed > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#BE0032' }} />
              <span className="text-[10px] text-gray-600">{destroyed}</span>
            </div>
          )}
          {running === 0 && snoozed === 0 && destroyed === 0 && (
            <span className="text-[10px] text-gray-400">No active VMs</span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[11px] font-bold" style={{ color: role.accent }}>{usd(totalUsd)}</span>
          <span className="text-[9px] text-gray-400">/mo</span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Rack Representation inside Detail view ───────────────────────────────────

const ENV_CFG_DETAIL = {
  production:  { label: 'Production',  color: '#1A4780', bg: '#EFF4FB', border: '#BDD0EA', dot: '#1A4780' },
  development: { label: 'Development', color: '#5B21B6', bg: '#F5F3FF', border: '#C4B5FD', dot: '#6D28D9' },
  quality:     { label: 'Testing',     color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4', dot: '#0D9488' },
}

const STATE_CFG_DETAIL = {
  running:   { dot: '#1EA03C', bar: '#1EA03C', badge: '#DCFCE7', badgeText: '#166534', label: 'running'   },
  snoozed:   { dot: '#F59E0B', bar: '#F59E0B', badge: '#FEF3C7', badgeText: '#92400E', label: 'snoozed'   },
  destroyed: { dot: '#BE0032', bar: '#CBD5E1', badge: '#FFE4E6', badgeText: '#9F1239', label: 'destroyed' },
  offline:   { dot: '#CBD5E1', bar: '#E5E7EB', badge: '#F1F5F9', badgeText: '#64748B', label: 'offline'   },
}

function RackDetailRow({ rack, dcRole, selectedVmId, onSelectVm, dcActive }) {
  const [open, setOpen] = useState(rack.vms.some(v => v.state !== 'offline') || rack.vms.length > 0)
  const cfg = ENV_CFG_DETAIL[resolveRackEnv(rack)] || ENV_CFG_DETAIL.development
  const running   = rack.vms.filter(v => v.state === 'running').length
  const snoozed   = rack.vms.filter(v => v.state === 'snoozed').length
  const destroyed = rack.vms.filter(v => v.state === 'destroyed').length
  const cost      = rack.vms.reduce((a, v) => a + (v.optimisedMonthlyUsd || 0), 0)
  const roleCfg   = ROLE_CFG[dcRole] || ROLE_CFG.primary

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-xl overflow-hidden"
      style={{ border: `1.5px solid ${cfg.border}` }}
    >
      {/* Rack header — clickable to collapse */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: cfg.bg, borderBottom: open ? `1px solid ${cfg.border}` : 'none' }}
      >
        <div className="flex items-center gap-3">
          {/* Colour swatch */}
          <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: cfg.dot }} />
          <div>
            <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
            <span className="text-[10px] text-gray-400 ml-2">{rack.sublabel}</span>
          </div>
          <span className="text-[9px] text-gray-400 ml-1">{rack.vms.length} VM{rack.vms.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            {running   > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{running}</span>}
            {snoozed   > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{snoozed}</span>}
            {destroyed > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"   />{destroyed}</span>}
          </div>
          <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{usd(cost)}/mo</span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
            className="text-gray-400 text-[12px]">▾</motion.span>
        </div>
      </button>

      {/* Rack body — VM list as horizontal server slots */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22,1,0.36,1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="p-3 space-y-2" style={{ background: '#FAFBFC' }}>
              {/* Rack rail top */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                <div className="h-px flex-1" style={{ background: cfg.border }} />
                <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">{rack.id}</span>
                <div className="h-px flex-1" style={{ background: cfg.border }} />
                <div className="w-2 h-2 rounded-full bg-gray-300" />
              </div>

              {rack.vms.length === 0 ? (
                <div className="flex items-center justify-center py-5 text-[11px] text-gray-400 border border-dashed rounded-lg"
                  style={{ borderColor: cfg.border }}>
                  No VMs provisioned in this rack
                </div>
              ) : (
                <div className="space-y-2">
                  {rack.vms.map((vm, i) => {
                    const sc = STATE_CFG_DETAIL[vm.state] || STATE_CFG_DETAIL.offline
                    const selected = selectedVmId === vm.id
                    return (
                      <motion.div
                        key={vm.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 + 0.06, duration: 0.22 }}
                        onClick={() => dcActive && onSelectVm(vm)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all
                          ${dcActive ? 'cursor-pointer hover:border-blue-200' : 'cursor-default'}`}
                        style={{
                          background: selected ? '#EFF6FF' : '#fff',
                          borderColor: selected ? '#93C5FD' : '#E5E7EB',
                          outline: selected ? '2px solid #3B82F6' : 'none',
                          outlineOffset: selected ? '1px' : '0',
                        }}
                      >
                        {/* server chassis mini icon */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex flex-col items-center justify-center gap-0.5 relative"
                          style={{ background: sc.badge, border: `1px solid ${sc.badge}` }}>
                          {[0,1,2].map(k => (
                            <motion.div key={k} className="rounded-sm" style={{ width: 18, height: 3, background: sc.bar, opacity: vm.state === 'offline' ? 0.3 : 1 }}
                              animate={vm.state === 'running' ? { opacity: [0.4, 1, 0.4] } : {}}
                              transition={{ duration: 1.4, repeat: Infinity, delay: k * 0.25 }} />
                          ))}
                          <motion.div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }}
                            animate={vm.state === 'running' || vm.state === 'snoozed' ? { scale: [1, 1.5, 1] } : {}}
                            transition={{ duration: vm.state === 'running' ? 1.2 : 2.6, repeat: Infinity }} />
                        </div>

                        {/* VM info */}
                        <div className="min-w-0 flex-shrink-0 w-40">
                          <div className="text-[11px] font-mono font-semibold text-gray-800 truncate">{vm.id}</div>
                          <div className="text-[9px] text-gray-400 truncate">{vm.alias}</div>
                        </div>

                        {/* State badge */}
                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: sc.badge, color: sc.badgeText }}>
                          {sc.label}
                        </span>

                        {/* Size */}
                        <span className="text-[9px] text-gray-400 hidden sm:block flex-shrink-0">{vm.size || '—'}</span>

                        <div className="flex-1" />

                        {/* Cost */}
                        {vm.state !== 'destroyed' ? (
                          <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: roleCfg.accent }}>
                            {usd(vm.optimisedMonthlyUsd || 0)}<span className="text-[9px] font-normal text-gray-400">/mo</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">$0.00/mo</span>
                        )}

                        {dcActive && (
                          <span className="text-[10px] flex-shrink-0" style={{ color: selected ? '#3B82F6' : '#CBD5E1' }}>
                            {selected ? '●' : '○'}
                          </span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Rack rail bottom */}
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                <div className="h-px flex-1" style={{ background: cfg.border }} />
                <div className="w-2 h-2 rounded-full bg-gray-300" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Datacenter Detail (expanded view) ───────────────────────────────────────

import VMActionPanel from './VMActionPanel'

function DatacenterDetailNew({ dc, onClose, onRequestStateChange }) {
  const [selectedVm, setSelectedVm] = useState(null)
  const allVms    = dc.racks.flatMap(r => r.vms)
  const running   = allVms.filter(v => v.state === 'running').length
  const snoozed   = allVms.filter(v => v.state === 'snoozed').length
  const destroyed = allVms.filter(v => v.state === 'destroyed').length
  const totalUsd  = allVms.reduce((a, v) => a + (v.optimisedMonthlyUsd || 0), 0)
  const roleCfg   = ROLE_CFG[dc.role] || ROLE_CFG.primary

  function handleSelectVm(vm) { setSelectedVm(prev => prev?.id === vm.id ? null : vm) }
  function handleReq(vm, targetState) { setSelectedVm(null); onRequestStateChange(vm, targetState) }

  return (
    <div>
      {/* DC header */}
      <div className="rounded-xl px-5 py-4 mb-4" style={{ background: roleCfg.accent }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.06, type: 'spring', stiffness: 320 }}
              className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl flex-shrink-0">
              🏢
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-white font-bold text-[16px]">{dc.name}</h2>
                <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/20 text-white">
                  {roleCfg.label}
                </span>
                {dc.active && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold bg-nouryon-green text-white">Active</span>
                )}
              </div>
              <p className="text-white/60 text-[11px] mt-0.5">📍 {dc.location} · {dc.region}</p>
            </motion.div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            {totalUsd > 0 && (
              <div className="text-right">
                <div className="text-[9px] text-white/60 uppercase tracking-wider">Est. monthly</div>
                <div className="text-[16px] font-bold text-white">{usd(totalUsd)}</div>
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
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="flex items-center gap-5 mt-3 flex-wrap">
            {running   > 0 && (
              <div className="flex items-center gap-1.5">
                <motion.span className="w-2 h-2 rounded-full bg-nouryon-green flex-shrink-0"
                  animate={{ boxShadow: ['0 0 0 0 #1EA03C44','0 0 0 5px #1EA03C00','0 0 0 0 #1EA03C44'] }}
                  transition={{ duration: 1.8, repeat: Infinity }} />
                <span className="text-[11px] text-white/80">{running} running</span>
              </div>
            )}
            {snoozed   > 0 && (
              <div className="flex items-center gap-1.5">
                <motion.span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
                  animate={{ boxShadow: ['0 0 0 0 #F59E0B44','0 0 0 5px #F59E0B00','0 0 0 0 #F59E0B44'] }}
                  transition={{ duration: 2.5, repeat: Infinity }} />
                <span className="text-[11px] text-white/80">{snoozed} snoozed</span>
              </div>
            )}
            {destroyed > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-[11px] text-white/80">{destroyed} destroyed</span>
              </div>
            )}
            <span className="text-[11px] text-white/50 ml-auto">{allVms.length} VMs total</span>
          </motion.div>
        )}
      </div>

      {/* VM Action Panel */}
      {dc.active && (
        <VMActionPanel
          selectedVm={selectedVm}
          onRequestStateChange={handleReq}
          onClear={() => setSelectedVm(null)}
        />
      )}

      {/* Racks: Production → Development → Quality, one below other */}
      <div className="space-y-3">
        {dc.racks.map((rack, i) => (
          <RackDetailRow
            key={rack.id}
            rack={rack}
            dcRole={dc.role}
            selectedVmId={selectedVm?.id}
            onSelectVm={handleSelectVm}
            dcActive={dc.active}
          />
        ))}
      </div>

      {!dc.active && (
        <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-center">
          <p className="text-[12px] text-gray-500">Planned datacenter — VMs provisioned when needed.</p>
        </div>
      )}
    </div>
  )
}

// ─── Infrastructure sub-view ──────────────────────────────────────────────────

function InfraView({ datacenters, setDatacenters }) {
  // Store only DC id — the object is always resolved fresh from liveDcs so it's never stale
  const [selectedDcId, setSelectedDcId]  = useState(null)
  const [showModal, setShowModal]        = useState(false)
  const [vmTransition, setVmTransition]  = useState(null)
  const [toast, setToast]                = useState(null)

  const { vms: azureVms, lastSync: azSync } = useAzureVMs(true)
  const liveDcs = mergeAzureStates(datacenters, azureVms)

  // Always resolved fresh — never stale
  const selectedDc = selectedDcId ? (liveDcs.find(d => d.id === selectedDcId) ?? null) : null

  async function handleRequestStateChange(vm, targetState) {
    setToast({ msg: 'Request logged for admin review.', targetState, vmAlias: vm.alias })
    try {
      await fetch(`/api/vms/${vm.id}/request-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: targetState }),
      })
    } catch (_) {}
    setTimeout(() => setVmTransition({ vm, targetState }), 1500)
  }

  function handleTransitionComplete(vmId, newState) {
    setDatacenters(prev => prev.map(dc => ({
      ...dc,
      racks: dc.racks.map(rack => ({
        ...rack,
        vms: rack.vms.map(vm => vm.id === vmId ? { ...vm, state: newState } : vm),
      })),
    })))
    setVmTransition(null)
  }

  const allVms       = liveDcs.flatMap(d => d.racks.flatMap(r => r.vms))
  const running      = allVms.filter(v => v.state === 'running').length
  const snoozed      = allVms.filter(v => v.state === 'snoozed').length
  const destroyed    = allVms.filter(v => v.state === 'destroyed').length
  const totalCostUsd = allVms.reduce((a, v) => a + (v.optimisedMonthlyUsd || 0), 0)
  const isLive       = !!azureVms

  return (
    <>
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            {selectedDc ? (
              <div className="flex items-center gap-3">
                <motion.button whileHover={{x:-2}} whileTap={{scale:0.97}}
                  onClick={() => setSelectedDcId(null)}
                  className="flex items-center gap-1.5 text-nouryon-blue text-[12px] font-semibold hover:underline">
                  ← All Datacenters
                </motion.button>
                <span className="text-gray-300">|</span>
                <h1 className="text-[18px] font-bold text-gray-900">{selectedDc.name}</h1>
              </div>
            ) : (
              <>
                <h1 className="text-[20px] font-bold text-gray-900">Infrastructure Overview</h1>
                <p className="text-[12px] text-gray-500 mt-0.5">ChemCore International · Primary / Secondary / DR</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border"
              style={isLive
                ? { color:'#166534', background:'#F0FBF2', borderColor:'#A8DFB0' }
                : { color:'#6B7280', background:'#F9FAFB', borderColor:'#E5E7EB' }}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'bg-nouryon-green animate-pulse_green' : 'bg-gray-400'}`} />
              {isLive ? `Azure live · ${azSync?.toLocaleTimeString()}` : 'Pipeline active'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Running VMs"   value={running}           sub="Across all 3 datacenters" accent="#1EA03C" delay={0}    live={isLive} />
          <KpiCard label="Snoozed VMs"   value={snoozed}           sub="Auto-wake scheduled"       accent="#D97706" delay={0.05} live={isLive} />
          <KpiCard label="Destroyed VMs" value={destroyed}         sub="Deprovisioned"              accent="#BE0032" delay={0.1}  live={isLive} />
          <KpiCard label="Monthly Cost"  value={usd(totalCostUsd)} sub={isLive ? 'Live estimate (USD)' : 'Optimised estimate (USD)'} accent="#1A4780" delay={0.15} live={isLive} />
        </div>

        <AnimatePresence mode="wait">
          {/* ── GRID VIEW: three cards side by side ── */}
          {!selectedDc && (
            <motion.div key="grid"
              initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              transition={{duration:0.22}}>

              {/* Legend */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-card px-4 py-3 mb-5">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">VM State Guide</p>
                <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
                  {[
                    ['running',  'Running — live & serving'],
                    ['snoozed',  'Snoozed — paused, auto-wake'],
                    ['destroyed','Destroyed — deprovisioned'],
                    ['offline',  'Not provisioned'],
                  ].map(([s, l]) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <StatusDot state={s} size={8} />{l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section label */}
              <div className="flex items-center gap-4 mb-4">
                {[
                  { role: 'primary',   label: 'Primary',           desc: 'Live production workloads — real Azure VMs', accent: '#1A4780' },
                  { role: 'secondary', label: 'Secondary',          desc: 'Failover & load sharing',                    accent: '#059669' },
                  { role: 'dr',        label: 'Disaster Recovery',  desc: 'Geo-redundant cold standby',                 accent: '#D97706' },
                ].map(s => (
                  <div key={s.role} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                        style={{ color: s.accent, borderColor: s.accent, background: s.accent + '11' }}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* The three datacenter cards in a row */}
              <div className="flex gap-4 items-stretch">
                <AnimatePresence>
                  {liveDcs.map(dc => (
                    <DatacenterCardNew
                      key={dc.id}
                      dc={dc}
                      isSelected={false}
                      onClick={d => setSelectedDcId(d.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── DATACENTER DETAIL ── */}
          {selectedDc && (
            <motion.div key={selectedDc.id}
              initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
              transition={{duration:0.28,ease:[0.22,1,0.36,1]}}>
              <DatacenterDetailNew
                dc={selectedDc}
                onClose={() => setSelectedDcId(null)}
                onRequestStateChange={handleRequestStateChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals / Overlays */}
      <AnimatePresence>
        {showModal && <AddDatacenterModal onAdd={dc => setDatacenters(p => [...p, dc])} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {vmTransition && (
          <VMStateOverlay vm={vmTransition.vm} targetState={vmTransition.targetState}
            onComplete={handleTransitionComplete} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <RequestToast
            msg={toast.msg}
            targetState={toast.targetState}
            vmAlias={toast.vmAlias}
            onDone={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Root DevView ─────────────────────────────────────────────────────────────

export default function DevView({ datacenters, setDatacenters }) {
  const [subTab, setSubTab] = useState('infra')
  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 flex items-end">
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => setSubTab(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-3.5 text-[13px] font-semibold transition-colors
              ${subTab === tab.id ? 'text-nouryon-blue' : 'text-gray-500 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
            {subTab === tab.id && (
              <motion.div layoutId="devSubTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-nouryon-blue rounded-t"
                transition={{ type:'spring', stiffness:400, damping:30 }} />
            )}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={subTab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
          transition={{duration:0.18}} className="flex-1">
          {subTab === 'infra'    && <InfraView datacenters={datacenters} setDatacenters={setDatacenters} />}
          {subTab === 'pipeline' && <PipelineView />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}