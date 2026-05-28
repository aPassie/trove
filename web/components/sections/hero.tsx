'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, ArrowRight } from 'lucide-react'
import { MarqueeBand } from './marquee-band'

const NAV = ['how it works', 'about', 'contact']

export function Hero() {
  const [scrolled, setScrolled] = useState(false)
  const [activeModal, setActiveModal] = useState<'none' | 'how-it-works' | 'about' | 'contact'>('none')
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [formEmail, setFormEmail] = useState('')
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formEmail && formMessage) {
      setFormSubmitted(true)
      setTimeout(() => {
        setFormSubmitted(false)
        setFormEmail('')
        setFormMessage('')
        setActiveModal('none')
      }, 2000)
    }
  }

  return (
    <section className="w-full flex-1 flex flex-col bg-[#0a0a0a] relative min-h-0">
      {/* Dynamic Floating / Inline Navbar */}
      <nav
        className={`z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled
            ? 'fixed left-1/2 -translate-x-1/2 top-4 rounded-full bg-[#0a0a0a]/90 border border-white/[0.08] backdrop-blur-md py-2.5 px-6 md:px-10 shadow-[0_10px_40px_rgba(0,0,0,0.8)]'
            : 'absolute left-0 right-0 top-0 py-6 px-6 md:px-12 flex justify-between items-center'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-1 ${scrolled ? 'hidden' : 'block'}`}>
          <span className="font-serif text-2xl font-black text-black tracking-tight select-none">
            trove<span className="text-black font-sans font-normal">*</span>
          </span>
        </div>

        {/* Links list */}
        <ul className={`flex gap-4 sm:gap-6 md:gap-8 lg:gap-10 items-center`}>
          {NAV.map((label) => (
            <li key={label}>
              <button
                onClick={() => {
                  setActiveModal(label.replace(/\s+/g, '-') as any)
                }}
                className={`font-mono text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer focus:outline-none ${
                  scrolled
                    ? 'text-[#F0EDE6]/60 hover:text-primary'
                    : 'text-black/70 hover:text-black'
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>

        {/* Top-Right Chamfered CTA */}
        <div className={scrolled ? 'hidden' : 'block'}>
          <a
            href="/auth/signin"
            className="hidden sm:inline-block bg-black text-white text-xs font-mono font-bold uppercase tracking-wider px-5 py-2.5 hover:bg-black/95 transition-all"
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
          >
            try trove
          </a>
        </div>
      </nav>

      {/* Main Vermilion Red Banner Container */}
      <div className="relative w-full flex-1 bg-primary px-6 md:px-12 flex flex-col justify-center overflow-hidden min-h-0 py-8">
        {/* Subtle high-fidelity tech-circuit grid texture overlay */}
        <img
          src="/hero-bg.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-multiply pointer-events-none"
        />

        <div className="relative max-w-6xl mx-auto flex flex-col gap-4 md:gap-5 text-left w-full">
          {/* Autonomous AI Agent Tag */}
          <div className="border border-black/20 bg-black/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-black self-start font-bold mt-8">
            ✕ AUTONOMOUS AI TAX SCANNING AGENT
          </div>

          {/* Main Title Banner in black */}
          <h1 className="font-bold leading-[0.9] tracking-[-0.07em] text-[9.5vw] sm:text-[8vw] md:text-[6vw] lg:text-[4.5vw] text-black uppercase">
            Automated TDS scan.<br />No portal. No limits.
          </h1>

          {/* Subtitle description - Detailed & highly scannable micro-breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 max-w-4xl mt-1 text-black select-none z-10">
            {/* Column 1: The Leak */}
            <div className="flex flex-col gap-1.5 bg-black/5 border border-black/10 rounded-xl p-3.5 backdrop-blur-[2px] transition-all duration-300 hover:bg-black/[0.07] hover:border-black/15">
              <span className="font-mono text-[8px] font-black tracking-widest text-black/40 uppercase">01 / THE LEAK</span>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-black">Withheld TDS</h4>
              <p className="text-[10px] sm:text-xs leading-relaxed text-black/75 font-semibold">
                Clients withhold 1% to 10% tax (TDS) under Section 194J/194C on every payment you receive. This money accumulates quietly as an unclaimed cash balance with the IT Department.
              </p>
            </div>

            {/* Column 2: The Agent */}
            <div className="flex flex-col gap-1.5 bg-black/5 border border-black/10 rounded-xl p-3.5 backdrop-blur-[2px] transition-all duration-300 hover:bg-black/[0.07] hover:border-black/15">
              <span className="font-mono text-[8px] font-black tracking-widest text-black/40 uppercase">02 / THE AGENT</span>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-black">Sandboxed Scan</h4>
              <p className="text-[10px] sm:text-xs leading-relaxed text-black/75 font-semibold">
                Trove runs an autonomous AI agent entirely inside your browser's local sandbox to read Form 26AS records via DigiLocker. Zero password storage, zero credentials saved on any server.
              </p>
            </div>

            {/* Column 3: The Recovery */}
            <div className="flex flex-col gap-1.5 bg-black/5 border border-black/10 rounded-xl p-3.5 backdrop-blur-[2px] transition-all duration-300 hover:bg-black/[0.07] hover:border-black/15">
              <span className="font-mono text-[8px] font-black tracking-widest text-black/40 uppercase">03 / THE RECOVERY</span>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-black">12-Minute Claim</h4>
              <p className="text-[10px] sm:text-xs leading-relaxed text-black/75 font-semibold">
                Our local compiler matches your tax ledger rows, calculates the exact refund due, and automatically compiles a government-ready ITR-1 JSON file. No manual CA audits.
              </p>
            </div>
          </div>

          {/* Dual Chamfered buttons */}
          <div className="flex gap-4">
            <a
              href="/auth/signin"
              className="bg-black text-white text-xs sm:text-sm font-mono font-black uppercase tracking-wider px-6 py-3.5 hover:bg-black/95 transition-all shadow-[0_4px_25px_rgba(0,0,0,0.15)]"
              style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
            >
              try trove
            </a>
            <button
              onClick={() => setActiveModal('how-it-works')}
              className="border border-black text-black text-xs sm:text-sm font-mono font-black uppercase tracking-wider px-6 py-3.5 hover:bg-black/10 transition-all cursor-pointer"
              style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
            >
              Our Approach
            </button>
          </div>
        </div>
      </div>

      {/* Repeating Marquee Band */}
      <MarqueeBand />

      {/* Interactive Modal Overlays Container */}
      <AnimatePresence>
        {activeModal !== 'none' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setActiveModal('none')
              setFormSubmitted(false)
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 cursor-pointer"
          >
            {/* Modal Dialog Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 select-none shadow-[0_25px_60px_rgba(0,0,0,0.8)] cursor-default"
            >
              {/* Top-Right Chamfered Close Button */}
              <button
                onClick={() => {
                  setActiveModal('none')
                  setFormSubmitted(false)
                }}
                className="absolute right-4 top-4 bg-primary text-black hover:bg-primary/90 flex h-8 w-8 items-center justify-center font-bold cursor-pointer transition-colors focus:outline-none"
                style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
              >
                <X size={16} />
              </button>

              {/* MODAL 1: HOW IT WORKS */}
              {activeModal === 'how-it-works' && (
                <div className="flex flex-col gap-5 text-left">
                  <div className="border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary self-start font-bold">
                    ✕ THE WORKFLOW
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0EDE6] leading-tight">
                    Three steps. Twelve minutes. Zero spreadsheets.
                  </h3>
                  
                  {/* Stepper Flow Container */}
                  <div className="flex flex-col gap-5 mt-2">
                    {/* Step 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-6 items-center border-b border-white/[0.04] pb-5">
                      <div className="flex gap-4 items-start">
                        <span className="font-mono text-xs text-primary font-black mt-0.5">01</span>
                        <div className="flex flex-col gap-1">
                          <h4 className="text-sm font-semibold tracking-tight text-[#F0EDE6]">Secure DigiLocker Integration</h4>
                          <p className="text-xs text-[#F0EDE6]/60 leading-relaxed font-light">Trove connects securely to the government Setu gate via direct DigiLocker token. We read your Form 26AS entries without ever storing your Aadhaar credentials.</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col items-center justify-center bg-white/[0.02] border border-white/[0.08] rounded-xl p-3 w-full h-[85px] gap-1.5 select-none relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.02] to-transparent animate-pulse" />
                        <div className="flex gap-2.5 items-center z-10">
                          <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#F0EDE6]/60">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          </div>
                          <div className="h-1.5 w-6 bg-primary/20 rounded relative">
                            <motion.div animate={{ left: ['0%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }} className="absolute h-full w-2 bg-primary rounded" />
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                          </div>
                        </div>
                        <span className="font-mono text-[8px] uppercase tracking-wider text-[#F0EDE6]/40 z-10 font-bold">Secure API Gate</span>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-6 items-center border-b border-white/[0.04] pb-5">
                      <div className="flex gap-4 items-start">
                        <span className="font-mono text-xs text-primary font-black mt-0.5">02</span>
                        <div className="flex flex-col gap-1">
                          <h4 className="text-sm font-semibold tracking-tight text-[#F0EDE6]">Automated TDS Rows Audit</h4>
                          <p className="text-xs text-[#F0EDE6]/60 leading-relaxed font-light">Our compiler parses unstructured deductor rows, cross-references transaction sections (e.g. 194J, 194C), and computes the exact excess withholding tax holding balance.</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col bg-white/[0.02] border border-white/[0.08] rounded-xl p-2.5 w-full h-[85px] gap-1 select-none justify-center overflow-hidden font-mono text-[7px] relative">
                        <motion.div 
                          animate={{ top: ['5%', '85%', '5%'] }} 
                          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }} 
                          className="absolute inset-x-0 h-[1px] bg-primary shadow-[0_0_5px_#ED462D] z-10" 
                        />
                        <div className="flex justify-between text-[#F0EDE6]/30 border-b border-white/[0.04] pb-0.5">
                          <span>SECTION</span>
                          <span>RATE</span>
                          <span>STATUS</span>
                        </div>
                        <div className="flex justify-between text-primary font-bold">
                          <span>SEC_194J</span>
                          <span>10.0%</span>
                          <span>AUDITED</span>
                        </div>
                        <div className="flex justify-between text-[#F0EDE6]/50">
                          <span>SEC_194C</span>
                          <span>1.0%</span>
                          <span className="text-amber-500 font-bold animate-pulse">PENDING</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-6 items-center">
                      <div className="flex gap-4 items-start">
                        <span className="font-mono text-xs text-primary font-black mt-0.5">03</span>
                        <div className="flex flex-col gap-1">
                          <h4 className="text-sm font-semibold tracking-tight text-[#F0EDE6]">ITR-1 Government Schema Export</h4>
                          <p className="text-xs text-[#F0EDE6]/60 leading-relaxed font-light">We automatically compile your refund ledger entries into a verified, government-compliant ITR-1 JSON file. Export it in one click to self-file or hand off to an agent.</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col bg-white/[0.02] border border-white/[0.08] rounded-xl p-2.5 w-full h-[85px] justify-center overflow-hidden font-mono text-[7px] text-[#F0EDE6]/50 select-none relative">
                        <div className="absolute top-1.5 right-1.5 text-primary font-bold text-[6px] uppercase border border-primary/20 bg-primary/5 px-1 rounded scale-90">JSON</div>
                        <div className="text-[#F0EDE6]/70 font-semibold">{`{`}</div>
                        <div className="pl-2 text-primary">{`"schema": "ITR-1",`}</div>
                        <div className="pl-2">{`"refund": 42150,`}</div>
                        <div className="pl-2 text-primary">{`"verified": true`}</div>
                        <div className="text-[#F0EDE6]/70 font-semibold">{`}`}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 2: ABOUT */}
              {activeModal === 'about' && (
                <div className="flex flex-col gap-5 text-left">
                  <div className="border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary self-start font-bold">
                    ✕ OUR PHILOSOPHY
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0EDE6] leading-tight">
                    Built for freelancers who never file.
                  </h3>
                  <div className="flex flex-col gap-4 text-xs sm:text-sm text-[#F0EDE6]/70 leading-relaxed font-light mt-1">
                    <p>
                      We built Trove for the writers, designers, developers, and consultants who watch hard-earned money sit unclaimed with the government because traditional portals are hostile and chartered accountants charge more than the refund is worth.
                    </p>
                    
                    {/* Architectural Comparison Flow Diagram */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {/* Left Block: Portal Vortex */}
                      <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3.5 opacity-55">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-white/[0.03]">
                          <div className="h-2 w-2 rounded-full bg-amber-600" />
                          <span className="font-mono text-[9px] font-black uppercase tracking-wider text-[#F0EDE6]/60">TRADITIONAL VORTEX</span>
                        </div>
                        {/* Point 1 */}
                        <div className="flex gap-2.5 items-start">
                          <div className="h-5 w-5 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#F0EDE6]/30 mt-0.5 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F0EDE6]/70">Credential Risk</span>
                            <span className="text-[9px] text-[#F0EDE6]/45 leading-normal font-light">Exposing full government portal access and Aadhaar keys to CAs.</span>
                          </div>
                        </div>
                        {/* Point 2 */}
                        <div className="flex gap-2.5 items-start">
                          <div className="h-5 w-5 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#F0EDE6]/30 mt-0.5 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F0EDE6]/70">CA Commissions</span>
                            <span className="text-[9px] text-[#F0EDE6]/45 leading-normal font-light">Chartered accountants charging flat upfront retaining fees or 10-20% cuts.</span>
                          </div>
                        </div>
                        {/* Point 3 */}
                        <div className="flex gap-2.5 items-start">
                          <div className="h-5 w-5 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#F0EDE6]/30 mt-0.5 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F0EDE6]/70">14-Day Lead Times</span>
                            <span className="text-[9px] text-[#F0EDE6]/45 leading-normal font-light">Endless Excel compilation, row audits, and back-and-forth messages.</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Trove Direct Scanner */}
                      <div className="bg-primary/[0.03] border border-primary/20 rounded-2xl p-4 flex flex-col gap-3.5 shadow-[0_8px_30px_rgba(237,70,45,0.03)]">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-primary/10">
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <span className="font-mono text-[9px] font-black uppercase tracking-wider text-primary">TROVE BROWSER SCANNER</span>
                        </div>
                        {/* Point 1 */}
                        <div className="flex gap-2.5 items-start">
                          <div className="h-5 w-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mt-0.5 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F0EDE6]">Zero Credentials Stored</span>
                            <span className="text-[9px] text-[#F0EDE6]/60 leading-normal font-light">Setu secure API keys authorize the parser completely locally. No server saves.</span>
                          </div>
                        </div>
                        {/* Point 2 */}
                        <div className="flex gap-2.5 items-start">
                          <div className="h-5 w-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mt-0.5 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F0EDE6]">No Filing Commissions</span>
                            <span className="text-[9px] text-[#F0EDE6]/60 leading-normal font-light">Flat tool usage fee. You retain 100% of the calculated tax withholding refund.</span>
                          </div>
                        </div>
                        {/* Point 3 */}
                        <div className="flex gap-2.5 items-start">
                          <div className="h-5 w-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mt-0.5 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F0EDE6]">12-Minute Resolution</span>
                            <span className="text-[9px] text-[#F0EDE6]/60 leading-normal font-light">Parser computes TDS row offsets and exports verified schemas immediately.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 3: CONTACT */}
              {activeModal === 'contact' && (
                <div className="flex flex-col gap-5 text-left">
                  <div className="border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary self-start font-bold">
                    ✕ GET IN TOUCH
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0EDE6] leading-tight">
                    Direct developer lines. No queues.
                  </h3>

                  <AnimatePresence mode="wait">
                    {!formSubmitted ? (
                      <motion.form
                        key="contact-form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleContactSubmit}
                        className="flex flex-col gap-4 mt-2"
                      >
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F0EDE6]/40">Your Email Address</label>
                          <input
                            type="email"
                            required
                            placeholder="you@domain.com"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            className="bg-[#0c0c0c] border border-white/10 rounded-lg px-4 py-3 text-xs sm:text-sm font-mono text-[#F0EDE6] placeholder-[#F0EDE6]/20 focus:outline-none focus:border-primary/50 transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F0EDE6]/40">Your Message</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="What can we help you solve?"
                            value={formMessage}
                            onChange={(e) => setFormMessage(e.target.value)}
                            className="bg-[#0c0c0c] border border-white/10 rounded-lg px-4 py-3 text-xs sm:text-sm font-sans text-[#F0EDE6] placeholder-[#F0EDE6]/20 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-primary text-black text-xs sm:text-sm font-mono font-black uppercase tracking-wider px-6 py-3.5 hover:bg-primary/90 transition-all self-start mt-2 cursor-pointer"
                          style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                        >
                          Send Message
                        </button>
                      </motion.form>
                    ) : (
                      <motion.div
                        key="success-message"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-10 gap-4 text-center"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
                          <Check size={24} strokeWidth={3} />
                        </div>
                        <h4 className="text-base font-bold text-[#F0EDE6]">Message Transmitted</h4>
                        <p className="text-xs text-[#F0EDE6]/60 leading-relaxed font-light max-w-sm">We have received your request. A Trove team developer will reach out directly within 2 hours.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
