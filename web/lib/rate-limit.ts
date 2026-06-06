const hits = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000
const MAX_REQUESTS = 30

export function checkRateLimit(key: string, max = MAX_REQUESTS, windowMs = WINDOW_MS): boolean {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count++
  return entry.count <= max
}

export function getClientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || req.headers.get('x-forwarded-for')?.split(',').pop()?.trim()
    || 'unknown'
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key)
  }
}, 60_000)
