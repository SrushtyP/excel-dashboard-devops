import { motion } from 'framer-motion'

const NAV = [
  { id: 'finops', label: 'FinOps',  icon: '💰', desc: 'Cost & Billing'   },
  { id: 'mon',    label: 'Mon',     icon: '📡', desc: 'Monitoring'       },
  { id: 'dev',    label: 'Dev',     icon: '⚙️',  desc: 'DevOps & Infra'  },
  { id: 'sec',    label: 'Sec',     icon: '🔒', desc: 'Security'         },
  { id: 'gov',    label: 'Gov',     icon: '📋', desc: 'Governance'       },
]

export default function Sidebar({ activeNav, onNav }) {
  return (
    <aside className="w-[220px] flex-shrink-0 bg-nouryon-blue flex flex-col h-screen z-20 shadow-lg">

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
            <span className="text-nouryon-blue font-bold text-lg leading-none">N</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-[15px] leading-tight">Nouryon</p>
            <p className="text-blue-200 text-[11px] leading-tight truncate">IM Platform</p>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-blue-200/70 uppercase tracking-widest font-semibold">
          ChemCore International
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map(item => {
          const active = activeNav === item.id
          return (
            <div key={item.id} className="relative">
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-white/15 rounded-lg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <button
                onClick={() => onNav(item.id)}
                className={`
                  relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                  transition-colors duration-150
                  ${active ? 'text-white' : 'text-blue-200 hover:text-white hover:bg-white/8'}
                `}
              >
                {/* Active left bar */}
                {active && (
                  <motion.div
                    layoutId="sidebar-bar"
                    className="absolute left-0 top-2 bottom-2 w-[3px] bg-nouryon-teal rounded-full"
                  />
                )}
                <span className="text-base leading-none">{item.icon}</span>
                <div className="min-w-0">
                  <div className={`text-[13px] font-semibold leading-tight ${active ? 'text-white' : ''}`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-blue-200/70 leading-tight">{item.desc}</div>
                </div>
              </button>
            </div>
          )
        })}
      </nav>

      {/* Footer status */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-nouryon-green animate-pulse_green flex-shrink-0" />
          <span className="text-[11px] text-blue-200">Pipeline active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-nouryon-teal flex-shrink-0" />
          <span className="text-[11px] text-blue-200">Azure — West India</span>
        </div>
      </div>
    </aside>
  )
}
