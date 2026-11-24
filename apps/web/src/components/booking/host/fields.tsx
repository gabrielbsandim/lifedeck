'use client'

import type { ReactNode, SelectHTMLAttributes } from 'react'
import type { Messages } from '@lifedeck/i18n'

export type HostCopy = Messages['bookingHost']

export const inputClass =
  'border-line text-ink-800 focus-visible:border-brand-600 bg-surface h-11 rounded-xl border-[1.5px] px-3 text-sm outline-none'

export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="text-ink-700 font-medium">{label}</span>
      <select className={`${inputClass} min-w-0`} {...props}>
        {children}
      </select>
    </label>
  )
}

export function CheckField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="accent-brand-600 mt-0.5 h-4 w-4 flex-none"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-ink-800 font-medium">{label}</span>
        {hint && <span className="text-ink-500 text-xs">{hint}</span>}
      </span>
    </label>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null
  }
  return (
    <p role="alert" className="text-danger text-sm">
      {message}
    </p>
  )
}

/** The server's validation message when it has one, the generic copy otherwise. */
export function errorMessage(error: unknown, fallback: string): string | null {
  if (!error) {
    return null
  }
  return error instanceof Error && error.message ? error.message : fallback
}
