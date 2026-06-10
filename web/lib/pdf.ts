// extracts text from a pdf in the browser, unlocking it if needed
import type { TextItem } from 'pdfjs-dist/types/src/display/api'

type PdfjsModule = typeof import('pdfjs-dist')
let pdfjsPromise: Promise<PdfjsModule> | null = null

async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()
      return pdfjsLib
    })
  }
  return pdfjsPromise
}

export class PasswordRequiredError extends Error {
  constructor(public incorrect: boolean) {
    super(incorrect ? 'Incorrect password' : 'This PDF is password-protected')
    this.name = 'PasswordRequiredError'
  }
}

export async function extractPdfText(file: File, password?: string): Promise<string> {
  const pdfjsLib = await loadPdfjs()
  const data = new Uint8Array(await file.arrayBuffer())
  let doc
  try {
    doc = await pdfjsLib.getDocument({ data, password }).promise
  } catch (e: unknown) {
    const err = e as { name?: string; code?: number }
    if (err?.name === 'PasswordException') {
      throw new PasswordRequiredError(err.code === 2)
    }
    throw e
  }

  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pages.push(reconstructLines(content.items.filter((it): it is TextItem => 'str' in it)))
  }
  return pages.join('\n')
}

function reconstructLines(items: TextItem[]): string {
  const rows = new Map<number, { x: number; s: string }[]>()
  for (const it of items) {
    if (!it.str) continue
    const y = Math.round(it.transform[5] / 2) * 2
    const x = it.transform[4]
    const row = rows.get(y) ?? []
    row.push({ x, s: it.str })
    rows.set(y, row)
  }

  const ys = [...rows.keys()].sort((a, b) => b - a)
  const lines: string[] = []
  for (const y of ys) {
    const cells = rows.get(y)!.sort((a, b) => a.x - b.x)
    let line = ''
    let prevEnd = -Infinity
    for (const c of cells) {
      if (line === '') {
        line = c.s
      } else {
        const gap = c.x - prevEnd
        line += (gap > 15 ? '   ' : c.s.startsWith(' ') || line.endsWith(' ') ? '' : ' ') + c.s
      }
      prevEnd = c.x + c.s.length * 4
    }
    if (line.trim()) lines.push(line)
  }
  return lines.join('\n')
}
