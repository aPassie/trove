// landing — hero only

import { Hero } from '@/components/sections/hero'
import { DisclaimerModal } from '@/components/disclaimer-modal'

export default function Page() {
  return (
    <main className="bg-[#0a0a0a] min-h-screen flex flex-col justify-between overflow-x-hidden">
      <Hero />
      <DisclaimerModal />
      
      {/* Editorial Footer */}
      <footer className="w-full bg-[#080808] border-t border-white/[0.04] select-none shrink-0">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-8 sm:py-10">
          {/* Top divider accent */}
          <div className="h-px w-full bg-gradient-to-r from-primary/20 via-white/[0.04] to-transparent mb-8 sm:mb-10 -mt-0.5" />
          
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            {/* Brand + tagline */}
            <div className="flex flex-col gap-2">
              <a href="/" className="font-serif text-xl font-bold text-[#F0EDE6]/80 hover:text-[#F0EDE6] transition-colors">
                trove<span className="text-primary">*</span>
              </a>
              <p className="text-[11px] sm:text-xs text-[#F0EDE6]/25 font-light leading-relaxed max-w-xs">
                Autonomous tax recovery for India&apos;s independent workforce.
              </p>
            </div>

            {/* Copyright + meta */}
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <p className="font-mono text-[9px] sm:text-[10px] text-[#F0EDE6]/20 uppercase tracking-[0.2em]">
                © {new Date().getFullYear()} Trove Technologies
              </p>
              <p className="font-mono text-[9px] text-[#F0EDE6]/12 uppercase tracking-widest">
                All rights reserved
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
