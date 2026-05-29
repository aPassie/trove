'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, ArrowRight, Download, Copy, AlertCircle, FileJson } from 'lucide-react'
import { MOCK_PROFILE_KEYS, MOCK_PROFILE_DETAILS } from '@/lib/mock-profiles'

type CaseStep = {
  name: string
  status: 'pending' | 'running' | 'done' | 'awaiting-approval' | 'failed'
  startedAt?: number
  finishedAt?: number
  error?: string
}

type TDSEntry = {
  deductor: string
  tan?: string
  section: string
  amount: number
  financialYear?: string
}

type Draft = {
  schema: string
  itr1: Record<string, any>
  refundAmount: number
}

type CaseState = {
  caseId: string
  steps: CaseStep[]
  analysis?: {
    tdsEntries: TDSEntry[]
    refundEstimate: number
    summary: string
    taxpayerName?: string
  }
  draft?: Draft
  mockUserId?: string
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
    title: 'Extracting Tax Ledger',
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
    desc: 'Formatting an ITR-1-style JSON draft with precise ledger entries...'
  }
}

export function Dashboard({ session }: DashboardProps) {
  const [caseId, setCaseId] = useState<string | null>(null)
  const [caseState, setCaseState] = useState<CaseState | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [copied, setCopied] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [scanHistory, setScanHistory] = useState<any[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('trove_scan_history')
    if (stored) {
      try {
        setScanHistory(JSON.parse(stored))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const saveHistory = (history: any[]) => {
    setScanHistory(history)
    localStorage.setItem('trove_scan_history', JSON.stringify(history))
  }

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload()
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  useEffect(() => {
    if (!caseId) {
      window.dispatchEvent(new CustomEvent('trove-active-case-changed', {
        detail: { taxpayerName: session?.user?.name || 'Aakash Singh' }
      }))
      return
    }

    const activeItem = scanHistory.find((h) => h.caseId === caseId)
    const taxpayerName = caseState?.analysis?.taxpayerName || activeItem?.taxpayerName || session?.user?.name || 'Aakash Singh'

    window.dispatchEvent(new CustomEvent('trove-active-case-changed', {
      detail: { taxpayerName }
    }))
  }, [caseId, caseState, scanHistory, session])

  const startCase = async (specificKey?: string) => {
    setIsStarting(true)
    
    // Choose a random profile different from the current one to ensure variety
    const keyToScan = specificKey || (() => {
      const currentKey = caseState?.mockUserId
      const remainingKeys = MOCK_PROFILE_KEYS.filter(k => k !== currentKey)
      const chosenKeys = remainingKeys.length > 0 ? remainingKeys : MOCK_PROFILE_KEYS
      return chosenKeys[Math.floor(Math.random() * chosenKeys.length)]
    })()

    const profileInfo = MOCK_PROFILE_DETAILS[keyToScan] || { name: 'Unknown User', estimate: '₹0' }

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mockUserId: keyToScan })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.caseId) {
          const newCase = {
            caseId: data.caseId,
            mockUserId: keyToScan,
            taxpayerName: profileInfo.name,
            estimate: profileInfo.estimate,
            status: 'scanning' as const,
            updatedAt: Date.now(),
            caseState: {
              caseId: data.caseId,
              steps: [
                { name: 'pull-26as', status: 'running' as const, startedAt: Date.now() },
                { name: 'parse', status: 'pending' as const },
                { name: 'analyse', status: 'pending' as const },
                { name: 'awaiting-approval', status: 'pending' as const },
                { name: 'draft-itr1', status: 'pending' as const }
              ],
              mockUserId: keyToScan
            }
          }
          const updatedHistory = [newCase, ...scanHistory.filter(h => h.caseId !== data.caseId)]
          saveHistory(updatedHistory)
          
          setCaseId(data.caseId)
          setCaseState(newCase.caseState as any)
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(`Failed to start scan: ${errData.error || res.statusText || res.status}`)
      }
    } catch (err: any) {
      alert(`Network error starting scan: ${err?.message || err}`)
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
          
          // Attach mockUserId from current state to keep tracking consistent
          const activeItem = scanHistory.find(h => h.caseId === caseId)
          if (activeItem && activeItem.mockUserId) {
            data.mockUserId = activeItem.mockUserId
          }
          
          setCaseState(data)

          // Determine status
          let status: 'scanning' | 'awaiting-approval' | 'completed' | 'failed' = 'scanning'
          const hasFailed = data.steps.some((s) => s.status === 'failed')
          const isAwaiting = data.steps.some((s) => s.name === 'awaiting-approval' && s.status === 'awaiting-approval')
          if (data.draft) {
            status = 'completed'
          } else if (hasFailed) {
            status = 'failed'
          } else if (isAwaiting) {
            status = 'awaiting-approval'
          }

          // Update scan history in localStorage
          setScanHistory(prevHistory => {
            const index = prevHistory.findIndex(h => h.caseId === caseId)
            if (index !== -1) {
              const updatedItem = {
                ...prevHistory[index],
                status,
                updatedAt: Date.now(),
                caseState: data,
                taxpayerName: data.analysis?.taxpayerName || prevHistory[index].taxpayerName,
                estimate: data.analysis?.refundEstimate 
                  ? `₹${data.analysis.refundEstimate.toLocaleString('en-IN')}` 
                  : prevHistory[index].estimate
              }
              const nextHistory = [...prevHistory]
              nextHistory[index] = updatedItem
              localStorage.setItem('trove_scan_history', JSON.stringify(nextHistory))
              return nextHistory
            }
            return prevHistory
          })

          // Stop polling if draft is generated or step failed
          const hasFailedCheck = data.steps.some((s) => s.status === 'failed')
          if (data.draft || hasFailedCheck) {
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
  }, [caseId, scanHistory])

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
          
          setScanHistory(prevHistory => {
            const index = prevHistory.findIndex(h => h.caseId === caseId)
            if (index !== -1) {
              const updatedItem = {
                ...prevHistory[index],
                status: data.draft ? 'completed' as const : 'scanning' as const,
                updatedAt: Date.now(),
                caseState: data
              }
              const nextHistory = [...prevHistory]
              nextHistory[index] = updatedItem
              localStorage.setItem('trove_scan_history', JSON.stringify(nextHistory))
              return nextHistory
            }
            return prevHistory
          })
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(`Approval failed: ${errData.error || res.statusText || res.status}`)
      }
    } catch (err: any) {
      alert(`Network error during approval: ${err?.message || err}`)
    } finally {
      setIsApproving(false)
    }
  }

  const copyDraft = async () => {
    if (!caseState?.draft) return
    const payload = JSON.stringify(caseState.draft.itr1, null, 2)
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload)
    }
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
  const failedStep = caseState?.steps.find((s) => s.status === 'failed')
  const analysis = caseState?.analysis
  const ledger = analysis?.tdsEntries ?? []
  const refundAmount = analysis?.refundEstimate ?? caseState?.draft?.refundAmount ?? 0
  const formattedRefund = `₹${refundAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  const uniqueSections = Array.from(new Set(ledger.map((e) => e.section))).filter(Boolean).join(', ')

  return (
    <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
        
        {/* Left column: Sidebar / Vault List */}
        <div className="flex flex-col gap-6 lg:border-r lg:border-white/[0.06] lg:pr-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#F0EDE6]/40">Scan Vault</span>
            {scanHistory.length > 0 && (
              <span className="font-mono text-[9px] text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded font-bold">
                {scanHistory.length} Audits
              </span>
            )}
          </div>

          <button
            onClick={() => startCase()}
            disabled={isStarting}
            className="group flex items-center justify-center gap-2 border border-primary text-primary hover:bg-primary hover:text-black font-mono font-black uppercase tracking-wider text-xs px-4 py-3.5 transition-all shadow-[0_4px_15px_rgba(237,70,45,0.05)] hover:shadow-[0_4px_25px_rgba(237,70,45,0.25)] disabled:opacity-50 cursor-pointer w-full"
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
          >
            {isStarting ? (
              <Loader2 className="animate-spin" size={12} />
            ) : (
              <span>✕ START NEW SCAN</span>
            )}
          </button>

          <div className="flex flex-col gap-3 max-h-[300px] lg:max-h-[600px] overflow-y-auto pr-1 select-none">
            {scanHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 rounded-2xl border border-white/[0.04] bg-[#0c0c0c]/50 text-center px-4">
                <span className="text-xs text-[#F0EDE6]/30 font-light">No audits compiled yet.</span>
              </div>
            ) : (
              scanHistory.map((item) => {
                const isActive = caseId === item.caseId
                const statusLabel = 
                  item.status === 'scanning' ? 'Scanning' :
                  item.status === 'awaiting-approval' ? 'Awaiting Approval' :
                  item.status === 'completed' ? 'Drafted' : 'Failed'

                return (
                  <div
                    key={item.caseId}
                    onClick={() => {
                      setCaseId(item.caseId)
                      setCaseState(item.caseState)
                    }}
                    className={`flex flex-col gap-2 rounded-xl border p-4 cursor-pointer transition-all ${
                      isActive 
                        ? 'border-primary/50 bg-[#120c0b] shadow-[0_0_15px_rgba(237,70,45,0.05)]' 
                        : 'border-white/[0.08] bg-[#0c0c0c] hover:border-white/[0.16] hover:bg-white/[0.01]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm text-[#F0EDE6] truncate">{item.taxpayerName}</span>
                      <span className="font-mono text-[9px] text-[#F0EDE6]/40 shrink-0">#{item.caseId.slice(0, 8)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs font-bold text-primary font-mono">{item.estimate}</span>
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 ${
                        item.status === 'scanning' ? 'text-amber-400 border border-amber-400/20 bg-amber-400/5 animate-pulse' :
                        item.status === 'awaiting-approval' ? 'text-primary border border-primary/20 bg-primary/5' :
                        item.status === 'completed' ? 'text-emerald-400 border border-emerald-400/20 bg-emerald-400/5' :
                        'text-red-400 border border-red-400/20 bg-red-400/5'
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right column: Workspace */}
        <div className="min-w-0 flex flex-col justify-start">
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
                    ✕ DEMO DIGILOCKER GATEWAY
                  </div>
                  <h2 className="text-3xl font-medium tracking-tight text-[#F0EDE6] sm:text-4xl md:text-5xl">
                    Ready to reclaim your tax refund, <span className="font-serif italic font-light text-primary">{session?.user?.name?.split(' ')[0]}*</span>
                  </h2>
                  <p className="text-sm text-[#F0EDE6]/60 sm:text-base font-light" style={{ lineHeight: 1.5 }}>
                    Trove connects to a mocked Setu and DigiLocker path. We scan the demo TDS ledger and build an ITR-1-style draft automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
                  <div className="flex flex-col gap-2 rounded-2xl bg-[#050505] p-6 border border-white/[0.06]">
                    <span className="text-xs text-primary font-mono uppercase tracking-wider font-semibold">Estimated Refund Available</span>
                    <span className="text-3xl font-bold text-[#F0EDE6] tracking-tight font-sans">₹15,000 – ₹1,12,000</span>
                    <span className="text-[10px] text-[#F0EDE6]/30 font-light">Typical gig worker refund average</span>
                  </div>
                  <div className="flex flex-col gap-2 rounded-2xl bg-[#050505] p-6 border border-white/[0.06]">
                    <span className="text-xs text-[#F0EDE6]/50 font-mono uppercase tracking-wider font-semibold">Portfolio Mode</span>
                    <span className="text-3xl font-bold text-primary tracking-tight font-sans">10 Persona Mock</span>
                    <span className="text-[10px] text-[#F0EDE6]/30 font-light">No real taxpayer data or filing</span>
                  </div>
                </div>

                <button
                  onClick={() => startCase()}
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
                  <span className="text-[10px] uppercase tracking-wider text-primary font-mono">Case Tracking #{caseId?.slice(0, 8)}</span>
                  <h2 className="text-2xl font-medium text-[#F0EDE6] sm:text-3xl">Recovering Your Unclaimed Withholding</h2>
                </div>

                {/* Steps timeline list */}
                <div className="flex flex-col gap-6 rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-6 md:p-8">
                  {['pull-26as', 'parse', 'analyse', 'awaiting-approval', 'draft-itr1'].map((stepName, idx) => {
                    const label = STEP_LABELS[stepName]
                    const status = getStepStatus(stepName) as string
                    const isStepRunning = status === 'running'
                    const isStepFailed = status === 'failed'
                    const isStepDone = status === 'done' || (stepName === 'awaiting-approval' && isCompleted) || (stepName === 'pull-26as' && getStepStatus('parse') !== 'pending')
                    return (
                      <div key={stepName} className="relative flex gap-4 md:gap-6">
                        {/* Line connector */}
                        {idx < 4 && (
                          <div
                            className={`absolute bottom-[-1.5rem] left-[15px] top-[28px] w-[2px] transition-colors duration-500 ${
                              isStepDone ? 'bg-primary' : isStepFailed ? 'bg-red-500/40' : 'bg-white/[0.08]'
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
                          ) : isStepFailed ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 text-red-300">
                              <AlertCircle size={12} />
                            </div>
                          ) : (
                            <div className={`h-3 w-3 rounded-full transition-colors duration-500 ${status === 'active' ? 'bg-primary scale-125 shadow-[0_0_10px_rgba(237,70,45,0.5)]' : 'bg-white/[0.12]'}`} />
                          )}
                        </div>

                        {/* Label contents */}
                        <div className="flex flex-col gap-1 py-1">
                          <span
                            className={`text-sm font-semibold transition-colors duration-500 ${
                              isStepDone ? 'text-primary' : isStepFailed ? 'text-red-300' : status === 'active' ? 'text-[#F0EDE6]' : 'text-[#F0EDE6]/30'
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

                {failedStep && (
                  <div className="flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4 text-sm text-red-100">
                    <AlertCircle className="mt-0.5 shrink-0 text-red-400" size={16} />
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-300">
                        {failedStep.name} failed
                      </span>
                      <span className="text-xs text-red-100/70">
                        {failedStep.error || 'The local demo service did not return a valid response. Check that the Go backend is running on :8787.'}
                      </span>
                    </div>
                  </div>
                )}

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
                        {formattedRefund} <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold">refundable balance</span>
                      </div>
                      {analysis?.summary && (
                        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 text-xs font-serif italic text-primary/80">
                          &ldquo;{analysis.summary}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F0EDE6]/50">TDS Withholding Ledger</span>
                      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#050505]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/[0.08] bg-[#0c0c0c] text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-[#F0EDE6]/40">
                              <th className="p-3 sm:p-4 font-medium">Deductor / Employer</th>
                              <th className="p-3 sm:p-4 font-medium hidden sm:table-cell">TAN ID</th>
                              <th className="p-3 sm:p-4 font-medium">Section</th>
                              <th className="p-3 sm:p-4 font-medium text-right">TDS Paid</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04] text-[11px] sm:text-xs text-[#F0EDE6]/80 font-light">
                            {ledger.map((row, index) => (
                              <tr key={row.tan ?? `${row.deductor}-${index}`} className="hover:bg-white/[0.01] transition-colors">
                                <td className="p-3 sm:p-4 font-medium truncate max-w-[130px] sm:max-w-none" title={row.deductor}>{row.deductor}</td>
                                <td className="p-3 sm:p-4 font-mono text-[#F0EDE6]/40 hidden sm:table-cell">{row.tan ?? 'N/A'}</td>
                                <td className="p-3 sm:p-4 text-[#F0EDE6]/60">{row.section}</td>
                                <td className="p-3 sm:p-4 font-semibold text-right text-primary">₹{row.amount.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-6">
                      <p className="text-xs text-[#F0EDE6]/40 leading-relaxed font-light">
                        By clicking Approve, you authorize the Trove demo agent to draft an ITR-1-style JSON file with these mocked ledger entries.
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
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col gap-0 rounded-3xl border border-primary/20 bg-[#0c0c0c] overflow-hidden shadow-[0_30px_80px_rgba(237,70,45,0.04)]"
                  >
                    {/* Hero header zone — generous breathing room */}
                    <div className="relative px-8 pt-10 pb-8 md:px-12 md:pt-14 md:pb-10" style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(237,70,45,0.06), transparent)' }}>
                      {/* Badge */}
                      <div className="border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-400 inline-flex items-center gap-1.5 font-bold mb-6">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        RECOVERY SUCCESS
                      </div>

                      {/* Title — serif italic for elegance, sans for structure */}
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-light text-[#F0EDE6] tracking-tight leading-[1.15]">
                        Your <span className="font-serif italic text-primary font-normal">ITR-1</span> return
                        <br className="hidden sm:block" />
                        {' '}has been drafted.
                      </h3>

                      {/* Hero refund amount — THE centerpiece */}
                      <div className="mt-6 md:mt-8 flex items-baseline gap-3 flex-wrap">
                        <span className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter text-[#F0EDE6] leading-none" style={{ fontFeatureSettings: '"tnum" 1' }}>
                          {formattedRefund}
                        </span>
                        <span className="text-xs sm:text-sm font-mono uppercase tracking-wider text-primary/80 font-semibold self-end mb-1 sm:mb-2">
                          refund claimed
                        </span>
                      </div>

                      {/* Subtle context line */}
                      <p className="mt-4 text-sm md:text-base text-[#F0EDE6]/40 font-light leading-relaxed max-w-lg">
                        Generated from your mocked Setu TDS ledger. This draft is ready for review and download.
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="mx-8 md:mx-12 h-px bg-gradient-to-r from-primary/20 via-white/[0.06] to-transparent" />

                    {/* Stats grid — larger numbers, clearer hierarchy */}
                    <div className="grid grid-cols-3 px-8 py-7 md:px-12 md:py-9">
                      {/* TDS Entries */}
                      <div className="flex flex-col gap-1.5">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#F0EDE6]/30">TDS Entries</span>
                        <span className="text-3xl sm:text-4xl font-bold text-[#F0EDE6] tracking-tight leading-none" style={{ fontFeatureSettings: '"tnum" 1' }}>
                          {ledger.length || caseState?.draft?.itr1?.tds_entries?.length || 5}
                        </span>
                        <span className="text-[10px] text-[#F0EDE6]/25 font-light">withholding records</span>
                      </div>
                      {/* Sections */}
                      <div className="flex flex-col gap-1.5 border-l border-white/[0.06] pl-6 sm:pl-8">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#F0EDE6]/30">Sections</span>
                        <span className="text-lg sm:text-2xl font-bold font-mono text-[#F0EDE6] tracking-tight leading-none mt-1" title={uniqueSections || '194J, 194C'}>
                          {uniqueSections || '194J, 194C'}
                        </span>
                        <span className="text-[10px] text-[#F0EDE6]/25 font-light">tax deduction codes</span>
                      </div>
                      {/* Status */}
                      <div className="flex flex-col gap-1.5 border-l border-white/[0.06] pl-6 sm:pl-8">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#F0EDE6]/30">ITR-1 Status</span>
                        <span className="text-lg sm:text-2xl font-black text-emerald-400 flex items-center gap-2 leading-none mt-1">
                          <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <Check size={10} strokeWidth={3} />
                          </span>
                          Drafted
                        </span>
                        <span className="text-[10px] text-[#F0EDE6]/25 font-light">ready to file</span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-8 md:mx-12 h-px bg-white/[0.04]" />

                    {/* JSON Codeblock display */}
                    <div className="mx-8 md:mx-12 my-6 md:my-8 relative rounded-xl border border-white/[0.08] bg-[#050505] p-5 font-mono text-[10px] leading-relaxed text-[#F0EDE6]/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
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
                      <div className="flex items-center gap-2 text-[#F0EDE6]/25 mb-3 border-b border-white/[0.04] pb-2.5">
                        <FileJson size={10} />
                        <span className="tracking-wide">itr1_draft.json</span>
                      </div>
                      <pre className="overflow-x-auto max-h-60 text-left">
                        {JSON.stringify(caseState?.draft?.itr1, null, 2)}
                      </pre>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3 sm:flex-row px-8 pb-8 md:px-12 md:pb-10">
                      <button
                        onClick={downloadDraft}
                        className="flex flex-1 items-center justify-center gap-2.5 bg-primary text-black text-xs font-mono font-black uppercase tracking-wider px-6 py-4 hover:bg-primary/90 transition-all cursor-pointer shadow-[0_4px_20px_rgba(237,70,45,0.15)]"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                      >
                        <Download size={14} strokeWidth={2.5} /> Download ITR-1 File
                      </button>
                      <button
                        onClick={() => {
                          setCaseId(null)
                          setCaseState(null)
                        }}
                        className="flex flex-1 items-center justify-center gap-2 border border-white/10 bg-white/[0.02] text-[#F0EDE6]/70 text-xs font-mono font-bold uppercase tracking-wider px-6 py-4 hover:bg-white/[0.05] hover:text-[#F0EDE6] transition-all cursor-pointer"
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

      </div>
    </div>
  )
}
