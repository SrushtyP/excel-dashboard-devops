import { motion } from 'framer-motion'
import { useAzureCost } from '../hooks/useAzureCost'
import { COST_SUMMARY } from '../data/inventory'

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-card p-5 ${className}`}>
      {children}
    </div>
  )
}

function MetricRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-[12px] text-gray-500">{label}</span>
      <span className={`text-[13px] font-bold ${highlight ? 'text-nouryon-green' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

export default function FinOpsView({ datacenters }) {
  const { cost: liveCost, lastSync: costSync } = useAzureCost()
  const cs = liveCost ? { ...COST_SUMMARY, monthlyOptimisedInr: liveCost.monthlyActualInr } : COST_SUMMARY
  const isLiveCost = !!liveCost

  const creditPct = Math.round((cs.creditUsedInr / cs.creditTotalInr) * 100)

  const vmRows = datacenters
    .flatMap(d => d.racks.flatMap(r => r.vms))
    .filter(v => v.state !== 'offline')

  return (
    <div className="flex flex-col gap-0 min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-[20px] font-bold text-gray-900">FinOps — Cost Management</h1>
        <p className="text-[12px] text-gray-500 mt-0.5">ChemCore International · Azure cloud spend</p>
      </div>

      <div className="px-6 py-5 flex flex-col gap-6">

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Unoptimised / mo', value: `₹${cs.monthlyUnoptimisedInr.toLocaleString()}`, accent: '#BE0032', icon: '📉' },
            { label: 'Optimised / mo',   value: `₹${cs.monthlyOptimisedInr.toLocaleString()}`,   accent: '#1EA03C', icon: '📈' },
            { label: 'Savings / mo',     value: `₹${cs.monthlySavingsInr.toLocaleString()}`,     accent: '#1A4780', icon: '💰' },
            { label: 'Savings %',        value: `${cs.savingsPercent}%`,                          accent: '#00ABA9', icon: '✅' },
          ].map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white rounded-xl border border-gray-200 shadow-card p-4"
              style={{ borderLeft: `4px solid ${k.accent}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{k.label}</p>
                  <p className="text-[22px] font-bold mt-1 leading-none" style={{ color: k.accent }}>{k.value}</p>
                </div>
                <span className="text-2xl">{k.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Credit tracker */}
          <Card>
            <h2 className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-4">Azure Credit Usage</h2>
            <div className="flex justify-between mb-1.5">
              <span className="text-[12px] text-gray-600">Used: ₹{cs.creditUsedInr.toLocaleString()}</span>
              <span className="text-[12px] text-gray-600">Total: ₹{cs.creditTotalInr.toLocaleString()}</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-4 rounded-full bg-nouryon-blue"
                initial={{ width: 0 }}
                animate={{ width: `${creditPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-nouryon-blue font-semibold">{creditPct}% used</span>
              <span className="text-[11px] text-gray-400">{100 - creditPct}% remaining</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">Runway — Optimised</p>
                <p className="text-[20px] font-bold text-nouryon-green mt-1">{cs.runwayOptimisedDays} days</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">Runway — Unoptimised</p>
                <p className="text-[20px] font-bold text-nouryon-red mt-1">{cs.runwayUnoptimisedDays} days</p>
              </div>
            </div>
          </Card>

          {/* Savings summary */}
          <Card>
            <h2 className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-4">Optimisation Summary</h2>
            <MetricRow label="Unoptimised monthly" value={`₹${cs.monthlyUnoptimisedInr.toLocaleString()}`} />
            <MetricRow label="Optimised monthly"   value={`₹${cs.monthlyOptimisedInr.toLocaleString()}`} />
            <MetricRow label="Monthly savings"      value={`₹${cs.monthlySavingsInr.toLocaleString()}`} highlight />
            <MetricRow label="Savings percent"      value={`${cs.savingsPercent}%`} highlight />
          </Card>
        </div>

        {/* Per-VM cost table */}
        <Card>
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-4">VM Cost Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200">
                  {['VM', 'State', 'Full cost/mo', 'Optimised/mo', 'Savings/mo', 'Business Unit'].map(h => (
                    <th key={h} className="text-left py-2 pr-3 text-[10px] uppercase tracking-widest font-bold text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vmRows.map((vm, i) => (
                  <motion.tr
                    key={vm.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 pr-3 font-semibold text-gray-800 truncate">{vm.alias}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        vm.state === 'running'   ? 'bg-green-50 text-green-700 border-green-200'  :
                        vm.state === 'snoozed'   ? 'bg-amber-50 text-amber-700 border-amber-200'  :
                        vm.state === 'destroyed' ? 'bg-red-50 text-red-700 border-red-200'        :
                        'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {vm.state}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-700">₹{vm.monthlyInr.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 font-bold text-nouryon-blue">₹{vm.optimisedMonthlyInr.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 font-bold text-nouryon-green">₹{vm.savingsInr.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-gray-500 truncate">{vm.unit}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  )
}
