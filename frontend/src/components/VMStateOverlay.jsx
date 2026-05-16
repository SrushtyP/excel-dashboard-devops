import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Layman-friendly step descriptions per state
const CFG = {
  running: {
    title: 'Starting VM',
    subtitle: 'Waking up your virtual machine and getting it ready to serve',
    color: '#1EA03C',
    colorDark: '#0d6e26',
    bg: 'linear-gradient(140deg,#F0FBF2,#DCFCE7)',
    border: '#86EFAC',
    icon: '▶',
    steps: [
      { label: 'Reserving space in the cloud',        plain: 'Asking Azure for a virtual computer slot',   ms: 1100 },
      { label: 'Connecting it to the network',        plain: 'Giving the machine an address on the internet', ms: 900  },
      { label: 'Turning on the operating system',     plain: 'Booting Ubuntu — like pressing the power button', ms: 1200 },
      { label: 'Installing your app',                 plain: 'Copying the dashboard code onto the machine', ms: 800  },
      { label: 'All good — checking health',          plain: 'Making sure everything responds correctly',   ms: 600  },
    ],
    doneMsg: '🟢 VM is live and ready',
    doneSubMsg: 'Your dashboard is now accessible',
  },
  snoozed: {
    title: 'Snoozing VM',
    subtitle: 'Putting the machine to sleep to save money — it will wake up automatically',
    color: '#D97706',
    colorDark: '#b45309',
    bg: 'linear-gradient(140deg,#FFFBEB,#FEF3C7)',
    border: '#FCD34D',
    icon: '⏸',
    steps: [
      { label: 'Finishing active tasks',              plain: 'Letting any in-progress work complete cleanly', ms: 900  },
      { label: 'Saving current state',                plain: 'Making sure nothing important is lost',       ms: 700  },
      { label: 'Telling processes to pause',          plain: 'Sending a "sleep now" signal to all services', ms: 1000 },
      { label: 'Deallocating compute power',          plain: 'Releasing the CPU and memory — cost drops to near zero', ms: 800 },
    ],
    doneMsg: '🌙 VM is now sleeping',
    doneSubMsg: 'No compute costs while snoozed — disk only (~₹2/mo)',
  },
  destroyed: {
    title: 'Destroying VM',
    subtitle: 'Permanently deleting this machine and all its Azure resources',
    color: '#BE0032',
    colorDark: '#7f0020',
    bg: 'linear-gradient(140deg,#FFF1F2,#FFE4E6)',
    border: '#FECDD3',
    icon: '✕',
    steps: [
      { label: 'Shutting down all processes',         plain: 'Safely stopping everything running on the machine', ms: 800  },
      { label: 'Unmounting the hard drive',           plain: 'Disconnecting storage so data can be cleared',  ms: 900  },
      { label: 'Releasing the network slot',          plain: 'Giving back the IP address to Azure',           ms: 700  },
      { label: 'Deleting the virtual machine',        plain: 'Removing the computer itself from the cloud',   ms: 1200 },
      { label: 'Freeing all Azure resources',         plain: 'Every resource gone — billing stops completely', ms: 1000 },
    ],
    doneMsg: '💀 VM successfully destroyed',
    doneSubMsg: 'All Azure resources released — ₹0 cost',
  },
}

// Floating particles during destroy
function DestroyParticles({ active }) {
  if (!active) return null
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-sm"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            background: i % 2 === 0 ? '#BE0032' : '#FF8BA7',
            left: `${10 + i * 8}%`,
            top: '50%',
          }}
          animate={{
            y: [0, -(20 + i * 4)],
            x: [0, (i % 2 === 0 ? -8 : 8) + i],
            opacity: [0.8, 0],
            rotate: [0, 90 + i * 20],
          }}
          transition={{
            duration: 0.8 + i * 0.15,
            repeat: Infinity,
            delay: i * 0.18,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

// Pulse rings for running
function PulseRings({ color }) {
  return (
    <>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-xl border"
          style={{ borderColor: color }}
          animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
        />
      ))}
    </>
  )
}

// Individual step row
function Step({ label, plain, status, index, isLast, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="flex items-start gap-3"
    >
      {/* Step indicator */}
      <div className="flex flex-col items-center flex-shrink-0 w-5 mt-0.5">
        <motion.div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
          style={{
            background: status === 'done' ? color : status === 'active' ? '#1A4780' : '#E5E7EB',
            color: status !== 'pending' ? '#fff' : '#9CA3AF',
            boxShadow: status === 'active' ? `0 0 8px ${color}66` : 'none',
          }}
          animate={status === 'active' ? { scale: [1, 1.18, 1] } : {}}
          transition={{ duration: 0.65, repeat: status === 'active' ? Infinity : 0 }}
        >
          {status === 'done'
            ? '✓'
            : status === 'active'
              ? <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.55, repeat: Infinity }}>●</motion.span>
              : '○'}
        </motion.div>
        {!isLast && (
          <motion.div
            className="w-px mt-0.5"
            style={{
              height: 20,
              background: status === 'done' ? color : '#E5E7EB',
            }}
            animate={status === 'done' ? { opacity: 1 } : { opacity: 0.4 }}
          />
        )}
      </div>

      {/* Step text */}
      <div className="flex-1 pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-[12px] font-semibold ${status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>
            {label}
          </span>
          <AnimatePresence>
            {status === 'done' && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: '#D1FAE5', color: '#065F46' }}
              >done ✓</motion.span>
            )}
            {status === 'active' && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-[10px] font-bold"
                style={{ color: '#1A4780' }}
              >running…</motion.span>
            )}
          </AnimatePresence>
        </div>
        {/* Plain English explanation */}
        <p className={`text-[10px] mt-0.5 leading-relaxed ${status === 'pending' ? 'text-gray-300' : 'text-gray-500'}`}>
          {plain}
        </p>
      </div>
    </motion.div>
  )
}

export default function VMStateOverlay({ vm, targetState, onComplete }) {
  const cfg = CFG[targetState]
  const [current, setCurrent] = useState(-1)
  const [done, setDone] = useState([])
  const [finished, setFin] = useState(false)
  const pct = cfg ? Math.round((done.length / cfg.steps.length) * 100) : 0

  useEffect(() => {
    if (!cfg) return
    let i = 0
    function run() {
      if (i >= cfg.steps.length) {
        setFin(true)
        setTimeout(() => onComplete(vm.id, targetState), 1200)
        return
      }
      setCurrent(i)
      setTimeout(() => {
        setDone(p => [...p, i])
        i++
        setTimeout(run, 120)
      }, cfg.steps[i].ms)
    }
    const t = setTimeout(run, 500)
    return () => clearTimeout(t)
  }, [])

  if (!cfg) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(248,249,250,0.72)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px] mx-4 rounded-2xl overflow-hidden relative"
        style={{
          background: cfg.bg,
          border: `2px solid ${cfg.border}`,
          boxShadow: `0 28px 72px rgba(0,0,0,0.16), 0 0 0 1px ${cfg.border}`,
        }}
      >
        {/* Animated progress bar */}
        <div className="h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.5)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg,${cfg.colorDark},${cfg.color})` }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        <div className="p-6">
          {/* VM header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative flex-shrink-0">
              {targetState === 'running' && <PulseRings color={cfg.color} />}
              <motion.div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl relative z-10"
                style={{ background: `linear-gradient(135deg,${cfg.colorDark},${cfg.color})` }}
                animate={
                  targetState === 'destroyed' && finished
                    ? { scale: [1, 0.7, 0], opacity: [1, 0.5, 0], rotate: [0, 15, -10] }
                    : targetState === 'running'
                      ? { boxShadow: [`0 0 0px ${cfg.color}44`, `0 0 20px ${cfg.color}77`, `0 0 0px ${cfg.color}44`] }
                      : targetState === 'snoozed'
                        ? { opacity: [1, 0.5, 1] }
                        : {}
                }
                transition={
                  targetState === 'destroyed' && finished
                    ? { duration: 0.7, delay: 0.1 }
                    : { duration: 2, repeat: Infinity }
                }
              >
                {cfg.icon}
                {targetState === 'destroyed' && <DestroyParticles active={!finished} />}
              </motion.div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-black text-gray-900 leading-tight">{vm.alias}</h2>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{vm.purpose}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <motion.span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: cfg.color + '22', color: cfg.color, border: `1px solid ${cfg.border}` }}
                  animate={{ opacity: finished ? 0.6 : 1 }}
                >
                  {cfg.title}
                </motion.span>
                <motion.span
                  className="text-[10px] text-gray-500 font-semibold"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: finished ? 0 : Infinity }}
                >
                  {pct}% complete
                </motion.span>
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-[12px] text-gray-600 mb-4 leading-relaxed"
            style={{ borderLeft: `3px solid ${cfg.color}`, paddingLeft: 10 }}>
            {cfg.subtitle}
          </p>

          {/* Step list */}
          <div>
            {cfg.steps.map((step, i) => (
              <Step
                key={i}
                label={step.label}
                plain={step.plain}
                index={i}
                isLast={i === cfg.steps.length - 1}
                color={cfg.color}
                status={done.includes(i) ? 'done' : current === i && !done.includes(i) ? 'active' : 'pending'}
              />
            ))}
          </div>

          {/* VM specs */}
          <div className="mt-4 pt-4 border-t border-white/60 grid grid-cols-3 gap-3">
            {[['CPU', `${vm.cpu} vCPU`], ['Memory', `${vm.memGb} GB`], ['Env', vm.environment]].map(([k, v]) => (
              <div key={k}>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{k}</p>
                <p className="text-[12px] font-bold text-gray-700 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {/* Done message */}
          <AnimatePresence>
            {finished && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 p-3.5 rounded-xl text-center"
                style={{ background: cfg.color + '18', border: `1.5px solid ${cfg.border}` }}
              >
                <p className="text-[14px] font-black" style={{ color: cfg.color }}>{cfg.doneMsg}</p>
                <p className="text-[11px] text-gray-500 mt-1">{cfg.doneSubMsg}</p>
                {/* Admin action notice */}
                <div className="mt-3 p-2.5 rounded-lg text-left flex items-start gap-2"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)' }}>
                  <span className="text-[13px] flex-shrink-0">👤</span>
                  <div>
                    <p className="text-[11px] font-black text-gray-800">Request logged</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                      No pipeline runs automatically. The admin will review this request and trigger the deployment via a git push.
                    </p>
                  </div>
                </div>
                <motion.div
                  className="mt-2 text-[10px] text-gray-400"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  Closing…
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}