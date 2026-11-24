import { en } from '@/messages/en'
import { pt } from '@/messages/pt'
import { es } from '@/messages/es'
import { fr } from '@/messages/fr'
import { de } from '@/messages/de'
import { it } from '@/messages/it'
import type { Messages } from '@/messages/types'
import type { Locale } from '@/locales'

export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  isLocale,
  resolveLocale,
  type Locale,
} from '@/locales'
export { detectLocale } from '@/detect'
export type {
  Messages,
  LegalDocument,
  LegalSectionContent,
  LegalBlock,
} from '@/messages/types'

export const messages: Record<Locale, Messages> = { en, pt, es, fr, de, it }

export function getMessages(locale: Locale): Messages {
  return messages[locale]
}
