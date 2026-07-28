import { useState } from 'react'
import { DailyBoard } from '@/components/daily-board'
import { Screen } from '@/components/ui'
import { todayIso } from '@/lib/api/dates'
import { useSyncTimezone } from '@/lib/api/use-account'
import { useSession } from '@/lib/api/use-session'

export default function TodayScreen() {
  const session = useSession()
  useSyncTimezone(session.data)
  const [date, setDate] = useState(() => todayIso())

  return (
    <Screen>
      <DailyBoard date={date} onDateChange={setDate} />
    </Screen>
  )
}
