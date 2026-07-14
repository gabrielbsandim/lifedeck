import { Suspense } from 'react'
import { CalendarScreen } from '@/components/calendar/calendar-screen'
import { AppShell } from '@/components/app-shell'

function CalendarLoading() {
  return (
    <div aria-busy className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="bg-line h-[70vh] w-full animate-pulse rounded-2xl" />
    </div>
  )
}

export default function CalendarPage() {
  return (
    <AppShell>
      <Suspense fallback={<CalendarLoading />}>
        <CalendarScreen />
      </Suspense>
    </AppShell>
  )
}
