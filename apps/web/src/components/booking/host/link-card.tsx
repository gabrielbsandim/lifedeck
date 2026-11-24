'use client'

import { useState } from 'react'
import { Badge, Button, Card } from '@lifedeck/ui'
import type { BookingPageView } from '@lifedeck/application'
import { useSaveBookingPage } from '@/lib/api/use-booking'
import { bookingPageUrl, whatsappShareUrl } from '@/lib/booking/host'
import type { HostCopy } from '@/components/booking/host/fields'

const linkClass =
  'border-line text-ink-700 hover:bg-bg inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold'

export function LinkCard({
  page,
  origin,
  t,
}: {
  page: BookingPageView
  origin: string
  t: HostCopy
}) {
  const [copied, setCopied] = useState(false)
  const save = useSaveBookingPage()
  const url = bookingPageUrl(origin, page.slug)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
            {t.link.label}
          </p>
          {!page.active && <Badge>{t.link.paused}</Badge>}
        </div>
        <p className="break-all text-base font-semibold">{url}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void copy()}>
          {copied ? t.link.copied : t.link.copy}
        </Button>
        <a
          className={linkClass}
          href={whatsappShareUrl(t.link.shareText.replace('{url}', url))}
          target="_blank"
          rel="noreferrer"
        >
          {t.link.share}
        </a>
        <a className={linkClass} href={url} target="_blank" rel="noreferrer">
          {t.link.open}
        </a>
        <Button
          variant="ghost"
          isLoading={save.isPending}
          onClick={() => save.mutate({ slug: page.slug, active: !page.active })}
        >
          {page.active ? t.link.pause : t.link.resume}
        </Button>
      </div>
    </Card>
  )
}
