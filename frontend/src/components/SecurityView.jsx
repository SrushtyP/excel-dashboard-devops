import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  Owner:       { bg: 'bg-red-100',    text: 'text-red-700'    },
  Contributor: { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  Reader:      { bg: 'bg-green-100',  text: 'text-green-700'  },
  Unknown:     { bg: 'bg-gray-100',   text: 'text-gray-600'   },
}

const SEVERITY_COLORS = {
  Critical: { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
  High:     { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  Medium:   { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
  Low:      { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  Info:     { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
}

// ─── Shared hook: generic fetch with loading/error state ─────────────────────
// Response is expected as { "vm-name": [ ...items ], ... }
// Returns a flat array with vmName injected into each item.

function useSecurityApi(url) {
  const [data, setData]       = useState([])    // flat array after normalisation
  const [raw, setRaw]         = useState(null)  // original nested object, kept for callers that need it
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(nested => {
        setRaw(nested)
        // Flatten: { "vm-a": [{...}, ...], "vm-b": [{...}] } → [{vmName:"vm-a",...}, ...]
        const flat = Object.entries(nested).flatMap(([vmName, items]) => {
          if (!Array.isArray(items)) return []   // skip error keys
          return items.map(item => ({ ...item, vmName }))
        })
        setData(flat)
        setLastFetched(new Date())
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [url])

  return { data, raw, loading, error, refetch: load, lastFetched }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function LoadingPane({ message = 'Fetching data from Azure…' }) {
  return (
    <div className="flex items-center justify-center h-48 gap-3 text-[13px] text-gray-400">
      <svg className="animate-spin w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
      </svg>
      {message}
    </div>
  )
}

function ErrorPane({ error, onRetry }) {
  return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start justify-between">
        <div>
          <p className="text-[12px] font-bold text-red-700 mb-0.5">Failed to load from Azure API</p>
          <p className="text-[11px] text-red-500 font-mono">{error}</p>
        </div>
        <button onClick={onRetry}
          className="ml-4 text-[11px] font-bold px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex-shrink-0">
          Retry
        </button>
      </div>
    </div>
  )
}

function LastFetchedBadge({ lastFetched, onRefresh, loading }) {
  if (!lastFetched) return null
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-400">
      <span>Last fetched: {lastFetched.toLocaleTimeString()}</span>
      <button onClick={onRefresh} disabled={loading}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 disabled:opacity-40 transition-colors">
        <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114.93-2M20 15a8 8 0 01-14.93 2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Refresh
      </button>
    </div>
  )
}

function SectionCard({ title, children, badge }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <h3 className="text-[13px] font-bold text-gray-800">{title}</h3>
        {badge !== undefined && (
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            badge === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {badge === 0 ? '✓ All clear' : `${badge} finding${badge !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>
      {children}
    </motion.div>
  )
}

function RoleBadge({ roleName }) {
  const c = ROLE_COLORS[roleName] || ROLE_COLORS.Unknown
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${c.bg} ${c.text}`}>
      {roleName}
    </span>
  )
}

function SeverityBadge({ severity }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.Info
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {severity}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    Open:            'bg-red-50 text-red-600 border border-red-200',
    'In Progress':   'bg-amber-50 text-amber-600 border border-amber-200',
    Resolved:        'bg-green-50 text-green-700 border border-green-200',
    Expired:         'bg-red-100 text-red-700',
    'Expiring Soon': 'bg-amber-100 text-amber-700',
    Valid:           'bg-green-100 text-green-700',
    Public:          'bg-red-100 text-red-700',
    Private:         'bg-green-100 text-green-700',
    None:            'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
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

// ─── Tab: RBAC ────────────────────────────────────────────────────────────────

function RBACTab() {
  const { data: allAssignments, loading, error, refetch, lastFetched } =
    useSecurityApi('/api/security/role-assignments')

  if (loading) return <LoadingPane message="Loading role assignments from Azure…" />
  if (error)   return <ErrorPane error={error} onRetry={refetch} />

  const owners         = allAssignments.filter(a => a.is_owner)
  const unknownRoles   = allAssignments.filter(a => a.role_name === 'Unknown')
  const vmNames        = [...new Set(allAssignments.map(a => a.vmName))]
  const ownersByVm     = vmNames.map(vm => ({ vm, owners: allAssignments.filter(a => a.vmName === vm && a.is_owner) }))
  const overprivileged = ownersByVm.filter(v => v.owners.length > 1)

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <LastFetchedBadge lastFetched={lastFetched} onRefresh={refetch} loading={loading} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Assignments" value={allAssignments.length} />
        <StatCard label="Owner Assignments" value={owners.length}       color={owners.length > 0       ? 'text-red-600'   : 'text-green-600'} />
        <StatCard label="Unknown Roles"     value={unknownRoles.length} color={unknownRoles.length > 0 ? 'text-amber-600' : 'text-green-600'} />
      </div>

      <SectionCard title="Role Assignments per VM">
        <table className="w-full text-[12px]">
          <thead><tr className="bg-gray-50">
            {['VM','Principal ID','Type','Role'].map(h =>
              <th key={h} className="px-5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
            )}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {allAssignments.map((a, i) => (
              <tr key={i} className="hover:bg-gray-50/60">
                <td className="px-5 py-2.5 font-mono text-gray-700">{a.vmName}</td>
                <td className="px-5 py-2.5 font-mono text-gray-400 text-[11px]">{a.principal_id?.slice(0, 8)}…</td>
                <td className="px-5 py-2.5 text-gray-600">{a.principal_type}</td>
                <td className="px-5 py-2.5"><RoleBadge roleName={a.role_name} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Owner Role Audit" badge={owners.length}>
        {owners.length === 0 ? (
          <p className="px-5 py-4 text-[12px] text-gray-400">No Owner assignments found.</p>
        ) : (
          <>
            <div className="px-5 py-3 bg-red-50 border-b border-red-100">
              <p className="text-[11px] text-red-700">Owner grants full access including role assignment. Each entry should be reviewed with your security team.</p>
            </div>
            <table className="w-full text-[12px]">
              <thead><tr className="bg-gray-50">
                {['VM','Principal ID','Type'].map(h =>
                  <th key={h} className="px-5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                )}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {owners.map((a, i) => (
                  <tr key={i} className="bg-red-50/40">
                    <td className="px-5 py-2.5 font-mono text-gray-700">{a.vmName}</td>
                    <td className="px-5 py-2.5 font-mono text-gray-500 text-[11px]">{a.principal_id}</td>
                    <td className="px-5 py-2.5 text-gray-600">{a.principal_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </SectionCard>

      <SectionCard title="Overprivileged VMs (Multiple Owners)" badge={overprivileged.length}>
        {overprivileged.length === 0 ? (
          <p className="px-5 py-4 text-[12px] text-gray-400">No VMs have more than one Owner assignment.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50">
              {['VM','Owner Count'].map(h =>
                <th key={h} className="px-5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              )}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {overprivileged.map(v => (
                <tr key={v.vm}>
                  <td className="px-5 py-2.5 font-mono text-gray-700">{v.vm}</td>
                  <td className="px-5 py-2.5">
                    <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full text-[11px]">{v.owners.length} owners</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Unknown Role IDs" badge={unknownRoles.length}>
        {unknownRoles.length === 0 ? (
          <p className="px-5 py-4 text-[12px] text-gray-400">All role IDs are recognised.</p>
        ) : (
          <>
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
              <p className="text-[11px] text-amber-700">These role IDs are not in the known roles list — may be custom roles worth investigating.</p>
            </div>
            <table className="w-full text-[12px]">
              <thead><tr className="bg-gray-50">
                {['VM','Principal ID','Role ID'].map(h =>
                  <th key={h} className="px-5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                )}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {unknownRoles.map((a, i) => (
                  <tr key={i}>
                    <td className="px-5 py-2.5 font-mono text-gray-700">{a.vmName}</td>
                    <td className="px-5 py-2.5 font-mono text-gray-400 text-[11px]">{a.principal_id?.slice(0, 8)}…</td>
                    <td className="px-5 py-2.5 font-mono text-amber-700 text-[11px]">{a.role_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </SectionCard>
    </div>
  )
}

// ─── CISO sub-tab: Public IP Exposure ─────────────────────────────────────────
// Expected item shape per VM:
//   { ip, port, protocol, exposure, risk, justification }

function PublicIPTab() {
  const { data: rows, loading, error, refetch, lastFetched } =
    useSecurityApi('/api/security/public-ips')

  if (loading) return <LoadingPane message="Scanning public IP exposure via Azure Network APIs…" />
  if (error)   return <ErrorPane error={error} onRetry={refetch} />

  const publicExposed = rows.filter(r => r.exposure === 'Public')
  const criticalCount = rows.filter(r => r.risk === 'Critical').length
  const highCount     = rows.filter(r => r.risk === 'High').length

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <LastFetchedBadge lastFetched={lastFetched} onRefresh={refetch} loading={loading} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Ports Scanned" value={rows.filter(r => r.port).length} />
        <StatCard label="Public Exposed"      value={publicExposed.length} color={publicExposed.length > 0 ? 'text-red-600' : 'text-green-600'} />
        <StatCard label="Critical Risk Ports" value={criticalCount}         color={criticalCount > 0        ? 'text-red-700' : 'text-green-600'} sub={`${highCount} High`} />
      </div>

      <SectionCard title="Network Exposure Map" badge={publicExposed.length}>
        {publicExposed.length > 0 && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <p className="text-[11px] text-red-700">Ports exposed to the public internet. Review NSG rules and apply least-privilege access.</p>
          </div>
        )}
        {rows.length === 0 ? (
          <p className="px-5 py-4 text-[12px] text-gray-400">No port exposure data returned from the API.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50">
              {['VM','Public IP','Port','Protocol','Exposure','Risk Level','Notes'].map(h =>
                <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              )}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, i) => (
                <tr key={i} className={`hover:bg-gray-50/60 ${row.risk === 'Critical' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-2.5 font-mono text-gray-700 text-[11px]">{row.vmName}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-600 text-[11px]">{row.ip ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-800 font-bold text-[11px]">{row.port ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-[11px]">{row.protocol ?? '—'}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={row.exposure} /></td>
                  <td className="px-4 py-2.5"><SeverityBadge severity={row.risk} /></td>
                  <td className="px-4 py-2.5 text-gray-500 text-[11px] max-w-xs">{row.justification ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Remediations: auto-derived from live data */}
      {rows.filter(r => r.risk === 'Critical' || r.risk === 'High').length > 0 && (
        <SectionCard title="Recommended Remediations">
          <div className="divide-y divide-gray-50">
            {rows
              .filter(r => r.risk === 'Critical' || r.risk === 'High')
              .map((r, i) => (
                <div key={i} className={`px-5 py-3 flex gap-4 items-start ${r.risk === 'Critical' ? 'bg-red-50/30' : ''}`}>
                  <SeverityBadge severity={r.risk} />
                  <div>
                    <p className="text-[12px] font-semibold text-gray-800 font-mono">{r.vmName} · Port {r.port}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{r.justification}</p>
                  </div>
                </div>
              ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ─── CISO sub-tab: Certificate Monitoring ─────────────────────────────────────
// Expected item shape per VM:
//   { domain, issuer, expiry, days_left, status }

function CertificatesTab() {
  const { data: certs, loading, error, refetch, lastFetched } =
    useSecurityApi('/api/security/certificates')

  if (loading) return <LoadingPane message="Fetching TLS certificate data from Azure…" />
  if (error)   return <ErrorPane error={error} onRetry={refetch} />

  const expired      = certs.filter(c => c.status === 'Expired')
  const expiringSoon = certs.filter(c => c.status === 'Expiring Soon')
  const valid        = certs.filter(c => c.status === 'Valid')

  const certStatusColor = status => {
    if (status === 'Expired')       return 'text-red-600'
    if (status === 'Expiring Soon') return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <LastFetchedBadge lastFetched={lastFetched} onRefresh={refetch} loading={loading} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Expired Certs"      value={expired.length}      color={expired.length > 0      ? 'text-red-600'   : 'text-green-600'} />
        <StatCard label="Expiring ≤ 90 days" value={expiringSoon.length} color={expiringSoon.length > 0 ? 'text-amber-600' : 'text-green-600'} />
        <StatCard label="Valid"              value={valid.length}        color="text-green-600" />
      </div>

      {expired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <p className="text-[12px] font-bold text-red-700">
            ⚠ {expired.length} expired certificate{expired.length > 1 ? 's' : ''} detected — clients may be receiving security errors.
          </p>
        </div>
      )}

      <SectionCard title="TLS Certificate Inventory" badge={expired.length + expiringSoon.length}>
        {certs.length === 0 ? (
          <p className="px-5 py-4 text-[12px] text-gray-400">No certificate data returned from the API.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50">
              {['VM','Domain','Issuer','Expiry Date','Days Remaining','Status'].map(h =>
                <th key={h} className="px-5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              )}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {certs.map((cert, i) => (
                <tr key={i} className={`hover:bg-gray-50/60 ${
                  cert.status === 'Expired'       ? 'bg-red-50/30'   :
                  cert.status === 'Expiring Soon' ? 'bg-amber-50/20' : ''
                }`}>
                  <td className="px-5 py-2.5 font-mono text-gray-700 text-[11px]">{cert.vmName}</td>
                  <td className="px-5 py-2.5 font-mono text-gray-800 text-[11px]">{cert.domain}</td>
                  <td className="px-5 py-2.5 text-gray-500 text-[11px]">{cert.issuer}</td>
                  <td className="px-5 py-2.5 font-mono text-gray-600 text-[11px]">{cert.expiry}</td>
                  <td className="px-5 py-2.5">
                    <span className={`font-bold text-[12px] font-mono ${certStatusColor(cert.status)}`}>
                      {cert.days_left < 0 ? `${Math.abs(cert.days_left)}d ago` : `${cert.days_left}d`}
                    </span>
                  </td>
                  <td className="px-5 py-2.5"><StatusBadge status={cert.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {certs.filter(c => c.status !== 'Valid').length > 0 && (
        <SectionCard title="Renewal Actions Required">
          <div className="divide-y divide-gray-50">
            {certs.filter(c => c.status !== 'Valid').map((cert, i) => (
              <div key={i} className="px-5 py-3 flex gap-4 items-start">
                <StatusBadge status={cert.status} />
                <div>
                  <p className="text-[12px] font-semibold text-gray-800">
                    {cert.domain} <span className="text-gray-400 font-normal font-mono">({cert.vmName})</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {cert.status === 'Expired'
                      ? `Certificate expired ${Math.abs(cert.days_left)} days ago. Renew immediately.`
                      : `Certificate expires in ${cert.days_left} days. Schedule renewal before ${cert.expiry}.`}
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

// ─── CISO wrapper with sub-tabs ───────────────────────────────────────────────

const CISO_SUBTABS = [
  { id: 'ip',   label: 'Public IP Exposure'    },
  { id: 'cert', label: 'Certificate Monitoring' },
]

function CISOTab() {
  const [sub, setSub] = useState('ip')
  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {CISO_SUBTABS.map(s => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`px-4 py-1.5 text-[12px] font-semibold rounded-md transition-all ${
              sub === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sub} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {sub === 'ip'   && <PublicIPTab />}
          {sub === 'cert' && <CertificatesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Tab: Vulnerabilities ─────────────────────────────────────────────────────
// Expected item shape per VM:
//   { id, component, severity, cvss, description, status, detected }

function VulnerabilitiesTab() {
  const { data: vulns, loading, error, refetch, lastFetched } =
    useSecurityApi('/api/security/vulnerabilities')

  const [filter, setFilter] = useState('All')
  const severities = ['All', 'Critical', 'High', 'Medium', 'Low']

  if (loading) return <LoadingPane message="Loading vulnerability scan results from Azure…" />
  if (error)   return <ErrorPane error={error} onRetry={refetch} />

  const filtered  = filter === 'All' ? vulns : vulns.filter(v => v.severity === filter)
  const open      = vulns.filter(v => v.status === 'Open')
  const critical  = vulns.filter(v => v.severity === 'Critical')
  const resolved  = vulns.filter(v => v.status === 'Resolved')

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <LastFetchedBadge lastFetched={lastFetched} onRefresh={refetch} loading={loading} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total CVEs"  value={vulns.length} />
        <StatCard label="Open"        value={open.length}     color={open.length > 0     ? 'text-red-600'   : 'text-green-600'} />
        <StatCard label="Critical"    value={critical.length} color={critical.length > 0 ? 'text-red-700'   : 'text-green-600'} />
        <StatCard label="Resolved"    value={resolved.length} color="text-green-600" />
      </div>

      <SectionCard title="CVE Findings" badge={open.length}>
        <div className="flex gap-2 px-5 py-3 border-b border-gray-100">
          {severities.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all border ${
                filter === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}>
              {s}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-4 text-[12px] text-gray-400">
            {vulns.length === 0 ? 'No vulnerability data returned from the API.' : 'No findings match this filter.'}
          </p>
        ) : (
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50">
              {['CVE ID','VM','Component','Severity','CVSS','Status','Detected','Description'].map(h =>
                <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              )}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filtered.map((v, i) => (
                  <motion.tr key={v.id ?? i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`hover:bg-gray-50/60 ${v.severity === 'Critical' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-blue-600 text-[11px] font-bold">{v.id}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-600 text-[11px]">{v.vmName}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-700 text-[11px]">{v.component}</td>
                    <td className="px-4 py-2.5"><SeverityBadge severity={v.severity} /></td>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono font-bold text-[12px] ${
                        v.cvss >= 9 ? 'text-red-700' : v.cvss >= 7 ? 'text-orange-600' : 'text-amber-600'
                      }`}>
                        {typeof v.cvss === 'number' ? v.cvss.toFixed(1) : v.cvss}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-2.5 font-mono text-gray-400 text-[11px]">{v.detected}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-[11px] max-w-xs">{v.description}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </SectionCard>

      {vulns.filter(v => v.status !== 'Resolved').length > 0 && (
        <SectionCard title="Patch Priority Queue">
          <div className="divide-y divide-gray-50">
            {vulns
              .filter(v => v.status !== 'Resolved')
              .sort((a, b) => (b.cvss ?? 0) - (a.cvss ?? 0))
              .map((v, i) => (
                <div key={v.id ?? i} className={`px-5 py-3 flex gap-4 items-start ${v.severity === 'Critical' ? 'bg-red-50/30' : ''}`}>
                  <div className="flex-shrink-0 mt-0.5"><SeverityBadge severity={v.severity} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[12px] font-bold text-blue-600 font-mono">{v.id}</p>
                      <span className="text-gray-300">·</span>
                      <p className="text-[12px] text-gray-700 font-mono">{v.component}</p>
                      <span className="text-gray-300">·</span>
                      <p className="text-[11px] text-gray-400 font-mono">{v.vmName}</p>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{v.description}</p>
                  </div>
                  <span className={`font-mono font-black text-[13px] flex-shrink-0 ${
                    v.cvss >= 9 ? 'text-red-700' : v.cvss >= 7 ? 'text-orange-600' : 'text-amber-600'
                  }`}>
                    {typeof v.cvss === 'number' ? v.cvss.toFixed(1) : v.cvss}
                  </span>
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
  { id: 'rbac',  label: 'RBAC',            icon: '🔑' },
  { id: 'ciso',  label: 'CISO',            icon: '🛡'  },
  { id: 'vulns', label: 'Vulnerabilities', icon: '🔍' },
]

export default function SecurityView() {
  const [activeTab, setActiveTab] = useState('rbac')

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 pt-5 pb-0">
        <h1 className="text-[20px] font-bold text-gray-900 mb-1">Security</h1>
        <p className="text-[12px] text-gray-400 mb-4">ChemCore International · Information Management Platform · 3 VMs</p>
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
            {activeTab === 'rbac'  && <RBACTab />}
            {activeTab === 'ciso'  && <CISOTab />}
            {activeTab === 'vulns' && <VulnerabilitiesTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}