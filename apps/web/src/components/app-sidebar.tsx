'use client'

import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoMark } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { AccountMenu } from '@/components/account-menu'

type NavItem = {
  href:
    | '/'
    | '/lists'
    | '/calendar'
    | '/analytics'
    | '/generate'
    | '/recurring'
    | '/developers'
  label: string
  icon: ReactNode
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function AppSidebar() {
  const { messages } = useI18n()
  const pathname = usePathname()
  const session = useSession()
  const hasCalendar =
    session.data?.entitlements?.includes('calendarSync') ?? false

  const items: NavItem[] = [
    {
      href: '/',
      label: messages.nav.today,
      icon: (
        <Icon>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </Icon>
      ),
    },
    {
      href: '/lists',
      label: messages.nav.lists,
      icon: (
        <Icon>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </Icon>
      ),
    },
    ...(hasCalendar
      ? [
          {
            href: '/calendar' as const,
            label: messages.nav.calendar,
            icon: (
              <Icon>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
              </Icon>
            ),
          },
        ]
      : []),
    {
      href: '/analytics',
      label: messages.nav.analytics,
      icon: (
        <Icon>
          <path d="M3 3v18h18M18 12l-3 3-3-3-3 4" />
        </Icon>
      ),
    },
    {
      href: '/generate',
      label: messages.nav.generate,
      icon: (
        <Icon>
          <path d="M12 3l1.9 4.8L19 9l-4.1 1.2L12 15l-1.9-4.8L6 9l4.1-1.2z" />
        </Icon>
      ),
    },
    {
      href: '/recurring',
      label: messages.recurring.manage,
      icon: (
        <Icon>
          <path d="M17 2l4 4-4 4M21 6H8a4 4 0 0 0-4 4M7 22l-4-4 4-4M3 18h13a4 4 0 0 0 4-4" />
        </Icon>
      ),
    },
    {
      href: '/developers',
      label: messages.nav.developers,
      icon: (
        <Icon>
          <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
        </Icon>
      ),
    },
  ]

  function isActive(href: NavItem['href']): boolean {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="border-line bg-bg fixed left-0 top-0 z-10 hidden h-screen w-56 flex-col gap-1 border-r p-4 lg:flex">
      <Link
        href="/"
        className="mb-4 flex items-center gap-2.5 px-2 py-1.5"
        aria-label={messages.app.name}
      >
        <LogoMark size={28} title={messages.app.name} />
        <span className="text-base font-bold tracking-tight">
          {messages.app.name}
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'bg-brand-50 text-brand-700 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold'
                  : 'text-ink-600 hover:bg-bg hover:text-ink-800 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium'
              }
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-line mt-auto border-t pt-3">
        <AccountMenu />
      </div>
    </aside>
  )
}
