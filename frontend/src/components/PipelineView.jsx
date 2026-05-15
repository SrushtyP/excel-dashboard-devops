import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePipeline } from '../hooks/usePipeline'

// Simulated runs used as fallback when API is not connected
const FALLBACK = [
  { id:0, sha:'d4e9b01', branch:'main', commit:'feat: add DR rack configuration', actor:'srushty-naik', status:'running',
    startedAt: new Date(Date.now()-90000).toISOString(), duration:null,
    jobs:[
      {name:'Checkout',status:'success',duration:'3s'},
      {name:'Setup Terraform',status:'success',duration:'26s'},
      {name:'Terraform Init',status:'success',duration:'40s'},
      {name:'Terraform Apply',status:'running',duration:null},
      {name:'Get VM IP',status:'pending',duration:null},
      {name:'Install Ansible',status:'pending',duration:null},
      {name:'Run Ansible Playbook',status:'pending',duration:null},
      {name:'Run state playbooks',status:'pending',duration:null},
      {name:'Verify deployment',status:'pending',duration:null},
    ],
  },
  { id:1, sha:'a3f8c12', branch:'main', commit:'redeploy: trigger fresh deployment', actor:'srushty-naik', status:'success',
    startedAt:'2026-05-15T10:51:00Z', duration:'4m 32s',
    jobs:[{name:'Checkout',status:'success',duration:'3s'},{name:'Setup Terraform',status:'success',duration:'28s'},{name:'Terraform Init',status:'success',duration:'41s'},{name:'Terraform Apply',status:'success',duration:'1m 12s'},{name:'Get VM IP',status:'success',duration:'5s'},{name:'Install Ansible',status:'success',duration:'18s'},{name:'Run Ansible Playbook',status:'success',duration:'52s'},{name:'Run state playbooks',status:'success',duration:'34s'},{name:'Verify deployment',status:'success',duration:'12s'}],
  },
  { id:2, sha:'b9d2e45', branch:'main', commit:'retrigger', actor:'srushty-naik', status:'success',
    startedAt:'2026-05-15T09:20:00Z', duration:'4m 18s',
    jobs:[{name:'Checkout',status:'success',duration:'3s'},{name:'Setup Terraform',status:'success',duration:'25s'},{name:'Terraform Init',status:'success',duration:'39s'},{name:'Terraform Apply',status:'success',duration:'1m 8s'},{name:'Get VM IP',status:'success',duration:'4s'},{name:'Install Ansible',status:'success',duration:'20s'},{name:'Run Ansible Playbook',status:'success',duration:'48s'},{name:'Run state playbooks',status:'success',duration:'29s'},{name:'Verify deployment',status:'success',duration:'12s'}],
  },
  { id:3, sha:'c1a7f88', branch:'main', commit:'fix: inventory state correction', actor:'srushty-naik', status:'failed',
    startedAt:'2026-05-14T16:05:00Z', duration:'2m 07s',
    jobs:[{name:'Checkout',status:'success',duration:'3s'},{name:'Setup Terraform',status:'success',duration:'27s'},{name:'Terraform Init',status:'success',duration:'38s'},{name:'Terraform Apply',status:'failed',duration:'58s',error:'Error: compute.VirtualMachinesClient — timeout after 30s'},{name:'Get VM IP',status:'skipped',duration:'—'},{name:'Install Ansible',status:'skipped',duration:'—'},{name:'Run Ansible Playbook',status:'skipped',duration:'—'},{name:'Run state playbooks',status:'skipped',duration:'—'},{name:'Verify deployment',status:'skipped',duration:'—'}],
  },
]

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  return `${Math.floor(s/3600)}h ago`
}

const JOB = {
  success:     { icon:'✓', bg:'#F0FBF2', border:'#A8DFB0', color:'#166534' },
  failed:      { icon:'✕', bg:'#FEF2F4', border:'#FECDD3', color:'#9f1239' },
  running:     { icon:'●', bg:'#EFF6FF', border:'#BFDBFE', color:'#1d4ed8' },
  in_progress: { icon:'●', bg:'#EFF6FF', border:'#BFDBFE', color:'#1d4ed8' },
  skipped:     { icon:'—', bg:'#F9FAFB', border:'#E5E7EB', color:'#9ca3af' },
  pending:     { icon:'○', bg:'#F9FAFB', border:'#F1F5F9', color:'#cbd5e1' },
}
const RUN = {
  success: { label:'Success', dot:'#1EA03C', text:'#166534', bg:'#F0FBF2', border:'#A8DFB0' },
  failed:  { label:'Failed',  dot:'#BE0032', text:'#9f1239', bg:'#FEF2F4', border:'#FECDD3' },
  running: { label:'Running', dot:'#1A4780', text:'#1d4ed8', bg:'#EFF6FF', border:'#BFDBFE' },
}

function JobStep({ job, index, total }) {
  const c = JOB[job.status] || JOB.pending
  return (
    <motion.div initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
      transition={{delay:index*0.04,duration:0.25}} className="flex items-start gap-3">
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        <motion.div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
          style={{background:c.bg,border:`1px solid ${c.border}`,color:c.color}}
          initial={{scale:0}} animate={{scale:1}} transition={{delay:index*0.04+0.04,type:'spring',stiffness:350}}>
          {job.status==='running'||job.status==='in_progress'
            ? <motion.span animate={{scale:[1,1.4,1]}} transition={{duration:0.9,repeat:Infinity}}>●</motion.span>
            : c.icon}
        </motion.div>
        {index<total-1 && <motion.div initial={{height:0}} animate={{height:16}} transition={{delay:index*0.04+0.08,duration:0.2}} style={{width:1,background:'#E5E7EB',marginTop:2}} />}
      </div>
      <div className="flex-1 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[12px] font-medium ${job.status==='pending'?'text-gray-400':'text-gray-800'} ${job.status==='running'||job.status==='in_progress'?'font-semibold text-gray-900':''}`}>{job.name}</span>
          {(job.status==='running'||job.status==='in_progress')
            ? <motion.span animate={{opacity:[1,0,1]}} transition={{duration:1,repeat:Infinity}} className="text-[10px] text-nouryon-blue font-semibold">in progress…</motion.span>
            : job.duration && <span className="text-[10px] text-gray-400">{job.duration}</span>
          }
        </div>
        {job.error && (
          <div className="mt-1 p-2 rounded bg-red-50 border border-red-100">
            <p className="text-[10px] text-red-700 font-mono leading-relaxed">{job.error}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function RunCard({ run, index }) {
  const [open, setOpen] = useState(run.status==='running')
  const c     = RUN[run.status] || RUN.success
  const done  = run.jobs.filter(j=>j.status==='success').length
  const pct   = Math.round((done/run.jobs.length)*100)
  const barColor = run.status==='failed'?'#BE0032':run.status==='running'?'#1A4780':'#1EA03C'

  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
      transition={{delay:index*0.06,duration:0.34,ease:[0.22,1,0.36,1]}}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      style={{boxShadow:run.status==='running'?'0 0 0 2px rgba(26,71,128,0.15)':'0 1px 4px rgba(0,0,0,0.05)'}}>

      {run.status==='running' && (
        <div className="h-[3px] bg-gray-100 relative overflow-hidden">
          <motion.div className="h-full absolute left-0 top-0" style={{background:'#1A4780'}}
            animate={{width:['20%','72%','76%']}} transition={{duration:14,ease:'easeInOut'}} />
          <motion.div style={{position:'absolute',top:0,height:'100%',width:60,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent)'}}
            animate={{left:['-10%','110%']}} transition={{duration:1.8,repeat:Infinity,ease:'linear'}} />
        </div>
      )}

      <button onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors">
        <motion.div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{background:c.dot}}
          animate={run.status==='running'?{boxShadow:['0 0 0 0 rgba(26,71,128,.4)','0 0 0 6px rgba(26,71,128,0)','0 0 0 0 rgba(26,71,128,.4)']}:{}}
          transition={{duration:1.8,repeat:Infinity}} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-gray-900">{run.commit}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:c.bg,border:`1px solid ${c.border}`,color:c.text}}>{c.label}</span>
          </div>
          <div className="flex gap-3 mt-1 flex-wrap text-[11px] text-gray-500">
            <span>#{run.id} · {timeAgo(run.startedAt)}</span>
            <span className="font-mono bg-gray-100 px-1.5 rounded">{run.sha}</span>
            <span>branch: <span className="text-nouryon-blue font-semibold">{run.branch}</span></span>
            {run.duration && <span>⏱ {run.duration}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{background:barColor}}
                initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8,delay:index*0.06+0.2,ease:[0.22,1,0.36,1]}} />
            </div>
            <span className="text-[10px] text-gray-400">{done}/{run.jobs.length} jobs</span>
          </div>
        </div>
        <motion.span animate={{rotate:open?180:0}} transition={{duration:0.2}} className="text-gray-400 text-[13px] flex-shrink-0">▾</motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            transition={{duration:0.28,ease:[0.22,1,0.36,1]}} style={{overflow:'hidden'}}>
            <div className="px-5 pt-1 pb-4 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 my-3">
                Deploy Excel Dashboard to Azure · jobs
              </p>
              {run.jobs.map((job,i)=><JobStep key={job.name} job={job} index={i} total={run.jobs.length} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function PipelineView() {
  const { runs: liveRuns, error, lastSync, refetch } = usePipeline()
  const runs = liveRuns || FALLBACK
  const isLive = !!liveRuns

  const success = runs.filter(r=>r.status==='success').length
  const failed  = runs.filter(r=>r.status==='failed').length
  const running = runs.filter(r=>r.status==='running'||r.status==='in_progress').length

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">Pipeline — GitHub Actions</h1>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Workflow: <span className="font-mono text-nouryon-blue">Deploy Excel Dashboard to Azure</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLive
              ? <span className="flex items-center gap-1.5 text-[11px] text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-semibold">
                  <span className="w-2 h-2 rounded-full bg-nouryon-green animate-pulse_green" />
                  Live · {lastSync?.toLocaleTimeString()}
                </span>
              : <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                  Simulated — add GITHUB_TOKEN to see live data
                </span>
            }
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.96}} onClick={refetch}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-nouryon-blue bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
              ↻ Refresh
            </motion.button>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-4">
          {[{l:'Running',v:running,a:'#1A4780',s:'In progress'},{l:'Success',v:success,a:'#1EA03C',s:'Completed OK'},{l:'Failed',v:failed,a:'#BE0032',s:'Need attention'}].map((k,i)=>(
            <motion.div key={k.l} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
              className="bg-white rounded-xl border border-gray-200 shadow-card p-4" style={{borderLeft:`4px solid ${k.a}`}}>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{k.l}</p>
              <p className="text-[26px] font-bold mt-1" style={{color:k.a}}>{k.v}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{k.s}</p>
            </motion.div>
          ))}
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-700">
            ⚠ Could not reach GitHub API: {error}. Showing cached/simulated data.
          </div>
        )}

        {!isLive && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-nouryon-blue text-[14px]">ℹ</span>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Add <code className="bg-blue-100 px-1 rounded font-mono">GITHUB_TOKEN</code> env var and set <code className="bg-blue-100 px-1 rounded font-mono">GITHUB_OWNER</code> + <code className="bg-blue-100 px-1 rounded font-mono">GITHUB_REPO</code> in Flask to enable live pipeline data.
            </p>
          </div>
        )}

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
            Recent runs ({runs.length}) {isLive ? '· live' : '· simulated'}
          </p>
          <div className="flex flex-col gap-3">
            {runs.map((run,i)=><RunCard key={run.id} run={run} index={i} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
