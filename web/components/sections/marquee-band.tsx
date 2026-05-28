'use client'

import { motion } from 'framer-motion'

const ITEMS = [
  'AUTOMATED TDS SCAN',
  'SECURE DIGILOCKER GATEWAY',
  'NO PORTAL CREDENTIALS STORED',
  'ZERO CA COMMISSIONS',
  'READY-TO-FILE ITR-1',
  '12 MINUTES TO CLAIM'
]

export function MarqueeBand() {
  // Duplicate the list of items to ensure seamless infinite looping scroll
  const doubledItems = [...ITEMS, ...ITEMS]

  return (
    <div className="relative w-full overflow-hidden bg-primary py-2.5 sm:py-3 border-y border-black/10 select-none">
      <motion.div
        className="flex whitespace-nowrap gap-8 pr-8"
        animate={{ x: [0, '-50%'] }}
        transition={{
          repeat: Infinity,
          ease: 'linear',
          duration: 25
        }}
      >
        {doubledItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-8 text-[9px] sm:text-xs font-mono font-black text-black tracking-widest">
            <span>{item}</span>
            <span className="opacity-40">•</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
