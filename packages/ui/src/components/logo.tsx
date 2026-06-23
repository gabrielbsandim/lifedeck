import * as React from 'react'

export type LogoProps = {
  size?: number
  monochrome?: boolean
  withWordmark?: boolean
  layout?: 'horizontal' | 'stacked'
  className?: string
  title?: string
}

export type LogoMarkProps = Omit<LogoProps, 'withWordmark' | 'layout'>

export function LogoMark({
  size = 24,
  monochrome = false,
  className,
  title = 'Lifedeck',
}: LogoMarkProps) {
  const maskId = React.useId()

  if (monochrome) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        role="img"
        aria-label={title}
        className={className}
      >
        <mask id={maskId}>
          <rect width="32" height="32" fill="#fff" />
          <circle cx="12" cy="14.5" r="2.1" fill="#000" />
        </mask>
        <g mask={`url(#${maskId})`} fill="currentColor">
          <rect x="13" y="4" width="15" height="20" rx="4.5" opacity="0.32" />
          <rect x="10" y="6.5" width="15" height="20" rx="4.5" opacity="0.58" />
          <rect x="7" y="9" width="15" height="20" rx="4.5" />
        </g>
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      className={className}
    >
      <rect
        x="13"
        y="4"
        width="15"
        height="20"
        rx="4.5"
        fill="var(--color-deck-back, oklch(0.86 0.07 285))"
      />
      <rect
        x="10"
        y="6.5"
        width="15"
        height="20"
        rx="4.5"
        fill="var(--color-deck-mid, oklch(0.74 0.13 285))"
      />
      <rect
        x="7"
        y="9"
        width="15"
        height="20"
        rx="4.5"
        fill="var(--color-brand-600, #6d4ae6)"
      />
      <circle
        cx="12"
        cy="14.5"
        r="2.1"
        fill="var(--color-violet-500, oklch(0.6 0.18 300))"
      />
    </svg>
  )
}

export type WordmarkProps = {
  className?: string
  style?: React.CSSProperties
}

export function Wordmark({ className, style }: WordmarkProps) {
  return (
    <span
      className={className}
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'var(--color-ink-900, oklch(0.21 0.02 265))',
        ...style,
      }}
    >
      Lifedeck
    </span>
  )
}

export function Logo({
  size = 24,
  monochrome = false,
  withWordmark = false,
  layout = 'horizontal',
  className,
  title = 'Lifedeck',
}: LogoProps) {
  const mark = <LogoMark size={size} monochrome={monochrome} title={title} />

  if (!withWordmark) {
    return <span className={className}>{mark}</span>
  }

  const stacked = layout === 'stacked'

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: 'center',
        gap: stacked ? size * 0.28 : size * 0.42,
      }}
    >
      {mark}
      <Wordmark style={{ fontSize: stacked ? size * 0.52 : size * 0.72 }} />
    </span>
  )
}
