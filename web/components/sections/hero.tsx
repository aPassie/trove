// the primary marketing landing page container with hero pitch, video walkthrough, and architectural features

import {
  ArrowRight,
  Cloud,
  Database,
  FileText,
  Mail,
  PlayCircle,
  ServerCog,
  ShieldCheck
} from 'lucide-react'
import { HeroTerminal } from './hero-terminal'

const ARCHITECTURE = [
  { icon: Cloud, label: 'Client-First Ingestion', detail: 'Data parsing and operations run inside the client sandbox, ensuring zero server-side credential storage.' },
  { icon: Database, label: 'Durable Case Lifecycle', detail: 'Step-by-step processing operates through distributed state orchestrators to preserve secure progress.' },
  { icon: ServerCog, label: 'Automated Tax Compiler', detail: 'Custom analytical modules compile complex unstructured withholding ledgers into structured tax profiles.' },
  { icon: FileText, label: 'Interoperable Schemas', detail: 'Final filings compile into open-standard JSON data structures, ready for direct e-portal ingestion.' }
]

export function Hero() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F0EDE6]">
      <section className="relative isolate overflow-hidden border-b border-white/[0.07]">
        <img
          src="/hero-bg.png"
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.16] mix-blend-screen"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,8,8,0.62),rgba(8,8,8,0.96))]" />

        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <a href="/" className="font-serif text-2xl font-bold text-[#F0EDE6]">
            trove<span className="text-primary">*</span>
          </a>
          <div className="hidden items-center gap-8 sm:flex">
            <a href="#walkthrough" className="font-mono text-xs font-bold uppercase tracking-wider text-[#F0EDE6]/50 transition hover:text-[#F0EDE6]">
              walkthrough
            </a>
            <a href="#system" className="font-mono text-xs font-bold uppercase tracking-wider text-[#F0EDE6]/50 transition hover:text-[#F0EDE6]">
              system
            </a>
          </div>

          <a
            href="/auth/signin"
            className="inline-block bg-primary px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-primary/95"
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
          >
            try trove
          </a>
        </nav>

        <div className="mx-auto flex w-full max-w-7xl flex-col px-5 pb-16 pt-12 sm:px-8 lg:px-10 lg:pb-24 lg:pt-20">
          <div className="flex flex-col items-center text-center gap-6 mb-14 sm:mb-18 lg:mb-20">
            <div className="flex w-fit items-center gap-2 border border-primary/25 bg-primary/[0.06] px-3 py-1.5 font-mono text-[10px] font-black uppercase text-primary">
              <ShieldCheck size={13} />
              Built for freelance TDS recovery
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.06] tracking-tight text-[#F0EDE6] sm:text-5xl lg:text-6xl">
              Turn withheld TDS into a ready-to-file <span className="font-serif italic font-bold text-primary">ITR-1.</span>
            </h1>
            <p className="max-w-xl text-base leading-7 text-[#F0EDE6]/45 font-light sm:text-lg">
              Trove reads Form 26AS, identifies tax deducted by clients, calculates the refundable balance, and compiles the filing draft.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row mt-2">
              <a
                href="/auth/signin"
                className="inline-flex items-center justify-center gap-2 bg-primary px-7 py-3.5 font-mono text-xs font-black uppercase tracking-wider text-black transition hover:bg-primary/90"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
              >
                Recover my TDS
                <ArrowRight size={15} strokeWidth={3} />
              </a>
              <a
                href="#walkthrough"
                className="inline-flex items-center justify-center gap-2 border border-white/12 bg-white/[0.03] px-7 py-3.5 font-mono text-xs font-black uppercase tracking-wider text-[#F0EDE6]/80 transition hover:bg-white/[0.07]"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
              >
                Watch walkthrough
                <PlayCircle size={15} />
              </a>
            </div>
          </div>

          <HeroTerminal />
        </div>
      </section>

      <section id="walkthrough" className="border-b border-white/[0.07] bg-[#0b0b0b] px-5 py-16 sm:px-8 lg:px-10 sm:py-20">
        <div className="mx-auto max-w-7xl flex flex-col gap-8 sm:gap-10">
          <div className="flex flex-col gap-4 max-w-2xl">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              Product walkthrough
            </p>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-[#F0EDE6] leading-[1.12]">
              The complete recovery path in{' '}
              <span className="font-serif italic text-primary font-normal">one minute.</span>
            </h2>
            <p className="text-sm leading-relaxed text-[#F0EDE6]/40 font-light max-w-lg">
              From sign-in to Form 26AS scan, refund review, approval, and ITR-1 JSON download — watch the full flow.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/10 via-white/[0.04] to-transparent opacity-60 pointer-events-none" />
            <div className="relative overflow-hidden rounded-xl border border-white/[0.09] bg-black shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
              <video controls preload="metadata" poster="/scan-preview.png" className="aspect-video w-full bg-black object-cover block">
                <source src="/product-walkthrough.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      <section id="system" className="bg-[#080808] px-5 pt-20 pb-12 sm:px-8 lg:px-10 sm:pt-28 sm:pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 sm:mb-12 flex flex-col gap-4 max-w-2xl">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              System behind the interface
            </p>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-[#F0EDE6] leading-[1.12]">
              A product <span className="font-serif italic text-primary font-normal">slice</span>,
              not a static screen.
            </h2>
            <p className="text-sm leading-relaxed text-[#F0EDE6]/45 font-light max-w-xl">
              Trove is engineered around client data security, state transparency, and compiler precision to drive a seamless tax recovery pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ARCHITECTURE.map(({ icon: Icon, label, detail }, index) => {
              return (
                <div
                  key={label}
                  className="relative p-6 sm:p-7 flex flex-col justify-between min-h-[180px] sm:min-h-[200px] bg-[#0c0c0c] border border-white/[0.08] hover:border-primary/45 transition-all duration-300 group cursor-default"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(237,70,45,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(237,70,45,0.015)_1px,transparent_1px)] bg-[size:10px_10px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="flex justify-between items-center relative z-10">
                    <span className="font-mono text-[10px] font-black tracking-widest text-primary">
                      [ 0{index + 1} ]
                    </span>
                    <Icon className="text-[#F0EDE6]/25 group-hover:text-primary transition-colors duration-300" size={18} />
                  </div>

                  <div className="relative z-10 mt-6 flex-1 flex flex-col justify-end">
                    <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[#F0EDE6] group-hover:text-white transition-colors duration-300 leading-snug">
                      {label}
                    </h3>
                    <p className="mt-2.5 text-[11px] sm:text-xs leading-relaxed text-[#F0EDE6]/45 group-hover:text-[#F0EDE6]/65 transition-colors duration-300">
                      {detail}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="mt-12 sm:mt-16 border border-white/[0.08] bg-[#0c0c0c] overflow-hidden"
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
          >
            <div className="px-6 py-8 sm:px-8 sm:py-9 md:px-10 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6" style={{ background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(237,70,45,0.04), transparent)' }}>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary/10 border border-primary/20 text-primary" style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}>
                    <Mail size={14} />
                  </div>
                  <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">
                    Get in touch
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-light text-[#F0EDE6] tracking-tight leading-[1.15]">
                  Questions? <span className="font-serif italic text-primary/90 font-normal">Let&apos;s talk.</span>
                </h3>

                <a
                  href="mailto:parth.sankhla98@gmail.com"
                  className="font-mono text-xs sm:text-sm font-bold text-[#F0EDE6]/60 hover:text-primary transition-colors duration-300 tracking-tight"
                >
                  parth.sankhla98@gmail.com
                </a>
              </div>

              <a
                href="mailto:parth.sankhla98@gmail.com"
                className="inline-flex items-center justify-center gap-2.5 bg-primary px-7 py-4 font-mono text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-primary/90 shrink-0 shadow-[0_4px_20px_rgba(237,70,45,0.15)]"
                style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                Email Developer
                <ArrowRight size={14} strokeWidth={3} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
