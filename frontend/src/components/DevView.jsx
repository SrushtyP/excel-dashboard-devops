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
// Three datacenters: Primary (real Azure VMs), Secondary (demo), DR (demo).
// Real VM IDs match /api/vms — live state is merged in via useAzureVMs.

export const INITIAL_DATACENTERS = [
  {
    id:       'dc-primary',
    name:     'Primary — South Africa North',
    location: 'Johannesburg, ZA',
    region:   'southafricanorth',
    active:   true,
    racks: [
      {
        id:       'rack-primary-prod',
        label:    'Production VMs',
        sublabel: 'Live compliance & R&D workloads',
        active:   true,
        vms: [
          {
            id:                  'vm-running',
            alias:               'Compliance reporting portal',
            state:               'running',
            environment:         'production',
            contact:             'compliance-team@chemcore.com',
            unit:                'Global Compliance',
            priority:            'critical',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrInr:           7.18,
            monthlyInr:          5250,
            optimisedMonthlyInr: 5250,
            savingsInr:          0,
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
            environment:         'staging',
            contact:             'rnd-mumbai@chemcore.com',
            unit:                'R&D Mumbai',
            priority:            'medium',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrInr:           7.18,
            monthlyInr:          5250,
            optimisedMonthlyInr: 1966,
            savingsInr:          3284,
            costHrUsd:           0.096,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 23.40,
            savingsUsd:          39.10,
            businessNeed:        'Active 8am–8pm IST weekdays only. Snoozed overnight and weekends.',
          },
        ],
      },
      {
        id:       'rack-primary-ephemeral',
        label:    'Ephemeral VMs',
        sublabel: 'On-demand audit compute',
        active:   true,
        vms: [
          {
            id:                  'vm-destroyed',
            alias:               'CPCB audit generator',
            state:               'destroyed',
            environment:         'ephemeral',
            contact:             'audit-team@chemcore.com',
            unit:                'India Audit Team',
            priority:            'low',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrInr:           0,
            monthlyInr:          5250,
            optimisedMonthlyInr: 0,
            savingsInr:          5250,
            costHrUsd:           0,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 0,
            savingsUsd:          62.50,
            businessNeed:        'Ephemeral compute for India CPCB hazardous waste compliance report.',
          },
        ],
      },
      {
        id:       'rack-primary-dr',
        label:    'DR Standby VMs',
        sublabel: 'Warm standby for primary',
        active:   false,
        vms:      [],
      },
    ],
  },

  {
    id:       'dc-secondary',
    name:     'Secondary — South Africa West',
    location: 'Cape Town, ZA',
    region:   'southafricawest',
    active:   true,
    racks: [
      {
        id:       'rack-sec-prod',
        label:    'Production VMs',
        sublabel: 'Failover & load sharing',
        active:   true,
        vms: [
          {
            id:                  'vm-sec-portal',
            alias:               'Compliance portal — failover',
            state:               'snoozed',
            environment:         'production',
            contact:             'compliance-team@chemcore.com',
            unit:                'Global Compliance',
            priority:            'high',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrInr:           7.18,
            monthlyInr:          5250,
            optimisedMonthlyInr: 1966,
            savingsInr:          3284,
            costHrUsd:           0.096,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 23.40,
            savingsUsd:          39.10,
            businessNeed:        'Hot standby for compliance portal. Active only during primary failover.',
          },
          {
            id:                  'vm-sec-rnd',
            alias:               'R&D secondary node',
            state:               'snoozed',
            environment:         'staging',
            contact:             'rnd-mumbai@chemcore.com',
            unit:                'R&D Mumbai',
            priority:            'medium',
            size:                'Standard_B2s',
            cpu:                 2,
            memGb:               4,
            diskGb:              20,
            costHrInr:           3.20,
            monthlyInr:          2340,
            optimisedMonthlyInr: 877,
            savingsInr:          1463,
            costHrUsd:           0.042,
            monthlyUsd:          30.60,
            optimisedMonthlyUsd: 10.43,
            savingsUsd:          20.17,
            businessNeed:        'Secondary R&D workloads. Mirrors primary lab data nightly.',
          },
        ],
      },
      {
        id:       'rack-sec-batch',
        label:    'Batch Processing VMs',
        sublabel: 'Report generation queue',
        active:   true,
        vms: [
          {
            id:                  'vm-sec-batch',
            alias:               'Batch report processor',
            state:               'running',
            environment:         'production',
            contact:             'ops-team@chemcore.com',
            unit:                'Operations',
            priority:            'medium',
            size:                'Standard_D4s_v3',
            cpu:                 4,
            memGb:               16,
            diskGb:              64,
            costHrInr:           14.36,
            monthlyInr:          10500,
            optimisedMonthlyInr: 10500,
            savingsInr:          0,
            costHrUsd:           0.192,
            monthlyUsd:          140.00,
            optimisedMonthlyUsd: 140.00,
            savingsUsd:          0,
            businessNeed:        'Processes compliance batch reports for 12 African regulatory bodies.',
          },
        ],
      },
      {
        id:       'rack-sec-mgmt',
        label:    'Management VMs',
        sublabel: 'Ops & monitoring',
        active:   false,
        vms:      [],
      },
    ],
  },

  {
    id:       'dc-dr',
    name:     'Disaster Recovery — Southeast Asia',
    location: 'Singapore',
    region:   'southeastasia',
    active:   true,
    racks: [
      {
        id:       'rack-dr-cold',
        label:    'Cold Standby VMs',
        sublabel: 'Geo-redundant recovery',
        active:   true,
        vms: [
          {
            id:                  'vm-dr-portal',
            alias:               'Compliance portal — DR',
            state:               'snoozed',
            environment:         'production',
            contact:             'compliance-team@chemcore.com',
            unit:                'Global Compliance',
            priority:            'critical',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              30,
            costHrInr:           7.18,
            monthlyInr:          5250,
            optimisedMonthlyInr: 1966,
            savingsInr:          3284,
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
            environment:         'production',
            contact:             'dba-team@chemcore.com',
            unit:                'Global Compliance',
            priority:            'critical',
            size:                'Standard_D2s_v3',
            cpu:                 2,
            memGb:               8,
            diskGb:              128,
            costHrInr:           7.18,
            monthlyInr:          5250,
            optimisedMonthlyInr: 1966,
            savingsInr:          3284,
            costHrUsd:           0.096,
            monthlyUsd:          62.50,
            optimisedMonthlyUsd: 23.40,
            savingsUsd:          39.10,
            businessNeed:        'Async database replica. RPO 1h. Snapshots synced every 6h.',
          },
        ],
      },
      {
        id:       'rack-dr-infra',
        label:    'Infrastructure VMs',
        sublabel: 'Network & DNS failover',
        active:   true,
        vms: [
          {
            id:                  'vm-dr-infra',
            alias:               'Network infra — DR',
            state:               'running',
            environment:         'production',
            contact:             'netops-team@chemcore.com',
            unit:                'Infrastructure',
            priority:            'high',
            size:                'Standard_B2s',
            cpu:                 2,
            memGb:               4,
            diskGb:              20,
            costHrInr:           3.20,
            monthlyInr:          2340,
            optimisedMonthlyInr: 2340,
            savingsInr:          0,
            costHrUsd:           0.042,
            monthlyUsd:          30.60,
            optimisedMonthlyUsd: 30.60,
            savingsUsd:          0,
            businessNeed:        'Always-on network infrastructure: DNS, VPN gateway, health monitoring for DR site.',
          },
        ],
      },
      {
        id:       'rack-dr-test',
        label:    'DR Test VMs',
        sublabel: 'Quarterly DR drill environment',
        active:   false,
        vms:      [],
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
// Only real VM IDs (vm-running, vm-snoozed, vm-destroyed) get updated —
// secondary/DR demo VMs keep their demo state.
function mergeAzureStates(datacenters, azureVms) {
  if (!azureVms) return datacenters
  const stateMap = Object.fromEntries(azureVms.map(v => [v.id, v]))
  return datacenters.map(dc => ({
    ...dc,
    racks: dc.racks.map(rack => ({
      ...rack,
      vms: rack.vms.map(vm => {
        const live = stateMap[vm.id]
        if (!live) return vm  // demo VM — keep as-is
        return {
          ...vm,
          ...live,           // spread all live fields (state, cost, alias, etc.)
          id: vm.id,         // ensure id is preserved
        }
      }),
    })),
  }))
}

// ─── Infrastructure sub-view ──────────────────────────────────────────────────

function InfraView({ datacenters, setDatacenters }) {
  const [selectedDc, setSelectedDc]     = useState(null)
  const [showModal, setShowModal]       = useState(false)
  const [vmTransition, setVmTransition] = useState(null)
  const [toast, setToast]               = useState(null)

  const { vms: azureVms, lastSync: azSync } = useAzureVMs(true)
  const liveDcs = mergeAzureStates(datacenters, azureVms)

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
    const patch = prev => prev.map(dc => ({
      ...dc,
      racks: dc.racks.map(rack => ({
        ...rack,
        vms: rack.vms.map(vm => vm.id === vmId ? { ...vm, state: newState } : vm),
      })),
    }))
    setDatacenters(patch)
    if (selectedDc) setSelectedDc(prev => prev ? patch([prev])[0] : null)
    setVmTransition(null)
  }

  function addDc(dc) { setDatacenters(p => [...p, dc]) }
  function removeDc(id) {
    setDatacenters(p => p.filter(d => d.id !== id))
    if (selectedDc?.id === id) setSelectedDc(null)
  }

  const allVms    = liveDcs.flatMap(d => d.racks.flatMap(r => r.vms))
  const running   = allVms.filter(v => v.state === 'running').length
  const snoozed   = allVms.filter(v => v.state === 'snoozed').length
  const destroyed = allVms.filter(v => v.state === 'destroyed').length
  const totalCost = allVms.reduce((a, v) => a + (v.optimisedMonthlyInr || 0), 0)
  const isLive    = !!azureVms
  const liveSel   = selectedDc ? liveDcs.find(d => d.id === selectedDc.id) || null : null

  return (
    <>
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            {selectedDc ? (
              <div className="flex items-center gap-3">
                <motion.button whileHover={{x:-2}} whileTap={{scale:0.97}}
                  onClick={() => setSelectedDc(null)}
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
            {/* DC role badges in the header */}
            {!selectedDc && (
              <div className="hidden md:flex items-center gap-2">
                {[
                  { label: 'Primary',   color: '#1A4780' },
                  { label: 'Secondary', color: '#059669' },
                  { label: 'DR',        color: '#D97706' },
                ].map(b => (
                  <span key={b.label}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ color: b.color, borderColor: b.color, background: b.color + '11' }}>
                    {b.label}
                  </span>
                ))}
              </div>
            )}
            <span className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border"
              style={isLive
                ? { color:'#166534', background:'#F0FBF2', borderColor:'#A8DFB0' }
                : { color:'#6B7280', background:'#F9FAFB', borderColor:'#E5E7EB' }}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'bg-nouryon-green animate-pulse_green' : 'bg-gray-400'}`} />
              {isLive ? `Azure live · ${azSync?.toLocaleTimeString()}` : 'Pipeline active'}
            </span>
            {!selectedDc && (
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-nouryon-blue hover:bg-blue-900 text-white text-[13px] font-bold px-4 py-2 rounded-lg shadow-card transition-colors">
                + Add Datacenter
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Running VMs"   value={running}   sub="Across all 3 datacenters" accent="#1EA03C" delay={0}    live={isLive} />
          <KpiCard label="Snoozed VMs"   value={snoozed}   sub="Auto-wake scheduled"       accent="#D97706" delay={0.05} live={isLive} />
          <KpiCard label="Destroyed VMs" value={destroyed} sub="Deprovisioned"              accent="#BE0032" delay={0.1}  live={isLive} />
          <KpiCard label="Monthly Cost"  value={`₹${totalCost.toLocaleString('en-IN')}`}
            sub={isLive ? 'Live estimate' : 'Optimised estimate'} accent="#1A4780" delay={0.15} live={isLive} />
        </div>

        <AnimatePresence mode="wait">
          {/* ── GRID VIEW ── */}
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

              {/* Datacenter role sections */}
              {[
                { role: 'Primary',            accent: '#1A4780', ids: ['dc-primary'],   desc: 'Live production workloads — real Azure VMs' },
                { role: 'Secondary',          accent: '#059669', ids: ['dc-secondary'], desc: 'Failover & load sharing — Cape Town' },
                { role: 'Disaster Recovery',  accent: '#D97706', ids: ['dc-dr'],        desc: 'Geo-redundant cold standby — Singapore' },
              ].map(section => {
                const sectionDcs = liveDcs.filter(d => section.ids.includes(d.id))
                const extraDcs   = liveDcs.filter(d =>
                  !['dc-primary','dc-secondary','dc-dr'].includes(d.id) &&
                  section.role === 'Primary'   // show user-added DCs under Primary
                )
                const allSectionDcs = [...sectionDcs, ...(section.role === 'Primary' ? extraDcs : [])]
                return (
                  <div key={section.role} className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
                        style={{ color: section.accent, borderColor: section.accent, background: section.accent + '11' }}>
                        {section.role}
                      </span>
                      <span className="text-[11px] text-gray-400">{section.desc}</span>
                      {section.role === 'Primary' && (
                        <span className="ml-auto text-[10px] text-green-600 font-semibold bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          ● Live Azure data
                        </span>
                      )}
                      {section.role !== 'Primary' && (
                        <span className="ml-auto text-[10px] text-blue-500 font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          Demo
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <AnimatePresence>
                        {allSectionDcs.map(dc => (
                          <DatacenterCard key={dc.id} dc={dc} isSelected={false}
                            onClick={d => setSelectedDc(d)}
                            onRemove={!dc.active && !['dc-primary','dc-secondary','dc-dr'].includes(dc.id) ? removeDc : null}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* ── DATACENTER DETAIL ── */}
          {selectedDc && liveSel && (
            <motion.div key={selectedDc.id}
              initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
              transition={{duration:0.28,ease:[0.22,1,0.36,1]}}>
              <DatacenterDetail
                dc={liveSel}
                onClose={() => setSelectedDc(null)}
                onRequestStateChange={handleRequestStateChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals / Overlays */}
      <AnimatePresence>
        {showModal && <AddDatacenterModal onAdd={addDc} onClose={() => setShowModal(false)} />}
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