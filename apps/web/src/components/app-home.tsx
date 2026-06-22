'use client'

import { Skeleton } from '@taskin/ui'
import { useSession } from '@/lib/api/use-session'
import { todayIso } from '@/lib/api/dates'
import { OnboardingCard } from '@/components/onboarding-card'
import { DailyBoard } from '@/components/daily-board'

export function AppHome() {
  const session = useSession()

  if (session.isPending) {
    return <Skeleton className="h-72 w-full rounded-2xl" />
  }

  if (!session.data) {
    return <OnboardingCard />
  }

  return <DailyBoard date={todayIso()} />
}
