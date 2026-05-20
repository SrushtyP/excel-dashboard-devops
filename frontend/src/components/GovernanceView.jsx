import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const REQUIRED_TAGS = ['environment', 'contact', 'business_unit']
const ALLOWED_ENV_VALUES = ['production', 'staging', 'dev', 'test', 'ephemeral']
const TAG_MISSPELLINGS = [
  'enviroment', 'enviornment', 'environement',
  'buisness_unit', 'bussiness_unit',
  'conatct', 'contcat',
]

function computeCompliance(vms) {
  let compliant = 0
  const perType = {}
  const invalidEnv = []
  const caseIssues = []
  const missing = []

  vms.forEach(vm => {
    const tags = {
      environment:   vm.environment   || '',
      contact:       vm.contact       || '',
      business_unit: vm.business_unit || '',
    }

    const hasAll = REQUIRED_TAGS.every(k => tags[k] && tags[k].trim() !== '')
    if (hasAll) compliant++

    const type = vm.specs?.vm_size || 'Unknown'
    if (!perType[type]) perType[type] = { total: 0, compliant: 0 }
    perType[type].total++
    if (hasAll) perType[type].compliant++

    const envVal = tags.environment.toLowerCase()
    if (envVal && !ALLOWED_ENV_VALUES.includes(envVal)) {
      invalidEnv.push({ name: vm.name, value: tags.environment })
    }

    if (tags.environment && tags.environment !== tags.environment.toLowerCase()) {
      caseIssues.push({ name: vm.name, value: tags.environment })
    }

    const missing_tags = REQUIRED_TAGS.filter(k => !tags[k] || tags[k].trim() === '')
    if (missing_tags.length > 0) {
      missing.push({ name: vm.name, alias: vm.alias, missing: missing_tags })
    }
  })

  const perTypeArr = Object.entries(perType).map(([type, v]) => ({
    type,
    total: v.total,
    compliant: v.compliant,
    percent: Math.round((v.compliant / v.total) * 100),
  }))

  return {
    total: vms.length,
    compliant,
    percent: vms.length ? Math.round((compliant / vms.length) * 100) : 0,
    perType: perTypeArr,
    invalidEnv,
    caseIssues,
    missing,
  }
}

function ScoreRing({ percent }) {
  const color = percent >= 80 ? '#22c55e' : percent >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${percent} ${100 - percent}`}
          strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-gray-800">
        {percent}%
      </span>
    </div>
  )
}

function SectionCard({ title, children, badge }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="text-[13px] font-bold text-gray-800">{title}</h3>
        {badge !== undefined && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full
            ${badge === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {badge === 0 ? '✓ All clear' : `${badge} issue${badge > 1 ? 's' : ''}`}
          </span>
        )}
      </div>
      {children}
    </motion.div>
  )
}

export default function GovernanceView({ datacenters }) {
  const vms = datacenters.flatMap(dc => dc.vms || [])
  const stats = computeCompliance(vms)

  return (
    <div className="flex flex-col min-h-screen bg-surface-page">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-[20px] font-bold text-gray-900">Governance</h1>
        <p className="text-[12px] text-gray-500 mt-0.5">
          Tag compliance audit · ChemCore International · {vms.length} VMs
        </p>
      </div>

      <div className="flex-1 p-6 space-y-5 max-w-5xl">

        <SectionCard title="Overall Tag Compliance">
          <div className="flex items-center gap-6 p-5">
            <ScoreRing percent={stats.percent} />
            <div className="space-y-1">
              <p className="text-[22px] font-bold text-gray-900">{stats.compliant} / {stats.total} VMs compliant</p>
              <p className="text-[12px] text-gray-500">
                Required tags: <span className="font-mono text-[11px] bg-gray-100 px-1 rounded">
                  {REQUIRED_TAGS.join(', ')}
                </span>
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Per Resource-Type Compliance">
          <div className="divide-y divide-gray-50">
            {stats.perType.map(row => (
              <div key={row.type} className="flex items-center gap-4 px-5 py-3">
                <span className="text-[12px] font-mono text-gray-600 w-40 truncate">{row.type}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-nouryon-blue transition-all"
                    style={{ width: `${row.percent}%` }} />
                </div>
                <span className="text-[12px] font-bold text-gray-700 w-10 text-right">{row.percent}%</span>
                <span className="text-[11px] text-gray-400">{row.compliant}/{row.total}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Invalid Environment Tag Values" badge={stats.invalidEnv.length}>
          {stats.invalidEnv.length === 0 ? (
            <p className="px-5 py-4 text-[12px] text-gray-400">No invalid environment values found.</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead><tr className="bg-gray-50">
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">VM</th>
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Invalid Value</th>
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Allowed</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {stats.invalidEnv.map(r => (
                  <tr key={r.name}>
                    <td className="px-5 py-2.5 font-mono text-gray-700">{r.name}</td>
                    <td className="px-5 py-2.5"><span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono">{r.value}</span></td>
                    <td className="px-5 py-2.5 text-gray-400">{ALLOWED_ENV_VALUES.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="Case-Inconsistent Tag Values" badge={stats.caseIssues.length}>
          {stats.caseIssues.length === 0 ? (
            <p className="px-5 py-4 text-[12px] text-gray-400">All tag values are lowercase — no case issues.</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead><tr className="bg-gray-50">
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">VM</th>
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Value</th>
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Should Be</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {stats.caseIssues.map(r => (
                  <tr key={r.name}>
                    <td className="px-5 py-2.5 font-mono text-gray-700">{r.name}</td>
                    <td className="px-5 py-2.5"><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-mono">{r.value}</span></td>
                    <td className="px-5 py-2.5 font-mono text-green-700">{r.value.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="Missing Required Tags" badge={stats.missing.length}>
          {stats.missing.length === 0 ? (
            <p className="px-5 py-4 text-[12px] text-gray-400">All VMs have the required tags.</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead><tr className="bg-gray-50">
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">VM</th>
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Alias</th>
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Missing</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {stats.missing.map(r => (
                  <tr key={r.name}>
                    <td className="px-5 py-2.5 font-mono text-gray-700">{r.name}</td>
                    <td className="px-5 py-2.5 text-gray-500">{r.alias}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {r.missing.map(tag => (
                          <span key={tag} className="bg-red-100 text-red-700 text-[10px] font-mono px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-[11px] font-bold text-amber-700 mb-1">⚠ Tag Key Misspelling Detection</p>
          <p className="text-[11px] text-amber-600">
            When connected to Azure Resource Graph, this section will flag VMs using known misspellings such as:
            {' '}<span className="font-mono">{TAG_MISSPELLINGS.join(', ')}</span>.
            Currently showing local inventory data only.
          </p>
        </div>

      </div>
    </div>
  )
}