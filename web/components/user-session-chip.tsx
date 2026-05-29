'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

type UserSessionChipProps = {
  initialName: string
  initialEmail: string
}

export function UserSessionChip({ initialName, initialEmail }: UserSessionChipProps) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)

  useEffect(() => {
    const handleCaseChange = (event: Event) => {
      const customEvent = event as CustomEvent
      const taxpayerName = customEvent.detail?.taxpayerName || initialName
      setName(taxpayerName)
      
      const firstWord = taxpayerName.toLowerCase().replace(/[^a-z]/g, '')
      setEmail(firstWord ? `${firstWord}@trove.demo` : initialEmail)
    }

    window.addEventListener('trove-active-case-changed', handleCaseChange)
    return () => {
      window.removeEventListener('trove-active-case-changed', handleCaseChange)
    }
  }, [initialName, initialEmail])

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0c0c0c] border border-white/[0.08]">
        <User size={12} className="text-primary" />
      </div>
      <span className="text-xs text-[#F0EDE6]/60 font-mono transition-all duration-300" title={name}>
        {email}
      </span>
    </div>
  )
}
