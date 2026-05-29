// a dashboard scan animation showing real-time client ledger parsing and refund draft generation

'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Download, FileText, IndianRupee } from 'lucide-react'

const LEDGER_ROWS = [
  { deductor: 'Acme Design Studio', section: '194J', amount: 6600, display: '₹6,600', status: 'withheld' },
  { deductor: 'Brightline Media', section: '194J', amount: 8400, display: '₹8,400', status: 'unclaimed' },
  { deductor: 'Quartz Labs', section: '194C', amount: 10200, display: '₹10,200', status: 'withheld' },
  { deductor: 'Northwind Studios', section: '194J', amount: 12000, display: '₹12,000', status: 'unclaimed' },
  { deductor: 'Beacon Analytics', section: '194J', amount: 13800, display: '₹13,800', status: 'ready' }
]

const TOTAL_REFUND = 51000

const DRAFT_POINTS = [
  ['TDS entries', '5'],
  ['Assessment year', '2025-26'],
  ['Export format', 'ITR-1 JSON'],
  ['Status', 'Ready']
]

export function HeroScan() {
  const [phase, setPhase] = useState(0)
  const [visibleRows, setVisibleRows] = useState(0)
  const [scanProgress, setScanProgress] = useState(0)
  const [counter, setCounter] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counterRef = useRef<number | null>(null)

  useEffect(() => {
    const startAnimation = () => {
      setPhase(1)
      setVisibleRows(0)
      setScanProgress(0)
      setCounter(0)
      setShowResult(false)
      setShowDetails(false)

      for (let i = 0; i < LEDGER_ROWS.length; i++) {
        setTimeout(() => setVisibleRows(i + 1), 300 + i * 400)
      }

      const scanStart = 300 + LEDGER_ROWS.length * 400 + 400
      setTimeout(() => {
        setPhase(2)
        const scanDuration = 1200
        const scanStep = 16
        let progress = 0
        const scanInterval = setInterval(() => {
          progress += (scanStep / scanDuration) * 100
          if (progress >= 100) {
            progress = 100
            clearInterval(scanInterval)
          }
          setScanProgress(progress)
        }, scanStep)
      }, scanStart)

      const dissolveStart = scanStart + 1500
      setTimeout(() => {
        setPhase(3)
      }, dissolveStart)

      const counterStart = dissolveStart + 600
      setTimeout(() => {
        setPhase(4)
        setShowResult(true)

        const duration = 1400
        const startTime = performance.now()
        const tick = (now: number) => {
          const elapsed = now - startTime
          const t = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - t, 3)
          setCounter(Math.round(eased * TOTAL_REFUND))
          if (t < 1) {
            counterRef.current = requestAnimationFrame(tick)
          }
        }
        counterRef.current = requestAnimationFrame(tick)
      }, counterStart)

      const detailsStart = counterStart + 1600
      setTimeout(() => {
        setPhase(5)
        setShowDetails(true)
      }, detailsStart)

      const restartDelay = detailsStart + 4000
      animRef.current = setTimeout(() => {
        startAnimation()
      }, restartDelay)
    }

    const initTimer = setTimeout(startAnimation, 800)

    return () => {
      clearTimeout(initTimer)
      if (animRef.current) clearTimeout(animRef.current)
      if (counterRef.current) cancelAnimationFrame(counterRef.current)
    }
  }, [])

  const formatCurrency = (n: number) => {
    return '₹' + n.toLocaleString('en-IN')
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-6 bg-gradient-to-b from-primary/[0.04] via-primary/[0.01] to-transparent rounded-3xl pointer-events-none blur-xl" />

      <div
        className="relative border border-white/[0.09] bg-[#0c0c0c]/95 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-primary/10 border border-primary/20 text-primary" style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}>
              {phase < 4 ? <FileText size={12} /> : <IndianRupee size={12} />}
            </div>
            <div>
              <p className="font-mono text-[9px] font-black uppercase tracking-wider text-primary/60">
                {phase < 3 ? 'Scanning' : phase < 4 ? 'Processing' : 'Complete'}
              </p>
              <p className="text-xs font-semibold text-[#F0EDE6]/80 tracking-tight mt-0.5">
                {phase < 3 ? 'Form 26AS Ledger' : phase < 4 ? 'Analyzing deductions…' : 'Refund-ready draft'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {phase >= 4 && (
              <CheckCircle2 size={14} className="text-emerald-400 animate-in fade-in duration-500" />
            )}
            <div className={`h-2 w-2 rounded-full transition-colors duration-500 ${
              phase < 2 ? 'bg-[#F0EDE6]/20' : phase < 4 ? 'bg-primary animate-pulse' : 'bg-emerald-400'
            }`} />
          </div>
        </div>

        <div className="relative px-5 py-5 min-h-[260px] sm:min-h-[280px]">
          {phase === 2 && (
            <div
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 z-20 pointer-events-none"
              style={{
                top: `${scanProgress}%`,
                transition: 'none',
                boxShadow: '0 0 20px rgba(237,70,45,0.4), 0 0 60px rgba(237,70,45,0.15)'
              }}
            />
          )}

          {phase >= 2 && phase < 4 && (
            <div className="absolute inset-0 bg-[linear-gradient(rgba(237,70,45,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(237,70,45,0.02)_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none transition-opacity duration-700" style={{ opacity: phase === 2 ? 1 : 0 }} />
          )}

          <div className={`space-y-2 transition-all duration-700 ${phase >= 3 ? 'opacity-0 scale-95 blur-sm' : 'opacity-100'}`}>
            {LEDGER_ROWS.map((row, index) => (
              <div
                key={row.deductor}
                className="grid grid-cols-[1fr_auto] gap-3 border border-white/[0.05] bg-black/25 p-2.5 transition-all duration-400"
                style={{
                  opacity: index < visibleRows ? 1 : 0,
                  transform: index < visibleRows ? 'translateY(0)' : 'translateY(8px)',
                  transitionDelay: '0ms'
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#F0EDE6]/85">{row.deductor}</p>
                  <p className="font-mono text-[9px] uppercase text-[#F0EDE6]/30">Section {row.section}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[11px] font-black text-primary/75">{row.display}</p>
                  <p className="font-mono text-[8px] uppercase text-[#F0EDE6]/25">{row.status}</p>
                </div>
              </div>
            ))}
          </div>

          {showResult && (
            <div className="absolute inset-0 px-5 py-5 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="border border-primary/20 bg-primary/[0.04] p-5 mb-3" style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))' }}>
                <p className="font-mono text-[9px] font-black uppercase tracking-wider text-primary/60 mb-1">Recoverable balance</p>
                <p
                  className="text-4xl sm:text-5xl font-black text-[#F0EDE6] tracking-tight"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatCurrency(counter)}
                </p>
              </div>

              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-1.5 transition-all duration-500 ${showDetails ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                {DRAFT_POINTS.map(([label, value]) => (
                  <div key={label} className="border border-white/[0.05] bg-black/20 p-2">
                    <p className="font-mono text-[8px] font-black uppercase text-[#F0EDE6]/25">{label}</p>
                    <p className="mt-0.5 text-xs font-bold text-[#F0EDE6]/80">{value}</p>
                  </div>
                ))}
              </div>

              <div className={`mt-3 flex items-center justify-between border border-white/[0.06] bg-black/30 px-3 py-2.5 font-mono text-[9px] uppercase text-[#F0EDE6]/40 transition-all duration-500 delay-200 ${showDetails ? 'opacity-100' : 'opacity-0'}`}>
                <span>itr1_draft.json</span>
                <Download size={12} className="text-primary/60" />
              </div>
            </div>
          )}
        </div>

        <div className="h-[2px] bg-white/[0.04]">
          <div
            className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500 ease-out"
            style={{
              width: phase === 0 ? '0%' : phase === 1 ? '20%' : phase === 2 ? `${20 + scanProgress * 0.4}%` : phase === 3 ? '75%' : phase === 4 ? '90%' : '100%'
            }}
          />
        </div>
      </div>
    </div>
  )
}
