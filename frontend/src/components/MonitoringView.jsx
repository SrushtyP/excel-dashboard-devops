import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ─── DATA (mirrors ChemCore_VM_Data.xlsx · place file at public/data/) ──────

const VMS = [
  { id: 'web01', name: 'chemcore-prod-web01', role: 'Web Server',        env: 'Production',  uptime: 99.97, vcpu: 4,  ram: 16  },
  { id: 'db01',  name: 'chemcore-prod-db01',  role: 'Database Server',   env: 'Production',  uptime: 99.95, vcpu: 8,  ram: 32  },
  { id: 'app01', name: 'chemcore-dev-app01',  role: 'Application Server', env: 'Development', uptime: 98.82, vcpu: 2,  ram: 8   },
]

const VM_COLOR  = { web01: '#1A4780', db01: '#00ABA9', app01: '#FF5300' }
const VM_DASH   = { web01: '0',       db01: '6 2',     app01: '2 2'     }

// Deterministic pseudo-random (same seed → same numbers as Excel)
const rng = (() => { let s = 42; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff } })()
const gauss = (mean, sd) => { const u = rng() + 1e-9, v = rng(); return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
const clamp  = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

const DAYS = ['14 May', '15 May', '16 May', '17 May', '18 May', '19 May', '20 May', '21 May']
const profiles = {
  web01: { cpu: [55, 30], mem: [72, 10], ni: [45, 20], no: [30, 15], iops: [850,  200] },
  db01:  { cpu: [68, 15], mem: [85,  5], ni: [15,  8], no: [10,  5], iops: [3200, 500] },
  app01: { cpu: [35, 25], mem: [55, 15], ni: [ 8,  4], no: [ 5,  3], iops: [320,  100] },
}

const TIMESERIES = DAYS.flatMap(day =>
  [0, 1, 2].map(h => {
    const f = 0.7 + 0.5 * (h / 2)
    const pt = { label: `${day} ${(h * 8).toString().padStart(2, '0')}:00`, day }
    Object.keys(profiles).forEach(vm => {
      const p = profiles[vm]
      pt[`${vm}_cpu`]  = Math.round(clamp(gauss(p.cpu[0] * f, p.cpu[1]),  5, 99) * 10) / 10
      pt[`${vm}_mem`]  = Math.round(clamp(gauss(p.mem[0],     p.mem[1]),  20, 99) * 10) / 10
      pt[`${vm}_ni`]   = Math.round(clamp(gauss(p.ni[0] * f,  p.ni[1]),   0, 200) * 10) / 10
      pt[`${vm}_no`]   = Math.round(clamp(gauss(p.no[0] * f,  p.no[1]),   0, 200) * 10) / 10
      pt[`${vm}_iops`] = Math.round(clamp(gauss(p.iops[0] * f, p.iops[1]), 50, 9999))
    })
    return pt
  })
)

const ALERTS = [
  { date: '21 May 2026', vm: 'chemcore-prod-db01',  type: 'High CPU',        sev: 'Critical', desc: 'CPU sustained above 95% for 15 min',       dur: '22 min',  resolved: false },
  { date: '20 May 2026', vm: 'chemcore-prod-web01', type: 'SSL Cert Expiry', sev: 'High',     desc: 'SSL certificate expiring in 14 days',       dur: 'N/A',     resolved: false },
  { date: '19 May 2026', vm: 'chemcore-dev-app01',  type: 'Disk Space',      sev: 'Medium',   desc: 'Disk usage at 87% on /var',                 dur: '4 hrs',   resolved: true  },
  { date: '18 May 2026', vm: 'chemcore-prod-db01',  type: 'Failed Login',    sev: 'High',     desc: '5 consecutive failed RDP attempts blocked', dur: 'Instant', resolved: true  },
  { date: '17 May 2026', vm: 'chemcore-prod-web01', type: 'High CPU',        sev: 'Medium',   desc: 'CPU above 80% during peak traffic',         dur: '45 min',  resolved: true  },
  { date: '16 May 2026', vm: 'chemcore-prod-db01',  type: 'Memory Pressure', sev: 'High',     desc: 'Memory usage at 92%, paging detected',     dur: '1.5 hrs', resolved: true  },
  { date: '15 May 2026', vm: 'chemcore-dev-app01',  type: 'Service Restart', sev: 'Low',      desc: 'App service restarted unexpectedly',        dur: '8 min',   resolved: true  },
  { date: '14 May 2026', vm: 'chemcore-prod-web01', type: 'Network Spike',   sev: 'Medium',   desc: 'Inbound traffic 3× normal baseline',       dur: '2 hrs',   resolved: true  },
]

// ─── TINY HELPERS ────────────────────────────────────────────────────────────

const SEV_STYLE = {
  Critical: { text: 'text-red-700  bg-red-50  border border-red-200'   },
  High:     { text: 'text-orange-700 bg-orange-50 border border-orange-200' },
  Medium:   { text: 'text-yellow-700 bg-yellow-50 border border-yellow-200' },
  Low:      { text: 'text-gray-600 bg-gray-100 border border-gray-200'  },
}
const SevBadge = ({ sev }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${SEV_STYLE[sev]?.text}`}>{sev}</span>
)

const KpiCard = ({ label, value, sub, accentClass = 'border-nouryon-blue' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${accentClass} p-4`}>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-[26px] font-bold text-gray-900 leading-tight">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
)

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-[11px] font-[Arial]">
      <p className="font-bold text-nouryon-blue mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          <span className="font-bold">{p.name}</span>: {p.value}{p.unit || ''}
        </p>
      ))}
    </div>
  )
}

const VmLegend = () => (
  <div className="flex gap-5 flex-wrap">
    {VMS.map(v => (
      <span key={v.id} className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <svg width={26} height={8}>
          <line x1={0} y1={4} x2={26} y2={4}
            stroke={VM_COLOR[v.id]} strokeWidth={2} strokeDasharray={VM_DASH[v.id]} />
        </svg>
        {v.name}
      </span>
    ))}
  </div>
)

// Average of last N rows for a key
const avgLast = (key, n = 5) => {
  const pts = TIMESERIES.slice(-n)
  return Math.round(pts.reduce((a, d) => a + (d[key] || 0), 0) / pts.length * 10) / 10
}
const maxAll = key => Math.max(...TIMESERIES.map(d => d[key] || 0))

// ─── SUB-VIEWS ────────────────────────────────────────────────────────────────

function OverviewTab() {
  const openAlerts = ALERTS.filter(a => !a.resolved).length
  const critAlerts = ALERTS.filter(a => a.sev === 'Critical').length

  // Uptime bar data
  const uptimeData = VMS.map(v => ({ name: v.id, uptime: v.uptime }))

  // Daily avg CPU across all VMs
  const trendData = DAYS.map(day => {
    const pts = TIMESERIES.filter(d => d.day === day)
    return {
      day,
      web01: Math.round(pts.reduce((a, d) => a + d.web01_cpu, 0) / pts.length * 10) / 10,
      db01:  Math.round(pts.reduce((a, d) => a + d.db01_cpu,  0) / pts.length * 10) / 10,
      app01: Math.round(pts.reduce((a, d) => a + d.app01_cpu, 0) / pts.length * 10) / 10,
    }
  })

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="VMs Running"     value="3 / 3"    sub="All healthy"          accentClass="border-nouryon-blue"  />
        <KpiCard label="Avg Uptime"      value="99.58%"   sub="Last 30 days"         accentClass="border-nouryon-green" />
        <KpiCard label="Open Alerts"     value={openAlerts} sub="Needs attention"    accentClass={openAlerts > 0 ? 'border-orange-500' : 'border-nouryon-green'} />
        <KpiCard label="Critical Alerts" value={critAlerts} sub="Immediate action"   accentClass={critAlerts > 0 ? 'border-red-600' : 'border-nouryon-green'}   />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Uptime */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-[12px] font-bold text-nouryon-blue uppercase tracking-widest mb-4">
            VM Uptime (%)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={uptimeData} barSize={36} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Arial' }} />
              <YAxis domain={[98, 100]} tick={{ fontSize: 11, fontFamily: 'Arial' }} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip />} formatter={v => [`${v}%`, 'Uptime']} />
              <ReferenceLine y={99} stroke="#BE0032" strokeDasharray="4 2"
                label={{ value: 'SLA 99%', fill: '#BE0032', fontSize: 10 }} />
              {uptimeData.map((d, i) => (
                <Bar key={d.name} dataKey="uptime" fill={Object.values(VM_COLOR)[i]}
                  radius={[4, 4, 0, 0]} name="Uptime" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 7-day CPU trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-[12px] font-bold text-nouryon-blue uppercase tracking-widest mb-1">
            7-Day CPU Trend (Daily Avg)
          </h3>
          <VmLegend />
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Arial' }} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'Arial' }} unit="%" />
              <Tooltip content={<ChartTooltip />} />
              {VMS.map(v => (
                <Line key={v.id} type="monotone" dataKey={v.id}
                  stroke={VM_COLOR[v.id]} strokeWidth={2} dot={false}
                  strokeDasharray={VM_DASH[v.id]} unit="%" name={v.id} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* VM health cards */}
      <div>
        <h3 className="text-[12px] font-bold text-nouryon-blue uppercase tracking-widest mb-3">
          VM Health Summary
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {VMS.map(v => {
            const avgCpu = avgLast(`${v.id}_cpu`)
            const avgMem = avgLast(`${v.id}_mem`)
            const vmAlerts = ALERTS.filter(a => a.vm === v.name)
            const openVmAlerts = vmAlerts.filter(a => !a.resolved).length
            return (
              <div key={v.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
                style={{ borderTop: `3px solid ${VM_COLOR[v.id]}` }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[12px] font-bold" style={{ color: VM_COLOR[v.id] }}>{v.id}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{v.name}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-nouryon-green">
                    <span className="w-1.5 h-1.5 rounded-full bg-nouryon-green" />Running
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Uptime</span>
                    <span className="font-bold text-nouryon-green">{v.uptime}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg CPU (5pt)</span>
                    <span className={`font-bold ${avgCpu > 80 ? 'text-red-600' : avgCpu > 60 ? 'text-orange-500' : 'text-gray-700'}`}>
                      {avgCpu}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Mem (5pt)</span>
                    <span className={`font-bold ${avgMem > 90 ? 'text-red-600' : avgMem > 80 ? 'text-orange-500' : 'text-gray-700'}`}>
                      {avgMem}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Open Alerts</span>
                    <span className={`font-bold ${openVmAlerts > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {openVmAlerts > 0 ? openVmAlerts : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CpuMemoryTab() {
  const [metric, setMetric] = useState('cpu')

  const metaMap = {
    cpu: { label: 'CPU Usage', unit: '%', refLine: 80, keys: VMS.map(v => `${v.id}_cpu`) },
    mem: { label: 'Memory Usage', unit: '%', refLine: 90, keys: VMS.map(v => `${v.id}_mem`) },
  }
  const m = metaMap[metric]

  // Stats per VM for the chosen metric
  const stats = VMS.map(v => {
    const key = `${v.id}_${metric}`
    const vals = TIMESERIES.map(d => d[key])
    const avg  = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10
    const max  = Math.max(...vals)
    const last = vals[vals.length - 1]
    return { ...v, avg, max, last }
  })

  // Stacked daily bar — avg per day per VM
  const dailyAvg = DAYS.map(day => {
    const pts = TIMESERIES.filter(d => d.day === day)
    const row = { day }
    VMS.forEach(v => {
      row[v.id] = Math.round(pts.reduce((a, d) => a + d[`${v.id}_${metric}`], 0) / pts.length * 10) / 10
    })
    return row
  })

  return (
    <div className="space-y-6">
      {/* Metric toggle */}
      <div className="flex items-center gap-3">
        {Object.entries(metaMap).map(([k, v]) => (
          <button key={k} onClick={() => setMetric(k)}
            className={`px-5 py-1.5 rounded-full text-[12px] font-bold border transition-all duration-150
              ${metric === k
                ? 'bg-nouryon-blue text-white border-nouryon-blue'
                : 'bg-white text-gray-500 border-gray-200 hover:border-nouryon-blue hover:text-nouryon-blue'
              }`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(v => (
          <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4"
            style={{ borderLeft: `4px solid ${VM_COLOR[v.id]}` }}>
            <p className="text-[11px] font-bold mb-0.5" style={{ color: VM_COLOR[v.id] }}>{v.name}</p>
            <p className="text-[10px] text-gray-400 mb-3">{v.role}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['7D AVG', v.avg, ''], ['7D MAX', v.max, v.max > m.refLine ? 'text-red-600' : ''], ['LATEST', v.last, '']].map(([lbl, val, cls]) => (
                <div key={lbl}>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider">{lbl}</p>
                  <p className={`text-[18px] font-bold ${cls || 'text-gray-800'}`}>{val}{m.unit}</p>
                </div>
              ))}
            </div>
            {/* Usage bar */}
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${v.last}%`, background: v.last > m.refLine ? '#BE0032' : VM_COLOR[v.id] }} />
            </div>
          </div>
        ))}
      </div>

      {/* Time-series chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-bold text-nouryon-blue uppercase tracking-widest">
            {m.label} — 7-Day Timeseries
          </h3>
          <span className="text-[10px] text-gray-400">Source: Azure Monitor · 14–21 May 2026</span>
        </div>
        <VmLegend />
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={TIMESERIES} margin={{ top: 10, right: 16, bottom: 44, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: 'Arial' }}
              angle={-40} textAnchor="end" interval={3} />
            <YAxis tick={{ fontSize: 11, fontFamily: 'Arial' }} unit={m.unit} domain={[0, 100]} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={m.refLine} stroke="#BE0032" strokeDasharray="4 2"
              label={{ value: `Alert ${m.refLine}%`, fill: '#BE0032', fontSize: 10, position: 'right' }} />
            {VMS.map(v => (
              <Line key={v.id} type="monotone"
                dataKey={`${v.id}_${metric}`}
                stroke={VM_COLOR[v.id]} strokeWidth={2} dot={false}
                strokeDasharray={VM_DASH[v.id]} unit={m.unit} name={v.id} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily grouped bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-[12px] font-bold text-nouryon-blue uppercase tracking-widest mb-4">
          Daily Average — {m.label}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyAvg} barGap={2} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Arial' }} />
            <YAxis tick={{ fontSize: 10, fontFamily: 'Arial' }} unit={m.unit} />
            <Tooltip content={<ChartTooltip />} />
            {VMS.map(v => (
              <Bar key={v.id} dataKey={v.id} fill={VM_COLOR[v.id]}
                radius={[3, 3, 0, 0]} name={v.id} unit={m.unit} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex gap-5 mt-2">
          {VMS.map(v => (
            <span key={v.id} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ background: VM_COLOR[v.id] }} />
              {v.id}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function NetworkIopsTab() {
  const [metric, setMetric] = useState('ni')
  const metaMap = {
    ni:   { label: 'Network In',  unit: ' Mbps', keys: VMS.map(v => `${v.id}_ni`)   },
    no:   { label: 'Network Out', unit: ' Mbps', keys: VMS.map(v => `${v.id}_no`)   },
    iops: { label: 'IOPS',        unit: ' IOPS', keys: VMS.map(v => `${v.id}_iops`) },
  }
  const m = metaMap[metric]

  const stats = VMS.map(v => {
    const key = `${v.id}_${metric}`
    const vals = TIMESERIES.map(d => d[key])
    return {
      ...v,
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10,
      max: Math.max(...vals),
      last: vals[vals.length - 1],
    }
  })

  // Area chart data — for in/out overlay on same chart
  const areaData = TIMESERIES

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex gap-3">
        {Object.entries(metaMap).map(([k, v]) => (
          <button key={k} onClick={() => setMetric(k)}
            className={`px-5 py-1.5 rounded-full text-[12px] font-bold border transition-all duration-150
              ${metric === k
                ? 'bg-nouryon-blue text-white border-nouryon-blue'
                : 'bg-white text-gray-500 border-gray-200 hover:border-nouryon-blue hover:text-nouryon-blue'
              }`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(v => (
          <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4"
            style={{ borderLeft: `4px solid ${VM_COLOR[v.id]}` }}>
            <p className="text-[11px] font-bold mb-0.5" style={{ color: VM_COLOR[v.id] }}>{v.name}</p>
            <p className="text-[10px] text-gray-400 mb-3">{v.role}</p>
            <div className="grid grid-cols-3 gap-1 text-center">
              {[['AVG', v.avg], ['MAX', v.max], ['LATEST', v.last]].map(([lbl, val]) => (
                <div key={lbl}>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider">{lbl}</p>
                  <p className="text-[16px] font-bold text-gray-800">{val}<span className="text-[10px] text-gray-400">{m.unit.trim()}</span></p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-bold text-nouryon-blue uppercase tracking-widest">
            {m.label} — 7-Day Timeseries
          </h3>
          <span className="text-[10px] text-gray-400">Azure Monitor · 14–21 May 2026</span>
        </div>
        <VmLegend />
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={areaData} margin={{ top: 10, right: 16, bottom: 44, left: 4 }}>
            <defs>
              {VMS.map(v => (
                <linearGradient key={v.id} id={`grad_${v.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor={VM_COLOR[v.id]} stopOpacity={0.15} />
                  <stop offset="90%" stopColor={VM_COLOR[v.id]} stopOpacity={0}    />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: 'Arial' }}
              angle={-40} textAnchor="end" interval={3} />
            <YAxis tick={{ fontSize: 11, fontFamily: 'Arial' }} />
            <Tooltip content={<ChartTooltip />} />
            {VMS.map(v => (
              <Area key={v.id} type="monotone"
                dataKey={`${v.id}_${metric}`}
                stroke={VM_COLOR[v.id]} strokeWidth={2} dot={false}
                fill={`url(#grad_${v.id})`}
                strokeDasharray={VM_DASH[v.id]}
                unit={m.unit} name={v.id} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Network In vs Out side by side (only when not on iops tab) */}
      {metric !== 'iops' && (
        <div className="grid grid-cols-2 gap-5">
          {[['ni', 'Network In (Mbps)'], ['no', 'Network Out (Mbps)']].map(([mk, title]) => (
            <div key={mk} className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-[11px] font-bold text-nouryon-blue uppercase tracking-widest mb-3">{title}</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={DAYS.map(day => {
                    const pts = TIMESERIES.filter(d => d.day === day)
                    const row = { day }
                    VMS.forEach(v => {
                      row[v.id] = Math.round(pts.reduce((a, d) => a + d[`${v.id}_${mk}`], 0) / pts.length * 10) / 10
                    })
                    return row
                  })}
                  barGap={2}
                  margin={{ top: 2, right: 4, bottom: 2, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fontFamily: 'Arial' }} />
                  <YAxis tick={{ fontSize: 9, fontFamily: 'Arial' }} />
                  <Tooltip content={<ChartTooltip />} />
                  {VMS.map(v => (
                    <Bar key={v.id} dataKey={v.id} fill={VM_COLOR[v.id]}
                      radius={[2, 2, 0, 0]} name={v.id} unit=" Mbps" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AlertsTab() {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? ALERTS
    : filter === 'open'
      ? ALERTS.filter(a => !a.resolved)
      : ALERTS.filter(a => a.sev === filter)

  const counts = {
    all: ALERTS.length,
    open: ALERTS.filter(a => !a.resolved).length,
    Critical: ALERTS.filter(a => a.sev === 'Critical').length,
    High: ALERTS.filter(a => a.sev === 'High').length,
    Medium: ALERTS.filter(a => a.sev === 'Medium').length,
  }

  // Trend: alerts per day
  const trendData = DAYS.map(day => ({
    day,
    count: ALERTS.filter(a => a.date.includes(day.split(' ')[0])).length,
  }))

  const FILTERS = [
    { key: 'all',      label: `All (${counts.all})` },
    { key: 'open',     label: `Open (${counts.open})`,         dot: 'bg-red-500'    },
    { key: 'Critical', label: `Critical (${counts.Critical})`, dot: 'bg-red-600'    },
    { key: 'High',     label: `High (${counts.High})`,         dot: 'bg-orange-500' },
    { key: 'Medium',   label: `Medium (${counts.Medium})`,     dot: 'bg-yellow-500' },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Alerts"    value={ALERTS.length}       sub="Last 30 days"       accentClass="border-nouryon-blue"  />
        <KpiCard label="Open / Unresolved" value={counts.open}       sub="Needs action"       accentClass={counts.open > 0 ? 'border-red-500' : 'border-nouryon-green'} />
        <KpiCard label="Critical"        value={counts.Critical}     sub="Immediate action"   accentClass="border-red-600"       />
        <KpiCard label="High Severity"   value={counts.High}         sub="Review required"    accentClass="border-orange-500"    />
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-[12px] font-bold text-nouryon-blue uppercase tracking-widest mb-3">
          Alert Frequency — 14–21 May
        </h3>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="20%" stopColor="#1A4780" stopOpacity={0.2} />
                <stop offset="90%" stopColor="#1A4780" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Arial' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'Arial' }} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="count" stroke="#1A4780" strokeWidth={2}
              fill="url(#alertGrad)" name="Alerts" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-150
              ${filter === f.key
                ? 'bg-nouryon-blue text-white border-nouryon-blue'
                : 'bg-white text-gray-500 border-gray-200 hover:border-nouryon-blue hover:text-nouryon-blue'
              }`}>
            {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Alerts table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-[12px]" style={{ fontFamily: 'Arial, sans-serif' }}>
          <thead>
            <tr className="bg-nouryon-blue text-white text-[10px] font-bold uppercase tracking-widest">
              {['Date', 'VM', 'Alert Type', 'Severity', 'Description', 'Duration', 'Status'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EFF4FA]'}>
                <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">{a.date}</td>
                <td className="px-4 py-2.5 font-bold text-nouryon-blue whitespace-nowrap">
                  {a.vm.replace('chemcore-', '')}
                </td>
                <td className="px-4 py-2.5 font-semibold">{a.type}</td>
                <td className="px-4 py-2.5"><SevBadge sev={a.sev} /></td>
                <td className="px-4 py-2.5 text-gray-600 max-w-[260px]">{a.desc}</td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{a.dur}</td>
                <td className="px-4 py-2.5">
                  {a.resolved
                    ? <span className="text-[10px] font-bold text-nouryon-green flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-nouryon-green" />Resolved
                      </span>
                    : <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Open
                      </span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-8 text-[12px] text-gray-400">No alerts match the selected filter.</p>
        )}
      </div>
    </div>
  )
}

// ─── MAIN MONITORING VIEW ─────────────────────────────────────────────────────

const SUB_TABS = [
  { id: 'overview', label: 'Overview',       icon: '📊' },
  { id: 'cpu',      label: 'CPU & Memory',   icon: '🖥️' },
  { id: 'network',  label: 'Network & IOPS', icon: '🌐' },
  { id: 'alerts',   label: 'Alerts',         icon: '🔔', badge: ALERTS.filter(a => !a.resolved).length },
]

export default function MonitoringView() {
  const [sub, setSub] = useState('overview')

  const content = {
    overview: <OverviewTab />,
    cpu:      <CpuMemoryTab />,
    network:  <NetworkIopsTab />,
    alerts:   <AlertsTab />,
  }
// this is sample commit
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-[20px] font-bold text-gray-900">Monitoring</h1>
        <p className="text-[12px] text-gray-500 mt-0.5">
          ChemCore International · Nouryon IM Platform · 3 VMs · Azure Monitor
        </p>
      </div>

      {/* Sub-tab bar */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0">
          {SUB_TABS.map(tab => {
            const active = sub === tab.id
            return (
              <button key={tab.id} onClick={() => setSub(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-3 text-[13px] font-semibold
                  transition-colors duration-150 border-b-2
                  ${active
                    ? 'text-nouryon-blue border-nouryon-blue'
                    : 'text-gray-500 border-transparent hover:text-nouryon-blue hover:border-gray-300'
                  }`}>
                <span className="text-sm leading-none">{tab.icon}</span>
                {tab.label}
                {tab.badge > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full
                    bg-red-500 text-white text-[9px] font-black px-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 px-6 py-6 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={sub}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {content[sub]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}