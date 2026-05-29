'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShieldAlert } from 'lucide-react'

export function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check local storage to see if user has already accepted the disclaimer
    const accepted = localStorage.getItem('trove_disclaimer_accepted')
    if (!accepted) {
      setIsOpen(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('trove_disclaimer_accepted', 'true')
    setIsOpen(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg border border-primary/20 bg-[#0c0c0c] p-6 sm:p-8 shadow-[0_24px_80px_rgba(237,70,45,0.08)] select-none text-[#F0EDE6]"
            style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
          >
            {/* Header Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="flex flex-col gap-5">
              {/* Icon & Title */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/[0.08] border border-primary/20 text-primary rounded-full">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <span className="font-mono text-[9px] font-black uppercase tracking-widest text-primary">Trove Technical Preview</span>
                  <h2 className="text-xl font-bold tracking-tight mt-0.5 text-white">Demonstration Environment</h2>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-3 font-sans text-xs sm:text-sm text-[#F0EDE6]/70 leading-relaxed font-light">
                <p>
                  Welcome to <span className="font-serif italic font-medium text-white">trove*</span>. This application is a fully functional client-side mockup designed to showcase freelance tax recovery pipelines.
                </p>
                <p>
                  Please be aware that compiling direct real-world tax returns and pulling live government statements requires strict regulatory clearances and official authorized government gateway approvals (including production-level DigiLocker, NSDL, and the Income Tax Department e-filing systems).
                </p>
                <p className="border-l-2 border-primary/40 pl-3 bg-primary/[0.03] py-2 text-primary font-mono text-[10px] sm:text-xs uppercase font-semibold">
                  Note: These regulatory integrations are actively planned and will be introduced in the near future.
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleAccept}
                className="group flex items-center justify-between bg-primary text-black text-xs font-mono font-black uppercase tracking-wider px-5 py-3.5 hover:bg-primary/95 transition-all shadow-[0_4px_20px_rgba(237,70,45,0.15)] cursor-pointer mt-2"
                style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                <span>I have read this and continue to the website</span>
                <Check size={14} strokeWidth={3} className="transition-transform group-hover:scale-110 ml-2" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
