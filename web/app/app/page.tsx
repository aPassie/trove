// app shell — landing screen after sign-in

import { auth, signOut } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard'
import { LogOut, User } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function AppHome() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0a] text-[#F0EDE6]">
      {/* Top Navbar */}
      <header className="flex items-center justify-between border-b border-white/[0.08] bg-[#0a0a0a]/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-serif text-xl font-bold tracking-tight text-[#F0EDE6]">trove<span className="text-primary">*</span></span>
          <span className="border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-primary font-bold">Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0c0c0c] border border-white/[0.08]">
              <User size={12} className="text-primary" />
            </div>
            <span className="text-xs text-[#F0EDE6]/60">{session?.user?.email}</span>
          </div>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/' })
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-2 border border-white/10 bg-black hover:bg-white/[0.04] px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#F0EDE6]/80 transition-all cursor-pointer"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main dashboard content */}
      <div className="flex-1 py-8">
        <Dashboard session={session} />
      </div>
    </main>
  )
}
