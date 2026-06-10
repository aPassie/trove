// the upload → refund → file-it flow, all client-side
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Download, FileCheck2, Lock, ShieldCheck, Upload, X } from 'lucide-react'
import { extractPdfText, PasswordRequiredError } from '@/lib/pdf'
import { initEngine, analyze, type AnalyzeResult } from '@/lib/engine'
import { num, inr, detectSource, derivePassword, valid, STATE_CODES } from '@/lib/format'

type Doc = { source: 'AIS' | '26AS'; text: string; name: string }

type Personal = {
  dob: string
  fatherName: string
  aadhaar: string
  flat: string
  locality: string
  city: string
  stateCode: string
  pinCode: string
  mobile: string
  email: string
  bankIfsc: string
  bankName: string
  bankAccount: string
}

const MAX_FILE_BYTES = 25 * 1024 * 1024

const CLIP_4 = 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
const CLIP_6 = 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
const CLIP_8 = 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
const CLIP_12 = 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'

function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

function CornerMarks({ tone = 'text-primary/30' }: { tone?: string }) {
  return (
    <>
      <span aria-hidden className={`pointer-events-none absolute left-0 top-0 h-2.5 w-2.5 border-l border-t border-current ${tone}`} />
      <span aria-hidden className={`pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 border-r border-t border-current ${tone}`} />
      <span aria-hidden className={`pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l border-current ${tone}`} />
      <span aria-hidden className={`pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-current ${tone}`} />
    </>
  )
}

function StepMarker({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] font-black tracking-widest text-primary">[ {index} ]</span>
      <span className="h-px flex-1 max-w-[42px] bg-gradient-to-r from-primary/40 to-transparent" />
      <span className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#F0EDE6]/65">{title}</span>
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[#080808] text-[#F0EDE6]">
      {/* atmosphere: blueprint grid fading down + primary bloom + film grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(240,237,230,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(240,237,230,0.022) 1px, transparent 1px)',
          backgroundSize: '36px 36px'
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px]"
        style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 0%, rgba(237,70,45,0.06), transparent)' }}
      />
      <div aria-hidden className="bg-noise pointer-events-none fixed inset-0 -z-10 opacity-30 mix-blend-soft-light" />

      <nav className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#080808]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <a href="/" className="font-serif text-2xl font-bold text-[#F0EDE6]">
            trove<span className="text-primary">*</span>
          </a>
          <span className="hidden sm:flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#F0EDE6]/70">
            <Lock size={11} className="text-primary/60" />
            runs entirely in your browser
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        {children}

        <style jsx global>{`
          .trove-input {
            width: 100%;
            background: #0c0c0c;
            border: 1px solid rgba(240, 237, 230, 0.12);
            padding: 0.625rem 0.75rem;
            color: #f0ede6;
            font-size: 0.875rem;
            color-scheme: dark;
            clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .trove-input:focus {
            outline: none;
            border-color: rgba(237, 70, 45, 0.5);
            box-shadow: 0 0 0 3px rgba(237, 70, 45, 0.08);
          }
          .trove-input-bad,
          .trove-input-bad:focus {
            border-color: rgba(248, 113, 113, 0.55);
            box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.08);
          }
        `}</style>

        {/* status rail — the quiet receipt that nothing was sent anywhere */}
        <div className="mt-14 flex items-center justify-between border-t border-white/[0.05] pt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-[#F0EDE6]/60">
          <span>engine · go → wasm</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-emerald-400/80 animate-pulse" />
            0 bytes uploaded
          </span>
        </div>
      </div>
    </div>
  )
}

export function UploadFlow() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pwIncorrect, setPwIncorrect] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [ageBand, setAgeBand] = useState('below60')
  const [regime, setRegime] = useState('')
  const [sec80C, setSec80C] = useState('')
  const [sec80D, setSec80D] = useState('')
  const [advanceTax, setAdvanceTax] = useState('')

  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [computing, setComputing] = useState(false)
  const [knownDob, setKnownDob] = useState('') // remembered from the pdf unlock so we don't ask twice

  useEffect(() => {
    initEngine().catch(() => {})
  }, [])

  const has26AS = docs.some((d) => d.source === '26AS')
  const ais = docs.find((d) => d.source === 'AIS')

  async function ingest(file: File, password?: string) {
    if (file.size > MAX_FILE_BYTES) {
      setError('That file is too large — AIS/26AS downloads are usually under a few MB.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')
      const text = isJson ? await file.text() : await extractPdfText(file, password)
      if (!text.trim()) {
        setError('That file looks empty or is a scanned image — download the digital AIS/26AS from the portal instead.')
        return
      }
      const source = detectSource(text)
      setDocs((prev) => [...prev.filter((d) => d.source !== source), { source, text, name: file.name }])
      setPendingFile(null)
      setPwIncorrect(false)
    } catch (e) {
      if (e instanceof PasswordRequiredError) {
        setPendingFile(file)
        setPwIncorrect(e.incorrect)
      } else {
        setError('Could not read that file. Make sure it’s your AIS or Form 26AS download (PDF or JSON).')
      }
    } finally {
      setBusy(false)
    }
  }

  function questionnaire(personal?: Personal) {
    return {
      ageBand,
      regime,
      deductions: { sec80C: num(sec80C), sec80D: num(sec80D) },
      advanceTaxPaid: num(advanceTax),
      ...(personal ? { personal } : {})
    }
  }

  async function computeRefund() {
    const f26 = docs.find((d) => d.source === '26AS')?.text ?? ''
    const primary = f26 || ais?.text || ''
    setComputing(true)
    setError('')
    try {
      const out = await analyze(primary, ais?.text ?? '', questionnaire())
      if (out.error) setError(out.error)
      else setResult(out)
    } catch (e) {
      const offline = e instanceof Error && /failed|fetch|network|initialise/i.test(e.message)
      setError(offline
        ? 'The tax engine couldn’t load — check your connection and retry.'
        : 'Something went wrong computing your refund. Please retry.')
    } finally {
      setComputing(false)
    }
  }

  // re-draft with the user's real details — same local engine run, just richer input
  async function refine(personal: Personal): Promise<boolean> {
    const f26 = docs.find((d) => d.source === '26AS')?.text ?? ''
    const primary = f26 || ais?.text || ''
    try {
      const out = await analyze(primary, ais?.text ?? '', questionnaire(personal))
      if (out.error || !out.result) return false
      setResult(out)
      return true
    } catch {
      return false
    }
  }

  if (result?.result) return <RefundReveal result={result} onRefine={refine} prefillDob={knownDob} onReset={() => setResult(null)} />

  return (
    <PageShell>
      <div className="space-y-9">
        <header className="flex flex-col gap-4">
          <StepMarker index="01" title="Your statement" />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            See what the tax department{' '}
            <span className="font-serif italic font-bold text-primary">owes you.</span>
          </h1>
          <p className="text-sm leading-relaxed text-[#F0EDE6]/75 font-light">
            Upload your AIS or Form 26AS. Everything is processed <strong className="text-[#F0EDE6]/85 font-semibold">in your browser</strong> — your
            file, PAN, and numbers never leave your device. No account needed to see your refund.
          </p>
        </header>

        <GetPdfGuide />

        <section className="space-y-3">
          <FileDrop label="Drop your AIS or Form 26AS here" busy={busy} onFile={(f) => ingest(f)} />
          {docs.map((d) => (
            <div key={d.source} className="flex items-center gap-2.5 border border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-2" style={{ clipPath: CLIP_6 }}>
              <FileCheck2 size={13} className="shrink-0 text-emerald-400" />
              <span className="font-mono text-[10px] font-black uppercase tracking-wider text-emerald-400">{d.source}</span>
              <span className="truncate font-mono text-[11px] text-[#F0EDE6]/65">{d.name}</span>
              <button
                type="button"
                aria-label={`Remove ${d.source} — ${d.name}`}
                onClick={() => {
                  setDocs((prev) => prev.filter((x) => x.source !== d.source))
                  setError('')
                }}
                className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center text-[#F0EDE6]/70 transition hover:bg-red-400/10 hover:text-red-400"
                style={{ clipPath: CLIP_4 }}
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {error && <p className="border border-red-400/25 bg-red-400/[0.05] px-3 py-2.5 text-sm text-red-400" style={{ clipPath: CLIP_6 }}>{error}</p>}
        </section>

        <section className="space-y-5">
          <StepMarker index="02" title="A few details" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Your age"
              hint="As on 31 March 2026. The tax office gives 60+ a bigger tax-free slice (under the old regime), so this can change your refund."
            >
              <Segmented
                value={ageBand}
                onChange={setAgeBand}
                options={[
                  { value: 'below60', label: 'Below 60' },
                  { value: 'senior', label: '60–80' },
                  { value: 'super_senior', label: '80+' }
                ]}
              />
            </Field>
            <Field
              label="Tax regime"
              hint={
                regime === 'new'
                  ? 'Lower tax rates, but investments like 80C / 80D won’t reduce your tax.'
                  : regime === 'old'
                    ? 'Higher rates, but your 80C / 80D investments below cut your taxable income.'
                    : 'India taxes you one of two ways — we calculate both and pick whichever leaves you more money. Leave this on Auto unless you know you want one.'
              }
            >
              <Segmented
                value={regime}
                onChange={setRegime}
                options={[
                  { value: '', label: 'Auto' },
                  { value: 'new', label: 'New' },
                  { value: 'old', label: 'Old' }
                ]}
              />
            </Field>
            <Field
              label="80C investments — optional"
              hint="What you put into PPF, ELSS, LIC, EPF or home-loan principal this year. Counts up to ₹1.5L, old regime only."
            >
              <MoneyInput label="80C investments in rupees" value={sec80C} onChange={setSec80C} />
            </Field>
            <Field
              label="80D health insurance — optional"
              hint="Health insurance premiums you paid for yourself or family. Old regime only."
            >
              <MoneyInput label="80D health insurance in rupees" value={sec80D} onChange={setSec80D} />
            </Field>
            <Field
              label="Advance tax already paid — optional"
              hint="Tax you deposited yourself during the year (challan 280). If clients’ TDS was your only tax, leave this at 0."
            >
              <MoneyInput label="Advance tax already paid in rupees" value={advanceTax} onChange={setAdvanceTax} />
            </Field>
          </div>
        </section>

        <PrimaryButton onClick={computeRefund} disabled={!(has26AS || ais) || computing}>
          {computing ? 'Computing in your browser…' : 'See my refund'}
          {!computing && <ArrowRight size={15} strokeWidth={3} className="transition-transform duration-200 group-hover:translate-x-1" />}
        </PrimaryButton>

        {pendingFile && (
          <UnlockModal
            incorrect={pwIncorrect}
            busy={busy}
            onCancel={() => setPendingFile(null)}
            onUnlock={(pw, dob) => {
              if (dob) setKnownDob(dob)
              ingest(pendingFile, pw)
            }}
          />
        )}
      </div>
    </PageShell>
  )
}

function PrimaryButton({
  onClick,
  disabled,
  children
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden bg-primary px-7 py-4 font-mono text-xs font-black uppercase tracking-wider text-black transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ clipPath: CLIP_8 }}
    >
      {/* shine sweep */}
      <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#F0EDE6]/75">{label}</span>
      {children}
      {hint && <p className="text-xs leading-relaxed text-[#F0EDE6]/70 font-light">{hint}</p>}
    </div>
  )
}

function Segmented({
  value,
  onChange,
  options
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 border border-white/[0.12] bg-[#0c0c0c] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" style={{ clipPath: CLIP_6 }}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`relative px-2 py-2 font-mono text-[10px] font-black uppercase tracking-wider transition ${
              active
                ? 'bg-primary text-black shadow-[0_2px_14px_rgba(237,70,45,0.35)]'
                : 'text-[#F0EDE6]/75 hover:bg-white/[0.05] hover:text-[#F0EDE6]/90'
            }`}
            style={{ clipPath: CLIP_4 }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center border border-white/[0.12] bg-[#0c0c0c] transition focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(237,70,45,0.08)]"
      style={{ clipPath: CLIP_6 }}
    >
      <span className="pl-3 font-mono text-xs text-[#F0EDE6]/65">₹</span>
      <input
        aria-label={label}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full bg-transparent px-2.5 py-2.5 text-sm text-[#F0EDE6] outline-none placeholder:text-[#F0EDE6]/60 tabular-nums"
      />
    </div>
  )
}

function FileDrop({ label, busy, onFile }: { label: string; busy: boolean; onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false)
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onFile(f)
      }}
      className={`group relative flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed p-10 text-center transition duration-200 ${
        drag
          ? 'border-primary/70 bg-primary/[0.05]'
          : 'border-white/15 bg-[#0c0c0c]/60 hover:border-primary/40 hover:bg-primary/[0.02]'
      }`}
    >
      <CornerMarks tone={drag ? 'text-primary' : 'text-primary/30 group-hover:text-primary/60'} />
      <span
        className={`flex h-11 w-11 items-center justify-center border text-primary transition duration-200 ${
          drag ? 'scale-110 border-primary/50 bg-primary/[0.16]' : 'border-primary/20 bg-primary/[0.08] group-hover:bg-primary/[0.14]'
        }`}
        style={{ clipPath: CLIP_6 }}
      >
        <Upload size={16} />
      </span>
      <span className="text-sm text-[#F0EDE6]/85">
        {busy ? 'Reading…' : drag ? 'Let go — we’ll read it right here' : label}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#F0EDE6]/65">
        or click to browse · PDF or JSON · parsed locally
      </span>
      <input
        type="file"
        accept="application/pdf,application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.currentTarget.value = ''
        }}
      />
    </label>
  )
}

function UnlockModal({
  incorrect,
  busy,
  onCancel,
  onUnlock
}: {
  incorrect: boolean
  busy: boolean
  onCancel: () => void
  onUnlock: (password: string, dob?: string) => void
}) {
  const [mode, setMode] = useState<'pandob' | 'password'>('pandob')
  const [pan, setPan] = useState('')
  const [dob, setDob] = useState('')
  const [password, setPassword] = useState('')

  const panOk = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(pan)
  const canSubmit = mode === 'pandob' ? panOk && dob.length === 10 : password.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md space-y-4 border border-primary/20 bg-[#0c0c0c] p-6 sm:p-7 text-[#F0EDE6] shadow-[0_24px_80px_rgba(237,70,45,0.08)]"
        style={{ clipPath: CLIP_12 }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/20 bg-primary/[0.08] text-primary" style={{ clipPath: CLIP_6 }}>
            <Lock size={16} />
          </div>
          <div>
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-primary">Locked PDF</span>
            <h2 className="text-lg font-bold tracking-tight">This file is locked by the Income Tax Department</h2>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[#F0EDE6]/75 font-light">
          Your AIS/26AS PDF is password-protected. The password is simply your <strong className="text-[#F0EDE6]/85 font-semibold">PAN + date of
          birth</strong> — tell us those and we’ll open it.
        </p>
        <p className="border-l-2 border-primary/40 bg-primary/[0.03] py-2 pl-3 text-xs leading-relaxed text-[#F0EDE6]/65">
          We use your PAN and date of birth <strong className="text-[#F0EDE6]/85">only to unlock this PDF, right here in your
          browser</strong>. They are never sent to or stored on any server.
        </p>
        {incorrect && <p className="text-sm text-red-400">That didn’t open it — double-check your date of birth, or enter the password directly.</p>}

        {mode === 'pandob' ? (
          <div className="space-y-3">
            <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder="PAN (ABCDE1234F)" maxLength={10} className="trove-input" />
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#F0EDE6]/65">
              Date of birth
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="trove-input mt-1.5" />
            </label>
            <button
              onClick={() => onUnlock(derivePassword(pan, dob), dob)}
              disabled={!canSubmit || busy}
              className="w-full bg-primary px-4 py-3 font-mono text-xs font-black uppercase tracking-wider text-black transition hover:bg-primary/90 disabled:opacity-40"
              style={{ clipPath: CLIP_6 }}
            >
              {busy ? 'Unlocking…' : 'Unlock'}
            </button>
            <button onClick={() => setMode('password')} className="w-full text-xs text-[#F0EDE6]/65 underline underline-offset-2 hover:text-[#F0EDE6]/85 transition">
              Know the password already? Enter it directly
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="PDF password" className="trove-input" />
            <p className="text-xs text-[#F0EDE6]/60">Format: PAN in lowercase + DOB as DDMMYYYY — e.g. <code className="font-mono text-[#F0EDE6]/70">abcde1234f01011990</code></p>
            <button
              onClick={() => onUnlock(password)}
              disabled={!canSubmit || busy}
              className="w-full bg-primary px-4 py-3 font-mono text-xs font-black uppercase tracking-wider text-black transition hover:bg-primary/90 disabled:opacity-40"
              style={{ clipPath: CLIP_6 }}
            >
              {busy ? 'Unlocking…' : 'Unlock'}
            </button>
            <button onClick={() => setMode('pandob')} className="w-full text-xs text-[#F0EDE6]/65 underline underline-offset-2 hover:text-[#F0EDE6]/85 transition">
              Use PAN + date of birth instead
            </button>
          </div>
        )}
        <button onClick={onCancel} className="w-full text-xs text-[#F0EDE6]/70 hover:text-[#F0EDE6]/70 transition">Cancel</button>
      </motion.div>
    </div>
  )
}

function GetPdfGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-white/[0.08] bg-[#0c0c0c]/60" style={{ clipPath: CLIP_8 }}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm text-[#F0EDE6]/85 transition hover:text-[#F0EDE6]">
        <span>Don’t have your AIS / 26AS? Here’s the 30-second way to get it</span>
        <ChevronDown size={15} className={`shrink-0 text-primary/70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-white/[0.08] px-4 py-4 text-sm leading-relaxed text-[#F0EDE6]/75 font-light">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Open{' '}
              <a href="https://www.incometax.gov.in/iec/foportal/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                incometax.gov.in
              </a>{' '}
              and log in (tip: <strong className="text-[#F0EDE6]/90 font-semibold">“Login with Aadhaar OTP”</strong> — no password to remember).
            </li>
            <li>Go to <strong className="text-[#F0EDE6]/90 font-semibold">Services → AIS</strong> → click <strong className="text-[#F0EDE6]/90 font-semibold">Proceed</strong>.</li>
            <li>Pick the year, click the <strong className="text-[#F0EDE6]/90 font-semibold">AIS</strong> tile → <strong className="text-[#F0EDE6]/90 font-semibold">Download</strong> → choose <strong className="text-[#F0EDE6]/90 font-semibold">JSON</strong> (most reliable) or PDF.</li>
            <li>Come back here and upload it. JSON works instantly; a PDF we’ll auto-unlock for you.</li>
          </ol>
          <p className="pt-1 text-xs text-[#F0EDE6]/60">On a phone? The official “AIS for Taxpayer” app is easier. No portal access? Many banks show Form 26AS under net banking → “Tax Credit”.</p>
        </div>
      )}
    </div>
  )
}

function RefundReveal({
  result,
  onRefine,
  prefillDob,
  onReset
}: {
  result: AnalyzeResult
  onRefine: (p: Personal) => Promise<boolean>
  prefillDob?: string
  onReset: () => void
}) {
  const r = result.result!
  const draft = result.draft
  const animatedRefund = useCountUp(r.refund)

  if (!r.eligible) {
    return (
      <PageShell>
        <div className="space-y-5">
          <StepMarker index="!" title="Eligibility check" />
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            This one needs a <span className="font-serif italic font-bold text-primary">different form.</span>
          </h1>
          <div className="border border-amber-400/25 bg-amber-400/[0.05] p-4 text-sm leading-relaxed text-amber-200" style={{ clipPath: CLIP_8 }}>
            {draft?.message || r.itrForm.replace('not-eligible:', '')}. You’ll need ITR-3 — for this case we
            recommend a CA. We won’t draft a return we’re not confident is right.
          </div>
          <button onClick={onReset} className="text-sm text-primary underline underline-offset-2">Start over</button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="space-y-7">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative border border-primary/25 bg-primary/[0.04] p-8 text-center shadow-[0_0_80px_rgba(237,70,45,0.06)]"
          style={{ clipPath: CLIP_12 }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(rgba(237,70,45,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(237,70,45,0.04) 1px, transparent 1px)',
              backgroundSize: '12px 12px'
            }}
          />
          <p className="relative font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#F0EDE6]/65">You’re owed</p>
          <p className="relative mt-2 text-5xl sm:text-6xl font-black tracking-tight text-primary tabular-nums">{inr(animatedRefund)}</p>
          <p className="relative mt-3 font-mono text-[10px] uppercase tracking-widest text-[#F0EDE6]/60">
            {r.refund > 0
              ? `Computed in your browser · ${r.chosenRegime} regime`
              : 'No refund this year based on what you uploaded'}
          </p>
        </motion.div>

        <div className="space-y-2">
          <StepMarker index="03" title="Here’s exactly how we got there" />
          <ul className="divide-y divide-white/[0.05] border border-white/[0.08] bg-[#0c0c0c]/60 text-sm" style={{ clipPath: CLIP_8 }}>
            {r.lineItems.map((li, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + i * 0.05, ease: 'easeOut' }}
                className="flex justify-between px-4 py-2.5"
              >
                <span className="text-[#F0EDE6]/75 font-light">{li.label}</span>
                <span className={`font-mono text-xs tabular-nums ${li.amount < 0 ? 'text-emerald-400' : 'text-[#F0EDE6]/85'}`}>{inr(li.amount)}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`relative border p-4 ${r.chosenRegime === 'new' ? 'border-primary/30 bg-primary/[0.03]' : 'border-white/[0.08] bg-[#0c0c0c]/60'}`} style={{ clipPath: CLIP_8 }}>
            {r.chosenRegime === 'new' && <span className="absolute right-3 top-3 font-mono text-[8px] font-black uppercase tracking-widest text-primary">picked</span>}
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#F0EDE6]/60">New regime tax</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{inr(r.taxNewRegime)}</p>
          </div>
          <div className={`relative border p-4 ${r.chosenRegime === 'old' ? 'border-primary/30 bg-primary/[0.03]' : 'border-white/[0.08] bg-[#0c0c0c]/60'}`} style={{ clipPath: CLIP_8 }}>
            {r.chosenRegime === 'old' && <span className="absolute right-3 top-3 font-mono text-[8px] font-black uppercase tracking-widest text-primary">picked</span>}
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#F0EDE6]/60">Old regime tax</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{inr(r.taxOldRegime)}</p>
          </div>
        </div>

        <FileHandoff draft={draft} onRefine={onRefine} prefillDob={prefillDob} />
        <button onClick={onReset} className="w-full text-xs text-[#F0EDE6]/70 hover:text-[#F0EDE6]/70 transition">Start over</button>
      </div>
    </PageShell>
  )
}

function FileHandoff({
  draft,
  onRefine,
  prefillDob
}: {
  draft: AnalyzeResult['draft']
  onRefine: (p: Personal) => Promise<boolean>
  prefillDob?: string
}) {
  const [stage, setStage] = useState<'cta' | 'form' | 'ready'>('cta')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [consent, setConsent] = useState(false)

  // no filing json for this year (e.g. older AY) — explain instead of a download
  if (!draft?.itr4) {
    return draft?.message ? (
      <p className="border border-amber-400/25 bg-amber-400/[0.05] p-3.5 text-sm leading-relaxed text-amber-200" style={{ clipPath: CLIP_8 }}>{draft.message}</p>
    ) : null
  }

  function download() {
    if (!draft?.itr4) return
    const blob = new Blob([JSON.stringify(draft.itr4, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${draft.schema || 'ITR-4'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (stage === 'cta') {
    return (
      <PrimaryButton onClick={() => setStage(draft.placeholders ? 'form' : 'ready')}>
        File this return
        <ArrowRight size={15} strokeWidth={3} className="transition-transform duration-200 group-hover:translate-x-1" />
      </PrimaryButton>
    )
  }

  if (stage === 'form') {
    return (
      <DetailsForm
        prefillDob={prefillDob}
        saving={saving}
        error={formError}
        onBack={() => setStage('cta')}
        onSubmit={async (p) => {
          setSaving(true)
          setFormError('')
          const ok = await onRefine(p)
          setSaving(false)
          if (ok) setStage('ready')
          else setFormError('Could not apply your details — please check them and retry.')
        }}
      />
    )
  }

  return (
    <div className="relative space-y-4 border border-primary/25 bg-[#0c0c0c]/60 p-5" style={{ clipPath: CLIP_12 }}>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
      {!draft.placeholders && (
        <p className="flex items-center gap-2 border border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-emerald-400" style={{ clipPath: CLIP_6 }}>
          <FileCheck2 size={13} /> your details and refund account are on the return
        </p>
      )}
      {draft.message && (
        <p className="border border-amber-400/25 bg-amber-400/[0.05] p-3 text-sm leading-relaxed text-amber-200" style={{ clipPath: CLIP_6 }}>{draft.message}</p>
      )}
      {(draft.ruleViolations?.length ?? 0) > 0 && (
        <div className="space-y-2 border border-amber-400/25 bg-amber-400/[0.05] p-3.5" style={{ clipPath: CLIP_6 }}>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
            The portal will flag these before you can submit
          </p>
          <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-amber-200/90 font-light">
            {draft.ruleViolations!.map((v, i) => (
              <li key={i}>{v.replace(/^rule [^:]+: /, '')}</li>
            ))}
          </ul>
          <p className="text-xs text-amber-200/60">
            You can still download and import this file — fix the items above in the portal’s editor before final submission.
          </p>
        </div>
      )}
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#F0EDE6]/75 font-light">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="sr-only" />
        <span
          aria-hidden
          className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition ${
            consent ? 'border-primary bg-primary text-black' : 'border-white/25 bg-[#0c0c0c]'
          }`}
          style={{ clipPath: CLIP_4 }}
        >
          {consent && <Check size={12} strokeWidth={4} />}
        </span>
        <span>
          I understand Trove <strong className="text-[#F0EDE6]/85 font-semibold">prepared</strong> this return and I am filing it myself. This is a
          preparation tool, not a substitute for a Chartered Accountant.
        </span>
      </label>

      <button
        onClick={download}
        disabled={!consent}
        className="inline-flex w-full items-center justify-center gap-2 bg-emerald-500 px-4 py-3.5 font-mono text-xs font-black uppercase tracking-wider text-black transition hover:bg-emerald-400 disabled:opacity-40"
        style={{ clipPath: CLIP_8 }}
      >
        <Download size={14} strokeWidth={3} />
        Download my ITR-4 JSON
      </button>

      <div className="text-sm leading-relaxed text-[#F0EDE6]/75 font-light">
        <p className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#F0EDE6]/70">
          <ShieldCheck size={12} className="text-primary/70" />
          Then, to file it (≈2 minutes)
        </p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Open the{' '}
            <a href="https://www.incometax.gov.in/iec/foportal/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              e-filing portal
            </a>{' '}
            → <strong className="text-[#F0EDE6]/90 font-semibold">e-File → Income Tax Returns → File Income Tax Return</strong>.
          </li>
          <li>Choose AY <strong className="text-[#F0EDE6]/90 font-semibold">2026-27</strong>, select <strong className="text-[#F0EDE6]/90 font-semibold">Offline / Import JSON</strong>, and upload the file you just downloaded.</li>
          <li>Review the prefilled values, then <strong className="text-[#F0EDE6]/90 font-semibold">Submit</strong>.</li>
          <li><strong className="text-[#F0EDE6]/90 font-semibold">e-Verify</strong> with Aadhaar OTP (one tap) — you have 30 days, but do it now so it’s done.</li>
        </ol>
        <p className="mt-2.5 text-xs text-[#F0EDE6]/60">
          You stay the filer of record — Trove never logs into the portal or files on your behalf.
        </p>
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  ok,
  hint,
  placeholder,
  type = 'text',
  inputMode,
  maxLength,
  upper
}: {
  label: string
  value: string
  onChange: (v: string) => void
  ok: boolean
  hint: string
  placeholder?: string
  type?: string
  inputMode?: 'numeric' | 'email' | 'tel'
  maxLength?: number
  upper?: boolean
}) {
  const [touched, setTouched] = useState(false)
  const bad = touched && !ok
  return (
    <div className="space-y-1.5">
      <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#F0EDE6]/75">{label}</span>
      <input
        aria-label={label}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
        onBlur={() => setTouched(true)}
        className={`trove-input ${bad ? 'trove-input-bad' : ''}`}
      />
      {bad && <p className="text-[11px] text-red-400">{hint}</p>}
    </div>
  )
}

function StateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [touched, setTouched] = useState(false)
  const bad = touched && value === ''
  return (
    <div className="space-y-1.5">
      <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#F0EDE6]/75">State</span>
      <div className="relative">
        <select
          aria-label="State"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          className={`trove-input appearance-none pr-9 ${bad ? 'trove-input-bad' : ''} ${value === '' ? 'text-[#F0EDE6]/70' : ''}`}
        >
          <option value="" disabled>Pick your state</option>
          {STATE_CODES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary/60" />
      </div>
      {bad && <p className="text-[11px] text-red-400">Pick your state — it goes in the address block</p>}
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
        {title}
        <span className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
      </p>
      {children}
    </div>
  )
}

function DetailsForm({
  prefillDob,
  saving,
  error,
  onBack,
  onSubmit
}: {
  prefillDob?: string
  saving: boolean
  error: string
  onBack: () => void
  onSubmit: (p: Personal) => void
}) {
  const [d, setD] = useState<Personal>({
    dob: prefillDob || '',
    fatherName: '',
    aadhaar: '',
    flat: '',
    locality: '',
    city: '',
    stateCode: '',
    pinCode: '',
    mobile: '',
    email: '',
    bankIfsc: '',
    bankName: '',
    bankAccount: ''
  })
  const set = (k: keyof Personal) => (v: string) => setD((p) => ({ ...p, [k]: v }))

  const ok = {
    dob: valid.dob(d.dob),
    fatherName: valid.nonEmpty(d.fatherName),
    aadhaar: valid.aadhaar(d.aadhaar),
    flat: valid.nonEmpty(d.flat),
    locality: valid.nonEmpty(d.locality),
    city: valid.nonEmpty(d.city),
    stateCode: d.stateCode !== '',
    pinCode: valid.pin(d.pinCode),
    mobile: valid.mobile(d.mobile),
    email: valid.email(d.email),
    bankIfsc: valid.ifsc(d.bankIfsc),
    bankName: valid.nonEmpty(d.bankName),
    bankAccount: valid.account(d.bankAccount)
  }
  const allOk = Object.values(ok).every(Boolean)

  return (
    <div className="relative space-y-6 border border-primary/25 bg-[#0c0c0c]/60 p-5 sm:p-6" style={{ clipPath: CLIP_12 }}>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="space-y-2">
        <StepMarker index="04" title="Whose return is this?" />
        <p className="text-sm leading-relaxed text-[#F0EDE6]/75 font-light">
          These go on the return itself — your refund lands in the bank account below, so double-check it.
          Like everything else, this never leaves your browser.
        </p>
      </div>

      <FormSection title="About you">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Date of birth" type="date" value={d.dob} onChange={set('dob')} ok={ok.dob} hint="Enter a valid date of birth" />
          <TextField label="Father’s name" value={d.fatherName} onChange={set('fatherName')} ok={ok.fatherName} hint="Required — it goes in the verification block" placeholder="As on your PAN card" />
          <TextField label="Aadhaar — optional" value={d.aadhaar} onChange={set('aadhaar')} ok={ok.aadhaar} hint="12 digits, or leave it blank" inputMode="numeric" maxLength={12} placeholder="12 digits" />
        </div>
      </FormSection>

      <FormSection title="Address">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Flat / house no." value={d.flat} onChange={set('flat')} ok={ok.flat} hint="Required" placeholder="B-204, Sunrise Apartments" />
          <TextField label="Street / locality" value={d.locality} onChange={set('locality')} ok={ok.locality} hint="Required" placeholder="Indiranagar 2nd Stage" />
          <TextField label="City / town / district" value={d.city} onChange={set('city')} ok={ok.city} hint="Required" placeholder="Bengaluru" />
          <StateField value={d.stateCode} onChange={set('stateCode')} />
          <TextField label="PIN code" value={d.pinCode} onChange={set('pinCode')} ok={ok.pinCode} hint="6 digits, can’t start with 0" inputMode="numeric" maxLength={6} placeholder="560038" />
        </div>
      </FormSection>

      <FormSection title="Contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Mobile" value={d.mobile} onChange={set('mobile')} ok={ok.mobile} hint="10 digits" inputMode="tel" maxLength={10} placeholder="9876543210" />
          <TextField label="Email" value={d.email} onChange={set('email')} ok={ok.email} hint="A real one — the ITR-V acknowledgement goes here" inputMode="email" placeholder="you@example.com" />
        </div>
      </FormSection>

      <FormSection title="Refund account">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="IFSC" value={d.bankIfsc} onChange={set('bankIfsc')} ok={ok.bankIfsc} hint="11 characters, like HDFC0001234" maxLength={11} upper placeholder="HDFC0001234" />
          <TextField label="Bank name" value={d.bankName} onChange={set('bankName')} ok={ok.bankName} hint="Required" placeholder="HDFC Bank" />
          <TextField label="Account number" value={d.bankAccount} onChange={set('bankAccount')} ok={ok.bankAccount} hint="6–20 digits" inputMode="numeric" maxLength={20} placeholder="50100123456789" />
        </div>
        <p className="text-xs leading-relaxed text-[#F0EDE6]/60">
          The Income Tax Department pays your refund into this account — it should be active and linked to your PAN.
        </p>
      </FormSection>

      {error && <p className="border border-red-400/25 bg-red-400/[0.05] px-3 py-2.5 text-sm text-red-400" style={{ clipPath: CLIP_6 }}>{error}</p>}

      <div className="space-y-3">
        <PrimaryButton onClick={() => onSubmit(d)} disabled={!allOk || saving}>
          {saving ? 'Applying locally…' : 'Put these on my return'}
          {!saving && <ArrowRight size={15} strokeWidth={3} className="transition-transform duration-200 group-hover:translate-x-1" />}
        </PrimaryButton>
        <button onClick={onBack} className="w-full text-xs text-[#F0EDE6]/70 hover:text-[#F0EDE6]/70 transition">Back</button>
      </div>
    </div>
  )
}
