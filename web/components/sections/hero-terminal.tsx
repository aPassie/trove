// a fake typing terminal that walks through a mock trove scan session

'use client'

import { useEffect, useRef, useState } from 'react'

interface TermLine {
  text: string
  type: 'command' | 'output' | 'success' | 'accent' | 'muted' | 'blank'
  delay: number
}

const SCRIPT: TermLine[] = [
  { text: '$ trove analyze form26as_2026-27.pdf', type: 'command', delay: 0 },
  { text: '', type: 'blank', delay: 600 },
  { text: '⟐ Parsing locally — nothing leaves this device...', type: 'muted', delay: 400 },
  { text: '✓ Form 26AS detected · AY 2026-27', type: 'output', delay: 800 },
  { text: '', type: 'blank', delay: 300 },
  { text: '  Found 5 TDS deductions under §194J:', type: 'output', delay: 500 },
  { text: '  ├─ Acme Design Studio      194J   ₹6,600    withheld', type: 'accent', delay: 250 },
  { text: '  ├─ Brightline Media        194J   ₹8,400    withheld', type: 'accent', delay: 200 },
  { text: '  ├─ Quartz Labs             194J   ₹10,200   withheld', type: 'accent', delay: 200 },
  { text: '  ├─ Northwind Studios       194J   ₹12,000   withheld', type: 'accent', delay: 200 },
  { text: '  └─ Beacon Analytics        194J   ₹13,800   withheld', type: 'accent', delay: 200 },
  { text: '', type: 'blank', delay: 400 },
  { text: '⟐ Applying §44ADA presumptive scheme...', type: 'muted', delay: 500 },
  { text: '✓ Deemed income: 50% of ₹5,10,000 receipts', type: 'output', delay: 700 },
  { text: '', type: 'blank', delay: 300 },
  { text: '⟐ Comparing regimes — new wins, ₹0 tax after §87A...', type: 'muted', delay: 500 },
  { text: '', type: 'blank', delay: 400 },
  { text: '  ₹51,000 recoverable', type: 'success', delay: 300 },
  { text: '', type: 'blank', delay: 400 },
  { text: '⟐ Drafting ITR-4...', type: 'muted', delay: 500 },
  { text: '✓ itr4_2026-27.json — valid against the official CBDT schema', type: 'output', delay: 600 },
  { text: '', type: 'blank', delay: 200 },
  { text: '  Ready to self-file. 5 entries · ₹51,000 refund · 0 bytes uploaded', type: 'success', delay: 400 },
]

function TypedLine({ text, type, onDone }: { text: string; type: string; onDone: () => void }) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    if (text === '') {
      onDone()
      return
    }

    if (type === 'command') {
      const speed = 28
      const interval = setInterval(() => {
        indexRef.current++
        setDisplayed(text.slice(0, indexRef.current))
        if (indexRef.current >= text.length) {
          clearInterval(interval)
          onDone()
        }
      }, speed)
      return () => clearInterval(interval)
    } else {
      setDisplayed(text)
      const timer = setTimeout(onDone, 60)
      return () => clearTimeout(timer)
    }
  }, [text, type, onDone])

  const colorClass =
    type === 'command' ? 'text-[#F0EDE6]' :
    type === 'success' ? 'text-primary font-bold' :
    type === 'accent' ? 'text-[#F0EDE6]/80' :
    type === 'muted' ? 'text-[#F0EDE6]/65' :
    'text-[#F0EDE6]/70'

  if (type === 'blank') return <div className="h-3" />

  return (
    <div className={`${colorClass} whitespace-pre leading-relaxed`}>
      {displayed}
      {type === 'command' && displayed.length < text.length && (
        <span className="inline-block w-[7px] h-[14px] bg-primary/80 ml-px animate-pulse align-middle" />
      )}
    </div>
  )
}

export function HeroTerminal() {
  const [lines, setLines] = useState<number>(0)
  const [cycle, setCycle] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLineDone = () => {
    const nextLine = lines + 1
    if (nextLine < SCRIPT.length) {
      timeoutRef.current = setTimeout(() => {
        setLines(nextLine)
      }, SCRIPT[nextLine].delay)
    } else {
      timeoutRef.current = setTimeout(() => {
        setLines(0)
        setCycle(c => c + 1)
      }, 5000)
    }
  }

  useEffect(() => {
    if (cycle > 0) {
      timeoutRef.current = setTimeout(() => {
        setLines(1)
      }, SCRIPT[0]?.delay || 0)
    }
  }, [cycle])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    timeoutRef.current = setTimeout(() => setLines(1), 800)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-6 bg-gradient-to-b from-primary/[0.03] via-primary/[0.01] to-transparent rounded-3xl pointer-events-none blur-xl" />

      <div
        className="relative border border-white/[0.09] bg-[#0a0a0a] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
      >
        <div className="flex items-center gap-2.5 px-3.5 py-2 border-b border-white/[0.05] bg-[#0e0e0e]/80">
          <div className="flex items-center gap-1">
            <div className="w-[8px] h-[8px] rounded-full bg-[#F0EDE6]/[0.07]" />
            <div className="w-[8px] h-[8px] rounded-full bg-[#F0EDE6]/[0.07]" />
            <div className="w-[8px] h-[8px] rounded-full bg-[#F0EDE6]/[0.07]" />
          </div>
          <span className="flex-1 text-center font-mono text-[9px] text-[#F0EDE6]/55 tracking-widest uppercase">
            trove — recovery scan
          </span>
          <div className="w-[30px]" />
        </div>

        <div
          ref={scrollRef}
          className="px-5 py-4 font-mono text-[11px] sm:text-xs h-[320px] overflow-y-auto scrollbar-none"
        >
          {Array.from({ length: lines }, (_, i) => (
            <TypedLine
              key={`${cycle}-${i}`}
              text={SCRIPT[i].text}
              type={SCRIPT[i].type}
              onDone={i === lines - 1 ? handleLineDone : () => {}}
            />
          ))}

          {lines === 0 && (
            <div className="text-[#F0EDE6]/55">
              <span className="text-[#F0EDE6]/55">$</span>
              <span className="inline-block w-[7px] h-[14px] bg-primary/80 ml-1.5 animate-pulse align-middle" />
            </div>
          )}
        </div>

        <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.03)_2px,rgba(0,0,0,0.03)_4px)]" />
      </div>
    </div>
  )
}
