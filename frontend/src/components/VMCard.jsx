import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StateBadge } from './StatusDot'
import { STATE_META } from '../data/inventory'

// Action options per current state
const ACTIONS = {
  running:   [{ to:'snoozed', label:'⏸ Snooze', s:'#FFFBEB', c:'#92400E', b:'#FCD34D' }, { to:'destroyed', label:'✕ Destroy', s:'#FFF1F2', c:'#9F1239', b:'#FECDD3' }],
  snoozed:   [{ to:'running', label:'▶ Start',   s:'#F0FBF2', c:'#166534', b:'#86EFAC' }, { to:'destroyed', label:'✕ Destroy', s:'#FFF1F2', c:'#9F1239', b:'#FECDD3' }],
  destroyed: [{ to:'running', label:'▶ Reprovision', s:'#F0FBF2', c:'#166534', b:'#86EFAC' }],
  offline:   [],
}

function MeterBar({ label, pct, color, delay }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-500 w-12">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <motion.div className="h-1.5 rounded-full" style={{background:color}}
          initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8,delay,ease:[0.22,1,0.36,1]}} />
      </div>
      <span className="text-[11px] text-gray-600 w-7 text-right">{pct}%</span>
    </div>
  )
}

export default function VMCard({ vm, index, onRequestStateChange }) {
  const [open, setOpen] = useState(false)
  const meta   = STATE_META[vm.state] || STATE_META.offline
  const dummy  = vm.state === 'offline'
  const actions = ACTIONS[vm.state] || []
  const cpuPct  = vm.state==='running'?42:vm.state==='snoozed'?8:0
  const memPct  = vm.state==='running'?61:vm.state==='snoozed'?12:0
  const diskPct = vm.state!=='offline'?38:0

  return (
    <motion.div layout
      initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
      transition={{delay:index*0.06,duration:0.3,ease:[0.22,1,0.36,1]}}
      className={`rack-unit state-${vm.state} mb-2`}
    >
      <motion.button
        onClick={()=>!dummy&&setOpen(o=>!o)} disabled={dummy}
        whileHover={!dummy?{backgroundColor:'rgba(248,250,253,0.85)'}:{}}
        whileTap={!dummy?{scale:0.998}:{}}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${dummy?'cursor-default opacity-40':'cursor-pointer'}`}
      >
        <div className="screw" />
        <motion.div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-[14px]"
          style={{background:meta.bg,border:`1px solid ${meta.border}`}}
          animate={vm.state==='running'?{boxShadow:[`0 0 0 ${meta.color}33`,`0 0 8px ${meta.color}55`,`0 0 0 ${meta.color}33`]}:{}}
          transition={{duration:2,repeat:Infinity}}
        >{dummy?'○':meta.icon}</motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-gray-900 truncate">{vm.alias}</span>
          </div>
          <div className="text-[11px] text-gray-500 truncate mt-0.5">{vm.purpose}</div>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
          <div className="led-row">
            {Array.from({length:12}).map((_,i)=>{
              const on = vm.state==='running'?10:vm.state==='snoozed'?5:vm.state==='destroyed'?2:0
              const cls = vm.state==='running'?'on-green':vm.state==='snoozed'?'on-amber':vm.state==='destroyed'?'on-red':''
              return <motion.div key={i} className={`led ${i<on?cls:''}`}
                initial={{scale:0}} animate={{scale:1}} transition={{delay:i*0.022,type:'spring',stiffness:500}} />
            })}
          </div>
          <StateBadge state={vm.state} />
        </div>

        {!dummy && (
          <div className="flex-shrink-0 text-right ml-2">
            <div className="text-[10px] text-gray-400">Monthly</div>
            <div className="text-[13px] font-bold text-nouryon-blue">₹{vm.optimisedMonthlyInr.toLocaleString()}</div>
          </div>
        )}
        {!dummy && <motion.div animate={{rotate:open?180:0}} transition={{duration:0.2}} className="text-gray-400 ml-1 flex-shrink-0">▾</motion.div>}
        <div className="screw" />
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            transition={{duration:0.28,ease:[0.22,1,0.36,1]}} style={{overflow:'hidden'}}>
            <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-white/70">

              {/* State banner */}
              <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} transition={{delay:0.04}}
                className="flex items-start gap-2 rounded-lg p-3 mb-3 text-[12px]"
                style={{background:meta.bg,border:`1px solid ${meta.border}`}}>
                <span className="text-base">{meta.icon}</span>
                <div>
                  <span className="font-semibold" style={{color:meta.color}}>{meta.label}</span>
                  <span className="text-gray-600 ml-1">— {meta.labelLong}</span>
                  {vm.snooze && (
                    <div className="mt-1 text-[11px] text-gray-500">
                      Sleeps <strong>{vm.snooze.sleep}</strong> · Wakes <strong>{vm.snooze.wake}</strong> · {vm.snooze.days} · {vm.snooze.tz}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Specs + Cost */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:0.07}}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Specs</p>
                  {[['CPU',`${vm.cpu} vCPU`],['Memory',`${vm.memGb} GB`],['Disk',`${vm.diskGb} GB`],['Size',vm.size],['Env',vm.environment]].map(([k,v])=>(
                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-[11px] text-gray-500 uppercase font-semibold tracking-wide">{k}</span>
                      <span className="text-[12px] font-medium text-gray-800">{v}</span>
                    </div>
                  ))}
                </motion.div>
                <motion.div initial={{opacity:0,x:6}} animate={{opacity:1,x:0}} transition={{delay:0.09}}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Cost</p>
                  {[['Per hour',`₹${vm.costHrInr}`],['Full/mo',`₹${vm.monthlyInr.toLocaleString()}`],['Optimised',`₹${vm.optimisedMonthlyInr.toLocaleString()}`],['Savings',`₹${vm.savingsInr.toLocaleString()}`]].map(([k,v])=>(
                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-[11px] text-gray-500 uppercase font-semibold tracking-wide">{k}</span>
                      <span className="text-[12px] font-medium text-nouryon-blue">{v}</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-nouryon-blue font-semibold mt-2">{vm.contact}</p>
                  <p className="text-[11px] text-gray-500">{vm.unit}</p>
                </motion.div>
              </div>

              {/* Utilisation meters */}
              {(vm.state==='running'||vm.state==='snoozed') && (
                <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:0.12}} className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Utilisation</p>
                  <div className="space-y-2">
                    <MeterBar label="CPU"    pct={cpuPct}  color="#1A4780" delay={0.14}/>
                    <MeterBar label="Memory" pct={memPct}  color="#00ABA9" delay={0.17}/>
                    <MeterBar label="Disk"   pct={diskPct} color="#1EA03C" delay={0.20}/>
                  </div>
                </motion.div>
              )}

              {/* ── Action buttons ── */}
              {!dummy && actions.length > 0 && onRequestStateChange && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.15}}
                  className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Change state</p>
                  <div className="flex gap-2 flex-wrap">
                    {actions.map(a=>(
                      <motion.button key={a.to}
                        whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                        onClick={()=>onRequestStateChange(vm,a.to)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                        style={{background:a.s,color:a.c,border:`1px solid ${a.b}`}}
                      >{a.label}</motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.18}}
                className="mt-3 p-2.5 rounded bg-gray-50 border border-gray-100">
                <p className="text-[11px] text-gray-600 leading-relaxed">{vm.businessNeed}</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
