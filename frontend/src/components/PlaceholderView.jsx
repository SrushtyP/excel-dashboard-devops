import { motion } from 'framer-motion'

const SECTION_META = {
  mon: {
    label: 'Monitoring',
    icon: '📡',
    desc: 'Real-time VM health, uptime graphs, alert rules, and log analytics.',
    coming: ['CPU & memory time-series', 'Alert configuration', 'Log Analytics workspace', 'Azure Monitor integration'],
  },
  sec: {
    label: 'Security',
    icon: '🔒',
    desc: 'Vulnerability assessments, network security groups, and compliance posture.',
    coming: ['NSG rule audit', 'Defender for Cloud score', 'Key Vault access logs', 'RBAC review'],
  },
  gov: {
    label: 'Governance',
    icon: '📋',
    desc: 'Policy assignments, resource tagging, and regulatory compliance tracking.',
    coming: ['Azure Policy assignments', 'Tag compliance report', 'CPCB audit trail', 'Cost allocation tags'],
  },
}

export default function PlaceholderView({ section }) {
  const meta = SECTION_META[section] || { label: section, icon: '🔧', desc: '', coming: [] }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-[20px] font-bold text-gray-900">{meta.label}</h1>
        <p className="text-[12px] text-gray-500 mt-0.5">ChemCore International · Nouryon IM Platform</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md text-center"
        >
          <div className="text-6xl mb-5">{meta.icon}</div>
          <h2 className="text-[18px] font-bold text-gray-800 mb-2">{meta.label}</h2>
          <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">{meta.desc}</p>

          <div className="bg-nouryon-blue/5 border border-nouryon-blue/15 rounded-xl p-5 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-nouryon-blue mb-3">Coming soon</p>
            <ul className="space-y-2">
              {meta.coming.map(item => (
                <li key={item} className="flex items-center gap-2 text-[12px] text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-nouryon-blue flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-gray-400 mt-5">
            This module is planned for the next sprint. Infrastructure data is available in <strong>Dev</strong>.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
