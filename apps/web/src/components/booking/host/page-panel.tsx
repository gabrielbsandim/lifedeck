'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Button, TextField } from '@lifedeck/ui'
import type { BookingPageView } from '@lifedeck/application'
import { LOCALE_NAMES, SUPPORTED_LOCALES, type Locale } from '@lifedeck/i18n'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSaveBookingPage } from '@/lib/api/use-booking'
import { timeZoneOptions } from '@/lib/booking/slot-days'
import {
  FormError,
  SelectField,
  errorMessage,
} from '@/components/booking/host/fields'

const NOTICE_HOURS = [0, 1, 2, 4, 12, 24, 48, 72]

export function PagePanel({ page }: { page: BookingPageView }) {
  const { messages } = useI18n()
  const t = messages.bookingHost
  const save = useSaveBookingPage()
  const [displayName, setDisplayName] = useState(page.displayName)
  const [headline, setHeadline] = useState(page.headline ?? '')
  const [slug, setSlug] = useState(page.slug)
  const [timezone, setTimezone] = useState(page.timezone)
  const [locale, setLocale] = useState(page.locale)
  const [noticeHours, setNoticeHours] = useState(
    Math.round(page.cancelNoticeMin / 60),
  )
  const zones = useMemo(() => timeZoneOptions(timezone), [timezone])
  const hours = NOTICE_HOURS.includes(noticeHours)
    ? NOTICE_HOURS
    : [...NOTICE_HOURS, noticeHours].sort((a, b) => a - b)

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate({
      slug: slug.trim().toLowerCase(),
      displayName: displayName.trim(),
      headline: headline.trim() || null,
      timezone,
      locale: locale as Locale,
      cancelNoticeMin: noticeHours * 60,
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextField
        label={t.page.displayName}
        value={displayName}
        maxLength={120}
        required
        onChange={event => setDisplayName(event.target.value)}
      />
      <TextField
        label={t.page.headline}
        value={headline}
        maxLength={300}
        onChange={event => setHeadline(event.target.value)}
      />
      <TextField
        label={t.page.slug}
        value={slug}
        maxLength={40}
        autoCapitalize="none"
        spellCheck={false}
        required
        onChange={event => setSlug(event.target.value.toLowerCase())}
      />
      <SelectField
        label={t.page.timezone}
        value={timezone}
        onChange={event => setTimezone(event.target.value)}
      >
        {zones.map(zone => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </SelectField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField
          label={t.page.cancelNotice}
          value={noticeHours}
          onChange={event => setNoticeHours(Number(event.target.value))}
        >
          {hours.map(n => (
            <option key={n} value={n}>
              {t.services.hours.replace('{n}', String(n))}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t.page.language}
          value={locale}
          onChange={event => setLocale(event.target.value)}
        >
          {SUPPORTED_LOCALES.map(value => (
            <option key={value} value={value}>
              {LOCALE_NAMES[value]}
            </option>
          ))}
        </SelectField>
      </div>
      <FormError message={errorMessage(save.error, t.failed)} />
      <div className="flex items-center gap-3">
        <Button type="submit" isLoading={save.isPending}>
          {t.save}
        </Button>
        {save.isSuccess && (
          <span role="status" className="text-success text-sm">
            {t.saved}
          </span>
        )}
      </div>
    </form>
  )
}
