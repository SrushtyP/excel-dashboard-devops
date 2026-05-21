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


// ── Resize Impact Modal (fixed overlay, blurred background) ───────────────────
function ResizeImpactModal({ selected, currentVm, currentPrice, curMonthly, onClose }) {
  const newMonthly = selected.retailPrice * 730
  const saving     = curMonthly - newMonthly
  const savingPct  = Math.round((saving / curMonthly) * 100)
  const isCheaper  = saving >= 0

  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', background: 'rgba(15,23,42,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(26,71,128,0.22), 0 4px 16px rgba(0,0,0,0.12)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: isCheaper ? 'linear-gradient(135deg,#F0FDF4,#ECFDF5)' : 'linear-gradient(135deg,#FFF7ED,#FEF2F2)', borderBottom: `1px solid ${isCheaper ? '#BBF7D0' : '#FECACA'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: isCheaper ? '#DCFCE7' : '#FEE2E2', border: `1.5px solid ${isCheaper ? '#86EFAC' : '#FCA5A5'}` }}>
              {isCheaper ? '📉' : '📈'}
            </div>
            <div>
              <h2 className="text-[15px] font-black text-gray-900">Resize Impact Summary</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {currentVm} → <span className="font-bold text-gray-700">{selected.armSkuName || selected.skuName}</span>
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.08, backgroundColor: '#F3F4F6' }}
            whileTap={{ scale: 0.94 }}
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors text-[14px]"
          >✕</motion.button>
        </div>

        <div className="p-6 space-y-5">
          {/* Cost comparison grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Current',     value: `$${curMonthly.toFixed(2)}`, sub: `$${currentPrice.toFixed(4)}/hr`,            color: '#1A4780', bg: '#EFF6FF', border: '#BFDBFE' },
              { label: 'New Cost',    value: `$${newMonthly.toFixed(2)}`,  sub: `$${selected.retailPrice.toFixed(4)}/hr`,    color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
              { label: isCheaper ? 'You Save' : 'Extra Cost',
                value: `$${Math.abs(saving).toFixed(2)}`,
                sub: `${Math.abs(savingPct)}% ${isCheaper ? 'cheaper' : 'more expensive'}`,
                color: isCheaper ? '#059669' : '#DC2626',
                bg: isCheaper ? '#F0FDF4' : '#FEF2F2',
                border: isCheaper ? '#BBF7D0' : '#FECACA' },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-3 text-center border"
                style={{ background: c.bg, borderColor: c.border }}>
                <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: c.color }}>{c.label}</p>
                <p className="text-[20px] font-black leading-none" style={{ color: c.color }}>{c.value}</p>
                <p className="text-[9px] text-gray-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Annual projection */}
          <div className="rounded-xl p-4 border"
            style={{ background: isCheaper ? '#F0FDF4' : '#FEF2F2', borderColor: isCheaper ? '#86EFAC' : '#FCA5A5' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5"
                  style={{ color: isCheaper ? '#166534' : '#991B1B' }}>
                  {isCheaper ? '📈 Annual Savings' : '📉 Annual Extra Cost'}
                </p>
                <p className="text-[28px] font-black leading-none"
                  style={{ color: isCheaper ? '#166534' : '#991B1B' }}>
                  ${Math.abs(saving * 12).toFixed(2)}
                  <span className="text-[12px] font-normal text-gray-400 ml-1">/year</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">Monthly delta</p>
                <p className="text-[16px] font-bold" style={{ color: isCheaper ? '#166534' : '#991B1B' }}>
                  {isCheaper ? '−' : '+'}${Math.abs(saving).toFixed(2)}/mo
                </p>
                <p className="text-[9px] text-gray-400">{Math.abs(savingPct)}% {isCheaper ? 'reduction' : 'increase'}</p>
              </div>
            </div>
          </div>

          {/* VM details row */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="rounded-lg p-3 bg-gray-50 border border-gray-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Current VM</p>
              <p className="font-bold text-gray-800">{currentVm}</p>
              <p className="text-gray-500 mt-0.5">${currentPrice.toFixed(4)}/hr · ${curMonthly.toFixed(2)}/mo</p>
            </div>
            <div className="rounded-lg p-3 border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
              <p className="text-[9px] font-black uppercase tracking-widest text-nouryon-blue mb-2">Selected VM</p>
              <p className="font-bold text-gray-800">{selected.armSkuName || selected.skuName}</p>
              <p className="text-gray-500 mt-0.5">${selected.retailPrice.toFixed(4)}/hr · ${newMonthly.toFixed(2)}/mo</p>
            </div>
          </div>

          {/* How to apply */}
          <div className="rounded-lg p-3 bg-gray-50 border border-gray-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">ℹ How to Apply</p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Update <code className="bg-gray-200 px-1 rounded font-mono text-[10px]">variable "vm_size"</code> default
              in <code className="bg-gray-200 px-1 rounded font-mono text-[10px]">terraform/variables.tf</code> to{' '}
              <code className="bg-blue-100 px-1 rounded font-mono text-[10px] text-blue-700">{selected.armSkuName || selected.skuName}</code>,
              then push to <code className="bg-gray-200 px-1 rounded font-mono text-[10px]">main</code> to trigger the pipeline.
            </p>
          </div>

          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white transition-colors"
            style={{ background: '#1A4780' }}
          >
            Close
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── VM Resize Calculator ───────────────────────────────────────────────────────
// Uses Azure Retail Prices API — public, no auth required
function ResizeCalculator() {
  const [region, setRegion]     = useState('southafricanorth')
  const [families, setFamilies] = useState(new Set(['B','D']))
  const [items, setItems]       = useState([])
  const [loading, setLoad]      = useState(false)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState(null)

  const CURRENT_VM    = 'Standard_B2ats_v2'
  const CURRENT_PRICE = 0.0122 // $/hr South Africa North

  const toggleFamily = f => {
    setFamilies(prev => {
      const next = new Set(prev)
      next.has(f) ? next.delete(f) : next.add(f)
      return next
    })
  }

  const fetchPrices = async () => {
    if (!families.size) return
    setLoad(true); setError(null); setItems([]); setSelected(null)
    try {
      // Use armSkuName contains 'Standard_X' — reliable family matching
      // Also restrict to Virtual Machines service to avoid DB/Storage noise
      const familyParts = [...families].map(f =>
        `contains(armSkuName, 'Standard_${f}')`
      ).join(' or ')

      const filter = `armRegionName eq '${region}' and serviceName eq 'Virtual Machines' and priceType eq 'Consumption' and (${familyParts})`

      // Call Flask proxy — avoids CORS from browser to prices.azure.com
      const url  = `/api/pricing?$filter=${encodeURIComponent(filter)}&$top=200`
      const r    = await fetch(url)

      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${r.status} from /api/pricing`)
      }

      const data = await r.json()
      if (data.error) throw new Error(data.error)

      // Filter: Linux only (no Windows), no Spot, no Low Priority, deduplicate by armSkuName
      const seen   = new Set()
      const result = (data.Items || [])
        .filter(item =>
          item.retailPrice > 0 &&
          item.armSkuName &&
          !item.productName?.includes('Windows') &&
          !item.skuName?.includes('Spot') &&
          !item.skuName?.includes('Low Priority') &&
          !seen.has(item.armSkuName) && seen.add(item.armSkuName)
        )
        .sort((a, b) => a.retailPrice - b.retailPrice)
        .slice(0, 50)

      if (!result.length) throw new Error('No Linux VM prices found for selected families in this region. Try B+D families.')
      setItems(result)
    } catch(e) {
      setError(e.message)
    } finally {
      setLoad(false)
    }
  }

  const curMonthly = CURRENT_PRICE * 730

  return (
    <Section title="VM Family Switch & Resize Calculator" badge="Azure Retail Prices API · live · no auth" delay={0.4}>
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Region</p>
          <select value={region} onChange={e=>{setRegion(e.target.value);setItems([])}}
            className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300">
            <option value="southafricanorth">South Africa North</option>
            <option value="centralus">Central US</option>
            <option value="eastus">East US</option>
            <option value="westeurope">West Europe</option>
            <option value="southeastasia">Southeast Asia</option>
            <option value="australiaeast">Australia East</option>
          </select>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">VM Families</p>
          <div className="flex gap-3 flex-wrap">
            {[['B','Burstable'],['D','General Purpose'],['F','Compute Opt'],['E','Memory Opt']].map(([f,label])=>(
              <label key={f} className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={families.has(f)} onChange={()=>toggleFamily(f)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-300" />
                <span><strong>{f}</strong>-series <span className="text-gray-400">({label})</span></span>
              </label>
            ))}
          </div>
        </div>
        <button onClick={fetchPrices} disabled={loading}
          className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-opacity"
          style={{background:'#1A4780',opacity:loading?0.6:1}}>
          {loading ? '⟳ Fetching...' : '↻ Fetch Live Prices'}
        </button>
      </div>

      {/* Current VM banner */}
      <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-[11px] flex flex-wrap gap-3">
        <span><strong>Current:</strong> <span className="font-bold text-blue-700">{CURRENT_VM}</span></span>
        <span><strong>$/hr:</strong> ${CURRENT_PRICE.toFixed(4)}</span>
        <span><strong>$/mo (730hr):</strong> <span className="font-bold">${curMonthly.toFixed(2)}</span></span>
        <span><strong>Region:</strong> {region}</span>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-100">
          <p className="text-[11px] text-red-600 font-semibold">⚠ {error}</p>
          {error.includes('fetch') && (
            <p className="text-[10px] text-red-400 mt-1">
              Flask proxy at <code className="bg-red-100 px-1 rounded">/api/pricing</code> not reachable —
              make sure the latest <code className="bg-red-100 px-1 rounded">app.py</code> is deployed and Flask is running.
            </p>
          )}
        </div>
      )}

      {/* Pricing table */}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-100">
                {['VM Size','$/hr','$/mo (730hr)','vs Current',''].map(h=>(
                  <th key={h} className="text-left px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const monthly   = item.retailPrice * 730
                const diff      = monthly - curMonthly
                const diffPct   = Math.round((diff / curMonthly) * 100)
                const isCurrent = item.armSkuName === 'Standard_B2ats_v2'
                const sel       = selected?.armSkuName === item.armSkuName
                return (
                  <tr key={item.armSkuName || item.skuName}
                    className="border-b border-gray-50 transition-colors cursor-pointer"
                    style={{background: isCurrent ? '#EFF6FF' : sel ? '#F0FDF4' : undefined}}
                    onMouseEnter={e=>{ if(!isCurrent && !sel) e.currentTarget.style.background='#F9FAFB' }}
                    onMouseLeave={e=>{ if(!isCurrent && !sel) e.currentTarget.style.background='' }}>
                    <td className="px-3 py-2 font-semibold" style={{color:isCurrent?'#1A4780':'#222'}}>
                      {item.armSkuName || item.skuName}{isCurrent?' ⭐':''}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600">${item.retailPrice.toFixed(4)}</td>
                    <td className="px-3 py-2 font-bold" style={{color:'#1A4780'}}>${monthly.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {isCurrent
                        ? <span className="text-[10px] font-bold text-blue-600">● Active</span>
                        : diff < 0
                          ? <span className="font-bold text-green-700">↓ ${Math.abs(diff).toFixed(2)}/mo ({Math.abs(diffPct)}% cheaper)</span>
                          : <span className="text-red-600">↑ ${diff.toFixed(2)}/mo (+{diffPct}%)</span>}
                    </td>
                    <td className="px-3 py-2">
                      {!isCurrent && (
                        <button onClick={()=>setSelected(item)}
                          className="px-2.5 py-1 text-[10px] font-semibold text-white rounded-md"
                          style={{background:'#1A4780'}}>
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resize Impact Summary modal — rendered via portal at top level */}
      <AnimatePresence>
        {selected && (
          <ResizeImpactModal
            selected={selected}
            currentVm={CURRENT_VM}
            currentPrice={CURRENT_PRICE}
            curMonthly={curMonthly}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {!items.length && !loading && !error && (
        <p className="text-[11px] text-gray-400 text-center py-6">
          Select VM families and click <strong>Fetch Live Prices</strong> to compare real Azure costs
        </p>
      )}
    </Section>
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
    ,
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

              {/* 1. Daily Azure Spend — full width */}
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

              {/* 2. Cost Optimisation Story */}
              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.20}}
                className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-100 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">Cost Optimisation Story</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  {[
                    ['Without optimisation',  usd(totalFullUsd),  '/month', '#BE0032'],
                    ['With snooze + destroy',  usd(totalOptUsd),   '/month', '#1EA03C'],
                    ['Annual savings',         usd(totalSavUsd*12),'/year',  '#1A4780'],
                  ].map(([l,v,u,c])=>(
                    <div key={l}>
                      <p className="text-[10px] text-gray-500 mb-1">{l}</p>
                      <p className="text-[22px] font-black leading-none" style={{color:c}}>{v}</p>
                      <p className="text-[10px] text-gray-400">{u}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* 3. Two charts side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* By service pie */}
                <Section title="Cost by Azure Service (MTD)" badge="Top 6" delay={0.25}>
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
                <Section title="VM State Distribution" delay={0.27}>
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

              {/* 4. Resource group bars + VM cost side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* By resource group */}
                {Object.keys(byRg).length>0 && (
                  <Section title="Cost by Resource Group (MTD)" badge="Live Azure data" delay={0.30}>
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
                <Section title="VM Cost Breakdown (Opt/mo)" delay={0.32}>
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

              {/* 5. VM Family Switch & Resize Calculator */}
              <ResizeCalculator />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}