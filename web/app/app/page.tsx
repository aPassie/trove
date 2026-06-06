import { auth } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard'
import { UserSessionChip } from '@/components/user-session-chip'
import { SignOutButton } from '@/components/sign-out-button'
import { redirect } from 'next/navigation'

export default async function AppHome() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0a] text-[#F0EDE6]">
      <header className="w-full border-b border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-md shrink-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-2.5">
            <a href="/" className="font-serif text-2xl font-bold text-[#F0EDE6]">
              trove<span className="text-primary">*</span>
            </a>
            <span className="border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-primary font-bold">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 sm:flex">
              <UserSessionChip
                initialName={session?.user?.name || 'Aakash Singh'}
                initialEmail={session?.user?.email || 'aakash@trove.demo'}
              />
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex-1 py-8">
        <Dashboard session={session} />
      </div>
    </main>
  )
}
