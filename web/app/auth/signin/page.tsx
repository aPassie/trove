'use client'

// sign-in page

import { motion } from 'framer-motion'
import { signIn } from 'next-auth/react'
import { ArrowRight } from 'lucide-react'

export default function SignIn() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-24">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full max-w-md flex-col gap-8 rounded-2xl bg-[#101010] p-8 md:rounded-[2rem] md:p-12"
      >
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-primary sm:text-xs">welcome back</span>
          <h1 className="text-2xl text-primary sm:text-3xl">sign in to trove</h1>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => signIn('digilocker-demo', { callbackUrl: '/app' })}
            className="group flex items-center justify-between rounded-full bg-primary px-5 py-3 text-sm font-medium text-black transition-all hover:gap-3"
          >
            <span>continue with digilocker</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110">
              <ArrowRight size={14} className="text-primary" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/app' })}
            className="rounded-full border border-[#212121] px-5 py-3 text-sm text-primary transition-colors hover:bg-[#212121]"
          >
            continue with google
          </button>
        </div>

        <p className="text-xs text-gray-500">digilocker is a demo provider — it signs you in as aakash with sample data.</p>
      </motion.div>
    </main>
  )
}
