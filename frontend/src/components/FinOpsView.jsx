import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const USD = v => `$${(+v || 0).toFixed(2)}`
const usd = v => `$${(+v || 0).toFixed(4)}`

const COLORS = ['#1A4780','#00ABA9','#1EA03C','#D97706','#BE0032','#7C3AED','#0891B2','#059669','#DC2626','#9333EA']

function KpiCard({ label, value, sub, accent, live, delta, delay=0 }) {
  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay }}
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
      style={{ borderLeft:`3px solid ${accent}` }}>
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{label}</p>
        {live && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0 mt-0.5" />}
      </div>
      <p className="text-[22px] font-bold leading-none" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
      {delta != null && (
        <p className="text-[10px] font-bold mt-0.5" style={{ color: delta >= 0 ? '#BE0032' : '#1EA03C' }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs last month
        </p>
      )}
    </motion.div>
  )
}

function SectionTitle({ children }) {
  return <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">{children}</p>
}

function LiveBadge({ live, synced }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]"
      style={{ color: live ? '#166534' : '#6B7280' }}>
      <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      {live ? `Live · synced ${new Date(synced).toLocaleTimeString()}` : 'Fallback data · Azure not connected'}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-[11px]">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{USD(p.value)}</strong></p>
      ))}
    </div>
  )
}

export default function FinOpsView({ datacenters }) {
  const [cost, setCost]     = useState(null)
  const [loading, setLoad]  = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    fetch('/api/cost')
      .then(r => r.json())
      .then(d => { setCost(d); setLoad(false) })
      .catch(e => { setError(e.message); setLoad(false) })
  }, [])

  // VM cost breakdown from datacenters
  const allVms = datacenters?.flatMap(d => d.racks.flatMap(r => r.vms)) || []
  const vmCostData = allVms
    .filter(v => v.state !== 'offline')
    .map(v => ({
      name: v.alias?.split(' ').slice(0,2).join(' ') || v.id,
      state: v.state,
      monthlyUsd: v.optimisedMonthlyUsd || v.optimisedMonthlyInr / 84 || 0,
      fullUsd: v.monthlyUsd || v.monthlyInr / 84 || 0,
      savingsUsd: v.savingsUsd || v.savingsInr / 84 || 0,
    }))
    .sort((a, b) => b.monthlyUsd - a.monthlyUsd)

  const totalOptimisedUsd = vmCostData.reduce((s, v) => s + v.monthlyUsd, 0)
  const totalFullUsd      = vmCostData.reduce((s, v) => s + v.fullUsd, 0)
  const totalSavingsUsd   = totalFullUsd - totalOptimisedUsd

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <motion.div className="w-8 h-8 rounded-full border-2 border-gray-200"
        style={{ borderTopColor: '#1A4780' }}
        animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
    </div>
  )

  const daily    = cost?.dailyBreakdown || []
  const services = cost?.byService || []
  const byRg     = cost?.byResourceGroup || {}

  // Pie data for VM states
  const stateBreakdown = [
    { name: 'Running',   value: allVms.filter(v=>v.state==='running').length,   color: '#1EA03C' },
    { name: 'Snoozed',   value: allVms.filter(v=>v.state==='snoozed').length,   color: '#D97706' },
    { name: 'Destroyed', value: allVms.filter(v=>v.state==='destroyed').length, color: '#BE0032' },
  ].filter(d => d.value > 0)

  // Pie data for service costs
  const servicePieData = services.slice(0, 6).map((s, i) => ({
    name: s.service.replace('Virtual Machines', 'VMs').replace('Microsoft.', ''),
    value: s.costUsd,
    color: COLORS[i],
  }))

  return (
    <div className="px-6 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">FinOps — Cost Management</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">ChemCore International · Azure cloud spend in <strong>USD</strong></p>
        </div>
        {cost && <LiveBadge live={cost.live} synced={cost.synced} />}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-600">
          ⚠ Could not load Azure cost data: {error}. Showing inventory estimates.
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="MTD Actual Spend"
          value={USD(cost?.totalMtdUsd ?? totalOptimisedUsd)}
          sub={cost?.period || 'This month'}
          accent="#BE0032" live={cost?.live} delay={0} />
        <KpiCard label="Projected / Month"
          value={USD(cost?.projectedMonthUsd ?? totalFullUsd)}
          sub="Full month estimate"
          accent="#1A4780" live={cost?.live} delay={0.05}
          delta={cost?.momChangePct} />
        <KpiCard label="Optimised Cost"
          value={USD(totalOptimisedUsd)}
          sub="With snooze + destroy"
          accent="#1EA03C" live={false} delay={0.1} />
        <KpiCard label="Monthly Savings"
          value={USD(totalSavingsUsd)}
          sub={`${totalFullUsd > 0 ? Math.round((totalSavingsUsd/totalFullUsd)*100) : 0}% vs always-on`}
          accent="#00ABA9" live={false} delay={0.15} />
      </div>

      {/* Daily spend chart */}
      {daily.length > 0 && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Daily Azure Spend (Last 30 Days)</SectionTitle>
            <span className="text-[10px] text-gray-400">USD · Real Azure data</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1A4780" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1A4780" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }}
                tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${v}`} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="costUsd" name="Cost (USD)"
                stroke="#1A4780" strokeWidth={2} fill="url(#costGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Two-column: service breakdown + VM cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Cost by service */}
        {services.length > 0 && (
          <motion.div initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.25 }}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <SectionTitle>Cost by Azure Service (MTD)</SectionTitle>
            <div className="flex items-start gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={servicePieData} cx={65} cy={65} innerRadius={38} outerRadius={60}
                    dataKey="value" paddingAngle={2}>
                    {servicePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => USD(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 min-w-0">
                {servicePieData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[10px] text-gray-600 truncate">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-800 flex-shrink-0">{USD(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* VM cost breakdown */}
        {vmCostData.length > 0 && (
          <motion.div initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.28 }}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <SectionTitle>VM Cost Breakdown (Optimised/mo)</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={vmCostData} layout="vertical" margin={{ top:0, right:40, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize:9 }} tickFormatter={v=>`$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:9 }} width={90} />
                <Tooltip formatter={v => USD(v)} />
                <Bar dataKey="monthlyUsd" name="Optimised/mo" radius={[0,3,3,0]}>
                  {vmCostData.map((entry, i) => (
                    <Cell key={i} fill={entry.state==='running' ? '#1EA03C' : entry.state==='snoozed' ? '#D97706' : '#BE0032'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-2 flex-wrap">
              {[['Running','#1EA03C'],['Snoozed','#D97706'],['Destroyed','#BE0032']].map(([l,c])=>(
                <div key={l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{background:c}}/>
                  <span className="text-[9px] text-gray-500">{l}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Resource group + VM state pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* By resource group */}
        {Object.keys(byRg).length > 0 && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <SectionTitle>Cost by Resource Group (MTD)</SectionTitle>
            <div className="space-y-2">
              {Object.entries(byRg)
                .sort(([,a],[,b]) => b-a)
                .map(([rg, cost], i) => {
                  const total = Object.values(byRg).reduce((s,v)=>s+v,0)
                  const pct = total > 0 ? Math.round((cost/total)*100) : 0
                  return (
                    <div key={rg}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-gray-600 font-semibold truncate">{rg}</span>
                        <span className="font-bold text-gray-800 flex-shrink-0 ml-2">{USD(cost)} <span className="text-gray-400">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: COLORS[i % COLORS.length] }}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </motion.div>
        )}

        {/* VM state distribution */}
        {stateBreakdown.length > 0 && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.33 }}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <SectionTitle>VM State Distribution</SectionTitle>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={stateBreakdown} cx={60} cy={60} innerRadius={35} outerRadius={55}
                    dataKey="value" paddingAngle={3}>
                    {stateBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {stateBreakdown.map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-[11px] text-gray-600">{s.name}</span>
                    </div>
                    <span className="text-[13px] font-bold" style={{ color: s.color }}>{s.value} VM{s.value !== 1 ? 's' : ''}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400">Total: {allVms.filter(v=>v.state!=='offline').length} VMs</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Per-VM cost table */}
      {vmCostData.length > 0 && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.36 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <SectionTitle>Per-VM Cost Summary</SectionTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-gray-50">
                  {['VM', 'State', 'Size', 'Full/mo', 'Optimised/mo', 'Savings/mo'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allVms.filter(v => v.state !== 'offline').map((vm, i) => {
                  const optUsd  = vm.optimisedMonthlyUsd  ?? (vm.optimisedMonthlyInr||0)/84
                  const fullUsd = vm.monthlyUsd ?? (vm.monthlyInr||0)/84
                  const savUsd  = vm.savingsUsd ?? (vm.savingsInr||0)/84
                  const stateColor = vm.state==='running'?'#1EA03C':vm.state==='snoozed'?'D97706':'#BE0032'
                  return (
                    <tr key={vm.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-800">{vm.alias}</div>
                        <div className="text-[9px] text-gray-400">{vm.id}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                          style={{
                            background: vm.state==='running'?'#F0FBF2':vm.state==='snoozed'?'#FFFBEB':'#FFF1F2',
                            color: vm.state==='running'?'#166534':vm.state==='snoozed'?'#92400E':'#9F1239'
                          }}>
                          {vm.state}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-[10px]">{vm.size || '—'}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-700">{USD(fullUsd)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: '#1A4780' }}>{USD(optUsd)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: savUsd > 0 ? '#1EA03C' : '#9CA3AF' }}>
                        {savUsd > 0 ? `+${USD(savUsd)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="px-4 py-2.5 font-black text-gray-700 text-[10px]" colSpan={3}>TOTAL</td>
                  <td className="px-4 py-2.5 font-black text-gray-700">{USD(totalFullUsd)}</td>
                  <td className="px-4 py-2.5 font-black" style={{ color:'#1A4780' }}>{USD(totalOptimisedUsd)}</td>
                  <td className="px-4 py-2.5 font-black" style={{ color:'#1EA03C' }}>{USD(totalSavingsUsd)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      )}

      {/* Savings story */}
      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
        className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-100 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Cost Optimisation Story</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            ['Without optimisation', USD(totalFullUsd), '/month', '#BE0032'],
            ['With snooze + destroy', USD(totalOptimisedUsd), '/month', '#1EA03C'],
            ['Annual savings', USD(totalSavingsUsd * 12), '/year', '#1A4780'],
          ].map(([label, val, unit, color]) => (
            <div key={label}>
              <p className="text-[10px] text-gray-500 mb-1">{label}</p>
              <p className="text-[22px] font-black leading-none" style={{ color }}>{val}</p>
              <p className="text-[10px] text-gray-400">{unit}</p>
            </div>
          ))}
        </div>
      </motion.div>

    </div>
  )
}