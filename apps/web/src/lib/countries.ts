export type Country = {
  /** ISO 3166-1 alpha-2 code, matches the IP country from the session. */
  code: string
  name: string
  flag: string
  /** International dial code, digits only (e.g. '55' for Brazil). */
  dial: string
}

const BRAZIL: Country = { code: 'BR', name: 'Brasil', flag: '🇧🇷', dial: '55' }

// A focused list centred on Brazil and the markets we serve. Ordered by how
// likely our users are to pick each one.
export const COUNTRIES: Country[] = [
  BRAZIL,
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '351' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dial: '1' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial: '54' },
  { code: 'MX', name: 'México', flag: '🇲🇽', dial: '52' },
  { code: 'ES', name: 'España', flag: '🇪🇸', dial: '34' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dial: '56' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dial: '57' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', dial: '51' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dial: '598' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dial: '595' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '44' },
]

export const DEFAULT_COUNTRY: Country = BRAZIL

export function findCountry(
  code: string | null | undefined,
): Country | undefined {
  if (!code) return undefined
  const upper = code.toUpperCase()
  return COUNTRIES.find(c => c.code === upper)
}

/**
 * Format the national part of a phone number for display. Brazil gets its
 * familiar "(11) 99999-9999" mask; other countries fall back to simple 3-digit
 * grouping so the field still reads as a phone number.
 */
export function formatNationalNumber(digits: string, country: Country): string {
  const d = digits.replace(/\D/g, '')
  if (country.code === 'BR') {
    const dd = d.slice(0, 11)
    const ddd = dd.slice(0, 2)
    const rest = dd.slice(2)
    if (dd.length <= 2) return ddd
    if (rest.length <= 4) return `(${ddd}) ${rest}`
    // 9-digit mobile: 5+4; 8-digit landline: 4+4.
    const split = rest.length > 8 ? 5 : rest.length === 8 ? 4 : rest.length - 4
    return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`
  }
  return d.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

/** Build the E.164 number sent to the pairing API. */
export function toE164(dial: string, nationalDigits: string): string {
  return `+${dial}${nationalDigits.replace(/\D/g, '')}`
}
