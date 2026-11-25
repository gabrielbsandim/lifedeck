'use client'

import { useEffect, useState } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@lifedeck/ui'
import { useSession } from '@/lib/api/use-session'
import { useSyncTimezone } from '@/lib/api/use-account'
import { todayIso } from '@/lib/api/dates'
import { returnToFrom } from '@/lib/navigation/return-to'
import { OnboardingCard } from '@/components/onboarding-card'
import { WhatsNewCard } from '@/components/whats-new-card'
import { DailyBoard } from '@/components/daily-board'
import { OnboardingModal } from '@/components/onboarding-modal'
import { AppShell } from '@/components/app-shell'
import { SiteFooter } from '@/components/site-footer'

const plainMain =
  'mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-5 py-16 sm:py-24'

export function AppHome() {
  const session = useSession()
  useSyncTimezone(session.data)
  const [date, setDate] = useState(() => todayIso())
  const router = useRouter()
  const signedIn = Boolean(session.data)

  // Read from the URL directly: useSearchParams would force a Suspense boundary
  // around the whole home page.
  useEffect(() => {
    const target = signedIn ? returnToFrom(window.location.search) : null
    if (target) {
      router.replace(target as Route)
    }
  }, [signedIn, router])

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
          <WhatsNewCard />
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <AppShell>
      <OnboardingModal />
      <DailyBoard date={date} onDateChange={setDate} />
    </AppShell>
  )
}
