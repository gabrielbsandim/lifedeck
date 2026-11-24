'use client'

import { useState, type FormEvent } from 'react'
import { Button, Card, TextField } from '@lifedeck/ui'
import type { BookingServiceInput } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCreateBookingService,
  useSaveBookingPage,
  useSetAvailability,
  useSlugCheck,
} from '@/lib/api/use-booking'
import {
  DEFAULT_WEEKLY,
  draftToWeekly,
  suggestSlug,
  weeklyToDraft,
} from '@/lib/booking/host'
import {
  FormError,
  errorMessage,
  type HostCopy,
} from '@/components/booking/host/fields'
import { ServiceForm } from '@/components/booking/host/service-form'
import { WeeklyHoursEditor } from '@/components/booking/host/weekly-hours-editor'

type Step = 1 | 2 | 3

function SlugStatus({ slug, t }: { slug: string; t: HostCopy['wizard'] }) {
  const check = useSlugCheck(slug)
  if (!check.data || check.data.slug !== slug.trim().toLowerCase()) {
    return null
  }
  if (check.data.available) {
    return <p className="text-success text-xs">{t.slugAvailable}</p>
  }
  return (
    <p role="alert" className="text-danger text-xs">
      {t.slugUnavailable[check.data.reason ?? 'invalid']}
    </p>
  )
}

export function SetupWizard({
  defaultName,
  origin,
  onBusy,
}: {
  defaultName: string
  origin: string
  onBusy: (busy: boolean) => void
}) {
  const { messages, locale } = useI18n()
  const t = messages.bookingHost
  const [step, setStep] = useState<Step>(1)
  const [displayName, setDisplayName] = useState(defaultName)
  const [slug, setSlug] = useState(() => suggestSlug(defaultName))
  const [service, setService] = useState<BookingServiceInput | null>(null)
  const [hours, setHours] = useState(() => weeklyToDraft(DEFAULT_WEEKLY))
  const [invalidDay, setInvalidDay] = useState<number | null>(null)
  const check = useSlugCheck(slug)
  const savePage = useSaveBookingPage()
  const createService = useCreateBookingService()
  const setAvailability = useSetAvailability()
  const busy =
    savePage.isPending || createService.isPending || setAvailability.isPending
  const failure =
    savePage.error ?? createService.error ?? setAvailability.error ?? null

  function nextFromLink(event: FormEvent) {
    event.preventDefault()
    if (check.data?.available) {
      setStep(2)
    }
  }

  async function finish() {
    const weekly = draftToWeekly(hours)
    if (!weekly.ok) {
      setInvalidDay(weekly.weekday)
      return
    }
    setInvalidDay(null)
    if (!service) {
      setStep(2)
      return
    }
    // Hours and services hang off the page, so it is saved first; the screen
    // keeps the wizard up until the last write lands.
    onBusy(true)
    try {
      await savePage.mutateAsync({
        slug: slug.trim().toLowerCase(),
        displayName: displayName.trim(),
      })
      await setAvailability.mutateAsync({ weekly: weekly.weekly })
      await createService.mutateAsync(service)
      onBusy(false)
    } catch {
      return
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-5 sm:p-6">
      <header className="flex flex-col gap-1">
        <p className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
          {t.wizard.step.replace('{n}', String(step))}
        </p>
        <h1 className="text-xl font-bold tracking-tight">{t.wizard.title}</h1>
      </header>

      {step === 1 && (
        <form onSubmit={nextFromLink} className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold">{t.wizard.linkTitle}</h2>
            <p className="text-ink-500 text-sm">{t.wizard.linkHint}</p>
          </div>
          <TextField
            label={t.wizard.displayName}
            value={displayName}
            maxLength={120}
            required
            onChange={event => setDisplayName(event.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <TextField
              label={t.wizard.slug}
              value={slug}
              maxLength={40}
              autoCapitalize="none"
              spellCheck={false}
              required
              onChange={event => setSlug(event.target.value.toLowerCase())}
            />
            <p className="text-ink-500 break-all text-xs">
              {origin}/b/{slug || '...'}
            </p>
            <SlugStatus slug={slug} t={t.wizard} />
          </div>
          <Button
            type="submit"
            disabled={!check.data?.available || !displayName.trim()}
          >
            {t.wizard.next}
          </Button>
        </form>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold">{t.wizard.serviceTitle}</h2>
            <p className="text-ink-500 text-sm">{t.wizard.serviceHint}</p>
          </div>
          <ServiceForm
            submitLabel={t.wizard.next}
            pending={false}
            error={null}
            onSubmit={input => {
              setService(input)
              setStep(3)
            }}
            onCancel={() => setStep(1)}
          />
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold">{t.wizard.hoursTitle}</h2>
            <p className="text-ink-500 text-sm">{t.wizard.hoursHint}</p>
          </div>
          <WeeklyHoursEditor
            draft={hours}
            onChange={setHours}
            invalidDay={invalidDay}
            locale={locale}
            t={t.hours}
          />
          <FormError message={errorMessage(failure, t.failed)} />
          <div className="flex gap-2">
            <Button isLoading={busy} onClick={() => void finish()}>
              {t.wizard.finish}
            </Button>
            <Button variant="ghost" onClick={() => setStep(2)}>
              {t.wizard.back}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
