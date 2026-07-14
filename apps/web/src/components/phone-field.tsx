'use client'

import { useState } from 'react'
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  findCountry,
  formatNationalNumber,
  toE164,
  type Country,
} from '@/lib/countries'

type PhoneFieldProps = {
  /** ISO country code to preselect (e.g. the IP country from the session). */
  defaultCountry?: string | null
  /** Receives the full E.164 number, or '' while empty. */
  onChange: (e164: string) => void
  placeholder?: string
  disabled?: boolean
  label?: string
}

/**
 * WhatsApp/phone entry with a country picker and a live mask. The country picker
 * supplies the dial code so the user only types their local number; we assemble
 * the E.164 value for the pairing API.
 */
export function PhoneField({
  defaultCountry,
  onChange,
  placeholder,
  disabled,
  label,
}: PhoneFieldProps) {
  const [country, setCountry] = useState<Country>(
    () => findCountry(defaultCountry) ?? DEFAULT_COUNTRY,
  )
  const [national, setNational] = useState('')

  function update(nextCountry: Country, rawNational: string) {
    const digits = rawNational.replace(/\D/g, '')
    setCountry(nextCountry)
    setNational(digits)
    onChange(digits ? toE164(nextCountry.dial, digits) : '')
  }

  return (
    <div>
      {label && (
        <label className="text-ink-700 mb-1 block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="border-line focus-within:border-brand-500 focus-within:ring-brand-500/30 flex items-stretch overflow-hidden rounded-xl border bg-white focus-within:ring-2">
        <select
          aria-label="Country"
          value={country.code}
          disabled={disabled}
          onChange={event =>
            update(findCountry(event.target.value) ?? DEFAULT_COUNTRY, national)
          }
          className="text-ink-800 border-line border-r bg-transparent py-2.5 pl-3 pr-2 text-sm focus:outline-none"
        >
          {COUNTRIES.map(item => (
            <option key={item.code} value={item.code}>
              {item.flag} +{item.dial}
            </option>
          ))}
        </select>
        <input
          value={formatNationalNumber(national, country)}
          onChange={event => update(country, event.target.value)}
          inputMode="tel"
          disabled={disabled}
          placeholder={placeholder}
          className="text-ink-900 min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none"
        />
      </div>
    </div>
  )
}
