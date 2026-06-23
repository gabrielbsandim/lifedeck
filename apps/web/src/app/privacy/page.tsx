import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getMessages } from '@lifedeck/i18n'
import { resolveLocaleFromHeader } from '@/lib/i18n/get-locale'
import { LegalScreen } from '@/components/legal/legal-screen'

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers()
  const locale = resolveLocaleFromHeader(headerList.get('accept-language'))
  return { title: getMessages(locale).legal.privacy.title }
}

export default function PrivacyPage() {
  return <LegalScreen doc="privacy" />
}
