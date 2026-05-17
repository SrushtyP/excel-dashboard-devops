import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

const usd = v => `$${(+(v||0)).toFixed(2)}`
const COLORS = ['#1A4780','#00ABA9','#1EA03C','#D97706','#BE0032','#7C3AED','#0891B2','#059669']

const CustomTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-[11px]">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p,i) => <p key={i} style={{color:p.color}}>{p.name}: <strong>{usd(p.value)}</strong></p>)}
    </div>
  )
}

function KpiCard({ label, value, sub, accent, live, delta, delay=0 }) {
  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay}}
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
      style={{borderLeft:`3px solid ${accent}`}}>
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{label}</p>
        {live && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0 mt-0.5" />}
      </div>
      <p className="text-[22px] font-bold leading-none" style={{color:accent}}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
      {delta!=null && (
        <p className="text-[10px] font-bold mt-0.5" style={{color:delta>=0?'#BE0032':'#1EA03C'}}>
          {delta>=0?'▲':'▼'} {Math.abs(delta)}% vs last month
        </p>
      )}
    </motion.div>
  )
}

function Section({ title, children, delay=0, badge }) {
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay}}
      className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
        {badge && <span className="text-[9px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      {children}
    </motion.div>
  )
}

// ── Per-VM detail drawer ───────────────────────────────────────────────────────
function VMDetail({ vm, onClose }) {
  // Simulated daily cost data for the VM (in reality would come from /api/cost?vm=...)
  const days = Array.from({length:30},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-29+i)
    const isWeekend = d.getDay()===0||d.getDay()===6
    const base = vm.state==='running' ? (vm.optimisedMonthlyUsd||2)/30
      : vm.state==='snoozed' ? (vm.optimisedMonthlyUsd||2)/30
      : 0
    return {
      date: d.toISOString().slice(5,10),
      costUsd: +(base * (isWeekend && vm.state==='snoozed' ? 0.1 : 1) * (0.9+Math.random()*0.2)).toFixed(4)
    }
  })
  const total30 = days.reduce((s,d)=>s+d.costUsd,0)
  const optUsd  = vm.optimisedMonthlyUsd ?? (vm.optimisedMonthlyInr||0)/84
  const fullUsd = vm.monthlyUsd          ?? (vm.monthlyInr||0)/84
  const savUsd  = vm.savingsUsd          ?? (vm.savingsInr||0)/84

  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{background:vm.state==='running'?'#1EA03C':vm.state==='snoozed'?'#D97706':'#BE0032'}} />
          <div>
            <p className="text-[14px] font-bold text-gray-900">{vm.alias}</p>
            <p className="text-[10px] text-gray-400">{vm.id} · {vm.size}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-[12px] transition-colors">✕ close</button>
      </div>

      <div className="p-5">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            ['Full/mo',    usd(fullUsd), '#1A4780'],
            ['Optimised',  usd(optUsd),  '#1EA03C'],
            ['Saves/mo',   usd(savUsd),  '#00ABA9'],
          ].map(([l,v,c])=>(
            <div key={l} className="rounded-lg p-3 border border-gray-100 text-center">
              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wide mb-1">{l}</p>
              <p className="text-[16px] font-black" style={{color:c}}>{v}</p>
            </div>
          ))}
        </div>

        {/* 30-day chart */}
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
          Daily Cost — Last 30 Days <span className="font-normal text-gray-400 ml-1">(30-day total: {usd(total30)})</span>
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={days} margin={{top:4,right:8,left:0,bottom:0}}>
            <defs>
              <linearGradient id={`vmGrad${vm.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#1A4780" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1A4780" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{fontSize:8}} interval={4} />
            <YAxis tick={{fontSize:8}} tickFormatter={v=>`$${v.toFixed(3)}`} width={44} />
            <Tooltip content={<CustomTip />} />
            <Area type="monotone" dataKey="costUsd" name="Cost (USD)"
              stroke="#1A4780" strokeWidth={1.5} fill={`url(#vmGrad${vm.id})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>

        {/* Note on data source */}
        {vm.state!=='destroyed' && (
          <p className="text-[9px] text-gray-400 mt-2">
            ⓘ Daily values estimated from optimised monthly rate.
            {vm.state==='snoozed' && ' Weekend cost reduced per snooze schedule.'}
            {' '}Live per-day data available via Azure Cost Management once <code>azure-mgmt-costmanagement</code> is installed.
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ── Azure Monitor Logs ─────────────────────────────────────────────────────────
function MonitoringView() {
  const [logs, setLogs]   = useState(null)
  const [loading, setLoad] = useState(true)
  const [error, setError]  = useState(null)

  useEffect(() => {
    fetch('/api/monitor/logs')
      .then(r => r.json())
      .then(d => { setLogs(d); setLoad(false) })
      .catch(() => { setError('Monitor API not available'); setLoad(false) })
  }, [])

  const LEVEL_COLOR = { Critical:'#BE0032', Error:'#BE0032', Warning:'#D97706', Information:'#1A4780', Verbose:'#9CA3AF' }

  if (loading) return (
    <div className="flex items-center justify-center h-24">
      <motion.div className="w-5 h-5 rounded-full border-2 border-gray-200" style={{borderTopColor:'#1A4780'}}
        animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  if (error || !logs?.entries?.length) return (
    <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 text-center">
      <p className="text-[11px] text-gray-500 font-semibold mb-1">
        {error || 'No logs available'}
      </p>
      <p className="text-[10px] text-gray-400">
        Install <code className="bg-gray-100 px-1 rounded">azure-mgmt-monitor</code> and add
        a Log Analytics workspace to enable live VM activity logs.
      </p>
    </div>
  )

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      {logs.entries.map((e,i) => (
        <motion.div key={i} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
          className="flex items-start gap-2.5 p-2.5 rounded-lg border"
          style={{background:i%2===0?'#FAFAFA':'#fff',borderColor:'#F0F0F0'}}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{background:LEVEL_COLOR[e.level]||'#9CA3AF'}} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-gray-700 truncate">{e.operation}</span>
              <span className="text-[9px] text-gray-400 flex-shrink-0">{e.timestamp}</span>
            </div>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{e.resource} · {e.caller}</p>
          </div>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{background:(LEVEL_COLOR[e.level]||'#9CA3AF')+'18',color:LEVEL_COLOR[e.level]||'#9CA3AF'}}>
            {e.level}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

// ── Main FinOps View ───────────────────────────────────────────────────────────
export default function FinOpsView({ datacenters }) {
  const [cost, setCost]       = useState(null)
  const [loading, setLoad]    = useState(true)
  const [selectedVm, setVm]   = useState(null)
  const [activeTab, setTab]   = useState('overview')

  useEffect(() => {
    fetch('/api/cost')
      .then(r=>r.json())
      .then(d=>{ setCost(d); setLoad(false) })
      .catch(()=>setLoad(false))
  }, [])

  const allVms = datacenters?.flatMap(d=>d.racks.flatMap(r=>r.vms)) || []
  const activeVms = allVms.filter(v=>v.state!=='offline')

  // Cost helpers — prefer USD fields
  const getOpt  = v => v.optimisedMonthlyUsd ?? (v.optimisedMonthlyInr||0)/84
  const getFull = v => v.monthlyUsd          ?? (v.monthlyInr||0)/84
  const getSav  = v => v.savingsUsd          ?? (v.savingsInr||0)/84

  const totalOptUsd  = activeVms.reduce((s,v)=>s+getOpt(v),0)
  const totalFullUsd = activeVms.reduce((s,v)=>s+getFull(v),0)
  const totalSavUsd  = totalFullUsd - totalOptUsd

  const vmBarData = activeVms.map(v=>({
    name: v.alias?.split(' ').slice(0,2).join(' ') || v.id,
    state: v.state,
    opt: +getOpt(v).toFixed(2),
    full: +getFull(v).toFixed(2),
  })).sort((a,b)=>b.opt-a.opt)

  const statePie = [
    {name:'Running',  value:allVms.filter(v=>v.state==='running').length,  color:'#1EA03C'},
    {name:'Snoozed',  value:allVms.filter(v=>v.state==='snoozed').length,  color:'#D97706'},
    {name:'Destroyed',value:allVms.filter(v=>v.state==='destroyed').length,color:'#BE0032'},
  ].filter(d=>d.value>0)

  const servicePie = (cost?.byService||[]).slice(0,6).map((s,i)=>({
    name:s.service.replace('Virtual Machines','VMs').replace('Microsoft.','').slice(0,18),
    value:s.costUsd, color:COLORS[i]
  }))

  const daily = cost?.dailyBreakdown || []
  const byRg  = cost?.byResourceGroup || {}

  const TABS = [
    {id:'overview',  label:'Overview'},
    {id:'vms',       label:'VM Analysis'},
    {id:'monitor',   label:'Monitor Logs'},
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <motion.div className="w-8 h-8 rounded-full border-2 border-gray-200" style={{borderTopColor:'#1A4780'}}
        animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen">
      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex items-end">
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setTab(tab.id)}
            className={`relative px-5 py-3.5 text-[13px] font-semibold transition-colors ${activeTab===tab.id?'text-nouryon-blue':'text-gray-500 hover:text-gray-800'}`}>
            {tab.label}
            {activeTab===tab.id && (
              <motion.div layoutId="finopsTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-nouryon-blue rounded-t"
                transition={{type:'spring',stiffness:400,damping:30}} />
            )}
          </button>
        ))}
      </div>

      <div className="px-6 py-6 space-y-5 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">FinOps — Cost Management</h1>
            <p className="text-[12px] text-gray-500 mt-0.5">ChemCore International · Azure cloud spend · <strong>USD</strong></p>
          </div>
          {cost && (
            <div className="flex items-center gap-1.5 text-[10px]" style={{color:cost.live?'#166534':'#6B7280'}}>
              <span className={`w-1.5 h-1.5 rounded-full ${cost.live?'bg-green-500 animate-pulse':'bg-gray-400'}`} />
              {cost.live ? `Live · ${new Date(cost.synced).toLocaleTimeString()}` : 'Inventory estimate · Azure not connected'}
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="MTD Actual Spend" value={usd(cost?.totalMtdUsd??totalOptUsd)}
            sub={cost?.period||'This month'} accent="#BE0032" live={cost?.live} delay={0} />
          <KpiCard label="Projected / Month" value={usd(cost?.projectedMonthUsd??totalFullUsd)}
            sub="Full month estimate" accent="#1A4780" live={cost?.live} delay={0.05} delta={cost?.momChangePct} />
          <KpiCard label="Optimised Cost" value={usd(totalOptUsd)}
            sub="With snooze + destroy" accent="#1EA03C" delay={0.1} />
          <KpiCard label="Monthly Savings" value={usd(totalSavUsd)}
            sub={`${totalFullUsd>0?Math.round((totalSavUsd/totalFullUsd)*100):0}% vs always-on`}
            accent="#00ABA9" delay={0.15} />
        </div>

        <AnimatePresence mode="wait">

          {/* ── OVERVIEW TAB ── */}
          {activeTab==='overview' && (
            <motion.div key="overview" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-5">

              {/* Daily spend — full width */}
              {daily.length>0 && (
                <Section title="Daily Azure Spend — Last 30 Days" badge="Real Azure data · USD" delay={0.18}>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={daily} margin={{top:4,right:8,left:0,bottom:0}}>
                      <defs>
                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1A4780" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#1A4780" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="date" tick={{fontSize:9}} tickFormatter={d=>d.slice(5)} interval="preserveStartEnd" />
                      <YAxis tick={{fontSize:9}} tickFormatter={v=>`$${v}`} width={38} />
                      <Tooltip content={<CustomTip />} />
                      <Area type="monotone" dataKey="costUsd" name="Spend (USD)"
                        stroke="#1A4780" strokeWidth={2} fill="url(#costGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Section>
              )}

              {/* Two charts side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* By service pie */}
                <Section title="Cost by Azure Service (MTD)" badge="Top 6" delay={0.22}>
                  {servicePie.length>0 ? (
                    <div className="flex items-start gap-4">
                      <ResponsiveContainer width={130} height={130}>
                        <PieChart>
                          <Pie data={servicePie} cx={60} cy={60} innerRadius={36} outerRadius={58}
                            dataKey="value" paddingAngle={2}>
                            {servicePie.map((e,i)=><Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip formatter={v=>usd(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        {servicePie.map((s,i)=>(
                          <div key={i} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}} />
                              <span className="text-[10px] text-gray-600 truncate">{s.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-800 flex-shrink-0">{usd(s.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 text-center py-6">
                      Service breakdown available when azure-mgmt-costmanagement is installed on VM.
                    </p>
                  )}
                </Section>

                {/* VM state pie */}
                <Section title="VM State Distribution" delay={0.24}>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={130} height={130}>
                      <PieChart>
                        <Pie data={statePie} cx={60} cy={60} innerRadius={35} outerRadius={55}
                          dataKey="value" paddingAngle={3}>
                          {statePie.map((e,i)=><Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 flex-1">
                      {statePie.map(s=>(
                        <div key={s.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{background:s.color}} />
                            <span className="text-[11px] text-gray-600">{s.name}</span>
                          </div>
                          <span className="text-[13px] font-bold" style={{color:s.color}}>{s.value} VM{s.value!==1?'s':''}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400">Total active: {activeVms.length} VMs</p>
                      </div>
                    </div>
                  </div>
                </Section>
              </div>

              {/* Resource group bars + VM cost side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* By resource group */}
                {Object.keys(byRg).length>0 && (
                  <Section title="Cost by Resource Group (MTD)" badge="Live Azure data" delay={0.27}>
                    <div className="space-y-2">
                      {Object.entries(byRg).sort(([,a],[,b])=>b-a).map(([rg,cost],i)=>{
                        const total = Object.values(byRg).reduce((s,v)=>s+v,0)
                        const pct = total>0?Math.round((cost/total)*100):0
                        return (
                          <div key={rg}>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-gray-600 font-semibold truncate">{rg}</span>
                              <span className="font-bold text-gray-800 flex-shrink-0 ml-2">{usd(cost)} <span className="text-gray-400">({pct}%)</span></span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div className="h-full rounded-full" style={{background:COLORS[i%COLORS.length]}}
                                initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8,delay:i*0.1}} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Section>
                )}

                {/* VM cost bar */}
                <Section title="VM Cost Breakdown (Opt/mo)" delay={0.29}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={vmBarData} layout="vertical" margin={{top:0,right:40,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                      <XAxis type="number" tick={{fontSize:9}} tickFormatter={v=>`$${v}`} />
                      <YAxis type="category" dataKey="name" tick={{fontSize:9}} width={85} />
                      <Tooltip formatter={v=>usd(v)} />
                      <Bar dataKey="opt" name="Optimised/mo" radius={[0,3,3,0]}>
                        {vmBarData.map((e,i)=>(
                          <Cell key={i} fill={e.state==='running'?'#1EA03C':e.state==='snoozed'?'#D97706':'#BE0032'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Section>
              </div>

              {/* Savings story */}
              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.35}}
                className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-100 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">Cost Optimisation Story</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  {[
                    ['Without optimisation',usd(totalFullUsd),'/month','#BE0032'],
                    ['With snooze + destroy',usd(totalOptUsd),'/month','#1EA03C'],
                    ['Annual savings',usd(totalSavUsd*12),'/year','#1A4780'],
                  ].map(([l,v,u,c])=>(
                    <div key={l}>
                      <p className="text-[10px] text-gray-500 mb-1">{l}</p>
                      <p className="text-[22px] font-black leading-none" style={{color:c}}>{v}</p>
                      <p className="text-[10px] text-gray-400">{u}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── VM ANALYSIS TAB ── */}
          {activeTab==='vms' && (
            <motion.div key="vms" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">

              {/* VM selector table */}
              <Section title="Select a VM to see day-by-day cost" delay={0.1}>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-gray-50">
                        {['VM','State','Size','Full/mo','Opt/mo','Saves/mo',''].map(h=>(
                          <th key={h} className="text-left px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeVms.map((vm,i)=>{
                        const optU  = getOpt(vm);  const fulU = getFull(vm); const savU = getSav(vm)
                        const sel   = selectedVm?.id===vm.id
                        return (
                          <tr key={vm.id} className={`border-t border-gray-50 transition-colors cursor-pointer ${sel?'bg-blue-50':' hover:bg-gray-50'}`}
                            onClick={()=>setVm(sel?null:vm)}>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-gray-800">{vm.alias}</div>
                              <div className="text-[9px] text-gray-400">{vm.id}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                                style={{background:vm.state==='running'?'#F0FBF2':vm.state==='snoozed'?'#FFFBEB':'#FFF1F2',
                                  color:vm.state==='running'?'#166534':vm.state==='snoozed'?'#92400E':'#9F1239'}}>
                                {vm.state}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-500 text-[10px]">{vm.size||'—'}</td>
                            <td className="px-3 py-2.5 font-semibold text-gray-700">{usd(fulU)}</td>
                            <td className="px-3 py-2.5 font-bold" style={{color:'#1A4780'}}>{usd(optU)}</td>
                            <td className="px-3 py-2.5 font-bold" style={{color:savU>0?'#1EA03C':'#9CA3AF'}}>
                              {savU>0?`+${usd(savU)}`:'—'}
                            </td>
                            <td className="px-3 py-2.5 text-[10px]" style={{color:'#1A4780'}}>
                              {sel?'▲ hide':'▼ analyse'}
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td className="px-3 py-2.5 font-black text-gray-700 text-[10px]" colSpan={3}>TOTAL</td>
                        <td className="px-3 py-2.5 font-black text-gray-700">{usd(totalFullUsd)}</td>
                        <td className="px-3 py-2.5 font-black" style={{color:'#1A4780'}}>{usd(totalOptUsd)}</td>
                        <td className="px-3 py-2.5 font-black" style={{color:'#1EA03C'}}>{usd(totalSavUsd)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Per-VM detail */}
              <AnimatePresence>
                {selectedVm && <VMDetail key={selectedVm.id} vm={selectedVm} onClose={()=>setVm(null)} />}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── MONITOR LOGS TAB ── */}
          {activeTab==='monitor' && (
            <motion.div key="monitor" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
              <Section title="Azure Activity Logs" badge="Via azure-mgmt-monitor" delay={0.1}>
                <MonitoringView />
              </Section>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-700">
                <p className="font-bold mb-1">To enable live Azure Monitor logs:</p>
                <ol className="space-y-1 list-decimal ml-4 text-[10px]">
                  <li>Add <code className="bg-white px-1 rounded border border-blue-200">azure-mgmt-monitor</code> to <code className="bg-white px-1 rounded border border-blue-200">requirements.txt</code></li>
                  <li>Create a Log Analytics workspace in <code className="bg-white px-1 rounded border border-blue-200">rg-dashboard-demo</code></li>
                  <li>Link your VMs to the workspace under Diagnostic Settings</li>
                  <li>The <code className="bg-white px-1 rounded border border-blue-200">/api/monitor/logs</code> endpoint will then return real activity log entries</li>
                </ol>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}