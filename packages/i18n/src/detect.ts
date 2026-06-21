import { DEFAULT_LOCALE, isLocale, type Locale } from './locales'

type LanguageEntry = {
  tag: string
  quality: number
}

function parseEntry(part: string): LanguageEntry {
  const trimmed = part.trim()
  const tag = trimmed.replace(/;.*$/, '').trim().toLowerCase()
  const qualityMatch = /;\s*q=([0-9.]+)/.exec(trimmed)
  const quality = qualityMatch === null ? 1 : Number(qualityMatch[1])
  return { tag, quality }
}

function parseAcceptLanguage(header: string): LanguageEntry[] {
  return header
    .split(',')
    .map(parseEntry)
    .filter(entry => entry.tag.length > 0)
    .sort((a, b) => b.quality - a.quality)
}

export function detectLocale(
  acceptLanguage: string | null | undefined,
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  if (!acceptLanguage) {
    return fallback
  }

  for (const { tag } of parseAcceptLanguage(acceptLanguage)) {
    const base = tag.replace(/-.*$/, '')
    if (isLocale(base)) {
      return base
    }
  }

  return fallback
}
