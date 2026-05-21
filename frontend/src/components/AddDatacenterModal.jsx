import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const REGIONS = [
  { id: 'eastus',        name: 'East US',        location: 'Virginia, US'    },
  { id: 'westeurope',    name: 'West Europe',     location: 'Netherlands'     },
  { id: 'southeastasia', name: 'Southeast Asia',  location: 'Singapore'       },
  { id: 'australiaeast', name: 'Australia East',  location: 'New South Wales' },
  { id: 'uksouth',       name: 'UK South',        location: 'London, UK'      },
  { id: 'japaneast',     name: 'Japan East',      location: 'Tokyo, JP'       },
]

export default function AddDatacenterModal({ onAdd, onClose }) {
  const [name, setName]       = useState('')
  const [region, setRegion]   = useState('')
  const [custom, setCustom]   = useState('')

  const displayName = name || (region ? `${REGIONS.find(r=>r.id===region)?.name} — Azure` : '')

  function handleSubmit(e) {
    e.preventDefault()
    const sel = REGIONS.find(r => r.id === region)
    onAdd({
      id:       `dc-${region || 'custom'}-${Date.now()}`,
      name:     displayName || 'New Datacenter',
      location: sel?.location || custom || 'TBD',
      region:   region || 'custom',
      active:   false,
      racks: [
        { id: `rack-p-${Date.now()}`,  label: 'Primary VMs',          sublabel: 'Production workloads',    active: false, vms: [] },
        { id: `rack-s-${Date.now()}`,  label: 'Secondary VMs',        sublabel: 'Failover & load sharing', active: false, vms: [] },
        { id: `rack-dr-${Date.now()}`, label: 'Disaster Recovery VMs', sublabel: 'Geo-redundant standby',  active: false, vms: [] },
      ],
    })
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Modal header */}
          <div className="bg-nouryon-blue px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-[16px]">Add Datacenter</h2>
              <p className="text-blue-200 text-[12px]">Provision a new Azure datacenter slot</p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none transition-colors">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Region selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                Azure Region
              </label>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-nouryon-blue/20 focus:border-nouryon-blue transition-all"
              >
                <option value="">Select a region…</option>
                {REGIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.name} — {r.location}</option>
                ))}
              </select>
            </div>

            {/* Custom name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                Display Name <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                placeholder={displayName || 'e.g. East US — Disaster Recovery'}
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-nouryon-blue/20 focus:border-nouryon-blue transition-all"
              />
            </div>

            {/* Info box */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-[11px] text-nouryon-blue leading-relaxed">
                This datacenter will be added as a <strong>planned</strong> slot. It will show as inactive until racks and VMs are provisioned via the pipeline.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-[13px] text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-nouryon-blue rounded-lg py-2 text-[13px] text-white font-bold hover:bg-blue-900 transition-colors"
              >
                Add Datacenter
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
