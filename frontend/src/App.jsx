import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import DevView from './components/DevView'
import FinOpsView from './components/FinOpsView'
import AdminView from './components/AdminView'
import PlaceholderView from './components/PlaceholderView'
import { INITIAL_DATACENTERS } from './data/inventory'

export default function App() {
  const [activeNav, setActiveNav]     = useState('dev')
  const [datacenters, setDatacenters] = useState(INITIAL_DATACENTERS)
  const [pendingCount, setPending]    = useState(0)

  // Poll pending requests count every 30s
  useEffect(() => {
    async function checkPending() {
      try {
        const res  = await fetch('/api/vms/pending-requests')
        const data = await res.json()
        const count = Array.isArray(data) ? data.filter(r => r.status !== 'actioned').length : 0
        setPending(count)
      } catch { /* offline */ }
    }
    checkPending()
    const t = setInterval(checkPending, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-surface-page font-sans">
      <Sidebar activeNav={activeNav} onNav={setActiveNav} pendingCount={pendingCount} />
      <main className="flex-1 overflow-y-auto min-w-0">
        {activeNav === 'dev'    && <DevView datacenters={datacenters} setDatacenters={setDatacenters} />}
        {activeNav === 'finops' && <FinOpsView datacenters={datacenters} />}
        {activeNav === 'admin'  && <AdminView />}
        {['mon','sec','gov'].includes(activeNav) && <PlaceholderView section={activeNav} />}
      </main>
    </div>
  )
}