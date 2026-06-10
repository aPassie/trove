// loads the go wasm tax engine and runs the pipeline in the browser
export type LineItem = { label: string; amount: number }
export type TaxResult = {
  itrForm: string
  eligible: boolean
  presumptiveIncome: number
  grossTotalIncome: number
  chosenRegime: string
  taxOldRegime: number
  taxNewRegime: number
  totalLiability: number
  tdsCredit: number
  tcsCredit: number
  refund: number
  payable: number
  lineItems: LineItem[]
}
export type AnalyzeResult = {
  profile?: any
  result?: TaxResult
  draft?: { schema: string; itr4?: Record<string, unknown>; refundAmount: number; eligible: boolean; placeholders?: boolean; message?: string; validationErrors?: string[]; ruleViolations?: string[] }
  error?: string
}

let initPromise: Promise<void> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.dataset.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export function initEngine(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await loadScript('/wasm_exec.js')
      const Go = (window as any).Go
      if (!Go) throw new Error('wasm_exec.js did not install Go')
      const go = new Go()
      const resp = await fetch('/trove.wasm')
      const bytes = await resp.arrayBuffer()
      const { instance } = await WebAssembly.instantiate(bytes, go.importObject)
      void go.run(instance)
      for (let i = 0; i < 200 && !(window as any).troveAnalyze; i++) {
        await new Promise((r) => setTimeout(r, 10))
      }
      if (!(window as any).troveAnalyze) throw new Error('engine failed to initialise')
    })().catch((e) => {
      initPromise = null
      throw e
    })
  }
  return initPromise
}

export async function analyze(
  form26asText: string,
  aisText: string,
  questionnaire: Record<string, unknown>
): Promise<AnalyzeResult> {
  await initEngine()
  const raw = (window as any).troveAnalyze(form26asText, aisText, JSON.stringify(questionnaire))
  return JSON.parse(raw) as AnalyzeResult
}
