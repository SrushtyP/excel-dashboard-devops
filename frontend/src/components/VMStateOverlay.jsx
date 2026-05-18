import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Plain-English pipeline steps ──────────────────────────────────────────────
const PIPE_STEPS = [
  { key: 'checkout',  plain: 'Downloading latest code from Git' },
  { key: 'tf:init',   plain: 'Connecting to Azure state storage' },
  { key: 'tf:apply',  plain: 'Verifying cloud infrastructure' },
  { key: 'ansible',   plain: 'Copying app files to the VM' },
  { key: 'npm build', plain: 'Building the React dashboard' },
  { key: 'flask',     plain: 'Restarting the web server' },
  { key: 'verify',    plain: 'Checking the app is live (HTTP 200)' },
]

// ── State visual config ───────────────────────────────────────────────────────
const S = {
  running:   { cls:'run', box:'s-running',  label:'online',  dot:'#34c47c', border:'#34c47c', bg:'#e0fff0', pill:'#dcfce7', pillText:'#166534' },
  snoozed:   { cls:'snz', box:'s-snoozed',  label:'snoozed', dot:'#e8a020', border:'#e8a020', bg:'#fff8e0', pill:'#fef3c7', pillText:'#92400e' },
  destroyed: { cls:'dst', box:'s-destroyed',label:'offline', dot:'#c8d4e4', border:'#c8d4e4', bg:'#f0f4fa', pill:'#f1f5f9', pillText:'#64748b' },
}
const T = {
  running:   { border:'#34c47c', bg:'#e0fff0', anim:'glow-green' },
  snoozed:   { border:'#e8a020', bg:'#fff8e0', anim:'glow-amber' },
  destroyed: { border:'#c8d4e4', bg:'#f0f4fa', anim:'none', dashed:true },
}

// ── Server mini illustration ──────────────────────────────────────────────────
function ServerMini({ state, animate: doAnim = false }) {
  const cfg = S[state] || S.destroyed
  return (
    <div className="flex flex-col items-center justify-center w-14 h-12 rounded mx-auto relative"
      style={{ background: cfg.bg, border: `1.5px ${T[state]?.dashed?'dashed':'solid'} ${cfg.border}` }}>
      <div className="space-y-0.5 w-7 px-1">
        {[0,1,2].map(i => (
          <motion.div key={i} className="h-1 rounded-sm"
            style={{ background: cfg.dot }}
            animate={doAnim && state==='running' ? { opacity:[0.4,1,0.4] } : { opacity: state==='snoozed'?0.35:0.2 }}
            transition={{ duration:1.5, repeat: doAnim ? Infinity : 0, delay:i*0.3 }} />
        ))}
      </div>
      <motion.div className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full"
        style={{ background: cfg.dot }}
        animate={doAnim ? { scale:[1,1.6,1] } : { scale:1 }}
        transition={{ duration: state==='running'?1.2:3, repeat: doAnim ? Infinity:0 }} />
    </div>
  )
}

// ── Main overlay ──────────────────────────────────────────────────────────────
export default function VMStateOverlay({ vm, targetState, onComplete }) {
  const [pipelineRun, setPipelineRun] = useState(null)
  const [pipeError, setPipeError]     = useState(null)
  const intervalRef = useRef(null)
  const openedAt    = useRef(new Date().toISOString())

  const fromState = vm?.state || 'running'
  const fromCfg   = S[fromState] || S.running
  const toCfg     = S[targetState] || S.running
  const toTarget  = T[targetState] || T.running

  // ── Poll /api/pipeline/runs every 8s, only show runs AFTER overlay opened ──
  useEffect(() => {
    if (!vm) return
    async function poll() {
      try {
        const res  = await fetch('/api/pipeline/runs')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (data.error) { setPipeError(data.error); return }
        const runs = (data.runs || []).filter(r => r.startedAt && r.startedAt > openedAt.current)
        if (!runs.length) return
        const latest = runs[0]
        setPipelineRun(latest)
        if (['success','failure','cancelled'].includes(latest.status)) {
          clearInterval(intervalRef.current)
        }
      } catch (e) {
        setPipeError('Could not reach pipeline API.')
      }
    }
    const first = setTimeout(poll, 5000)
    intervalRef.current = setInterval(poll, 8000)
    return () => { clearTimeout(first); clearInterval(intervalRef.current) }
  }, [vm?.id, targetState])

  function handleClose() {
    clearInterval(intervalRef.current)
    onComplete(vm.id, targetState)
  }

  if (!vm) return null

  const jobs      = pipelineRun?.jobs || []
  const runStatus = pipelineRun?.status || 'pending'
  const isDone    = runStatus === 'success' || runStatus === 'failure'

  // Map job names to plain-English steps
  function matchStep(jobName) {
    const lower = jobName.toLowerCase()
    return PIPE_STEPS.find(s =>
      lower.includes(s.key) ||
      (s.key==='checkout'  && lower.includes('checkout')) ||
      (s.key==='tf:init'   && lower.includes('terraform init')) ||
      (s.key==='tf:apply'  && lower.includes('terraform apply')) ||
      (s.key==='ansible'   && lower.includes('ansible')) ||
      (s.key==='npm build' && lower.includes('build')) ||
      (s.key==='flask'     && lower.includes('flask')) ||
      (s.key==='verify'    && lower.includes('verify'))
    )?.plain || jobName
  }

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', background:'rgba(240,246,255,0.7)' }}>

      <motion.div
        initial={{ opacity:0, scale:0.9, y:20 }} animate={{ opacity:1, scale:1, y:0 }}
        transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
        className="w-full max-w-[460px] mx-4 rounded-xl overflow-hidden relative"
        style={{ background:'#f0f6ff', border:'1.5px solid #4a7ab5', boxShadow:'0 20px 60px rgba(74,122,181,0.2)' }}>

        {/* corner accents */}
        {[
          'top-1.5 left-1.5 border-t border-l',
          'top-1.5 right-1.5 border-t border-r',
          'bottom-1.5 left-1.5 border-b border-l',
          'bottom-1.5 right-1.5 border-b border-r',
        ].map((cls,i) => (
          <div key={i} className={`absolute w-2.5 h-2.5 pointer-events-none ${cls}`}
            style={{ borderColor:'#4a7ab5' }} />
        ))}

        {/* top accent bar */}
        <div className="h-0.5 w-full" style={{ background:'#4a7ab5' }} />

        <div className="p-5">

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] font-mono" style={{ color:'#4a7ab5', letterSpacing:'0.1em' }}>
                chemcore-im // state transition
              </p>
              <p className="text-[14px] font-semibold mt-0.5" style={{ color:'#1a4780' }}>
                {vm.id}
                <span className="text-[11px] font-normal ml-2" style={{ color:'#8ab0d4' }}>
                  // {vm.alias}
                </span>
              </p>
            </div>
            <button onClick={handleClose}
              className="text-[9px] font-mono px-2 py-1 rounded transition-colors"
              style={{ border:'1px solid #bdd4f0', color:'#8ab0d4', background:'transparent' }}
              onMouseEnter={e=>{e.target.style.borderColor='#4a7ab5';e.target.style.color='#1a4780'}}
              onMouseLeave={e=>{e.target.style.borderColor='#bdd4f0';e.target.style.color='#8ab0d4'}}>
              [ close ]
            </button>
          </div>

          {/* Transition visual */}
          <div className="flex items-center justify-center gap-4 p-4 rounded-lg mb-4"
            style={{ background:'#e8f2ff', border:'1px solid #bdd4f0' }}>
            {/* FROM */}
            <div className="text-center">
              <ServerMini state={fromState} animate={false} />
              <div className="text-[9px] font-bold uppercase tracking-wider mt-2"
                style={{ color: fromCfg.pillText }}>{fromState}</div>
            </div>

            {/* Arrow */}
            <motion.div className="text-xl" style={{ color:'#4a7ab5' }}
              animate={{ x:[0,4,0] }} transition={{ duration:1.2, repeat:Infinity }}>→</motion.div>

            {/* TO */}
            <div className="text-center">
              <motion.div
                animate={targetState!=='destroyed' ? { borderColor:[toCfg.border, toCfg.border+'66', toCfg.border] } : {}}
                transition={{ duration:1.2, repeat:Infinity }}
                style={{ borderRadius:8, overflow:'hidden' }}>
                <ServerMini state={targetState} animate={true} />
              </motion.div>
              <div className="text-[9px] font-bold uppercase tracking-wider mt-2"
                style={{ color: toCfg.pillText }}>{targetState}</div>
            </div>
          </div>

          {/* Admin notice — shown while no pipeline yet */}
          {!pipelineRun && !pipeError && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="flex items-start gap-2.5 p-3 rounded-lg mb-4"
              style={{ background:'#fff8e8', border:'1px solid #fcd34d' }}>
              <span className="text-[13px] flex-shrink-0 mt-0.5">i</span>
              <div className="text-[10px] leading-relaxed" style={{ color:'#78350f' }}>
                <strong style={{ color:'#92400e' }}>Request submitted.</strong> Your request has been logged.
                The admin will review and push to Git to trigger the pipeline.
                This panel will update live once the pipeline starts.
              </div>
            </motion.div>
          )}

          {/* Pipeline error */}
          {pipeError && (
            <div className="p-3 rounded-lg mb-4 text-[10px]"
              style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#991b1b' }}>
              Could not reach pipeline API: {pipeError}
            </div>
          )}

          {/* Pipeline panel */}
          <div className="rounded-lg overflow-hidden"
            style={{ background:'#e8f2ff', border:'1px solid #bdd4f0' }}>

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b"
              style={{ borderColor:'#d4e5f7' }}>
              <span className="text-[9px] font-mono tracking-wider" style={{ color:'#4a7ab5' }}>
                pipeline // github-actions // testing-branch
              </span>
              {pipelineRun ? (
                <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: runStatus==='success'?'#dcfce7':runStatus==='failure'?'#fee2e2':runStatus==='running'?'#dbeafe':'#f1f5f9',
                    color:      runStatus==='success'?'#166534':runStatus==='failure'?'#991b1b':runStatus==='running'?'#1d4ed8':'#94a3b8',
                    border:     `1px solid ${runStatus==='success'?'#86efac':runStatus==='failure'?'#fca5a5':runStatus==='running'?'#93c5fd':'#e2e8f0'}`,
                  }}>
                  {runStatus==='running' ? '● running' : runStatus==='success' ? '✓ success' : runStatus==='failure' ? '✕ failed' : runStatus}
                </span>
              ) : (
                <span className="text-[8px] px-2 py-0.5 rounded-full"
                  style={{ background:'#f1f5f9', color:'#94a3b8', border:'1px solid #e2e8f0' }}>
                  idle
                </span>
              )}
            </div>

            <div className="px-4 py-3">
              {/* Waiting for pipeline */}
              {!pipelineRun && !pipeError && (
                <div className="flex flex-col items-center py-4 gap-2">
                  <motion.div className="w-5 h-5 rounded-full border-2"
                    style={{ borderColor:'#d4e5f7', borderTopColor:'#4a7ab5' }}
                    animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }} />
                  <p className="text-[10px]" style={{ color:'#8ab0d4' }}>
                    Waiting for admin to push to Git…
                  </p>
                  <p className="text-[9px]" style={{ color:'#bdd4f0' }}>
                    Pipeline steps will appear here once triggered
                  </p>
                </div>
              )}

              {/* Pipeline running / done */}
              {pipelineRun && (
                <>
                  <div className="flex justify-between text-[9px] mb-3" style={{ color:'#8ab0d4' }}>
                    <span>Run #{String(pipelineRun.id).slice(-5)} · branch: {pipelineRun.branch}</span>
                    <span>{pipelineRun.duration || '—'}</span>
                  </div>

                  {/* Steps — use job list if available, else use PIPE_STEPS */}
                  <div className="space-y-1.5 mb-3">
                    {(jobs.length > 0 ? jobs : PIPE_STEPS.map(s=>({ name:s.plain, status:'pending' }))).map((job, i) => {
                      const status = job.status || 'pending'
                      const dotColor = status==='success'?'#34c47c':status==='failure'?'#ef4444':status==='running'?'#3b82f6':'#d1d5db'
                      const lblColor = status==='success'?'#166534':status==='failure'?'#991b1b':status==='running'?'#1d4ed8':'#94a3b8'
                      return (
                        <motion.div key={i} initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }}
                          transition={{ delay:i*0.04 }}
                          className="flex items-center gap-2">
                          <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: dotColor }}
                            animate={status==='running' ? { scale:[1,1.5,1] } : { scale:1 }}
                            transition={{ duration:0.6, repeat: status==='running'?Infinity:0 }} />
                          <span className="text-[10px]" style={{ color: lblColor }}>
                            {jobs.length > 0 ? matchStep(job.name) : job.name}
                          </span>
                          {job.duration && (
                            <span className="text-[9px] ml-auto" style={{ color:'#94a3b8' }}>{job.duration}</span>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Progress bar */}
                  {jobs.length > 0 && (
                    <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background:'#d1d5db' }}>
                      <motion.div className="h-full rounded-full" style={{ background:'#34c47c' }}
                        initial={{ width:'0%' }}
                        animate={{ width: `${Math.round((jobs.filter(j=>j.status==='success').length/Math.max(jobs.length,1))*100)}%` }}
                        transition={{ duration:0.5 }} />
                    </div>
                  )}

                  {/* Done banner */}
                  <AnimatePresence>
                    {isDone && (
                      <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
                        className="p-3 rounded-lg text-center"
                        style={{
                          background: runStatus==='success'?'#f0fdf4':'#fef2f2',
                          border: `1px solid ${runStatus==='success'?'#86efac':'#fca5a5'}`,
                        }}>
                        <p className="text-[12px] font-bold" style={{ color: runStatus==='success'?'#166534':'#991b1b' }}>
                          {runStatus==='success'
                            ? `✓ Pipeline complete — ${vm.id} is now ${targetState}`
                            : '✕ Pipeline failed — check GitHub Actions for details'}
                        </p>
                        {runStatus==='failure' && (
                          <p className="text-[9px] mt-1" style={{ color:'#64748b' }}>
                            Could be a quota limit, SSH timeout, or config error. Open the Pipeline tab for the full log.
                          </p>
                        )}
                        <button onClick={handleClose}
                          className="mt-2 text-[10px] font-bold px-3 py-1.5 rounded text-white"
                          style={{ background: runStatus==='success'?'#34c47c':'#ef4444' }}>
                          Close
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>

          {/* VM specs footer */}
          <div className="mt-3 pt-3 grid grid-cols-3 gap-3" style={{ borderTop:'1px solid #d4e5f7' }}>
            {[
              ['CPU', `${vm.cpu} vCPU`],
              ['Memory', `${vm.memGb} GB`],
              ['Env', vm.environment],
            ].map(([k,v]) => (
              <div key={k}>
                <p className="text-[8px] uppercase tracking-widest font-bold" style={{ color:'#8ab0d4' }}>{k}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color:'#1a4780' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  // helper inside component
  function matchStep(name) {
    const lower = name.toLowerCase()
    return PIPE_STEPS.find(s =>
      lower.includes(s.key) ||
      (s.key==='checkout'  && lower.includes('checkout')) ||
      (s.key==='tf:init'   && lower.includes('terraform init')) ||
      (s.key==='tf:apply'  && lower.includes('terraform apply')) ||
      (s.key==='ansible'   && lower.includes('ansible')) ||
      (s.key==='npm build' && lower.includes('build')) ||
      (s.key==='flask'     && lower.includes('flask')) ||
      (s.key==='verify'    && lower.includes('verify'))
    )?.plain || name
  }
}