// auth — google for real sign-in, a digilocker stub for the demo persona

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
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
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' }
})
