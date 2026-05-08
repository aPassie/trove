'use client'

// hero — full-bleed video, navbar pill, giant brand with asterisk, right-column blurb and cta

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { WordsPullUp } from '../words-pull-up'

const NAV = ['how it works', 'for freelancers', 'pricing', 'about', 'contact']
const HERO_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4'

export function Hero() {
  return (
    <section className="h-screen p-4 md:p-6">
      <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
        <video src={HERO_VIDEO} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        <nav className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-2xl bg-black px-4 py-2 md:rounded-b-3xl md:px-8">
          <ul className="flex gap-3 text-[10px] sm:gap-6 sm:text-xs md:gap-12 md:text-sm lg:gap-14">
            {NAV.map((label) => (
              <li key={label}>
                <a href="#" className="text-[rgba(225,224,204,0.8)] transition-colors hover:text-[#E1E0CC]">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 grid grid-cols-12 gap-4 p-4 md:p-8 lg:p-12">
          <div className="col-span-12 md:col-span-8">
            <h1
              className="font-medium leading-[0.85] tracking-[-0.07em] text-[26vw] sm:text-[24vw] md:text-[22vw] lg:text-[20vw] xl:text-[19vw] 2xl:text-[20vw]"
              style={{ color: '#E1E0CC' }}
            >
              <WordsPullUp text="trove" showAsterisk />
            </h1>
          </div>

          <div className="col-span-12 flex flex-col gap-4 md:col-span-4 md:justify-end">
            <motion.p
              className="text-xs text-primary/70 sm:text-sm md:text-base"
              style={{ lineHeight: 1.2 }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              trove pulls your form 26as, finds the tds that&apos;s already yours, and hands back a ready-to-file return. no chartered accountant, no portal, no chasing.
            </motion.p>

            <motion.a
              href="/auth/signin"
              className="group flex items-center gap-2 self-start rounded-full bg-primary py-2 pl-5 pr-2 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              get my refund
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                <ArrowRight size={16} className="text-primary" />
              </span>
            </motion.a>
          </div>
        </div>
      </div>
    </section>
  )
}
