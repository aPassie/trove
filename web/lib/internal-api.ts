const BFF_URL = process.env.BFF_URL || 'http://localhost:8789'
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN

export function bffUrl(path: string): string {
  return `${BFF_URL}${path}`
}

export function bffHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra ?? {}) }
  if (INTERNAL_TOKEN) {
    headers['authorization'] = `Bearer ${INTERNAL_TOKEN}`
  }
  return headers
}
