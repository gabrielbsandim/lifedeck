'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { AccountDialog } from '@/components/account-dialog'
import { AuthDialog } from '@/components/auth-dialog'
import {
  ChartIcon,
  ChevronRightIcon,
  CodeIcon,
  RecurringIcon,
} from '@/components/icons'

type NavLink = {
  href: '/analytics' | '/recurring' | '/developers'
  label: string
  icon: React.ReactNode
}

export function ProfileSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { messages } = useI18n()
  const session = useSession()
  const [accountOpen, setAccountOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const user = session.data
  const registered = Boolean(user && !user.isGuest && user.email !== null)

  const links: NavLink[] = [
    {
      href: '/analytics',
      label: messages.nav.analytics,
      icon: <ChartIcon size={20} />,
    },
    {
      href: '/recurring',
      label: messages.recurring.manage,
      icon: <RecurringIcon size={20} />,
    },
    {
      href: '/developers',
      label: messages.nav.developers,
      icon: <CodeIcon size={20} />,
    },
  ]

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label={messages.auth.close}
              onClick={onClose}
              className="bg-ink-900/40 absolute inset-0"
            />
            <motion.div
              role="dialog"
              aria-label={messages.nav.profile}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="relative rounded-t-3xl bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3 shadow-[0_-12px_40px_rgba(40,30,60,0.18)]"
            >
              <div className="bg-line mx-auto mb-4 h-1 w-10 rounded-full" />

              {user && (
                <div className="mb-4 flex items-center gap-3">
                  <Avatar
                    name={user.displayName}
                    src={user.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-ink-800 truncate text-base font-semibold">
                      {user.displayName}
                    </p>
                    <p className="text-ink-400 truncate text-xs">
                      {registered ? user.email : messages.auth.guestBadge}
                    </p>
                  </div>
                </div>
              )}

              <nav className="flex flex-col gap-1">
                {links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className="text-ink-700 hover:bg-bg flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium"
                  >
                    <span className="text-ink-500">{link.icon}</span>
                    <span className="flex-1">{link.label}</span>
                    <ChevronRightIcon size={16} className="text-ink-300" />
                  </Link>
                ))}
              </nav>

              <div className="border-line mt-3 border-t pt-3">
                {registered ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      setAccountOpen(true)
                    }}
                    className="text-ink-700 hover:bg-bg flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium"
                  >
                    <Avatar
                      name={user!.displayName}
                      src={user!.avatarUrl}
                      size="sm"
                    />
                    <span className="flex-1 text-left">
                      {messages.auth.account}
                    </span>
                    <ChevronRightIcon size={16} className="text-ink-300" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      setAuthOpen(true)
                    }}
                    className="bg-brand-600 hover:bg-brand-700 flex w-full items-center justify-center rounded-xl px-3 py-3 text-sm font-semibold text-white"
                  >
                    {messages.auth.createAccount}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      {registered && user && (
        <AccountDialog
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          user={user}
        />
      )}
    </>
  )
}
