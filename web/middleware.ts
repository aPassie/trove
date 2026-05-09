// guards /app routes — anything inside must be signed in

export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: ['/app/:path*']
}
