import { headers } from 'next/headers'
import { getMessages, type Messages } from '@lifedeck/i18n'
import { resolveLocaleFromHeader } from '@/lib/i18n/get-locale'

export async function bookingMessages(): Promise<Messages['booking']> {
  const headerList = await headers()
  const locale = resolveLocaleFromHeader(headerList.get('accept-language'))
  return getMessages(locale).booking
}
