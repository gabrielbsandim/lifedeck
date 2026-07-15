'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { Card, cn } from '@lifedeck/ui'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'

/** A titled group of cards, matching the design's section rhythm. */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      {(title || description) && (
        <div className="flex flex-col gap-0.5">
          {title && (
            <h2 className="text-ink-500 text-xs font-semibold uppercase tracking-[0.08em]">
              {title}
            </h2>
          )}
          {description && <p className="text-ink-500 text-xs">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

/** White card used across every settings section. */
export function SectionCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <Card className={cn('p-5', className)}>{children}</Card>
}

/** The design's pill switch (44x26 track, 22 knob). */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative h-[26px] w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-brand-600' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-all',
          checked ? 'left-[20px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  badge?: ReactNode
}

/** Pill segmented control (carry-over, interval, currency, payment method). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('bg-bg flex gap-1 rounded-xl p-[3px]', className)}>
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold transition-colors disabled:opacity-50',
              active
                ? 'text-brand-700 bg-white shadow-sm'
                : 'text-ink-500 bg-transparent',
            )}
          >
            {option.label}
            {option.badge}
          </button>
        )
      })}
    </div>
  )
}

/** Sticky mobile subpage header with a back button and centered title. */
export function SubpageHeader({
  title,
  onBack,
  backLabel,
  right,
}: {
  title: string
  onBack: () => void
  backLabel: string
  right?: ReactNode
}) {
  return (
    <div className="bg-bg/85 sticky top-0 z-10 -mx-4 flex items-center px-2 py-2 backdrop-blur sm:-mx-5 sm:px-3">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="text-brand-600 flex h-9 w-9 items-center justify-center"
      >
        <ChevronLeftIcon size={22} />
      </button>
      <span className="text-ink-900 flex-1 text-center text-[17px] font-semibold">
        {title}
      </span>
      <span className="flex h-9 min-w-9 items-center justify-end">{right}</span>
    </div>
  )
}

/** One row inside a hub group: colored icon tile, label, optional detail, chevron. */
export function HubRow({
  icon,
  iconClassName,
  label,
  detail,
  href,
  onClick,
  tone = 'default',
}: {
  icon: ReactNode
  iconClassName?: string
  label: string
  detail?: string
  href?: Route
  onClick?: () => void
  tone?: 'default' | 'danger'
}) {
  const inner = (
    <>
      <span
        className={cn(
          'flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-lg text-white',
          iconClassName ?? 'bg-ink-500',
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          'flex-1 text-base',
          tone === 'danger' ? 'text-danger' : 'text-ink-800',
        )}
      >
        {label}
      </span>
      {detail && <span className="text-ink-500 text-sm">{detail}</span>}
      {(href || onClick) && tone !== 'danger' && (
        <ChevronRightIcon size={16} className="text-ink-300 shrink-0" />
      )}
    </>
  )
  const className =
    'flex w-full items-center gap-3 px-4 text-left min-h-[52px] hover:bg-bg/60 transition-colors'
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  )
}

/** Card wrapper for a stack of HubRows, with inset dividers. */
export function HubRowGroup({ children }: { children: ReactNode }) {
  return (
    <Card className="divide-line divide-y overflow-hidden py-0">
      {children}
    </Card>
  )
}
