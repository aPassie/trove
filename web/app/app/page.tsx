// app shell — landing screen after sign-in, cases will live here

import { auth } from '@/lib/auth'

export default async function AppHome() {
  const session = await auth()
  return (
    <main className="flex min-h-screen flex-col gap-8 p-8 md:p-12">
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-primary sm:text-xs">signed in as</span>
        <h1 className="text-3xl text-primary">{session?.user?.name ?? 'guest'}</h1>
      </div>
      <p className="text-sm text-gray-400">your cases will live here.</p>
    </main>
  )
}
