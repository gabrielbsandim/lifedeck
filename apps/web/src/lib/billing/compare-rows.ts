import type { Messages } from '@lifedeck/i18n'

export type CompareCell = boolean | 'sample'

export type CompareRow = {
  label: string
  free: CompareCell
  pro: CompareCell
  premium: CompareCell
}

/**
 * The plan comparison grid. Mirrors the entitlements in `@lifedeck/domain` and
 * the use-case caps, so the table stays truthful to what each plan grants:
 * assistant memory is baseline; habits are baseline but capped to one on free
 * (shown as 'sample'); the WhatsApp assistant is a sample on free; calendar
 * sync, the daily brief and reminders are pro+; nudges, "find me time", the
 * Apple/cal.com calendars, the stronger model and higher limits are premium.
 */
export function compareRows(messages: Messages): CompareRow[] {
  const t = messages.billing
  return [
    { label: t.compareDailyLists, free: true, pro: true, premium: true },
    { label: t.compareSharing, free: true, pro: true, premium: true },
    { label: t.compareAnalytics, free: true, pro: true, premium: true },
    { label: t.compareAi, free: true, pro: true, premium: true },
    { label: t.compareMemory, free: true, pro: true, premium: true },
    { label: t.compareHabits, free: 'sample', pro: true, premium: true },
    { label: t.compareAssistant, free: 'sample', pro: true, premium: true },
    { label: t.compareBrief, free: false, pro: true, premium: true },
    { label: t.compareCalendar, free: false, pro: true, premium: true },
    { label: t.compareReminders, free: false, pro: true, premium: true },
    { label: t.compareNudges, free: false, pro: false, premium: true },
    { label: t.compareFindTime, free: false, pro: false, premium: true },
    { label: t.compareAllCalendars, free: false, pro: false, premium: true },
    { label: t.compareStrongerAi, free: false, pro: false, premium: true },
    { label: t.compareHigherLimits, free: false, pro: false, premium: true },
  ]
}
