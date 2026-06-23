import { en } from '@/messages/en'
import { pt } from '@/messages/pt'
import { es } from '@/messages/es'
import type { Messages } from '@/messages/types'
import type { Locale } from '@/locales'

export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
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

export const messages: Record<Locale, Messages> = { en, pt, es }

export function getMessages(locale: Locale): Messages {
  return messages[locale]
}
