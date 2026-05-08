'use client'

// single character whose opacity is tied to scroll position for progressive reveal

import { motion, MotionValue, useTransform } from 'framer-motion'

type Props = {
  char: string
  index: number
  total: number
  progress: MotionValue<number>
}

export function AnimatedLetter({ char, index, total, progress }: Props) {
  const charProgress = index / total
  const opacity = useTransform(progress, [charProgress - 0.1, charProgress + 0.05], [0.2, 1])
  return <motion.span style={{ opacity }}>{char}</motion.span>
}
