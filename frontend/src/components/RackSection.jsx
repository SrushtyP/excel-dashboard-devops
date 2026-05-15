import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VMCard from './VMCard'

const RACK_ICONS = {
  'rack-primary':'🖥️','rack-secondary':'🔄','rack-dr':'🛡️',
  'rack-primary-us':'🖥️','rack-secondary-us':'🔄','rack-dr-us':'🛡️',
}

export default function RackSection({ rack, dcActive, onRequestStateChange }) {
  const [open, setOpen] = useState(rack.active)
  const active = rack.vms.filter(v=>v.state!=='offline')

  return (
    <div className={`rounded-xl border overflow-hidden h-full transition-all ${
      !dcActive?'bg-gray-50 border-gray-200 opacity-60'
      :rack.active?'bg-white border-gray-200 shadow-card'
      :'bg-gray-50 border-dashed border-gray-300'}`}>
      <motion.button whileTap={dcActive?{scale:0.99}:{}}
        onClick={()=>setOpen(o=>!o)} disabled={!dcActive}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${!dcActive?'cursor-not-allowed':'cursor-pointer hover:bg-gray-50/80 transition-colors'}`}>
        <span className="text-xl">{RACK_ICONS[rack.id]||'🗄️'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-semibold ${rack.active?'text-gray-900':'text-gray-500'}`}>{rack.label}</span>
            {!rack.active && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500 font-bold uppercase tracking-wide">Future</span>}
          </div>
          <span className="text-[11px] text-gray-400">{rack.sublabel}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {active.filter(v=>v.state==='running').length>0 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-bold">{active.filter(v=>v.state==='running').length} running</span>}
          {active.filter(v=>v.state==='snoozed').length>0 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">{active.filter(v=>v.state==='snoozed').length} snoozed</span>}
          {active.filter(v=>v.state==='destroyed').length>0 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold">{active.filter(v=>v.state==='destroyed').length} dest.</span>}
          <motion.span animate={{rotate:open?180:0}} transition={{duration:0.22}} className="text-gray-400 text-[13px] ml-1">▾</motion.span>
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            transition={{duration:0.28,ease:[0.22,1,0.36,1]}} style={{overflow:'hidden'}}>
            <div className="mx-3 mb-3 p-3 rounded-lg border"
              style={{background:'#F8FAFD',borderColor:'#E2EBF6',backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 36px,rgba(26,71,128,0.025) 36px,rgba(26,71,128,0.025) 37px)'}}>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                <div className="h-2 w-2 rounded-full bg-gray-300"/>
                <div className="h-px flex-1 bg-gray-200"/>
                <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">{rack.id}</span>
                <div className="h-px flex-1 bg-gray-200"/>
                <div className="h-2 w-2 rounded-full bg-gray-300"/>
              </div>
              {rack.vms.length===0
                ? <div className="flex items-center justify-center py-5 text-[12px] text-gray-400 border border-dashed border-gray-300 rounded-lg">No slots provisioned</div>
                : rack.vms.map((vm,i)=>(
                    <VMCard key={vm.id} vm={vm} index={i}
                      onRequestStateChange={dcActive&&rack.active?onRequestStateChange:null} />
                  ))
              }
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                <div className="h-2 w-2 rounded-full bg-gray-300"/>
                <div className="h-px flex-1 bg-gray-200"/>
                <div className="h-2 w-2 rounded-full bg-gray-300"/>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
