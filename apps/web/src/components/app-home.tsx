'use client'

import { Skeleton } from '@lifedeck/ui'
import { useSession } from '@/lib/api/use-session'
import { todayIso } from '@/lib/api/dates'
import { OnboardingCard } from '@/components/onboarding-card'
import { DailyBoard } from '@/components/daily-board'
import { AppShell } from '@/components/app-shell'

const plainMain =
  'mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-5 py-16 sm:py-24'

export function AppHome() {
  const session = useSession()

  if (session.isPending) {
    return (
      <main className={plainMain}>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </main>
    )
  }

  if (!session.data) {
    return (
      <main className={plainMain}>
        <OnboardingCard />
      </main>
    )
  }

  return (
    <AppShell>
      <DailyBoard date={todayIso()} />
    </AppShell>
  )
}
