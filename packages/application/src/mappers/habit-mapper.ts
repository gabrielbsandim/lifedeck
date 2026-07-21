import { computeHabitStreak, isHabitScheduledOn } from '@lifedeck/domain'
import type { Habit } from '@lifedeck/domain'
import type { HabitView } from '@/dtos/habit-dto'

const DAY_MS = 86_400_000
const WEEK_BAR_DAYS = 7

// The trailing 7 civil dates ending at `today`, oldest first. Civil dates are
// localized already, so stepping them as UTC midnights is unambiguous.
function trailingWeek(today: string): string[] {
  const base = new Date(`${today}T00:00:00.000Z`).getTime()
  const days: string[] = []
  for (let offset = WEEK_BAR_DAYS - 1; offset >= 0; offset -= 1) {
    days.push(new Date(base - offset * DAY_MS).toISOString().slice(0, 10))
  }
  return days
}

// Builds the client view for a habit, folding in the streak facts computed from
// the completion dates. `today` is the owner's civil date, so `doneToday` and
// the streak grace resolve in the user's own day.
export function toHabitView(
  habit: Habit,
  doneDates: string[],
  today: string,
): HabitView {
  const props = habit.toJSON()
  const done = new Set(doneDates)
  return {
    id: props.id,
    ownerId: props.ownerId,
    title: props.title,
    cadence: props.cadence,
    checkinHour: props.checkinHour,
    active: props.active,
    createdAt: props.createdAt.toISOString(),
    currentStreak: computeHabitStreak(props.cadence, doneDates, today),
    doneToday: done.has(today),
    scheduledToday: isHabitScheduledOn(props.cadence, today),
    recentDays: trailingWeek(today).map(date => ({
      date,
      done: done.has(date),
      scheduled: isHabitScheduledOn(props.cadence, date),
    })),
  }
}
