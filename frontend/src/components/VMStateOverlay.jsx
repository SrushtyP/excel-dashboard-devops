import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CFG = {
  running: {
    title: 'Start VM requested',
    color: '#1EA03C', colorDark: '#0d6e26',
    bg: 'linear-gradient(140deg,#F0FBF2,#DCFCE7)',
    border: '#86EFAC', icon: '▶',
    what: 'Your request to start this VM has been logged. The admin will push to Git to trigger the pipeline.',
  },
  snoozed: {
    title: 'Snooze VM requested',
    color: '#D97706', colorDark: '#b45309',
    bg: 'linear-gradient(140deg,#FFFBEB,#FEF3C7)',
    border: '#FCD34D', icon: '⏸',
    what: 'Your request to snooze this VM has been logged. The admin will push to Git to trigger the pipeline.',
  },
  destroyed: {
    title: 'Destroy VM requested',
    color: '#BE0032', colorDark: '#7f0020',
    bg: 'linear-gradient(140deg,#FFF1F2,#FFE4E6)',
    border: '#FECDD3', icon: '✕',
    what: 'Your request to destroy this VM has been logged. The admin will push to Git to trigger the pipeline.',
  },
}

const STATUS_COLOR = {
  success: '#1EA03C', failure: '#BE0032', running: '#1A4780',
  cancelled: '#6B7280', pending: '#D97706',
}
const STATUS_ICON = { success: '✓', failure: '✕', running: '●', cancelled: '—', pending: '…' }

function plainJob(name) {
  const map = {
    'deploy': 'Deploy app to VM',
    'Checkout': 'Download latest code from Git',
    'Setup Terraform': 'Prepare infrastructure tool',
    'Terraform Init': 'Connect to Azure state storage',
    'Terraform Apply': 'Provision / verify cloud resources',
    'Get VM IP': 'Get VM network address',
    'Install Ansible': 'Prepare deployment tool',
    'Create Ansible inventory': 'Set up server connection',
    'Create azure_config': 'Write Azure credentials to VM',
    'Install Flask': 'Install Python web framework',
    'Run Ansible': 'Deploy app files to VM',
    'Run state': 'Apply VM power states',
    'Verify': 'Check app is responding',
  }
  for (const [k, v] of Object.entries(map)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v
  }
  return name
}

export default function VMStateOverlay({ vm, targetState, onComplete }) {
  const cfg = CFG[targetState]
  const [pipelineRun, setPipelineRun] = useState(null)
  const [polling, setPolling] = useState(false)
  const [apiError, setApiError] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!cfg) return

    async function fetchLatestRun() {
      try {
        const res = await fetch('/api/pipeline/runs')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (data.error) { setApiError(data.error); clearInterval(intervalRef.current); return }
        const runs = data.runs || []
        if (runs.length === 0) return
        const latest = runs[0]
        setPipelineRun(latest)
        setPolling(true)
        if (['success', 'failure', 'cancelled'].includes(latest.status)) {
          clearInterval(intervalRef.current)
          setPolling(false)
        }
      } catch (e) {
        setApiError('Could not reach pipeline API — PAT_TOKEN may not be set.')
        clearInterval(intervalRef.current)
      }
    }

    const firstTimer = setTimeout(fetchLatestRun, 3000)
    intervalRef.current = setInterval(fetchLatestRun, 8000)
    return () => { clearTimeout(firstTimer); clearInterval(intervalRef.current) }
  }, [targetState])

  function handleClose() {
    clearInterval(intervalRef.current)
    onComplete(vm.id, targetState)
  }

  if (!cfg) return null

  const jobs = pipelineRun?.jobs || []
  const runStatus = pipelineRun?.status || 'pending'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(248,249,250,0.75)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[460px] mx-4 rounded-2xl overflow-hidden"
        style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, boxShadow: `0 24px 64px rgba(0,0,0,0.14)` }}
      >
        <div className="h-1" style={{ background: `linear-gradient(90deg,${cfg.colorDark},${cfg.color})` }} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${cfg.colorDark},${cfg.color})` }}
              animate={targetState === 'snoozed' ? { opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >{cfg.icon}</motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-black text-gray-900">{cfg.title}</h2>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate">{vm.alias}</p>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 text-[13px] flex-shrink-0 transition-colors">✕</button>
          </div>

          {/* Admin notice */}
          <div className="p-3 rounded-xl mb-4 flex items-start gap-2"
            style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${cfg.border}` }}>
            <span className="text-[13px] flex-shrink-0">👤</span>
            <p className="text-[11px] text-gray-600 leading-relaxed">{cfg.what}</p>
          </div>

          {/* Pipeline panel */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #BDD0EA', background: 'rgba(255,255,255,0.85)' }}>

            {/* Panel header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Pipeline</span>
                {polling && runStatus === 'running' && (
                  <motion.span className="w-1.5 h-1.5 rounded-full bg-blue-600"
                    animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                )}
              </div>
              {pipelineRun && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: (STATUS_COLOR[runStatus] || '#6B7280') + '18', color: STATUS_COLOR[runStatus] || '#6B7280', border: `1px solid ${(STATUS_COLOR[runStatus] || '#6B7280')}44` }}>
                  {STATUS_ICON[runStatus] || '?'} {runStatus}
                </span>
              )}
            </div>

            {/* Waiting state */}
            {!pipelineRun && !apiError && (
              <div className="px-4 py-6 text-center">
                <motion.div className="w-6 h-6 rounded-full border-2 border-gray-200 mx-auto mb-2"
                  style={{ borderTopColor: '#1A4780' }}
                  animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                <p className="text-[12px] font-semibold text-gray-600">Waiting for admin to push to Git…</p>
                <p className="text-[10px] text-gray-400 mt-1">Pipeline steps will appear here once triggered</p>
              </div>
            )}

            {/* API error */}
            {apiError && (
              <div className="px-4 py-4 text-center">
                <p className="text-[11px] text-red-500 font-semibold">⚠ {apiError}</p>
              </div>
            )}

            {/* Live pipeline run */}
            {pipelineRun && !apiError && (
              <div className="px-4 py-3">
                <div className="flex justify-between text-[10px] text-gray-400 mb-2">
                  <span>Branch: {pipelineRun.branch} · Run #{pipelineRun.id?.toString().slice(-5)}</span>
                  <span>{pipelineRun.duration || '—'}</span>
                </div>

                {jobs.length > 0 ? (
                  <div className="space-y-1">
                    {jobs.map((job, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                        <motion.span className="text-[12px] font-bold flex-shrink-0 w-4 text-center mt-0.5"
                          style={{ color: STATUS_COLOR[job.status] || '#6B7280' }}
                          animate={job.status === 'running' ? { opacity: [1, 0.2, 1] } : {}}
                          transition={{ duration: 0.7, repeat: job.status === 'running' ? Infinity : 0 }}>
                          {STATUS_ICON[job.status] || '?'}
                        </motion.span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-gray-800 truncate">{plainJob(job.name)}</p>
                          <p className="text-[9px] text-gray-400 truncate">{job.name}</p>
                        </div>
                        {job.duration && <span className="text-[10px] text-gray-400 flex-shrink-0">{job.duration}</span>}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 text-center py-2">Loading job details…</p>
                )}

                <AnimatePresence>
                  {(runStatus === 'success' || runStatus === 'failure') && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-3 rounded-xl text-center"
                      style={{ background: runStatus === 'success' ? '#F0FBF2' : '#FFF1F2', border: `1px solid ${runStatus === 'success' ? '#86EFAC' : '#FECDD3'}` }}>
                      <p className="text-[13px] font-black" style={{ color: runStatus === 'success' ? '#166534' : '#9F1239' }}>
                        {runStatus === 'success' ? '✓ Pipeline completed — VM state updated' : '✕ Pipeline failed'}
                      </p>
                      {runStatus === 'failure' && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          Could be a quota limit, SSH timeout, or config error. Open the Pipeline tab for the full error log.
                        </p>
                      )}
                      <button onClick={handleClose}
                        className="mt-2 text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
                        style={{ background: runStatus === 'success' ? '#1EA03C' : '#BE0032' }}>
                        Close
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* VM meta footer */}
          <div className="mt-3 pt-3 border-t border-white/50 grid grid-cols-3 gap-3">
            {[['CPU', `${vm.cpu} vCPU`], ['Memory', `${vm.memGb} GB`], ['Env', vm.environment]].map(([k, v]) => (
              <div key={k}>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{k}</p>
                <p className="text-[12px] font-bold text-gray-700 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}