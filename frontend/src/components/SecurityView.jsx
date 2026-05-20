import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const KNOWN_ROLES = {
  '8e3af657-a8ff-443c-a75c-2fe8c4bcb635': 'Owner',
  'b24988ac-6180-42a0-ab88-20f7382dd24c': 'Contributor',
  'acdd72a7-3385-48ef-bd42-f606fba81ae7': 'Reader',
}

const ROLE_COLORS = {
  'Owner':       { bg: 'bg-red-100',    text: 'text-red-700'    },
  'Contributor': { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  'Reader':      { bg: 'bg-green-100',  text: 'text-green-700'  },
  'Unknown':     { bg: 'bg-gray-100',   text: 'text-gray-600'   },
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
            {badge === 0 ? '✓ All clear' : `${badge} finding${badge > 1 ? 's' : ''}`}
          </span>
        )}
      </div>
      {children}
    </motion.div>
  )
}

function RoleBadge({ roleName }) {
  const c = ROLE_COLORS[roleName] || ROLE_COLORS['Unknown']
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${c.bg} ${c.text}`}>
      {roleName}
    </span>
  )
}

export default function SecurityView() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetch('/api/security/role-assignments')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[13px] text-gray-400">
      Loading role assignments from Azure...
    </div>
  )

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-[12px] text-red-700">
        Failed to load: {error}
      </div>
    </div>
  )

  // Flatten all assignments across VMs
  const allAssignments = Object.entries(data).flatMap(([vmName, assignments]) => {
    if (assignments.error) return []
    return assignments.map(a => ({ ...a, vmName }))
  })

  const owners       = allAssignments.filter(a => a.is_owner)
  const unknownRoles = allAssignments.filter(a => a.role_name === 'Unknown')
  const vmNames      = Object.keys(data)

  // VMs with more than one owner
  const ownersByVm = vmNames.map(vm => ({
    vm,
    owners: (data[vm].error ? [] : data[vm]).filter(a => a.is_owner)
  }))
  const overprivileged = ownersByVm.filter(v => v.owners.length > 1)

  return (
    <div className="flex flex-col min-h-screen bg-surface-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-[20px] font-bold text-gray-900">Security</h1>
        <p className="text-[12px] text-gray-500 mt-0.5">
          RBAC role assignments audit · ChemCore International · {vmNames.length} VMs · {allAssignments.length} total assignments
        </p>
      </div>

      <div className="flex-1 p-6 space-y-5 max-w-5xl">

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Assignments', value: allAssignments.length, color: 'text-gray-800' },
            { label: 'Owner Assignments', value: owners.length,         color: owners.length > 0 ? 'text-red-600' : 'text-green-600' },
            { label: 'Unknown Roles',     value: unknownRoles.length,   color: unknownRoles.length > 0 ? 'text-amber-600' : 'text-green-600' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold">{card.label}</p>
              <p className={`text-[28px] font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* ── All role assignments ── */}
        <SectionCard title="Role Assignments per VM">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50">
              <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">VM</th>
              <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Principal ID</th>
              <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {allAssignments.map((a, i) => (
                <tr key={i}>
                  <td className="px-5 py-2.5 font-mono text-gray-700">{a.vmName}</td>
                  <td className="px-5 py-2.5 font-mono text-gray-400 text-[11px]">{a.principal_id.slice(0, 8)}…</td>
                  <td className="px-5 py-2.5 text-gray-600">{a.principal_type}</td>
                  <td className="px-5 py-2.5"><RoleBadge roleName={a.role_name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        {/* ── Owner audit ── */}
        <SectionCard title="Owner Role Audit" badge={owners.length}>
          {owners.length === 0 ? (
            <p className="px-5 py-4 text-[12px] text-gray-400">No Owner assignments found.</p>
          ) : (
            <>
              <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                <p className="text-[11px] text-red-700">
                  Owner grants full access including role assignment. Each entry below should be reviewed with your security team.
                </p>
              </div>
              <table className="w-full text-[12px]">
                <thead><tr className="bg-gray-50">
                  <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">VM</th>
                  <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Principal ID</th>
                  <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
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

        {/* ── Overprivileged ── */}
        <SectionCard title="Overprivileged VMs (Multiple Owners)" badge={overprivileged.length}>
          {overprivileged.length === 0 ? (
            <p className="px-5 py-4 text-[12px] text-gray-400">No VMs have more than one Owner assignment.</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead><tr className="bg-gray-50">
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">VM</th>
                <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Owner Count</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {overprivileged.map(v => (
                  <tr key={v.vm}>
                    <td className="px-5 py-2.5 font-mono text-gray-700">{v.vm}</td>
                    <td className="px-5 py-2.5">
                      <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
                        {v.owners.length} owners
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* ── Unknown roles ── */}
        <SectionCard title="Unknown Role IDs" badge={unknownRoles.length}>
          {unknownRoles.length === 0 ? (
            <p className="px-5 py-4 text-[12px] text-gray-400">All role IDs are recognised.</p>
          ) : (
            <>
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                <p className="text-[11px] text-amber-700">
                  These role IDs are not in the known roles list. They may be custom roles — worth investigating.
                </p>
              </div>
              <table className="w-full text-[12px]">
                <thead><tr className="bg-gray-50">
                  <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">VM</th>
                  <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Principal ID</th>
                  <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role ID</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {unknownRoles.map((a, i) => (
                    <tr key={i}>
                      <td className="px-5 py-2.5 font-mono text-gray-700">{a.vmName}</td>
                      <td className="px-5 py-2.5 font-mono text-gray-400 text-[11px]">{a.principal_id.slice(0,8)}…</td>
                      <td className="px-5 py-2.5 font-mono text-amber-700 text-[11px]">{a.role_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </SectionCard>

      </div>
    </div>
  )
}