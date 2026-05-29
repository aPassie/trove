'use client'

import { motion } from 'framer-motion'
import { signIn } from 'next-auth/react'
import { ArrowRight } from 'lucide-react'

export function SignInClient() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 py-16 overflow-hidden">
      <img
        src="/hero-bg.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-[0.04] mix-blend-multiply pointer-events-none"
      />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full max-w-md flex-col gap-6 rounded-3xl bg-[#0c0c0c] border border-white/10 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85)] select-none z-10"
      >
        <div className="flex flex-col gap-3">
          <div className="border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary self-start font-bold">
            ✕ AUTHORIZATION TERMINAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F0EDE6]">
            Sign in to <span className="font-serif italic font-normal text-primary">trove<span className="font-sans text-[#F0EDE6] font-normal">*</span></span>
          </h1>
          <p className="text-xs text-[#F0EDE6]/60 leading-relaxed font-light">
            Authenticate through the mocked DigiLocker path to initiate the portfolio scan.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center bg-[#050505] border border-white/[0.06] rounded-2xl p-4 w-full h-[100px] gap-2 select-none relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.01] to-transparent animate-pulse" />
          <div className="flex gap-4 items-center z-10">
            <div className="h-9 w-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#F0EDE6]/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <div className="h-1.5 w-12 bg-primary/10 rounded relative">
              <motion.div 
                animate={{ left: ['0%', '100%'] }} 
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }} 
                className="absolute h-full w-2.5 bg-primary rounded shadow-[0_0_6px_#ED462D]" 
              />
            </div>
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
          </div>
          <span className="font-mono text-[8px] uppercase tracking-wider text-[#F0EDE6]/30 z-10 font-black">DigiLocker Demo Link</span>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => signIn('digilocker-demo', { callbackUrl: '/app' })}
            className="group flex items-center justify-between bg-primary text-black text-xs sm:text-sm font-mono font-black uppercase tracking-wider px-5 py-3.5 hover:bg-primary/95 transition-all cursor-pointer"
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
          >
            <span>continue with digilocker</span>
            <ArrowRight size={14} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <p className="text-[10px] text-[#F0EDE6]/30 leading-normal font-light font-mono uppercase text-center mt-2">
          ✕ DigiLocker is in demo sandbox mode.<br />Signs in as Aakash with pre-loaded mock ledger.
        </p>
      </motion.div>
    </main>
  )
}
