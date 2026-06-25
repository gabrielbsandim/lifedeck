import { Suspense } from 'react'
import { CalendarScreen } from '@/components/calendar/calendar-screen'
import { AppShell } from '@/components/app-shell'

export default function CalendarPage() {
  return (
    <AppShell>
      <Suspense>
        <CalendarScreen />
      </Suspense>
    </AppShell>
  )
}
