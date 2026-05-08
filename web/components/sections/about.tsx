'use client'

// about — three-segment heading with italic middle, scroll-linked body reveal

import { useRef } from 'react'
import { useScroll } from 'framer-motion'
import { WordsPullUpMultiStyle } from '../words-pull-up-multi-style'
import { AnimatedLetter } from '../animated-letter'

const BODY = "Every freelancer I know has tax withheld they never claim. The portal is hostile, a chartered accountant costs more than the refund, and the money sits with the government. Trove is the small tool that gets it back, in twelve minutes."

export function About() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2']
  })

  const chars = BODY.split('')

  return (
    <section className="bg-black px-4 py-24 md:px-6 md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 rounded-2xl bg-[#101010] px-6 py-20 text-center md:rounded-[2rem] md:px-12 md:py-32">
        <span className="text-[10px] text-primary sm:text-xs">freelancer tools</span>

        <h2 className="mx-auto max-w-3xl text-3xl leading-[0.95] sm:text-4xl sm:leading-[0.9] md:text-5xl lg:text-6xl xl:text-7xl">
          <WordsPullUpMultiStyle
            segments={[
              { text: 'I built trove for the freelancers I know,', className: 'font-normal' },
              { text: 'the ones who never file.', className: 'italic font-serif' },
              { text: 'I wanted it to be the one thing they never had to think about.', className: 'font-normal' }
            ]}
          />
        </h2>

        <p ref={ref} className="max-w-2xl text-xs sm:text-sm md:text-base" style={{ color: '#DEDBC8' }}>
          {chars.map((char, i) => (
            <AnimatedLetter key={i} char={char} index={i} total={chars.length} progress={scrollYProgress} />
          ))}
        </p>
      </div>
    </section>
  )
}
