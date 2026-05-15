import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CFG = {
  running: {
    title: 'Starting VM', subtitle: 'Provisioning resources and booting instance',
    color: '#1EA03C', bg: 'linear-gradient(140deg,#F0FBF2,#DCFCE7)', border: '#86EFAC',
    icon: '▶', steps: [
      { label: 'Allocating compute resources',   ms: 1100 },
      { label: 'Provisioning network interface', ms: 900  },
      { label: 'Booting OS image',               ms: 1200 },
      { label: 'Starting application services',  ms: 800  },
      { label: 'Health check passed',            ms: 600  },
    ], doneMsg: 'VM is now running',
  },
  snoozed: {
    title: 'Snoozing VM', subtitle: 'Gracefully pausing — will auto-wake per schedule',
    color: '#D97706', bg: 'linear-gradient(140deg,#FFFBEB,#FEF3C7)', border: '#FCD34D',
    icon: '⏸', steps: [
      { label: 'Draining active connections',    ms: 900  },
      { label: 'Flushing in-memory state',       ms: 700  },
      { label: 'Suspending OS processes',        ms: 1000 },
      { label: 'VM paused — awaiting wake time', ms: 600  },
    ], doneMsg: 'VM is now snoozed',
  },
  destroyed: {
    title: 'Destroying VM', subtitle: 'Deprovisioning instance and releasing Azure resources',
    color: '#BE0032', bg: 'linear-gradient(140deg,#FFF1F2,#FFE4E6)', border: '#FECDD3',
    icon: '✕', steps: [
      { label: 'Stopping running processes',   ms: 800  },
      { label: 'Detaching storage volumes',    ms: 900  },
      { label: 'Releasing network interfaces', ms: 700  },
      { label: 'Deprovisioning compute node',  ms: 1200 },
      { label: 'Releasing Azure resources',    ms: 1000 },
    ], doneMsg: 'VM successfully destroyed',
  },
}

function Step({ label, status, index, isLast }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="flex items-start gap-3"
    >
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        <motion.div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
          style={{
            background: status==='done' ? '#1EA03C' : status==='active' ? '#1A4780' : '#E5E7EB',
            color: status!=='pending' ? '#fff' : '#9CA3AF',
          }}
          animate={status==='active' ? { scale:[1,1.2,1] } : {}}
          transition={{ duration:0.7, repeat: status==='active' ? Infinity : 0 }}
        >
          {status==='done' ? '✓'
            : status==='active'
              ? <motion.span animate={{opacity:[1,0.3,1]}} transition={{duration:0.6,repeat:Infinity}}>●</motion.span>
              : '○'}
        </motion.div>
        {!isLast && <div className="w-px bg-gray-200 mt-0.5" style={{height:16}} />}
      </div>
      <div className="flex-1 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[12px] ${status==='pending'?'text-gray-400':status==='active'?'text-gray-900 font-semibold':'text-gray-700 font-medium'}`}>{label}</span>
          {status==='done' && <motion.span initial={{opacity:0}} animate={{opacity:1}} className="text-[10px] text-green-600 font-semibold">done</motion.span>}
          {status==='active' && <motion.span animate={{opacity:[1,0,1]}} transition={{duration:0.9,repeat:Infinity}} className="text-[10px] text-nouryon-blue font-semibold">running…</motion.span>}
        </div>
      </div>
    </motion.div>
  )
}

export default function VMStateOverlay({ vm, targetState, onComplete }) {
  const cfg = CFG[targetState]
  const [current, setCurrent] = useState(-1)
  const [done, setDone]       = useState([])
  const [finished, setFin]    = useState(false)
  const pct = cfg ? Math.round((done.length / cfg.steps.length) * 100) : 0

  useEffect(() => {
    if (!cfg) return
    let i = 0
    function run() {
      if (i >= cfg.steps.length) { setFin(true); setTimeout(() => onComplete(vm.id, targetState), 1100); return }
      setCurrent(i)
      setTimeout(() => { setDone(p=>[...p,i]); i++; setTimeout(run,100) }, cfg.steps[i].ms)
    }
    const t = setTimeout(run, 400)
    return () => clearTimeout(t)
  }, [])

  if (!cfg) return null

  return (
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',background:'rgba(248,249,250,0.75)'}}
    >
      <motion.div
        initial={{opacity:0,scale:0.88,y:28}} animate={{opacity:1,scale:1,y:0}}
        transition={{duration:0.4,ease:[0.22,1,0.36,1]}}
        className="w-full max-w-[400px] mx-4 rounded-2xl overflow-hidden"
        style={{background:cfg.bg, border:`2px solid ${cfg.border}`, boxShadow:'0 24px 64px rgba(0,0,0,0.14)'}}
      >
        {/* Progress bar */}
        <div className="h-1.5 bg-white/40 overflow-hidden">
          <motion.div className="h-full" style={{background:cfg.color}}
            animate={{width:`${pct}%`}} transition={{duration:0.35,ease:'easeOut'}} />
        </div>

        <div className="p-6">
          {/* VM identity */}
          <div className="flex items-center gap-4 mb-5">
            <motion.div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0"
              style={{background:cfg.color}}
              animate={targetState==='destroyed'&&finished
                ? {scale:[1,0.8,0],opacity:[1,0.6,0]}
                : targetState==='running' ? {boxShadow:[`0 0 0 ${cfg.color}44`,`0 0 18px ${cfg.color}77`,`0 0 0 ${cfg.color}44`]}
                : targetState==='snoozed' ? {opacity:[1,0.55,1]} : {}}
              transition={targetState==='destroyed'&&finished?{duration:0.7,delay:0.1}:{duration:2,repeat:Infinity}}
            >{cfg.icon}</motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-bold text-gray-900 leading-tight">{vm.alias}</h2>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{vm.purpose}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{background:cfg.color+'22',color:cfg.color,border:`1px solid ${cfg.border}`}}>
                  {cfg.title}
                </span>
                <span className="text-[10px] text-gray-400">{pct}% complete</span>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-gray-600 mb-4 leading-relaxed"
            style={{borderLeft:`3px solid ${cfg.color}`,paddingLeft:10}}>
            {cfg.subtitle}
          </p>

          {/* Steps */}
          <div>
            {cfg.steps.map((step,i) => (
              <Step key={i} label={step.label} index={i} isLast={i===cfg.steps.length-1}
                status={done.includes(i)?'done':current===i&&!done.includes(i)?'active':'pending'} />
            ))}
          </div>

          {/* VM specs */}
          <div className="mt-4 pt-4 border-t border-white/60 grid grid-cols-3 gap-3">
            {[['CPU',`${vm.cpu} vCPU`],['Memory',`${vm.memGb} GB`],['Env',vm.environment]].map(([k,v])=>(
              <div key={k}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{k}</p>
                <p className="text-[12px] font-semibold text-gray-700 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {finished && (
              <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.35}}
                className="mt-4 p-3 rounded-xl text-center"
                style={{background:cfg.color+'18',border:`1px solid ${cfg.border}`}}>
                <p className="text-[13px] font-bold" style={{color:cfg.color}}>{cfg.doneMsg}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Updating datacenter inventory…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
