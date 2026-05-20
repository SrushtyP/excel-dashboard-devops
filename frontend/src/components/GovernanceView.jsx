import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_TAGS      = ['environment', 'contact', 'business_unit']
const ALLOWED_ENV_VALUES = ['production', 'staging', 'dev', 'test', 'ephemeral']
const TAG_MISSPELLINGS   = [
  'enviroment', 'enviornment', 'environement',
  'busines_unit', 'bussiness_unit',
  'conatct', 'contcat',
]

// ─── Mock data: VM Backups ────────────────────────────────────────────────────

const MOCK_BACKUPS = [
  {
    vm: 'vm-running',
    alias: 'Compliance reporting portal',
    policy: 'Daily-30day-Retain',
    last_backup: '2026-05-19T22:00:00Z',
    status: 'Success',
    recovery_points: 30,
    rpo_hours: 24,
    rto_hours: 4,
    storage_gb: 18.4,
    vault: 'chemcore-backup-vault-prod',
    next_backup: '2026-05-20T22:00:00Z',
  },
  {
    vm: 'vm-snoozed',
    alias: 'Mumbai R&D lab',
    policy: 'Weekly-Retain',
    last_backup: '2026-05-12T03:00:00Z',
    status: 'Warning',
    recovery_points: 4,
    rpo_hours: 168,
    rto_hours: 8,
    storage_gb: 6.1,
    vault: 'chemcore-backup-vault-staging',
    next_backup: '2026-05-19T03:00:00Z',
    warning: 'Last backup is 8 days old — exceeds weekly schedule.',
  },
  {
    vm: 'vm-destroyed',
    alias: 'CPCB audit generator',
    policy: 'None',
    last_backup: null,
    status: 'Not Configured',
    recovery_points: 0,
    rpo_hours: null,
    rto_hours: null,
    storage_gb: 0,
    vault: '—',
    next_backup: null,
    warning: 'VM is ephemeral — no backup policy assigned.',
  },
]

const MOCK_APP_BACKUPS = [
  {
    vm: 'vm-running',
    app: 'Flask Dashboard (app.py)',
    last_snapshot: '2026-05-19T22:10:00Z',
    method: 'Azure Blob snapshot',
    status: 'Success',
    size_mb: 142,
    retention_days: 30,
  },
  {
    vm: 'vm-running',
    app: 'inventory.json / inventory.yml',
    last_snapshot: '2026-05-19T22:10:00Z',
    method: 'GitHub (main branch)',
    status: 'Success',
    size_mb: 0.04,
    retention_days: null,
  },
  {
    vm: 'vm-snoozed',
    app: 'R&D Lab Datasets',
    last_snapshot: '2026-05-10T03:15:00Z',
    method: 'Azure Blob snapshot',
    status: 'Stale',
    size_mb: 890,
    retention_days: 7,
    warning: 'Snapshot older than retention window.',
  },
  {
    vm: 'vm-snoozed',
    app: 'Jupyter Notebooks',
    last_snapshot: null,
    method: 'Not configured',
    status: 'Missing',
    size_mb: 0,
    retention_days: null,
    warning: 'No backup configured for notebook data.',
  },
]

// ─── Mock data: Contracts ─────────────────────────────────────────────────────

const CONTRACT_TIERS = {
  'Tier 1': {
    label: 'Tier 1 — Mission Critical',
    description: 'SLA ≥ 99.9% uptime. 24/7 support. Immediate escalation path. Annual audit required.',
    color: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
  },
  'Tier 2': {
    label: 'Tier 2 — Business Important',
    description: 'SLA ≥ 99.5% uptime. Business-hours support. Monthly review.',
    color: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' },
  },
  'Tier 3': {
    label: 'Tier 3 — Non-Critical / Ephemeral',
    description: 'Best-effort. No formal SLA. Self-service support. Quarterly check-in.',
    color: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600', bar: 'bg-gray-400' },
  },
}

const MOCK_CONTRACTS = [
  {
    vm: 'vm-running',
    alias: 'Compliance reporting portal',
    tier: 'Tier 1',
    contract_id: 'CHM-2024-COMP-001',
    vendor: 'Microsoft Azure',
    start_date: '2024-01-01',
    end_date: '2026-12-31',
    sla_uptime: 99.9,
    support_contact: 'azure-enterprise@microsoft.com',
    renewal_status: 'Active',
    auto_renew: true,
    annual_cost_inr: 75000,
    owner: 'compliance-team@chemcore.com',
    notes: 'Covers 24/7 regulatory portal. Reviewed annually with CISO.',
  },
  {
    vm: 'vm-snoozed',
    alias: 'Mumbai R&D lab',
    tier: 'Tier 2',
    contract_id: 'CHM-2025-RND-007',
    vendor: 'Microsoft Azure',
    start_date: '2025-04-01',
    end_date: '2026-09-30',
    sla_uptime: 99.5,
    support_contact: 'rnd-support@chemcore.com',
    renewal_status: 'Expiring Soon',
    auto_renew: false,
    annual_cost_inr: 28000,
    owner: 'rnd-mumbai@chemcore.com',
    notes: 'Snoozed overnight. Renewal decision pending budget approval.',
  },
  {
    vm: 'vm-destroyed',
    alias: 'CPCB audit generator',
    tier: 'Tier 3',
    contract_id: 'CHM-2026-AUDIT-003',
    vendor: 'Internal',
    start_date: '2026-03-01',
    end_date: '2026-04-30',
    sla_uptime: null,
    support_contact: 'audit-team@chemcore.com',
    renewal_status: 'Expired',
    auto_renew: false,
    annual_cost_inr: 0,
    owner: 'audit-team@chemcore.com',
    notes: 'Ephemeral VM for CPCB window. Contract closed post-audit.',
  },
]

// ─── Compliance logic (unchanged from original) ───────────────────────────────

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
      business_unit: vm._unit         || '',
    }

    const hasAll = REQUIRED_TAGS.every(k => tags[k] && tags[k].trim() !== '')
    if (hasAll) compliant++

    const type = vm.specs?.vm_size || 'Unknown'
    if (!perType[type]) perType[type] = { total: 0, compliant: 0 }
    perType[type].total++
    if (hasAll) perType[type].compliant++

    const envVal = tags.environment.toLowerCase()
    if (envVal && !ALLOWED_ENV_VALUES.includes(envVal))
      invalidEnv.push({ name: vm.name, value: tags.environment })

    if (tags.environment && tags.environment !== tags.environment.toLowerCase())
      caseIssues.push({ name: vm.name, value: tags.environment })

    const missing_tags = REQUIRED_TAGS.filter(k => !tags[k] || tags[k].trim() === '')
    if (missing_tags.length > 0)
      missing.push({ name: vm.name, alias: vm.alias, missing: missing_tags })
  })

  const perTypeArr = Object.entries(perType).map(([type, v]) => ({
    type,
    total: v.total,
    compliant: v.compliant,
    percent: Math.round((v.compliant / v.total) * 100),
  }))

  return { total: vms.length, compliant, percent: vms.length ? Math.round((compliant / vms.length) * 100) : 0, perType: perTypeArr, invalidEnv, caseIssues, missing }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionCard({ title, children, badge }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <h3 className="text-[13px] font-bold text-gray-800">{title}</h3>
        {badge !== undefined && (
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badge === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {badge === 0 ? '✓ All clear' : `${badge} issue${badge !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>
      {children}
    </motion.div>
  )
}

function StatCard({ label, value, color = 'text-gray-800', sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{label}</p>
      <p className={`text-[28px] font-black mt-0.5 leading-none ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
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
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-gray-800">{percent}%</span>
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    Success:          'bg-green-100 text-green-700',
    Warning:          'bg-amber-100 text-amber-700',
    Stale:            'bg-amber-100 text-amber-600',
    Missing:          'bg-red-100 text-red-700',
    'Not Configured': 'bg-gray-100 text-gray-500',
    Active:           'bg-green-100 text-green-700',
    'Expiring Soon':  'bg-amber-100 text-amber-700',
    Expired:          'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function TierBadge({ tier }) {
  const c = CONTRACT_TIERS[tier]?.color || { badge: 'bg-gray-100 text-gray-500' }
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{tier}</span>
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.round((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

// ─── Tab: Tag Compliance (original, preserved) ────────────────────────────────

function TagComplianceTab({ vms }) {
  const stats = computeCompliance(vms)

  return (
    <div className="space-y-5">
      <SectionCard title="Overall Tag Compliance">
        <div className="flex items-center gap-6 p-5">
          <ScoreRing percent={stats.percent} />
          <div className="space-y-1">
            <p className="text-[22px] font-bold text-gray-900">{stats.compliant} / {stats.total} VMs compliant</p>
            <p className="text-[12px] text-gray-500">
              Required tags: <span className="font-mono text-[11px] bg-gray-100 px-1 rounded">{REQUIRED_TAGS.join(', ')}</span>
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
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${row.percent}%` }} />
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
              {['VM','Invalid Value','Allowed'].map(h => <th key={h} className="px-5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}
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
              {['VM','Current Value','Should Be'].map(h => <th key={h} className="px-5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}
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
              {['VM','Alias','Missing'].map(h => <th key={h} className="px-5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {stats.missing.map(r => (
                <tr key={r.name}>
                  <td className="px-5 py-2.5 font-mono text-gray-700">{r.name}</td>
                  <td className="px-5 py-2.5 text-gray-500">{r.alias}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {r.missing.map(tag => <span key={tag} className="bg-red-100 text-red-700 text-[10px] font-mono px-1.5 py-0.5 rounded">{tag}</span>)}
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
          When connected to Azure Resource Graph, this section will flag VMs using known misspellings such as:{' '}
          <span className="font-mono">{TAG_MISSPELLINGS.join(', ')}</span>.
          Currently showing local inventory data only.
        </p>
      </div>
    </div>
  )
}

// ─── Tab: VM & Application Backups ───────────────────────────────────────────

function BackupsTab() {
  const [subTab, setSubTab] = useState('vm')

  const vmIssues   = MOCK_BACKUPS.filter(b => b.status !== 'Success').length
  const appIssues  = MOCK_APP_BACKUPS.filter(b => b.status !== 'Success').length
  const configured = MOCK_BACKUPS.filter(b => b.policy !== 'None').length

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="VMs with Backup Policy" value={`${configured}/${MOCK_BACKUPS.length}`} color={configured < MOCK_BACKUPS.length ? 'text-amber-600' : 'text-green-600'} />
        <StatCard label="VM Backup Issues"        value={vmIssues}   color={vmIssues > 0 ? 'text-red-600' : 'text-green-600'} />
        <StatCard label="App Backup Issues"       value={appIssues}  color={appIssues > 0 ? 'text-red-600' : 'text-green-600'} />
        <StatCard label="Total Recovery Points"   value={MOCK_BACKUPS.reduce((s, b) => s + b.recovery_points, 0)} color="text-gray-800" />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['vm', 'VM Backups'], ['app', 'Application Backups']].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`px-4 py-1.5 text-[12px] font-semibold rounded-md transition-all ${subTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={subTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

          {subTab === 'vm' && (
            <div className="space-y-5">
              <SectionCard title="VM Backup Policies" badge={vmIssues}>
                {vmIssues > 0 && (
                  <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                    <p className="text-[11px] text-amber-700">{vmIssues} VM{vmIssues > 1 ? 's' : ''} have backup issues. Review policies in Azure Recovery Services Vault.</p>
                  </div>
                )}
                <table className="w-full text-[12px]">
                  <thead><tr className="bg-gray-50">
                    {['VM','Policy','Last Backup','Recovery Points','RPO','RTO','Vault','Status'].map(h =>
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    )}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {MOCK_BACKUPS.map((b, i) => (
                      <tr key={i} className={`hover:bg-gray-50/60 ${b.status === 'Warning' ? 'bg-amber-50/30' : b.status === 'Not Configured' ? 'bg-gray-50/50' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-mono text-gray-700 text-[11px]">{b.vm}</p>
                          <p className="text-gray-400 text-[10px]">{b.alias}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600 text-[11px]">{b.policy}</td>
                        <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">{b.last_backup ? formatDate(b.last_backup) : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-[13px] ${b.recovery_points > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{b.recovery_points}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-[11px]">{b.rpo_hours ? `${b.rpo_hours}h` : '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-[11px]">{b.rto_hours ? `${b.rto_hours}h` : '—'}</td>
                        <td className="px-4 py-3 font-mono text-gray-400 text-[10px] max-w-[140px] truncate">{b.vault}</td>
                        <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>

              {/* Warning banners */}
              {MOCK_BACKUPS.filter(b => b.warning).map((b, i) => (
                <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                  <p className="text-[11px] font-bold text-amber-700">{b.vm} · {b.alias}</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">{b.warning}</p>
                </div>
              ))}
            </div>
          )}

          {subTab === 'app' && (
            <div className="space-y-5">
              <SectionCard title="Application-Level Backups" badge={appIssues}>
                {appIssues > 0 && (
                  <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                    <p className="text-[11px] text-red-700">{appIssues} application backup{appIssues > 1 ? 's' : ''} need attention — stale snapshots or missing policies.</p>
                  </div>
                )}
                <table className="w-full text-[12px]">
                  <thead><tr className="bg-gray-50">
                    {['VM','Application','Method','Last Snapshot','Size','Retention','Status'].map(h =>
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    )}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {MOCK_APP_BACKUPS.map((a, i) => (
                      <tr key={i} className={`hover:bg-gray-50/60 ${a.status === 'Missing' ? 'bg-red-50/20' : a.status === 'Stale' ? 'bg-amber-50/20' : ''}`}>
                        <td className="px-4 py-2.5 font-mono text-gray-600 text-[11px]">{a.vm}</td>
                        <td className="px-4 py-2.5 text-gray-700 text-[11px] font-medium">{a.app}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-[11px]">{a.method}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-500 text-[11px]">{a.last_snapshot ? formatDate(a.last_snapshot) : '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-500 text-[11px]">{a.size_mb > 0 ? `${a.size_mb} MB` : '—'}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-[11px]">{a.retention_days ? `${a.retention_days}d` : '—'}</td>
                        <td className="px-4 py-2.5"><StatusPill status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>

              <SectionCard title="Remediation Required">
                <div className="divide-y divide-gray-50">
                  {MOCK_APP_BACKUPS.filter(a => a.warning).map((a, i) => (
                    <div key={i} className="px-5 py-3 flex gap-3 items-start">
                      <StatusPill status={a.status} />
                      <div>
                        <p className="text-[12px] font-semibold text-gray-800">{a.app} <span className="text-gray-400 font-normal font-mono">({a.vm})</span></p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{a.warning}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Tab: Contracts ───────────────────────────────────────────────────────────

function ContractsTab() {
  const [activeTier, setActiveTier] = useState('All')
  const tiers = ['All', 'Tier 1', 'Tier 2', 'Tier 3']

  const filtered = activeTier === 'All' ? MOCK_CONTRACTS : MOCK_CONTRACTS.filter(c => c.tier === activeTier)

  const expiringSoon = MOCK_CONTRACTS.filter(c => {
    const d = daysUntil(c.end_date)
    return d !== null && d >= 0 && d <= 90
  })
  const expired      = MOCK_CONTRACTS.filter(c => { const d = daysUntil(c.end_date); return d !== null && d < 0 })
  const totalCost    = MOCK_CONTRACTS.reduce((s, c) => s + c.annual_cost_inr, 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Contracts"   value={MOCK_CONTRACTS.length} />
        <StatCard label="Expiring ≤ 90 days" value={expiringSoon.length} color={expiringSoon.length > 0 ? 'text-amber-600' : 'text-green-600'} />
        <StatCard label="Expired"            value={expired.length}       color={expired.length > 0 ? 'text-red-600' : 'text-green-600'} />
        <StatCard label="Annual Cost (INR)"  value={`₹${totalCost.toLocaleString('en-IN')}`} color="text-gray-800" sub="across active contracts" />
      </div>

      {/* Tier breakdown cards */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(CONTRACT_TIERS).map(([tier, meta]) => {
          const count = MOCK_CONTRACTS.filter(c => c.tier === tier).length
          return (
            <div key={tier} className={`rounded-xl border px-5 py-4 ${meta.color.bg} ${meta.color.border}`}>
              <div className="flex items-center justify-between mb-1">
                <TierBadge tier={tier} />
                <span className={`text-[22px] font-black ${meta.color.badge.includes('red') ? 'text-red-700' : meta.color.badge.includes('amber') ? 'text-amber-700' : 'text-gray-700'}`}>{count}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{meta.description}</p>
            </div>
          )
        })}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {tiers.map(t => (
          <button key={t} onClick={() => setActiveTier(t)}
            className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all border ${activeTier === t ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Contract table */}
      <SectionCard title="Contract Registry" badge={expired.length + expiringSoon.length}>
        <table className="w-full text-[12px]">
          <thead><tr className="bg-gray-50">
            {['VM / System','Contract ID','Tier','Vendor','Start','End','Days Left','SLA','Auto-Renew','Status'].map(h =>
              <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            )}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            <AnimatePresence>
              {filtered.map((c, i) => {
                const days = daysUntil(c.end_date)
                const daysColor = days === null ? 'text-gray-400' : days < 0 ? 'text-red-600 font-bold' : days <= 90 ? 'text-amber-600 font-bold' : 'text-gray-600'
                return (
                  <motion.tr key={c.contract_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`hover:bg-gray-50/60 ${c.renewal_status === 'Expired' ? 'bg-red-50/20' : c.renewal_status === 'Expiring Soon' ? 'bg-amber-50/20' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-gray-700 text-[11px]">{c.vm}</p>
                      <p className="text-gray-400 text-[10px]">{c.alias}</p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-blue-600 text-[11px]">{c.contract_id}</td>
                    <td className="px-4 py-2.5"><TierBadge tier={c.tier} /></td>
                    <td className="px-4 py-2.5 text-gray-600 text-[11px]">{c.vendor}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-400 text-[11px]">{c.start_date}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-600 text-[11px]">{c.end_date}</td>
                    <td className={`px-4 py-2.5 font-mono text-[11px] ${daysColor}`}>
                      {days === null ? '—' : days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-500 text-[11px]">{c.sla_uptime ? `${c.sla_uptime}%` : '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[11px] font-bold ${c.auto_renew ? 'text-green-600' : 'text-gray-400'}`}>{c.auto_renew ? 'Yes' : 'No'}</span>
                    </td>
                    <td className="px-4 py-2.5"><StatusPill status={c.renewal_status} /></td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </SectionCard>

      {/* Detail cards per contract */}
      <div className="space-y-3">
        {filtered.map(c => {
          const meta = CONTRACT_TIERS[c.tier]
          const days = daysUntil(c.end_date)
          return (
            <div key={c.contract_id} className={`rounded-xl border px-5 py-4 ${meta.color.bg} ${meta.color.border}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <TierBadge tier={c.tier} />
                  <span className="font-mono text-[12px] text-gray-700 font-bold">{c.vm}</span>
                  <span className="text-gray-400 text-[11px]">{c.alias}</span>
                </div>
                <StatusPill status={c.renewal_status} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3 text-[11px]">
                <div><p className="text-gray-400 uppercase text-[10px] font-semibold tracking-wider">Owner</p><p className="text-gray-700 font-mono mt-0.5">{c.owner}</p></div>
                <div><p className="text-gray-400 uppercase text-[10px] font-semibold tracking-wider">Support</p><p className="text-gray-700 mt-0.5">{c.support_contact}</p></div>
                <div><p className="text-gray-400 uppercase text-[10px] font-semibold tracking-wider">Annual Cost</p><p className="text-gray-700 font-bold mt-0.5">₹{c.annual_cost_inr.toLocaleString('en-IN')}</p></div>
                <div><p className="text-gray-400 uppercase text-[10px] font-semibold tracking-wider">Expires</p>
                  <p className={`font-mono mt-0.5 font-bold ${days !== null && days < 0 ? 'text-red-600' : days !== null && days <= 90 ? 'text-amber-600' : 'text-gray-700'}`}>
                    {c.end_date} {days !== null ? `(${days < 0 ? `${Math.abs(days)}d ago` : `${days}d`})` : ''}
                  </p>
                </div>
              </div>
              {c.notes && <p className="mt-2 text-[11px] text-gray-500 italic border-t border-black/5 pt-2">{c.notes}</p>}
            </div>
          )
        })}
      </div>

      {/* Renewal action items */}
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <SectionCard title="Action Required">
          <div className="divide-y divide-gray-50">
            {[...expired, ...expiringSoon].map((c, i) => (
              <div key={i} className="px-5 py-3 flex gap-3 items-start">
                <StatusPill status={c.renewal_status} />
                <div>
                  <p className="text-[12px] font-semibold text-gray-800">{c.alias} <span className="font-mono text-gray-400">({c.contract_id})</span></p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {c.renewal_status === 'Expired'
                      ? `Contract expired on ${c.end_date}. Contact ${c.owner} to initiate renewal or close.`
                      : `Contract expires in ${daysUntil(c.end_date)} days (${c.end_date}). ${c.auto_renew ? 'Auto-renew is ON.' : 'Auto-renew is OFF — manual action needed.'}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'tags',      label: 'Tag Compliance', icon: '🏷' },
  { id: 'backups',   label: 'Backups',        icon: '💾' },
  { id: 'contracts', label: 'Contracts',      icon: '📄' },
]

export default function GovernanceView({ datacenters }) {
  const [activeTab, setActiveTab] = useState('tags')

  const vms = (datacenters || []).flatMap(dc =>
    (dc.racks || []).flatMap(rack => rack.vms || [])
  )

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 pt-5 pb-0">
        <h1 className="text-[20px] font-bold text-gray-900 mb-1">Governance</h1>
        <p className="text-[12px] text-gray-400 mb-4">ChemCore International · Information Management Platform · {vms.length} VMs</p>

        <div className="flex gap-0 border-b border-gray-100 -mb-px">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-semibold transition-colors
                ${activeTab === tab.id
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'}`}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 max-w-6xl">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === 'tags'      && <TagComplianceTab vms={vms} />}
            {activeTab === 'backups'   && <BackupsTab />}
            {activeTab === 'contracts' && <ContractsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}