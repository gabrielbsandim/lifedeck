'use client'

import Image from 'next/image'
import { Card } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/site'

export function WhatsNewCard() {
  const { messages, locale } = useI18n()
  const copy = messages.whatsNew

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">{copy.title}</h2>
      <ul className="text-ink-600 mt-3 flex list-disc flex-col gap-2 pl-5 text-sm">
        {copy.items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <p className="text-ink-500 mt-6 text-sm font-medium">{copy.getTheApp}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
          <Image
            unoptimized
            src={`/badges/app-store-${locale}.svg`}
            alt={copy.appStore}
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </a>
        <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
          {/* Google's badge carries its own padding, so it renders taller to match. */}
          <Image
            unoptimized
            src={`/badges/google-play-${locale}.png`}
            alt={copy.googlePlay}
            width={155}
            height={60}
            className="-my-2.5 h-[60px] w-auto"
          />
        </a>
      </div>
    </Card>
  )
}
