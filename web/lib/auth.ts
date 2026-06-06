import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

const secret = process.env.AUTH_SECRET
if (!secret) {
  throw new Error('AUTH_SECRET is not set — refusing to start with an insecure signing key')
}

const demoEnabled = process.env.AUTH_DEMO_PROVIDER === 'true'

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret,
  trustHost: true,
  providers: [
    ...(demoEnabled
      ? [
          Credentials({
            id: 'digilocker-demo',
            name: 'digilocker (demo)',
            credentials: {},
            authorize: async () => ({
              id: `demo-${crypto.randomUUID()}`,
              name: 'Aakash Singh',
              email: 'aakash@trove.demo'
            })
          })
        ]
      : [])
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/app')
      const isOnSignIn = nextUrl.pathname === '/auth/signin'

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false
      }

      if (isOnSignIn && isLoggedIn) {
        return Response.redirect(new URL('/app', nextUrl))
      }

      return true
    }
  }
})
