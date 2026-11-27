// Hermes ships no Intl.RelativeTimeFormat, so calling it as a constructor throws
// and takes the whole screen down. Where it is missing, an absolute short date
// stands in for "5 minutes ago".
type Formatter = Pick<Intl.RelativeTimeFormat, 'format'>

const STEPS: {
  limit: number
  size: number
  unit: Intl.RelativeTimeFormatUnit
}[] = [
  { limit: 60, size: 1, unit: 'second' },
  { limit: 3600, size: 60, unit: 'minute' },
  { limit: 86_400, size: 3600, unit: 'hour' },
  { limit: Infinity, size: 86_400, unit: 'day' },
]

function relativeFormatter(locale: string): Formatter | null {
  if (typeof Intl.RelativeTimeFormat !== 'function') {
    return null
  }
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
}

export function relativeTime(
  iso: string,
  locale: string,
  now: number = Date.now(),
): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return ''
  }
  const rtf = relativeFormatter(locale)
  if (!rtf) {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(then)
  }
  const diffSec = Math.round((then - now) / 1000)
  const step = STEPS.find(s => Math.abs(diffSec) < s.limit) ?? STEPS[3]!
  return rtf.format(Math.round(diffSec / step.size), step.unit)
}
