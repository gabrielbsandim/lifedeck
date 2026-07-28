// Ported from the `weekdayLabels` helper in
// apps/web/src/components/recurring-task-form.tsx, extracted here because both
// the habit form and the recurring form need it and neither should import the
// other's screen module.
export function weekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const sunday = Date.UTC(2026, 5, 21)
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(sunday + index * 86_400_000)),
  )
}
