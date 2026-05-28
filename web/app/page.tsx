// landing — hero only

import { Hero } from '@/components/sections/hero'

export default function Page() {
  return (
    <main className="bg-[#0a0a0a] h-screen flex flex-col justify-between overflow-hidden">
      <Hero />
      
      {/* Sleek Minimalist Copyright Footer */}
      <footer className="w-full bg-[#0a0a0a] py-4 border-t border-white/[0.04] text-center select-none shrink-0">
        <p className="text-[10px] sm:text-xs font-mono text-[#F0EDE6]/25 uppercase tracking-widest">
          © {new Date().getFullYear()} Trove Technologies. All rights reserved.
        </p>
      </footer>
    </main>
  )
}
