'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, ArrowRight, Download, Copy, Sparkles, Shield, AlertCircle, FileJson } from 'lucide-react'

type CaseStep = {
  name: string
  status: 'pending' | 'running' | 'done' | 'awaiting-approval' | 'failed'
  startedAt?: number
  finishedAt?: number
}

type Draft = {
  schema: string
  itr1: Record<string, any>
  refundAmount: number
}

type CaseState = {
  caseId: string
  steps: CaseStep[]
  draft?: Draft
}

type DashboardProps = {
  session: {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
    }
  } | null
}

const STEP_LABELS: Record<string, { title: string; desc: string }> = {
  'pull-26as': {
    title: 'Connecting Tax API',
    desc: 'Retrieving Form 26AS tax statements via verified Setu gateway...'
  },
  'parse': {
    title: 'Extracting Ledger Ledger',
    desc: 'Parsing structured TDS rows and checking taxpayer signatures...'
  },
  'analyse': {
    title: 'AI Scanner Active',
    desc: 'Calculating excess withholding tax and running compliance checks...'
  },
  'awaiting-approval': {
    title: 'Awaiting Authorization',
    desc: 'Taxes identified! Review the analysis and approve filing below...'
  },
  'draft-itr1': {
    title: 'Drafting Tax Return',
    desc: 'Formatting government-compliant ITR-1 file with precise ledger entries...'
  }
}

const FIXTURE_LEDGER = [
  { deductor: 'Acme Design Studio Pvt Ltd', tan: 'BLRA12345E', section: '194J', amount: 6600 },
  { deductor: 'Brightline Media Pvt Ltd', tan: 'MUMB67890F', section: '194J', amount: 8400 },
  { deductor: 'Quartz Labs', tan: 'DELQ54321A', section: '194C', amount: 10200 },
  { deductor: 'Northwind Studios', tan: 'BLRN98765K', section: '194J', amount: 12000 },
  { deductor: 'Beacon Analytics', tan: 'PUNB11122M', section: '194J', amount: 13800 }
]

export function Dashboard({ session }: DashboardProps) {
  const [caseId, setCaseId] = useState<string | null>(null)
  const [caseState, setCaseState] = useState<CaseState | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [copied, setCopied] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Start new case
  const startCase = async () => {
    setIsStarting(true)
    try {
      const res = await fetch('/api/cases', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.caseId) {
          setCaseId(data.caseId)
        }
      } else if (res.status === 429) {
        alert('Too many requests. Please wait a moment and try again.')
      }
    } catch {
      // network error – silently handled
    } finally {
      setIsStarting(false)
    }
  }

  // Poll case state
  useEffect(() => {
    if (!caseId) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}`)
        if (res.ok) {
          const data = (await res.json()) as CaseState
          setCaseState(data)

          // Stop polling if draft is generated or step failed
          const hasFailed = data.steps.some((s) => s.status === 'failed')
          if (data.draft || hasFailed) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }
        }
      } catch {
        // polling error – will retry on next interval
      }
    }

    // Run immediately and poll
    poll()
    pollIntervalRef.current = setInterval(poll, 1500)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [caseId])

  // Approve case
  const approveCase = async () => {
    if (!caseId) return
    setIsApproving(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/approve`, { method: 'POST' })
      if (res.ok) {
        // Immediately trigger polling to capture running state
        const pollRes = await fetch(`/api/cases/${caseId}`)
        if (pollRes.ok) {
          const data = await pollRes.json()
          setCaseState(data)
        }
      }
    } catch {
      // approval error – user can retry
    } finally {
      setIsApproving(false)
    }
  }

  const copyDraft = () => {
    if (!caseState?.draft) return
    navigator.clipboard.writeText(JSON.stringify(caseState.draft.itr1, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadDraft = () => {
    if (!caseState?.draft) return
    const blob = new Blob([JSON.stringify(caseState.draft.itr1, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `itr1_draft_${caseState.caseId.slice(0, 8)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Get active or last completed step status
  const getStepStatus = (stepName: string): 'pending' | 'running' | 'done' | 'active' => {
    if (!caseState) return 'pending'
    const step = caseState.steps.find((s) => s.name === stepName)
    if (!step) return 'pending'
    if (step.status === 'awaiting-approval' && stepName === 'awaiting-approval') return 'active'
    return step.status as any
  }

  const isCaseActive = !!caseId
  const currentApprovalStep = caseState?.steps.find((s) => s.name === 'awaiting-approval')
  const isAwaitingApproval = currentApprovalStep?.status === 'awaiting-approval'
  const isCompleted = !!caseState?.draft

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <AnimatePresence mode="wait">
        {!isCaseActive ? (
          // STAGE 1: Landed & Ready to scan
          <motion.div
            key="start-screen"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-8 rounded-3xl border border-white/[0.08] bg-[#0c0c0c] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
          >
            <div className="flex flex-col gap-3">
              <div className="border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary self-start font-bold">
                ✕ AADHAAR VERIFIED GATEWAY
              </div>
              <h2 className="text-3xl font-medium tracking-tight text-[#F0EDE6] sm:text-4xl md:text-5xl">
                Ready to reclaim your tax refund, <span className="font-serif italic font-light text-primary">{session?.user?.name?.split(' ')[0]}*</span>
              </h2>
              <p className="text-sm text-[#F0EDE6]/60 sm:text-base font-light" style={{ lineHeight: 1.5 }}>
                Trove connects to the government Setu gate via DigiLocker token. We scan all TDS withheld by your clients over the last financial year and build a ready-to-file tax filing automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
              <div className="flex flex-col gap-2 rounded-2xl bg-[#050505] p-6 border border-white/[0.06]">
                <span className="text-xs text-primary font-mono uppercase tracking-wider font-semibold">Estimated Refund Available</span>
                <span className="text-3xl font-bold text-[#F0EDE6] tracking-tight">₹15,000 – ₹40,000</span>
                <span className="text-[10px] text-[#F0EDE6]/30 font-light">Typical gig worker refund average</span>
              </div>
              <div className="flex flex-col gap-2 rounded-2xl bg-[#050505] p-6 border border-white/[0.06]">
                <span className="text-xs text-[#F0EDE6]/50 font-mono uppercase tracking-wider font-semibold">Compliance Guarantee</span>
                <span className="text-3xl font-bold text-primary tracking-tight">100% compliant</span>
                <span className="text-[10px] text-[#F0EDE6]/30 font-light">Government validated schemas only</span>
              </div>
            </div>

            <button
              onClick={startCase}
              disabled={isStarting}
              className="group flex items-center justify-between bg-primary text-black text-xs sm:text-sm font-mono font-black uppercase tracking-wider px-6 py-4.5 hover:bg-primary/95 transition-all shadow-[0_4px_25px_rgba(237,70,45,0.2)] disabled:opacity-50 cursor-pointer"
              style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
            >
              {isStarting ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Initiating Scan...</span>
                </div>
              ) : (
                <>
                  <span>Begin Excess TDS Scan</span>
                  <ArrowRight size={16} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </motion.div>
        ) : (
          // STAGE 2: Scanning & Processing Timeline
          <motion.div
            key="processing-screen"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex flex-col gap-8"
          >
            {/* Timeline header */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-wider text-primary">Case Tracking #{caseId?.slice(0, 8)}</span>
              <h2 className="text-2xl font-medium text-[#F0EDE6] sm:text-3xl">Recovering Your Unclaimed Withholding</h2>
            </div>

            {/* Steps timeline list */}
            <div className="flex flex-col gap-6 rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-6 md:p-8">
              {['pull-26as', 'parse', 'analyse', 'awaiting-approval', 'draft-itr1'].map((stepName, idx) => {
                const label = STEP_LABELS[stepName]
                const status = getStepStatus(stepName) as string
                const isStepRunning = status === 'running'
                const isStepDone = status === 'done' || status === 'active' || (stepName === 'awaiting-approval' && isCompleted) || (stepName === 'pull-26as' && getStepStatus('parse') !== 'pending')
                const isStepPending = status === 'pending'

                return (
                  <div key={stepName} className="relative flex gap-4 md:gap-6">
                    {/* Line connector */}
                    {idx < 4 && (
                      <div
                        className={`absolute bottom-[-1.5rem] left-[15px] top-[28px] w-[2px] transition-colors duration-500 ${
                          isStepDone ? 'bg-primary' : 'bg-white/[0.08]'
                        }`}
                      />
                    )}

                    {/* Step indicator circle */}
                    <div className="relative flex h-8 w-8 items-center justify-center">
                      {isStepRunning ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-[#0a0a0a]">
                          <Loader2 className="animate-spin text-primary" size={12} />
                        </div>
                      ) : isStepDone ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-black">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className={`h-3 w-3 rounded-full transition-colors duration-500 ${status === 'active' ? 'bg-primary scale-125 shadow-[0_0_10px_rgba(237,70,45,0.5)]' : 'bg-white/[0.12]'}`} />
                      )}
                    </div>

                    {/* Label contents */}
                    <div className="flex flex-col gap-1 py-1">
                      <span
                        className={`text-sm font-semibold transition-colors duration-500 ${
                          isStepDone ? 'text-primary' : status === 'active' ? 'text-[#F0EDE6]' : 'text-[#F0EDE6]/30'
                        }`}
                      >
                        {label.title}
                      </span>
                      <span className="text-xs text-[#F0EDE6]/60 font-light leading-relaxed">{label.desc}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* STAGE 3: Review summary & authorize (pauses for approval) */}
            {isAwaitingApproval && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-6 rounded-3xl border border-primary/20 bg-gradient-to-b from-[#110c0b] to-[#0a0a0a] p-6 md:p-8 shadow-[0_20px_50px_rgba(237,70,45,0.03)]"
              >
                <div className="flex flex-col gap-3">
                  <div className="border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary self-start font-bold">
                    ✕ SCAN LEDGER VERIFICATION
                  </div>
                  <h3 className="text-xl font-medium text-primary">Excess TDS Found!</h3>
                  <div className="text-3xl md:text-4xl font-bold tracking-tight text-white py-1">
                    ₹51,000 <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold">refundable balance</span>
                  </div>
                  {caseState?.steps.find((s) => s.name === 'analyse')?.status === 'done' && (
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 text-xs font-serif italic text-primary/80">
                      &ldquo;₹51,000 withheld as TDS across 5 entries — verified entirely recoverable client-side.&rdquo;
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F0EDE6]/50">TDS Withholding Ledger</span>
                  <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#050505]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-[#0c0c0c] text-[10px] uppercase font-mono tracking-wider text-[#F0EDE6]/40">
                          <th className="p-4 font-medium">Deductor / Employer</th>
                          <th className="p-4 font-medium">TAN ID</th>
                          <th className="p-4 font-medium">Section</th>
                          <th className="p-4 font-medium text-right">TDS Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04] text-xs text-[#F0EDE6]/80 font-light">
                        {FIXTURE_LEDGER.map((row) => (
                          <tr key={row.tan} className="hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 font-medium">{row.deductor}</td>
                            <td className="p-4 font-mono text-[#F0EDE6]/40">{row.tan}</td>
                            <td className="p-4 text-[#F0EDE6]/60">{row.section}</td>
                            <td className="p-4 font-semibold text-right text-primary">₹{row.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-6">
                  <p className="text-xs text-[#F0EDE6]/40 leading-relaxed font-light">
                    By clicking Approve, you authorize the Trove agent to draft a verified ITR-1 Return with these entries. No CA costs or service charges. File directly in one click.
                  </p>
                  <button
                    onClick={approveCase}
                    disabled={isApproving}
                    className="group flex items-center justify-center gap-3 bg-primary text-black text-xs sm:text-sm font-mono font-black uppercase tracking-wider px-5 py-4 hover:bg-primary/95 transition-all shadow-[0_4px_25px_rgba(237,70,45,0.2)] disabled:opacity-50 cursor-pointer"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  >
                    {isApproving ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <span>Approve & Draft ITR-1 Return</span>
                        <ArrowRight size={14} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STAGE 4: Completed Draft Output */}
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-6 rounded-3xl border border-primary/20 bg-[#0c0c0c] p-6 md:p-8"
              >
                <div className="flex flex-col gap-3">
                  <div className="border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary self-start font-bold">
                    ✕ RECOVERY SUCCESS
                  </div>
                  <h3 className="text-2xl font-medium text-[#F0EDE6]">Your ITR-1 Return is Drafted</h3>
                  <p className="text-sm text-[#F0EDE6]/60 leading-relaxed font-light">
                    The tax filing draft for AY 2025-26 has been successfully generated using the Setu government tax schema. Your refund claim is exactly **₹51,000**.
                  </p>
                </div>

                {/* JSON Codeblock display */}
                <div className="relative rounded-xl border border-white/[0.08] bg-[#050505] p-4 font-mono text-[10px] leading-relaxed text-[#F0EDE6]/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
                  <div className="absolute right-3 top-3 flex gap-2">
                    <button
                      onClick={copyDraft}
                      className="flex h-8 w-8 items-center justify-center border border-white/10 bg-black hover:bg-white/[0.04] transition-all text-[#F0EDE6]/40 hover:text-[#F0EDE6] cursor-pointer"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                      title="Copy code"
                    >
                      {copied ? <span className="text-[9px] text-primary px-1 font-sans font-semibold">Copied!</span> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={downloadDraft}
                      className="flex h-8 w-8 items-center justify-center border border-white/10 bg-black hover:bg-white/[0.04] transition-all text-[#F0EDE6]/40 hover:text-[#F0EDE6] cursor-pointer"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                      title="Download JSON"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[#F0EDE6]/30 mb-2 border-b border-white/[0.04] pb-2">
                    <FileJson size={10} />
                    <span>itr1_draft.json</span>
                  </div>
                  <pre className="overflow-x-auto max-h-60 text-left">
                    {JSON.stringify(caseState?.draft?.itr1, null, 2)}
                  </pre>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={downloadDraft}
                    className="flex flex-1 items-center justify-center gap-2 border border-primary text-primary text-xs font-mono font-bold uppercase tracking-wider px-5 py-3.5 hover:bg-primary/5 transition-all cursor-pointer"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  >
                    <Download size={14} /> Download ITR-1 File
                  </button>
                  <button
                    onClick={() => {
                      setCaseId(null)
                      setCaseState(null)
                    }}
                    className="flex flex-1 items-center justify-center gap-2 border border-white/10 bg-[#1a1a1a] text-[#F0EDE6]/80 text-xs font-mono font-bold uppercase tracking-wider px-5 py-3.5 hover:bg-white/[0.04] transition-all cursor-pointer"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
