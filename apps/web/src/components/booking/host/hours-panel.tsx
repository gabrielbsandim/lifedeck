'use client'

import { useState } from 'react'
import { Button, Card, TextField } from '@lifedeck/ui'
import type { BookingSetupView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useDeleteAvailabilityOverride,
  useSetAvailability,
  useSetAvailabilityOverride,
} from '@/lib/api/use-booking'
import {
  draftToWeekly,
  draftToWindows,
  minutesToTime,
  weeklyToDraft,
  type DayWindowDraft,
} from '@/lib/booking/host'
import {
  CheckField,
  FormError,
  errorMessage,
} from '@/components/booking/host/fields'
import {
  WeeklyHoursEditor,
  WindowRows,
} from '@/components/booking/host/weekly-hours-editor'

function formatDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

function OverrideForm() {
  const { messages } = useI18n()
  const t = messages.bookingHost
  const [date, setDate] = useState('')
  const [closed, setClosed] = useState(true)
  const [windows, setWindows] = useState<DayWindowDraft[]>([
    { start: '09:00', end: '12:00' },
  ])
  const [invalid, setInvalid] = useState(false)
  const save = useSetAvailabilityOverride()

  function submit() {
    const parsed = closed ? [] : draftToWindows(windows)
    setInvalid(parsed === null || (!closed && parsed.length === 0))
    if (!date || parsed === null || (!closed && parsed.length === 0)) {
      return
    }
    save.mutate({ date, windows: parsed }, { onSuccess: () => setDate('') })
  }

  return (
    <div className="border-line flex flex-col gap-3 rounded-xl border p-3">
      <TextField
        label={t.hours.date}
        type="date"
        value={date}
        onChange={event => setDate(event.target.value)}
      />
      <CheckField
        label={t.hours.closedAllDay}
        checked={closed}
        onChange={setClosed}
      />
      {!closed && (
        <WindowRows
          windows={windows}
          onChange={setWindows}
          t={t.hours}
          dayLabel={date}
        />
      )}
      {invalid && (
        <p role="alert" className="text-danger text-sm">
          {t.hours.invalidDay.replace('{day}', date)}
        </p>
      )}
      <FormError message={errorMessage(save.error, t.failed)} />
      <Button
        className="self-start"
        disabled={!date}
        isLoading={save.isPending}
        onClick={submit}
      >
        {t.hours.addOverride}
      </Button>
    </div>
  )
}

export function HoursPanel({
  setup,
  timeZone,
}: {
  setup: BookingSetupView
  timeZone: string
}) {
  const { messages, locale } = useI18n()
  const t = messages.bookingHost
  const [draft, setDraft] = useState(() => weeklyToDraft(setup.weekly))
  const [invalidDay, setInvalidDay] = useState<number | null>(null)
  const save = useSetAvailability()
  const remove = useDeleteAvailabilityOverride()

  function submit() {
    const result = draftToWeekly(draft)
    if (!result.ok) {
      setInvalidDay(result.weekday)
      return
    }
    setInvalidDay(null)
    save.mutate({ weekly: result.weekly })
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold">{t.hours.weekly}</h2>
          <p className="text-ink-500 text-sm">
            {t.hours.timezoneNote.replace('{zone}', timeZone)}
          </p>
        </div>
        <WeeklyHoursEditor
          draft={draft}
          onChange={next => {
            setDraft(next)
            save.reset()
          }}
          invalidDay={invalidDay}
          locale={locale}
          t={t.hours}
        />
        <FormError message={errorMessage(save.error, t.failed)} />
        <div className="flex items-center gap-3">
          <Button isLoading={save.isPending} onClick={submit}>
            {t.save}
          </Button>
          {save.isSuccess && (
            <span role="status" className="text-success text-sm">
              {t.saved}
            </span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold">{t.hours.overrides}</h2>
          <p className="text-ink-500 text-sm">{t.hours.overridesHint}</p>
        </div>
        {setup.overrides.length === 0 && (
          <p className="text-ink-400 text-sm">{t.hours.noOverrides}</p>
        )}
        {setup.overrides.map(override => (
          <Card
            key={override.date}
            className="flex items-center justify-between gap-3 p-3"
          >
            <div className="min-w-0 text-sm">
              <p className="font-semibold capitalize">
                {formatDate(override.date, locale)}
              </p>
              <p className="text-ink-500">
                {override.windows.length === 0
                  ? t.hours.closedAllDay
                  : override.windows
                      .map(
                        window =>
                          `${minutesToTime(window.startMinute)} - ${minutesToTime(window.endMinute)}`,
                      )
                      .join(', ')}
              </p>
            </div>
            <Button
              variant="ghost"
              aria-label={`${t.hours.removeOverride} ${override.date}`}
              isLoading={remove.isPending && remove.variables === override.date}
              onClick={() => remove.mutate(override.date)}
            >
              ×
            </Button>
          </Card>
        ))}
        <OverrideForm />
      </section>
    </div>
  )
}
