import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || 'local_fallback_secret_for_trove_development',
  providers: [
    ...(process.env.AUTH_DEMO_PROVIDER !== 'false'
      ? [
          Credentials({
            id: 'digilocker-demo',
            name: 'digilocker (demo)',
            credentials: {},
            authorize: async () => ({
              id: 'demo-aakash',
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
