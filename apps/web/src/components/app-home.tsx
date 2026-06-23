'use client'

import { Skeleton } from '@lifedeck/ui'
import { useSession } from '@/lib/api/use-session'
import { useSyncTimezone } from '@/lib/api/use-account'
import { todayIso } from '@/lib/api/dates'
import { OnboardingCard } from '@/components/onboarding-card'
import { DailyBoard } from '@/components/daily-board'
import { AppShell } from '@/components/app-shell'
import { SiteFooter } from '@/components/site-footer'

const plainMain =
  'mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-5 py-16 sm:py-24'

export function AppHome() {
  const session = useSession()
  useSyncTimezone(session.data)

  if (session.isPending) {
    return (
      <main className={plainMain}>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </main>
    )
  }

  if (!session.data) {
    return (
      <div className="flex min-h-dvh flex-col">
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-5 py-16 sm:py-24">
          <OnboardingCard />
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <AppShell>
      <DailyBoard date={todayIso()} />
    </AppShell>
  )
}
