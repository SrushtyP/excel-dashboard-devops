import { useState } from 'react'
import Sidebar from './components/Sidebar'
import DevView from './components/DevView'
import FinOpsView from './components/FinOpsView'
import PlaceholderView from './components/PlaceholderView'
import { INITIAL_DATACENTERS } from './data/inventory'

export default function App() {
  const [activeNav, setActiveNav] = useState('dev')
  const [datacenters, setDatacenters] = useState(INITIAL_DATACENTERS)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-page font-sans">
      <Sidebar activeNav={activeNav} onNav={setActiveNav} />
      <main className="flex-1 overflow-y-auto min-w-0">
        {activeNav === 'dev'    && <DevView datacenters={datacenters} setDatacenters={setDatacenters} />}
        {activeNav === 'finops' && <FinOpsView datacenters={datacenters} />}
        {['mon','sec','gov'].includes(activeNav) && <PlaceholderView section={activeNav} />}
      </main>
    </div>
  )
}
