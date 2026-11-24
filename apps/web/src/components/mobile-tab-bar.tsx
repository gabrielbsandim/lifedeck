'use client'

import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n/messages-provider'
import { activeMobileTab, type MobileTab } from '@/lib/navigation/active-tab'
import {
  CalendarIcon,
  HabitIcon,
  ListsIcon,
  SparkleIcon,
  UserIcon,
} from '@/components/icons'

const tabClass = (active: boolean) =>
  `flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium transition-colors ${
    active ? 'text-brand-accent' : 'text-ink-400'
  }`

function PlainTab({
  href,
  active,
  icon,
  label,
}: {
  href: Route
  active: boolean
  icon: ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={tabClass(active)}
    >
      {icon}
      {label}
    </Link>
  )
}

export function MobileTabBar() {
  const { messages } = useI18n()
  const active: MobileTab | null = activeMobileTab(usePathname())
  const onAssistant = active === 'assistant'

  return (
    <nav
      aria-label={messages.nav.menu}
      className="border-line bg-surface/90 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-lg lg:hidden"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        <PlainTab
          href="/"
          active={active === 'today'}
          icon={<CalendarIcon size={22} />}
          label={messages.nav.today}
        />
        <PlainTab
          href="/lists"
          active={active === 'lists'}
          icon={<ListsIcon size={22} />}
          label={messages.nav.lists}
        />

        <Link
          href="/generate"
          aria-current={onAssistant ? 'page' : undefined}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium"
        >
          <span
            className={`from-brand-600 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gradient-to-br to-violet-500 text-white shadow-[0_4px_12px_oklch(0.52_0.22_280/0.4)] transition-transform active:scale-95 ${
              onAssistant ? 'brightness-95' : ''
            }`}
          >
            <SparkleIcon size={20} />
          </span>
          <span className={onAssistant ? 'text-brand-accent' : 'text-ink-400'}>
            {messages.nav.generate}
          </span>
        </Link>

        <PlainTab
          href="/habits"
          active={active === 'habits'}
          icon={<HabitIcon size={22} />}
          label={messages.nav.habits}
        />
        <PlainTab
          href="/settings"
          active={active === 'profile'}
          icon={<UserIcon size={22} />}
          label={messages.nav.profile}
        />
      </div>
    </nav>
  )
}
