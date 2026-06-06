export function isSameOrigin(req: Request): boolean {
  const allowed = process.env.AUTH_URL || 'http://localhost:3000'

  const origin = req.headers.get('origin')
  if (origin) {
    return origin === allowed
  }

  const secFetchSite = req.headers.get('sec-fetch-site')
  if (secFetchSite) {
    return secFetchSite === 'same-origin' || secFetchSite === 'none'
  }

  return false
}
