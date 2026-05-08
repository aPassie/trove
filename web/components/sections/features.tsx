'use client'

// features — four-card grid: a looping demo video plus three product steps

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { WordsPullUpMultiStyle } from '../words-pull-up-multi-style'

const VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4'
const ICON_PULL = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85'
const ICON_REFUND = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85'
const ICON_DRAFT = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85'

type Card = {
  num: string
  title: string
  icon: string
  items: string[]
}

const CARDS: Card[] = [
  {
    num: '01',
    title: 'pull your 26as.',
    icon: ICON_PULL,
    items: [
      'connects via digilocker',
      'reads every tds entry on form 26as',
      'cross-references form 16 when you have one',
      'never stores pan or aadhaar'
    ]
  },
  {
    num: '02',
    title: 'compute the refund.',
    icon: ICON_REFUND,
    items: [
      'summarises each refundable tds line',
      'explains why the tax department is holding it',
      'shows one number — what you are owed'
    ]
  },
  {
    num: '03',
    title: 'ready-to-file itr-1.',
    icon: ICON_DRAFT,
    items: [
      'drafted against the official itd schema',
      'validated for the latest assessment year',
      'download as json or pdf, hand to a ca or self-file'
    ]
  }
]

function CardWrapper({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : {}}
      transition={{ delay: index * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl"
    >
      {children}
    </motion.div>
  )
}

export function Features() {
  return (
    <section className="relative min-h-screen bg-black px-4 py-24 md:px-6 md:py-32">
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-16">
        <div className="text-xl font-normal sm:text-2xl md:text-3xl lg:text-4xl">
          <WordsPullUpMultiStyle
            segments={[
              { text: 'the part that makes filing painless.', className: 'text-primary' },
              { text: 'no portal. no ca. no chase.', className: 'text-gray-500' }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-2 md:grid-cols-2 md:gap-1 lg:h-[480px] lg:grid-cols-4">
          <CardWrapper index={0}>
            <div className="relative h-full min-h-[280px] overflow-hidden lg:min-h-0">
              <video src={VIDEO} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                <p className="text-sm md:text-base" style={{ color: '#E1E0CC' }}>the agent at work.</p>
              </div>
            </div>
          </CardWrapper>

          {CARDS.map((card, i) => (
            <CardWrapper key={card.num} index={i + 1}>
              <div className="flex h-full min-h-[280px] flex-col justify-between bg-[#212121] p-4 md:p-5 lg:min-h-0">
                <div className="flex flex-col gap-4">
                  <img src={card.icon} alt="" className="h-10 w-10 rounded sm:h-12 sm:w-12" />
                  <h3 className="text-lg text-primary md:text-xl">
                    {card.title} <span className="text-gray-500">({card.num})</span>
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {card.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-gray-400 md:text-sm">
                        <Check size={14} className="mt-0.5 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <a href="#" className="mt-6 inline-flex items-center gap-2 self-start text-xs text-primary md:text-sm">
                  learn more
                  <ArrowRight size={14} style={{ transform: 'rotate(-45deg)' }} />
                </a>
              </div>
            </CardWrapper>
          ))}
        </div>
      </div>
    </section>
  )
}
