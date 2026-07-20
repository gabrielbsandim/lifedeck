import { computeHabitStreak, isHabitScheduledOn } from '@lifedeck/domain'
import type { Habit } from '@lifedeck/domain'
import type { HabitView } from '@/dtos/habit-dto'

// Builds the client view for a habit, folding in the streak facts computed from
// the completion dates. `today` is the owner's civil date, so `doneToday` and
// the streak grace resolve in the user's own day.
export function toHabitView(
  habit: Habit,
  doneDates: string[],
  today: string,
): HabitView {
  const props = habit.toJSON()
  return {
    id: props.id,
    ownerId: props.ownerId,
    title: props.title,
    cadence: props.cadence,
    checkinHour: props.checkinHour,
    active: props.active,
    createdAt: props.createdAt.toISOString(),
    currentStreak: computeHabitStreak(props.cadence, doneDates, today),
    doneToday: doneDates.includes(today),
    scheduledToday: isHabitScheduledOn(props.cadence, today),
  }
}
