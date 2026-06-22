'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { AuthDialog } from '@/components/auth-dialog'
import { AccountDialog } from '@/components/account-dialog'

export function AccountMenu() {
  const { messages } = useI18n()
  const session = useSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const user = session.data
  if (!user) {
    return null
  }

  const registered = !user.isGuest && user.email !== null

  return (
    <>
      {registered ? (
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="border-line text-ink-700 hover:bg-bg flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm font-medium transition"
        >
          <span
            className={
              user.isEmailVerified
                ? 'h-2 w-2 rounded-full bg-emerald-500'
                : 'h-2 w-2 rounded-full bg-amber-400'
            }
            aria-hidden
          />
          {user.displayName}
        </button>
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
      {registered && (
        <AccountDialog
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          user={user}
        />
      )}
    </>
  )
}
