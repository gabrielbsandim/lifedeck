'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { AuthDialog } from '@/components/auth-dialog'

export function AccountMenu() {
  const { messages } = useI18n()
  const session = useSession()
  const [authOpen, setAuthOpen] = useState(false)

  const user = session.data
  if (!user) {
    return null
  }

  const registered = !user.isGuest && user.email !== null

  return (
    <>
      {registered ? (
        <Link
          href="/settings"
          className="border-line text-ink-700 hover:bg-bg flex items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-3 text-sm font-medium transition"
        >
          <span className="relative">
            <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
            <span
              className={
                user.isEmailVerified
                  ? 'ring-bg absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2'
                  : 'ring-bg absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2'
              }
              aria-hidden
            />
          </span>
          {user.displayName}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="text-brand-600 hover:text-brand-700 text-sm font-medium"
        >
          {messages.auth.createAccount}
        </button>
      )}

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
