'use client'

import { useMemo, useState } from 'react'
import { Button, Skeleton, cn } from '@lifedeck/ui'
import type { BookableSlotView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { usePublicSlots } from '@/lib/api/use-public-booking'
import {
  formatSlotDay,
  formatSlotTime,
  groupSlotsByDay,
  slotWindow,
  timeZoneOptions,
} from '@/lib/booking/slot-days'

const WINDOW_DAYS = 7
const DAY_MS = 86_400_000

type SlotPickerProps = {
  slug: string
  serviceId: string
  timeZone: string
  onTimeZoneChange: (timeZone: string) => void
  selected: string | null
  onSelect: (slot: BookableSlotView) => void
}

export function SlotPicker({
  slug,
  serviceId,
  timeZone,
  onTimeZoneChange,
  selected,
  onSelect,
}: SlotPickerProps) {
  const { messages, locale } = useI18n()
  const t = messages.booking
  const [start] = useState(() => new Date())
  const [offset, setOffset] = useState(0)
  const [day, setDay] = useState<string | null>(null)
  const windowStart = new Date(start.getTime() + offset * WINDOW_DAYS * DAY_MS)
  const query = { serviceId, ...slotWindow(windowStart, WINDOW_DAYS) }
  const slots = usePublicSlots(slug, query)
  const days = useMemo(
    () => groupSlotsByDay(slots.data ?? [], timeZone),
    [slots.data, timeZone],
  )
  const activeDay = days.find(entry => entry.date === day) ?? days[0]
  const zones = useMemo(() => timeZoneOptions(timeZone), [timeZone])

  function move(delta: number) {
    setOffset(current => current + delta)
    setDay(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-700 font-medium">{t.timezone}</span>
        <select
          value={timeZone}
          onChange={event => onTimeZoneChange(event.target.value)}
          className="border-line bg-surface h-11 rounded-xl border-[1.5px] px-3"
        >
          {zones.map(zone => (
            <option key={zone} value={zone}>
              {zone.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-ink-600 text-sm font-medium">{t.pickDay}</h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            onClick={() => move(-1)}
            disabled={offset === 0}
            aria-label={t.previousDays}
          >
            ‹
          </Button>
          <Button
            variant="ghost"
            onClick={() => move(1)}
            aria-label={t.nextDays}
          >
            ›
          </Button>
        </div>
      </div>

      {slots.isPending && <Skeleton className="h-32 w-full rounded-2xl" />}
      {slots.isSuccess && days.length === 0 && (
        <p className="text-ink-500 text-sm">{t.noSlots}</p>
      )}

      {activeDay && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
            {days.map(entry => (
              <button
                key={entry.date}
                type="button"
                role="tab"
                aria-selected={entry.date === activeDay.date}
                onClick={() => setDay(entry.date)}
                className={cn(
                  'shrink-0 rounded-xl border-[1.5px] px-3 py-2 text-sm',
                  entry.date === activeDay.date
                    ? 'border-brand-600 bg-brand-50 text-brand-accent-strong'
                    : 'border-line',
                )}
              >
                {formatSlotDay(entry.date, locale)}
              </button>
            ))}
          </div>
          <h2 className="text-ink-600 text-sm font-medium">{t.pickTime}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {activeDay.slots.map(slot => (
              <button
                key={slot.startsAt}
                type="button"
                aria-pressed={slot.startsAt === selected}
                onClick={() => onSelect(slot)}
                className={cn(
                  'h-11 rounded-xl border-[1.5px] text-sm font-medium',
                  slot.startsAt === selected
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-line hover:border-brand-600',
                )}
              >
                {formatSlotTime(slot.startsAt, locale, timeZone)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
