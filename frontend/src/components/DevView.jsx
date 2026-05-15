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
  { id:'infra',    label:'Infrastructure', icon:'🏢' },
  { id:'pipeline', label:'Pipeline',        icon:'⚙️'  },
]

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

// Merges live Azure VM states into datacenter structure
function mergeAzureStates(datacenters, azureVms) {
  if (!azureVms) return datacenters
  const stateMap = Object.fromEntries(azureVms.map(v=>[v.id, v.state]))
  return datacenters.map(dc=>({
    ...dc,
    racks: dc.racks.map(rack=>({
      ...rack,
      vms: rack.vms.map(vm=>({
        ...vm,
        state: stateMap[vm.id] ?? vm.state,
      })),
    })),
  }))
}

function InfraView({ datacenters, setDatacenters }) {
  const [selectedDc, setSelectedDc]     = useState(null)   // full DC object, null = grid view
  const [showModal, setShowModal]       = useState(false)
  const [vmTransition, setVmTransition] = useState(null)   // { vm, targetState }
  const [toast, setToast]               = useState(null)   // message string

  // Live Azure VM state polling
  const { vms: azureVms, lastSync: azSync } = useAzureVMs(true)
  const liveDcs = mergeAzureStates(datacenters, azureVms)

  // When user requests a state change
  async function handleRequestStateChange(vm, targetState) {
    // Optimistically show toast
    const label = targetState==='running'?'start':targetState==='snoozed'?'snooze':'destroy'
    setToast(`Request to ${label} "${vm.alias}" accepted. Updating inventory.yml and pushing to GitHub — pipeline will start shortly.`)

    // Call backend (fails gracefully if not connected)
    try {
      await fetch(`/api/vms/${vm.id}/request-state`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ state: targetState }),
      })
    } catch (_) { /* offline — state will sync via polling */ }

    // Show cinematic overlay after short delay
    setTimeout(() => {
      setVmTransition({ vm, targetState })
    }, 1500)
  }

  // Overlay completes → apply state locally (Azure poll will confirm)
  function handleTransitionComplete(vmId, newState) {
    setDatacenters(prev =>
      prev.map(dc=>({
        ...dc,
        racks: dc.racks.map(rack=>({
          ...rack,
          vms: rack.vms.map(vm=>vm.id===vmId?{...vm,state:newState}:vm),
        })),
      }))
    )
    // Refresh selected DC
    if (selectedDc) {
      setSelectedDc(prev=>prev ? {
        ...prev,
        racks: prev.racks.map(rack=>({
          ...rack,
          vms: rack.vms.map(vm=>vm.id===vmId?{...vm,state:newState}:vm),
        })),
      } : null)
    }
    setVmTransition(null)
  }

  function addDc(dc) { setDatacenters(p=>[...p,dc]) }
  function removeDc(id) {
    setDatacenters(p=>p.filter(d=>d.id!==id))
    if (selectedDc?.id===id) setSelectedDc(null)
  }

  const allVms    = liveDcs.flatMap(d=>d.racks.flatMap(r=>r.vms))
  const running   = allVms.filter(v=>v.state==='running').length
  const snoozed   = allVms.filter(v=>v.state==='snoozed').length
  const destroyed = allVms.filter(v=>v.state==='destroyed').length
  const totalCost = allVms.reduce((a,v)=>a+(v.optimisedMonthlyInr||0),0)
  const isLive    = !!azureVms

  // Live selected DC derived from merged state
  const liveSel = selectedDc
    ? liveDcs.find(d=>d.id===selectedDc.id) || null
    : null

  return (
    <>
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            {selectedDc ? (
              <div className="flex items-center gap-3">
                <motion.button whileHover={{x:-2}} whileTap={{scale:0.97}}
                  onClick={()=>setSelectedDc(null)}
                  className="flex items-center gap-1.5 text-nouryon-blue text-[12px] font-semibold hover:underline">
                  ← All Datacenters
                </motion.button>
                <span className="text-gray-300">|</span>
                <h1 className="text-[18px] font-bold text-gray-900">{selectedDc.name}</h1>
              </div>
            ) : (
              <>
                <h1 className="text-[20px] font-bold text-gray-900">Infrastructure Overview</h1>
                <p className="text-[12px] text-gray-500 mt-0.5">ChemCore International · Azure DevOps Automation</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border"
              style={isLive
                ? {color:'#166534',background:'#F0FBF2',borderColor:'#A8DFB0'}
                : {color:'#6B7280',background:'#F9FAFB',borderColor:'#E5E7EB'}}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive?'bg-nouryon-green animate-pulse_green':'bg-gray-400'}`} />
              {isLive ? `Azure live · ${azSync?.toLocaleTimeString()}` : 'Pipeline active'}
            </span>
            {!selectedDc && (
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                onClick={()=>setShowModal(true)}
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
          <KpiCard label="Running VMs"   value={running}   sub="Serving live traffic"  accent="#1EA03C" delay={0}    live={isLive}/>
          <KpiCard label="Snoozed VMs"   value={snoozed}   sub="Auto-wake scheduled"   accent="#D97706" delay={0.05} live={isLive}/>
          <KpiCard label="Destroyed VMs" value={destroyed} sub="Deprovisioned"         accent="#BE0032" delay={0.1}  live={isLive}/>
          <KpiCard label="Monthly Cost"  value={`₹${totalCost.toLocaleString()}`} sub={isLive?"Live estimate":"Optimised estimate"} accent="#1A4780" delay={0.15} live={isLive}/>
        </div>

        <AnimatePresence mode="wait">
          {/* ── GRID VIEW (no DC selected) ── */}
          {!selectedDc && (
            <motion.div key="grid"
              initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              transition={{duration:0.22}}>
              {/* State legend */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-card px-4 py-3 mb-5">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">VM State Guide</p>
                <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
                  {[['running','Running — live & serving'],['snoozed','Snoozed — paused, auto-wake'],['destroyed','Destroyed — deprovisioned'],['offline','Not provisioned']].map(([s,l])=>(
                    <div key={s} className="flex items-center gap-1.5"><StatusDot state={s} size={8}/>{l}</div>
                  ))}
                </div>
              </div>
              {/* DC card grid — fills full width */}
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Datacenters ({liveDcs.length}) — click to open
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence>
                  {liveDcs.map(dc=>(
                    <DatacenterCard key={dc.id} dc={dc} isSelected={false}
                      onClick={d=>setSelectedDc(d)}
                      onRemove={!dc.active?removeDc:null} />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── DATACENTER DETAIL (full main section) ── */}
          {selectedDc && liveSel && (
            <motion.div key={selectedDc.id}
              initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
              transition={{duration:0.28,ease:[0.22,1,0.36,1]}}>
              <DatacenterDetail
                dc={liveSel}
                onClose={()=>setSelectedDc(null)}
                onRequestStateChange={handleRequestStateChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals / Overlays */}
      <AnimatePresence>
        {showModal && <AddDatacenterModal onAdd={addDc} onClose={()=>setShowModal(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {vmTransition && (
          <VMStateOverlay vm={vmTransition.vm} targetState={vmTransition.targetState}
            onComplete={handleTransitionComplete} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <RequestToast msg={toast} onDone={()=>setToast(null)} />}
      </AnimatePresence>
    </>
  )
}

export default function DevView({ datacenters, setDatacenters }) {
  const [subTab, setSubTab] = useState('infra')
  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 flex items-end">
        {SUB_TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setSubTab(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-3.5 text-[13px] font-semibold transition-colors ${subTab===tab.id?'text-nouryon-blue':'text-gray-500 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
            {subTab===tab.id && (
              <motion.div layoutId="devSubTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-nouryon-blue rounded-t"
                transition={{type:'spring',stiffness:400,damping:30}} />
            )}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={subTab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
          transition={{duration:0.18}} className="flex-1">
          {subTab==='infra'    && <InfraView datacenters={datacenters} setDatacenters={setDatacenters} />}
          {subTab==='pipeline' && <PipelineView />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
