import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    ...(process.env.AUTH_DEMO_PROVIDER === 'true'
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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/app')
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false
      }
      return true
    }
  }
})
