import { motion } from 'framer-motion'
import RackSection from './RackSection'

export default function DatacenterDetail({ dc, onClose, onRequestStateChange }) {
  const allVms      = dc.racks.flatMap(r=>r.vms)
  const running     = allVms.filter(v=>v.state==='running').length
  const snoozed     = allVms.filter(v=>v.state==='snoozed').length
  const destroyed   = allVms.filter(v=>v.state==='destroyed').length
  const monthlyCost = allVms.reduce((a,v)=>a+(v.optimisedMonthlyInr||0),0)

  return (
    <div>
      {/* DC header strip */}
      <div className="bg-nouryon-blue rounded-xl px-5 py-4 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div initial={{scale:0}} animate={{scale:1}}
              transition={{delay:0.07,type:'spring',stiffness:300}}
              className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl flex-shrink-0">
              🏢
            </motion.div>
            <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{delay:0.09}}>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-[16px]">{dc.name}</h2>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${dc.active?'bg-nouryon-green text-white':'bg-gray-400 text-white'}`}>
                  {dc.active?'Active':'Planned'}
                </span>
              </div>
              <p className="text-blue-200 text-[11px] mt-0.5">📍 {dc.location} · {dc.region}</p>
            </motion.div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {dc.active && monthlyCost > 0 && (
              <div className="text-right">
                <div className="text-[10px] text-blue-200">Est. monthly</div>
                <div className="text-[15px] font-bold text-white">₹{monthlyCost.toLocaleString()}</div>
              </div>
            )}
            <motion.button whileHover={{scale:1.1,backgroundColor:'rgba(255,255,255,0.25)'}}
              whileTap={{scale:0.9}} onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/15 text-white flex items-center justify-center text-sm">✕</motion.button>
          </div>
        </div>

        {dc.active && (
          <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:0.14}}
            className="flex items-center gap-5 mt-3 flex-wrap">
            {running>0 && <div className="flex items-center gap-1.5">
              <motion.span className="w-2 h-2 rounded-full bg-nouryon-green flex-shrink-0"
                animate={{boxShadow:['0 0 0 0 #1EA03C44','0 0 0 5px #1EA03C00','0 0 0 0 #1EA03C44']}}
                transition={{duration:1.8,repeat:Infinity}}/>
              <span className="text-[11px] text-blue-100">{running} running</span>
            </div>}
            {snoozed>0 && <div className="flex items-center gap-1.5">
              <motion.span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
                animate={{boxShadow:['0 0 0 0 #F59E0B44','0 0 0 5px #F59E0B00','0 0 0 0 #F59E0B44']}}
                transition={{duration:2.5,repeat:Infinity}}/>
              <span className="text-[11px] text-blue-100">{snoozed} snoozed</span>
            </div>}
            {destroyed>0 && <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-nouryon-red flex-shrink-0"/>
              <span className="text-[11px] text-blue-100">{destroyed} destroyed</span>
            </div>}
          </motion.div>
        )}
      </div>

      {/* Three racks in a responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {dc.racks.map((rack,i)=>(
          <motion.div key={rack.id}
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
            transition={{delay:i*0.08+0.1,duration:0.3,ease:[0.22,1,0.36,1]}}>
            <RackSection rack={rack} dcActive={dc.active} onRequestStateChange={onRequestStateChange} />
          </motion.div>
        ))}
      </div>

      {!dc.active && (
        <div className="mt-5 p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-center">
          <p className="text-[12px] text-gray-500">Planned for future expansion — racks provisioned when needed.</p>
        </div>
      )}
    </div>
  )
}
