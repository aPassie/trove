'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const handleSignOut = async () => {
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('trove_scan_history')) keys.push(k)
      }
      keys.forEach((k) => localStorage.removeItem(k))
    } catch {
      void 0
    }
    await signOut({ callbackUrl: '/' })
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex items-center gap-2 border border-white/10 bg-black hover:bg-white/[0.04] px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-[#F0EDE6]/80 transition-all cursor-pointer"
      style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
    >
      <LogOut size={12} />
      <span>Sign Out</span>
    </button>
  )
}
