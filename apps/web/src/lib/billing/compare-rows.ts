import type { Messages } from '@lifedeck/i18n'

export type CompareCell = boolean | 'sample'

export type CompareRow = {
  label: string
  free: CompareCell
  pro: CompareCell
  premium: CompareCell
}

/**
 * The plan comparison grid. Mirrors the entitlements in `@lifedeck/domain`
 * (whatsappAssistant is a sample on free, calendarSync is pro+, premiumModel is
 * premium only), so the table stays truthful to what each plan actually grants.
 */
export function compareRows(messages: Messages): CompareRow[] {
  const t = messages.billing
  return [
    { label: t.compareDailyLists, free: true, pro: true, premium: true },
    { label: t.compareSharing, free: true, pro: true, premium: true },
    { label: t.compareAnalytics, free: true, pro: true, premium: true },
    { label: t.compareAi, free: true, pro: true, premium: true },
    { label: t.compareAssistant, free: 'sample', pro: true, premium: true },
    { label: t.compareCalendar, free: false, pro: true, premium: true },
    { label: t.compareReminders, free: false, pro: true, premium: true },
    { label: t.compareStrongerAi, free: false, pro: false, premium: true },
    { label: t.compareHigherLimits, free: false, pro: false, premium: true },
  ]
}
