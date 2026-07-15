'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  CalendarIcon,
  ListsIcon,
  SparkleIcon,
  UserIcon,
} from '@/components/icons'

const tabClass = (active: boolean) =>
  `flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium transition-colors ${
    active ? 'text-brand-600' : 'text-ink-400'
  }`

export function MobileTabBar() {
  const { messages } = useI18n()
  const pathname = usePathname()

  // The Profile tab now opens the full settings hub, which also surfaces the
  // tools (Analytics, Recurring, Developers) that used to live in a sheet.
  const onProfileRoute =
    pathname.startsWith('/settings') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/recurring') ||
    pathname.startsWith('/developers')

  return (
    <nav
      aria-label={messages.nav.menu}
      className="border-line fixed inset-x-0 bottom-0 z-30 border-t bg-white/90 backdrop-blur-lg lg:hidden"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={tabClass(pathname === '/')}
        >
          <CalendarIcon size={22} />
          {messages.nav.today}
        </Link>

        <Link
          href="/lists"
          aria-current={pathname.startsWith('/lists') ? 'page' : undefined}
          className={tabClass(pathname.startsWith('/lists'))}
        >
          <ListsIcon size={22} />
          {messages.nav.lists}
        </Link>

        <Link
          href="/generate"
          aria-current={pathname.startsWith('/generate') ? 'page' : undefined}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium"
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md transition-transform active:scale-95 ${
              pathname.startsWith('/generate') ? 'bg-brand-700' : 'bg-brand-600'
            }`}
          >
            <SparkleIcon size={20} />
          </span>
          <span
            className={
              pathname.startsWith('/generate')
                ? 'text-brand-600'
                : 'text-ink-400'
            }
          >
            {messages.nav.generate}
          </span>
        </Link>

        <Link
          href="/settings"
          aria-current={onProfileRoute ? 'page' : undefined}
          className={tabClass(onProfileRoute)}
        >
          <UserIcon size={22} />
          {messages.nav.profile}
        </Link>
      </div>
    </nav>
  )
}
