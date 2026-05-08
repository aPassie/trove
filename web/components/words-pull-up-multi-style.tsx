'use client'

// same pull-up idea but each segment can carry its own classes for italic, color or weight

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

type Segment = { text: string; className?: string }
type Props = {
  segments: Segment[]
  className?: string
}

export function WordsPullUpMultiStyle({ segments, className = '' }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  const allWords = segments.flatMap((seg) =>
    seg.text.split(' ').map((word) => ({ word, className: seg.className ?? '' }))
  )

  return (
    <span ref={ref} className={`inline-flex flex-wrap justify-center ${className}`}>
      {allWords.map(({ word, className: wordClass }, i) => (
        <motion.span
          key={i}
          className={`inline-block ${wordClass}`}
          initial={{ y: 20, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {word}
          {i < allWords.length - 1 && ' '}
        </motion.span>
      ))}
    </span>
  )
}
