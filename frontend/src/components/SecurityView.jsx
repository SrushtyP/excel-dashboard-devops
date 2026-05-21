import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Refined CISO Demo Data ───────────────────────────────────────────────────
// Reflects actual Azure NSG setup: vm-running has pip-vm-running (4.168.235.47),
// vm-snoozed has pip-vm-snoozed (102.37.106.155), both behind nsg-dashboard.
// NSG rules match what Terraform provisions: port 80 (HTTP) and 22 (SSH) open.

const DEMO_PUBLIC_IPS = [
  {
    vmName:        'vm-running',
    ip:            '4.168.235.47',
    port:          80,
    protocol:      'TCP',
    exposure:      'Public',
    risk:          'High',
    nsg_rule:      'Allow-HTTP-80',
    justification: 'Flask dashboard (port 80) open to 0.0.0.0/0 — intentional for demo access. Recommend WAF or IP restriction for production.',
  },
  {
    vmName:        'vm-running',
    ip:            '4.168.235.47',
    port:          22,
    protocol:      'TCP',
    exposure:      'Public',
    risk:          'Critical',
    nsg_rule:      'Allow-SSH-22',
    justification: 'SSH open to 0.0.0.0/0 via nsg-dashboard. Restrict to known admin IPs via NSG inbound rule immediately.',
  },
  {
    vmName:        'vm-snoozed',
    ip:            '102.37.106.155',
    port:          22,
    protocol:      'TCP',
    exposure:      'Public',
    risk:          'Critical',
    nsg_rule:      'Allow-SSH-22',
    justification: 'SSH open to 0.0.0.0/0 — same shared NSG (nsg-dashboard) applies. Even snoozed VMs are reachable when deallocated IP is reassigned.',
  },
  {
    vmName:        'vm-snoozed',
    ip:            '102.37.106.155',
    port:          80,
    protocol:      'TCP',
    exposure:      'Public',
    risk:          'Medium',
    nsg_rule:      'Allow-HTTP-80',
    justification: 'Port 80 open on snoozed VM. Flask is stopped but the port is reachable if any process binds to it on restart.',
  },
  {
    vmName:        'vm-destroyed',
    ip:            'N/A',
    port:          null,
    protocol:      '—',
    exposure:      'None',
    risk:          'Info',
    nsg_rule:      '—',
    justification: 'VM deprovisioned — no public IP allocated, no exposure.',
  },
]

// Certificate data reflects reality: no HTTPS on port 443 (Flask runs HTTP on 80).
// The "No HTTPS" finding is itself a valid CISO concern for a compliance portal.
const DEMO_CERTIFICATES = [
  {
    vmName:   'vm-running',
    domain:   '4.168.235.47 (compliance portal)',
    issuer:   '—',
    expiry:   '—',
    daysLeft: null,
    status:   'No HTTPS',
    source:   'TLS probe',
    note:     'Flask serves HTTP only on port 80. Port 443 is not open. A compliance portal accessible to 82 countries should use TLS.',
  },
  {
    vmName:   'vm-snoozed',
    domain:   '102.37.106.155 (R&D lab)',
    issuer:   '—',
    expiry:   '—',
    daysLeft: null,
    status:   'No HTTPS',
    source:   'TLS probe',
    note:     'Internal R&D environment — no TLS configured. Acceptable for VNet-only access but currently publicly reachable on port 80.',
  },
  {
    vmName:   'vm-destroyed',
    domain:   '—',
    issuer:   '—',
    expiry:   '—',
    daysLeft: null,
    status:   'No Public IP',
    source:   '—',
    note:     'VM deprovisioned. No certificate check required.',
  },
]

// ─── Refined Vulnerability Demo Data ─────────────────────────────────────────
// Real CVEs affecting Ubuntu 22.04 (Jammy) packages actually present on the VM:
// openssh-server, curl, python3.10, openssl 3.0.x, linux kernel 5.15, pip packages.
// Statuses reflect a realistic remediation lifecycle.

const DEMO_VULNS = [
  {
    id:          'CVE-2023-38408',
    vmName:      'vm-running',
    component:   'openssh-server 8.9p1',
    severity:    'Critical',
    cvss:        9.8,
    description: 'Remote code execution via ssh-agent on Ubuntu 22.04. Attacker can load arbitrary PKCS#11 providers. Patch: openssh 1:8.9p1-3ubuntu0.4.',
    status:      'Open',
    detected:    '2026-04-15',
    fix_version: '1:8.9p1-3ubuntu0.4',
  },
  {
    id:          'CVE-2023-38545',
    vmName:      'vm-running',
    component:   'curl 7.81.0',
    severity:    'High',
    cvss:        8.8,
    description: 'SOCKS5 heap overflow in libcurl — remote code execution possible when curl connects through a malicious SOCKS5 proxy.',
    status:      'Open',
    detected:    '2026-04-10',
    fix_version: '7.81.0-1ubuntu1.16',
  },
  {
    id:          'CVE-2024-0727',
    vmName:      'vm-running',
    component:   'openssl 3.0.2',
    severity:    'Medium',
    cvss:        5.5,
    description: 'NULL pointer dereference when processing a maliciously crafted PKCS12 file. DoS risk for services parsing certificates.',
    status:      'In Progress',
    detected:    '2026-03-20',
    fix_version: '3.0.2-0ubuntu1.16',
  },
  {
    id:          'CVE-2024-1086',
    vmName:      'vm-running',
    component:   'linux-image 5.15.0-100',
    severity:    'High',
    cvss:        7.8,
    description: 'Use-after-free in netfilter nf_tables. Local privilege escalation — attacker with local access can gain root.',
    status:      'Open',
    detected:    '2026-04-22',
    fix_version: '5.15.0-105-generic',
  },
  {
    id:          'CVE-2023-5752',
    vmName:      'vm-running',
    component:   'pip 22.0.2',
    severity:    'Medium',
    cvss:        5.5,
    description: 'Mercurial VCS URL injection via pip install allows arbitrary command execution during package installation.',
    status:      'Resolved',
    detected:    '2026-02-10',
    fix_version: '23.3',
  },
  {
    id:          'CVE-2023-38408',
    vmName:      'vm-snoozed',
    component:   'openssh-server 8.9p1',
    severity:    'Critical',
    cvss:        9.8,
    description: 'Same openssh RCE as vm-running — both VMs share the same base image and package versions.',
    status:      'Open',
    detected:    '2026-04-15',
    fix_version: '1:8.9p1-3ubuntu0.4',
  },
  {
    id:          'CVE-2022-3786',
    vmName:      'vm-snoozed',
    component:   'openssl 3.0.2',
    severity:    'High',
    cvss:        7.5,
    description: 'X.509 certificate verification buffer overrun — stack overflow via crafted email address in a certificate. Affects TLS clients.',
    status:      'Resolved',
    detected:    '2026-01-15',
    fix_version: '3.0.2-0ubuntu1.8',
  },
  {
    id:          'CVE-2024-2961',
    vmName:      'vm-snoozed',
    component:   'glibc 2.35',
    severity:    'High',
    cvss:        8.8,
    description: 'Out-of-bounds write in iconv() glibc function. Exploitable via PHP applications calling iconv — enables RCE in some configurations.',
    status:      'Open',
    detected:    '2026-05-01',
    fix_version: '2.35-0ubuntu3.8',
  },
  {
    id:          'CVE-2023-52425',
    vmName:      'vm-snoozed',
    component:   'libexpat 2.4.7',
    severity:    'Medium',
    cvss:        5.9,
    description: 'Denial of service via XML entity expansion (billion laughs variant) in libexpat. Affects Python xml.etree and any libexpat consumer.',
    status:      'Open',
    detected:    '2026-03-12',
    fix_version: '2.4.7-1ubuntu0.3',
  },
]

// ─── Shared hook: generic fetch ───────────────────────────────────────────────

function useSecurityApi(url) {
  const [data, setData]           = useState([])
  const [raw, setRaw]             = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(nested => {
        setRaw(nested)
        const flat = Object.entries(nested).flatMap(([vmName, items]) =>
          Array.isArray(items) ? items.map(item => ({ ...item, vmName })) : []
        )
        setData(flat)
        setLastFetched(new Date())
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [url])
  return { data, raw, loading, error, refetch: load, lastFetched }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function DemoBanner({ message }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700">
      <span className="font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] tracking-wide">DEMO</span>
      <span>{message}</span>
    </div>
  )
}

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
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${c.bg} ${c.text}`}>{roleName}</span>
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
    Open:          'bg-red-50 text-red-600 border border-red-200',
    'In Progress': 'bg-amber-50 text-amber-600 border border-amber-200',
    Resolved:      'bg-green-50 text-green-700 border border-green-200',
    Expired:       'bg-red-100 text-red-700',
    'Expiring Soon':'bg-amber-100 text-amber-700',
    Valid:         'bg-green-100 text-green-700',
    'No HTTPS':    'bg-red-100 text-red-700',
    'No Public IP':'bg-gray-100 text-gray-500',
    Public:        'bg-red-100 text-red-700',
    Private:       'bg-green-100 text-green-700',
    None:          'bg-gray-100 text-gray-500',
  }
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
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

// ─── Tab: RBAC (live data) ────────────────────────────────────────────────────

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
                <td className="px-5 py-2.5 font-mono text-gray-400 text-[11px]">{a.principal_id?.slice(0,8)}…</td>
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
                    <td className="px-5 py-2.5 font-mono text-gray-400 text-[11px]">{a.principal_id?.slice(0,8)}…</td>
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

// ─── CISO: Public IP Exposure (live via Azure Network API) ────────────────────

function PublicIPTab() {
  const { data: liveRows, loading, error, refetch, lastFetched } =
    useSecurityApi('/api/security/public-ips')

  // Use live data if available, fall back to refined demo data
  const rows          = (!loading && !error && liveRows.length > 0) ? liveRows : DEMO_PUBLIC_IPS
  const isDemo        = loading || error || liveRows.length === 0
  const publicExposed = rows.filter(r => r.exposure === 'Public')
  const criticalCount = rows.filter(r => r.risk === 'Critical').length
  const highCount     = rows.filter(r => r.risk === 'High').length

  return (
    <div className="space-y-4">
      {/* Live/Demo indicator */}
      <div className="flex items-center justify-between">
        {isDemo
          ? <DemoBanner message="Showing representative data for rg-dashboard-demo NSG rules. Live Azure Network API will replace this when available." />
          : <LastFetchedBadge lastFetched={lastFetched} onRefresh={refetch} loading={loading} />
        }
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Ports Scanned" value={rows.filter(r => r.port).length} />
        <StatCard label="Publicly Exposed"    value={publicExposed.length} color={publicExposed.length > 0 ? 'text-red-600' : 'text-green-600'} />
        <StatCard label="Critical Risk Ports" value={criticalCount} color={criticalCount > 0 ? 'text-red-700' : 'text-green-600'} sub={`${highCount} High`} />
      </div>

      <SectionCard title="Network Exposure Map — nsg-dashboard" badge={publicExposed.length}>
        {publicExposed.length > 0 && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <p className="text-[11px] text-red-700">
              Both VMs share <span className="font-mono font-bold">nsg-dashboard</span> which allows inbound 22 (SSH) and 80 (HTTP) from 0.0.0.0/0.
              Restrict SSH to known admin IPs immediately.
            </p>
          </div>
        )}
        <table className="w-full text-[12px]">
          <thead><tr className="bg-gray-50">
            {['VM','Public IP','Port','Protocol','Exposure','Risk','NSG Rule','Notes'].map(h =>
              <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
            )}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => (
              <tr key={i} className={`hover:bg-gray-50/60 ${row.risk === 'Critical' ? 'bg-red-50/30' : ''}`}>
                <td className="px-4 py-2.5 font-mono text-gray-700 text-[11px]">{row.vmName}</td>
                <td className="px-4 py-2.5 font-mono text-gray-600 text-[11px]">{row.ip ?? '—'}</td>
                <td className="px-4 py-2.5 font-mono text-gray-800 font-bold text-[11px]">{row.port ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-[11px]">{row.protocol}</td>
                <td className="px-4 py-2.5"><StatusBadge status={row.exposure} /></td>
                <td className="px-4 py-2.5"><SeverityBadge severity={row.risk} /></td>
                <td className="px-4 py-2.5 font-mono text-gray-400 text-[11px]">{row.nsg_rule ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-[11px] max-w-xs">{row.justification}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Remediations derived from actual findings */}
      <SectionCard title="Recommended Remediations">
        <div className="divide-y divide-gray-50">
          {[
            {
              urgency: 'Critical',
              vm: 'vm-running + vm-snoozed',
              port: 22,
              action: 'Update nsg-dashboard inbound rule "Allow-SSH-22": change Source from Any to your specific admin IP or CIDR. This applies to both VMs sharing this NSG.',
            },
            {
              urgency: 'High',
              vm: 'vm-running',
              port: 80,
              action: 'Place Flask dashboard behind Azure Application Gateway or restrict port 80 to known client IPs. The app handles compliance data for 82 countries — WAF protection is strongly recommended.',
            },
            {
              urgency: 'Medium',
              vm: 'vm-running + vm-snoozed',
              port: 443,
              action: 'Enable HTTPS by adding a TLS termination layer. Consider Azure Application Gateway with an SSL certificate, or Let\'s Encrypt via certbot on the VM.',
            },
          ].map((rec, i) => (
            <div key={i} className={`px-5 py-3 flex gap-4 items-start ${rec.urgency === 'Critical' ? 'bg-red-50/20' : ''}`}>
              <SeverityBadge severity={rec.urgency} />
              <div>
                <p className="text-[12px] font-semibold text-gray-800 font-mono">{rec.vm} · Port {rec.port}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{rec.action}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── CISO: Certificate Monitoring (live TLS probe) ────────────────────────────

function CertificatesTab() {
  const { data: liveCerts, loading, error, refetch, lastFetched } =
    useSecurityApi('/api/security/certificates')

  const certs    = (!loading && !error && liveCerts.length > 0) ? liveCerts : DEMO_CERTIFICATES
  const isDemo   = loading || error || liveCerts.length === 0

  const noHttps      = certs.filter(c => c.status === 'No HTTPS')
  const expired      = certs.filter(c => c.status === 'Expired')
  const expiringSoon = certs.filter(c => c.status === 'Expiring Soon')
  const valid        = certs.filter(c => c.status === 'Valid')

  const certStatusColor = status => {
    if (status === 'Expired' || status === 'No HTTPS') return 'text-red-600'
    if (status === 'Expiring Soon')                    return 'text-amber-600'
    if (status === 'Valid')                            return 'text-green-600'
    return 'text-gray-400'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {isDemo
          ? <DemoBanner message="TLS probe results for vm-running (4.168.235.47) and vm-snoozed (102.37.106.155). Port 443 not open — Flask runs HTTP on port 80." />
          : <LastFetchedBadge lastFetched={lastFetched} onRefresh={refetch} loading={loading} />
        }
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="No HTTPS"        value={noHttps.length}      color={noHttps.length > 0      ? 'text-red-600'   : 'text-green-600'} />
        <StatCard label="Expired Certs"   value={expired.length}      color={expired.length > 0      ? 'text-red-600'   : 'text-green-600'} />
        <StatCard label="Expiring ≤90d"   value={expiringSoon.length} color={expiringSoon.length > 0 ? 'text-amber-600' : 'text-green-600'} />
        <StatCard label="Valid"           value={valid.length}        color="text-green-600" />
      </div>

      {noHttps.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <p className="text-[12px] font-bold text-red-700">
            ⚠ {noHttps.length} VM{noHttps.length > 1 ? 's' : ''} have no HTTPS — all traffic is unencrypted.
            A compliance portal serving regulatory bodies across 82 countries must use TLS.
          </p>
        </div>
      )}

      <SectionCard title="TLS Certificate Inventory" badge={noHttps.length + expired.length + expiringSoon.length}>
        <table className="w-full text-[12px]">
          <thead><tr className="bg-gray-50">
            {['VM','Domain / IP','Issuer','Expiry','Days Left','Status','Source','Notes'].map(h =>
              <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
            )}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {certs.map((cert, i) => (
              <tr key={i} className={`hover:bg-gray-50/60 ${
                cert.status === 'No HTTPS' || cert.status === 'Expired' ? 'bg-red-50/20' :
                cert.status === 'Expiring Soon' ? 'bg-amber-50/20' : ''
              }`}>
                <td className="px-4 py-2.5 font-mono text-gray-700 text-[11px]">{cert.vmName}</td>
                <td className="px-4 py-2.5 font-mono text-gray-800 text-[11px]">{cert.domain}</td>
                <td className="px-4 py-2.5 text-gray-500 text-[11px]">{cert.issuer}</td>
                <td className="px-4 py-2.5 font-mono text-gray-600 text-[11px]">{cert.expiry}</td>
                <td className="px-4 py-2.5">
                  <span className={`font-bold text-[12px] font-mono ${certStatusColor(cert.status)}`}>
                    {cert.daysLeft === null ? '—' :
                     cert.daysLeft < 0 ? `${Math.abs(cert.daysLeft)}d ago` : `${cert.daysLeft}d`}
                  </span>
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={cert.status} /></td>
                <td className="px-4 py-2.5 text-gray-400 text-[11px]">{cert.source}</td>
                <td className="px-4 py-2.5 text-gray-500 text-[11px] max-w-xs">{cert.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Actions Required">
        <div className="divide-y divide-gray-50">
          {certs.filter(c => c.status !== 'Valid' && c.status !== 'No Public IP').map((cert, i) => (
            <div key={i} className="px-5 py-3 flex gap-3 items-start">
              <StatusBadge status={cert.status} />
              <div>
                <p className="text-[12px] font-semibold text-gray-800">{cert.domain} <span className="font-mono text-gray-400">({cert.vmName})</span></p>
                <p className="text-[11px] text-gray-500 mt-0.5">{cert.note}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── CISO wrapper ─────────────────────────────────────────────────────────────

const CISO_SUBTABS = [
  { id: 'ip',   label: 'Public IP Exposure'     },
  { id: 'cert', label: 'Certificate Monitoring'  },
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
        <motion.div key={sub} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {sub === 'ip'   && <PublicIPTab />}
          {sub === 'cert' && <CertificatesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Tab: Vulnerabilities (refined demo — real Ubuntu 22.04 CVEs) ─────────────

function VulnerabilitiesTab() {
  const [filter, setFilter]   = useState('All')
  const [vmFilter, setVmFilter] = useState('All')
  const severities = ['All', 'Critical', 'High', 'Medium', 'Low']
  const vmOptions  = ['All', 'vm-running', 'vm-snoozed']

  const filtered = DEMO_VULNS
    .filter(v => filter === 'All'    || v.severity === filter)
    .filter(v => vmFilter === 'All'  || v.vmName   === vmFilter)

  const open     = DEMO_VULNS.filter(v => v.status === 'Open')
  const critical = DEMO_VULNS.filter(v => v.severity === 'Critical')
  const resolved = DEMO_VULNS.filter(v => v.status === 'Resolved')

  return (
    <div className="space-y-5">
      <DemoBanner message="Vulnerability data is illustrative — based on real CVEs affecting Ubuntu 22.04 (Jammy) packages present on these VMs. Microsoft Defender for Cloud requires Standard tier. Upgrade or integrate Trivy for live scanning." />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total CVEs"  value={DEMO_VULNS.length} />
        <StatCard label="Open"        value={open.length}     color={open.length > 0     ? 'text-red-600'   : 'text-green-600'} />
        <StatCard label="Critical"    value={critical.length} color={critical.length > 0 ? 'text-red-700'   : 'text-green-600'} />
        <StatCard label="Resolved"    value={resolved.length} color="text-green-600" />
      </div>

      <SectionCard title="CVE Findings — Ubuntu 22.04 (Jammy)" badge={open.length}>
        {/* Filters row */}
        <div className="flex flex-wrap gap-3 px-5 py-3 border-b border-gray-100 items-center">
          <div className="flex gap-1.5">
            {severities.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all border ${
                  filter === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}>
                {s}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex gap-1.5">
            {vmOptions.map(v => (
              <button key={v} onClick={() => setVmFilter(v)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all border ${
                  vmFilter === v ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-4 text-[12px] text-gray-400">No findings match this filter.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50">
              {['CVE ID','VM','Package / Component','Severity','CVSS','Status','Fix Available','Detected'].map(h =>
                <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              )}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filtered.map((v, i) => (
                  <motion.tr key={`${v.id}-${v.vmName}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`hover:bg-gray-50/60 ${v.severity === 'Critical' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-blue-600 text-[11px] font-bold">{v.id}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-600 text-[11px]">{v.vmName}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-700 text-[11px]">{v.component}</td>
                    <td className="px-4 py-2.5"><SeverityBadge severity={v.severity} /></td>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono font-bold text-[12px] ${
                        v.cvss >= 9 ? 'text-red-700' : v.cvss >= 7 ? 'text-orange-600' : 'text-amber-600'
                      }`}>{v.cvss.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-2.5 font-mono text-green-700 text-[10px]">{v.fix_version}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-400 text-[11px]">{v.detected}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Description panel below table */}
      <SectionCard title="Finding Details">
        <div className="divide-y divide-gray-50">
          {filtered.map((v, i) => (
            <div key={`${v.id}-${v.vmName}-desc`} className={`px-5 py-3 flex gap-4 items-start ${v.severity === 'Critical' ? 'bg-red-50/20' : ''}`}>
              <SeverityBadge severity={v.severity} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-bold text-blue-600 font-mono">{v.id}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-[11px] font-mono text-gray-700">{v.component}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-[11px] font-mono text-gray-400">{v.vmName}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">{v.description}</p>
                <p className="text-[10px] text-green-700 font-mono mt-1">Fix: apt upgrade {v.component.split(' ')[0]} → {v.fix_version}</p>
              </div>
              <span className={`font-mono font-black text-[13px] flex-shrink-0 ${
                v.cvss >= 9 ? 'text-red-700' : v.cvss >= 7 ? 'text-orange-600' : 'text-amber-600'
              }`}>{v.cvss.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
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
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === 'rbac'  && <RBACTab />}
            {activeTab === 'ciso'  && <CISOTab />}
            {activeTab === 'vulns' && <VulnerabilitiesTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}