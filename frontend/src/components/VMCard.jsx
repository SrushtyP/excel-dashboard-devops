import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StateBadge } from './StatusDot'
import { STATE_META } from '../data/inventory'

const ACTIONS = {
  running:   [{ to:'snoozed', label:'⏸ Snooze', s:'#FFFBEB', c:'#92400E', b:'#FCD34D' },
              { to:'destroyed', label:'✕ Destroy', s:'#FFF1F2', c:'#9F1239', b:'#FECDD3' }],
  snoozed:   [{ to:'running', label:'▶ Start',   s:'#F0FBF2', c:'#166534', b:'#86EFAC' },
              { to:'destroyed', label:'✕ Destroy', s:'#FFF1F2', c:'#9F1239', b:'#FECDD3' }],
  destroyed: [{ to:'running', label:'▶ Reprovision', s:'#F0FBF2', c:'#166534', b:'#86EFAC' }],
  offline:   [],
}

const usd = v => `$${(+(v||0)).toFixed(2)}`

// ── Animations ────────────────────────────────────────────────────────────────
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[0,1,2,3,4].map(i => (
        <motion.div key={i} className="absolute w-1 h-1 rounded-full"
          style={{ background:'#1EA03C', left:`${18+i*15}%`, top:'65%' }}
          animate={{ y:[0,-18,0], opacity:[0,0.7,0] }}
          transition={{ duration:1.8+i*0.3, repeat:Infinity, delay:i*0.4 }} />
      ))}
    </div>
  )
}
function SleepZs() {
  return (
    <div className="absolute right-1 top-0 pointer-events-none" style={{width:20,height:24}}>
      {['Z','z','z'].map((z,i)=>(
        <motion.span key={i} className="absolute font-black select-none"
          style={{fontSize:5+i*2,color:'#F59E0B',right:i*3,top:i*4,opacity:0}}
          animate={{y:[-2,-12],opacity:[0,0.9,0],scale:[0.7,1.1,0.7]}}
          transition={{duration:2.2,repeat:Infinity,delay:i*0.55}}>{z}</motion.span>
      ))}
    </div>
  )
}
function Debris() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[0,1,2,3].map(i=>(
        <motion.div key={i} className="absolute w-0.5 h-0.5 rounded-sm"
          style={{background:'#BE0032',left:`${22+i*15}%`,top:'40%'}}
          animate={{y:[0,10],x:[i%2===0?-3:3],opacity:[0.7,0],rotate:[0,45]}}
          transition={{duration:1.4,repeat:Infinity,delay:i*0.35}} />
      ))}
    </div>
  )
}

function VMIcon({ state, meta }) {
  if (state==='running') return (
    <motion.div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
      style={{background:'linear-gradient(135deg,#0d6e26,#1EA03C)',border:'1px solid #86EFAC'}}
      animate={{boxShadow:['0 0 0px #1EA03C22','0 0 8px #1EA03C55','0 0 0px #1EA03C22']}}
      transition={{duration:2,repeat:Infinity}}>
      <span className="relative z-10 text-white text-[12px]">▶</span>
      <Particles />
    </motion.div>
  )
  if (state==='snoozed') return (
    <motion.div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-visible"
      style={{background:'linear-gradient(135deg,#b45309,#D97706)',border:'1px solid #FCD34D'}}
      animate={{opacity:[1,0.6,1]}} transition={{duration:2.5,repeat:Infinity}}>
      <span className="text-white text-[12px]">⏸</span>
      <SleepZs />
    </motion.div>
  )
  if (state==='destroyed') return (
    <motion.div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
      style={{background:'linear-gradient(135deg,#7f0020,#BE0032)',border:'1px solid #FECDD3'}}>
      <motion.div className="absolute inset-0"
        style={{background:'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.1) 3px,rgba(0,0,0,0.1) 4px)'}} />
      <span className="relative z-10 text-white text-[11px] font-black">✕</span>
      <Debris />
    </motion.div>
  )
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 opacity-40"
      style={{background:'#F3F4F6',border:'1px solid #E5E7EB'}}>
      <span className="text-gray-400 text-[11px]">○</span>
    </div>
  )
}

// ── Clean key-value row ───────────────────────────────────────────────────────
function KV({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-1 gap-3 border-b border-gray-50 last:border-0">
      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wide whitespace-nowrap">{label}</span>
      <span className="text-[10px] font-semibold text-right" style={{color:accent||'#374151'}}>{value}</span>
    </div>
  )
}

function Meter({ label, pct, color, delay }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-gray-400 w-7 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1 overflow-hidden">
        <motion.div className="h-1 rounded-full" style={{background:color}}
          initial={{width:0}} animate={{width:`${pct}%`}}
          transition={{duration:0.7,delay,ease:[0.22,1,0.36,1]}} />
      </div>
      <span className="text-[9px] text-gray-400 w-5 text-right flex-shrink-0">{pct}%</span>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export default function VMCard({ vm, index, onRequestStateChange }) {
  const [open, setOpen] = useState(false)
  const meta    = STATE_META[vm.state] || STATE_META.offline
  const dummy   = vm.state === 'offline'
  const actions = ACTIONS[vm.state] || []

  const optUsd  = vm.optimisedMonthlyUsd ?? (vm.optimisedMonthlyInr||0)/84
  const fullUsd = vm.monthlyUsd          ?? (vm.monthlyInr||0)/84
  const savUsd  = vm.savingsUsd          ?? (vm.savingsInr||0)/84
  const hrUsd   = vm.costHrUsd           ?? (vm.costHrInr||0)/84

  const cpuPct  = vm.state==='running'?42:vm.state==='snoozed'?8:0
  const memPct  = vm.state==='running'?61:vm.state==='snoozed'?12:0
  const diskPct = vm.state!=='offline'?38:0

  const glow = vm.state==='running'?'#1EA03C':vm.state==='snoozed'?'#F59E0B':vm.state==='destroyed'?'#BE0032':'transparent'
  const bg   = vm.state==='running'    ? 'linear-gradient(180deg,#f8fffe,#edfaf0)'
    : vm.state==='snoozed'   ? 'linear-gradient(180deg,#fffdf5,#fffbeb)'
    : vm.state==='destroyed' ? 'linear-gradient(180deg,#fffbfb,#fff1f2)'
    : '#FAFAFA'

  return (
    <motion.div layout
      initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}}
      transition={{delay:index*0.05,duration:0.25}}
      className={`rack-unit state-${vm.state} mb-2 relative overflow-visible`}
      style={{background:bg,
        boxShadow:open?`0 3px 12px ${glow}1A,0 1px 2px rgba(0,0,0,0.04)`:`0 1px 2px rgba(0,0,0,0.03)`,
        transition:'box-shadow 0.3s'}}>

      {/* Top accent */}
      <motion.div className="absolute top-0 left-6 right-6 h-px"
        style={{background:`linear-gradient(90deg,transparent,${glow}44,transparent)`}}
        animate={vm.state==='running'?{opacity:[0.4,1,0.4]}:{opacity:0.2}}
        transition={{duration:2.5,repeat:Infinity}} />

      {/* ── Collapsed row ── */}
      <motion.button
        onClick={()=>!dummy&&setOpen(o=>!o)} disabled={dummy}
        className={`w-full flex items-center gap-2 px-2.5 py-2 text-left ${dummy?'cursor-default opacity-30':'cursor-pointer'}`}>

        <div className="screw" />
        <VMIcon state={vm.state} meta={meta} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-bold text-gray-900 truncate leading-tight">{vm.alias}</span>
            {vm.priority==='critical' && (
              <span className="text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded flex-shrink-0"
                style={{background:'#FEF3C7',color:'#92400E',border:'1px solid #FCD34D'}}>CRIT</span>
            )}
          </div>
          {/* Show state badge inline since LEDs are hidden on mobile */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <StateBadge state={vm.state} />
          </div>
        </div>

        {/* LEDs — hidden on very small widths */}
        <div className="hidden md:flex led-row flex-shrink-0">
          {Array.from({length:8}).map((_,i)=>{
            const on  = vm.state==='running'?7:vm.state==='snoozed'?3:vm.state==='destroyed'?1:0
            const cls = vm.state==='running'?'on-green':vm.state==='snoozed'?'on-amber':vm.state==='destroyed'?'on-red':''
            const active = i<on
            return (
              <motion.div key={i} className={`led ${active?cls:''}`}
                initial={{scale:0}} animate={{scale:1,opacity:active&&vm.state==='snoozed'?[1,0.3,1]:1}}
                transition={{scale:{delay:i*0.025,type:'spring',stiffness:500},
                  opacity:active&&vm.state==='snoozed'?{duration:2,repeat:Infinity,delay:i*0.15}:{}}} />
            )
          })}
        </div>

        {/* Cost */}
        {!dummy && (
          <div className="flex-shrink-0 text-right ml-1" style={{minWidth:46}}>
            <div className="text-[8px] text-gray-400 leading-tight">opt/mo</div>
            <div className="text-[11px] font-black leading-tight" style={{color:'#1A4780'}}>{usd(optUsd)}</div>
            {savUsd>0 && <div className="text-[7px] font-bold leading-tight" style={{color:'#1EA03C'}}>-{usd(savUsd)}</div>}
          </div>
        )}

        {!dummy && (
          <motion.div animate={{rotate:open?180:0}} transition={{duration:0.2}}
            className="text-gray-400 ml-1 flex-shrink-0 text-[10px]">▾</motion.div>
        )}
        <div className="screw" />
      </motion.button>

      {/* ── Expanded panel — single column, no grid ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
            exit={{height:0,opacity:0}} transition={{duration:0.25,ease:[0.22,1,0.36,1]}}
            style={{overflow:'hidden'}}>

            <div className="px-3 pb-3 pt-2 border-t border-gray-100 bg-white/70 space-y-2.5">

              {/* State description */}
              <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 relative overflow-hidden"
                style={{background:meta.bg,border:`1px solid ${meta.border}`}}>
                {vm.state==='running' && (
                  <motion.div className="absolute inset-0 opacity-10"
                    style={{background:'linear-gradient(90deg,transparent,#1EA03C44,transparent)'}}
                    animate={{x:['-100%','100%']}} transition={{duration:3,repeat:Infinity,ease:'linear'}} />
                )}
                <span className="text-[12px] flex-shrink-0 relative z-10">{meta.icon}</span>
                <div className="relative z-10 min-w-0">
                  <span className="text-[10px] font-bold" style={{color:meta.color}}>{meta.label}</span>
                  <span className="text-[10px] text-gray-500"> — {meta.labelLong}</span>
                  {vm.snooze && (
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      🌙 {vm.snooze.sleep}–{vm.snooze.wake} · {vm.snooze.days}
                    </p>
                  )}
                </div>
              </div>

              {/* Specs */}
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Specs</p>
                <div className="grid grid-cols-2 gap-x-3">
                  <KV label="CPU"  value={`${vm.cpu} vCPU`} />
                  <KV label="RAM"  value={`${vm.memGb} GB`} />
                  <KV label="Disk" value={`${vm.diskGb} GB`} />
                  <KV label="Env"  value={vm.environment} />
                </div>
                <p className="text-[8px] text-gray-400 mt-0.5 truncate">{vm.size}</p>
              </div>

              {/* Cost */}
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Cost (USD/month)</p>
                <div className="grid grid-cols-2 gap-x-3">
                  <KV label="Full"   value={usd(fullUsd)} accent="#6B7280" />
                  <KV label="Hourly" value={`$${(+hrUsd).toFixed(4)}`} accent="#6B7280" />
                  <KV label="Opt"    value={usd(optUsd)}  accent="#166534" />
                  <KV label="Saves"  value={usd(savUsd)}  accent="#1EA03C" />
                </div>
                <p className="text-[8px] text-gray-400 mt-0.5 truncate">{vm.contact}</p>
              </div>

              {/* Utilisation */}
              {(vm.state==='running'||vm.state==='snoozed') && (
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Utilisation</p>
                  <div className="space-y-1.5">
                    <Meter label="CPU"  pct={cpuPct}  color="#1A4780" delay={0.1} />
                    <Meter label="RAM"  pct={memPct}  color="#00ABA9" delay={0.13} />
                    <Meter label="Disk" pct={diskPct} color="#1EA03C" delay={0.16} />
                  </div>
                </div>
              )}

              {/* Actions */}
              {!dummy && actions.length>0 && onRequestStateChange && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Change state</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {actions.map(a=>(
                      <motion.button key={a.to}
                        whileHover={{scale:1.04,y:-1}} whileTap={{scale:0.96}}
                        onClick={()=>onRequestStateChange(vm,a.to)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-wide"
                        style={{background:a.s,color:a.c,border:`1.5px solid ${a.b}`}}>
                        {a.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Business need */}
              <p className="text-[9px] text-gray-500 leading-relaxed pt-1 border-t border-gray-100">{vm.businessNeed}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}