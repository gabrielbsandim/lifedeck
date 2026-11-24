import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getMessages } from '@lifedeck/i18n'
import { resolveLocaleFromHeader } from '@/lib/i18n/get-locale'
import { StatusPage } from '@/components/status-page'

async function pageMessages() {
  const headerList = await headers()
  return getMessages(resolveLocaleFromHeader(headerList.get('accept-language')))
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await pageMessages()).errorPage.notFoundTitle }
}

export default async function NotFound() {
  const t = (await pageMessages()).errorPage
  return (
    <StatusPage
      code="404"
      title={t.notFoundTitle}
      body={t.notFoundBody}
      homeLabel={t.backHome}
    />
  )
}
