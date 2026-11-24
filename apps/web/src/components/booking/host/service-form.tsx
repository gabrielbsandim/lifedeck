'use client'

import { useState, type FormEvent } from 'react'
import { Button, TextField } from '@lifedeck/ui'
import type {
  BookingServiceInput,
  BookingServiceView,
} from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { placeLabel } from '@/components/booking/booking-page-view'
import {
  CheckField,
  FormError,
  SelectField,
} from '@/components/booking/host/fields'

const DURATIONS = [15, 20, 30, 45, 60, 90, 120]
const NOTICES = [0, 60, 120, 240, 720, 1440, 2880]
const BREAKS = [0, 5, 10, 15, 30]
const KINDS = ['online-meet', 'online-link', 'in-person', 'phone'] as const

type Draft = {
  name: string
  description: string
  durationMin: number
  kind: string
  url: string
  address: string
  priceLabel: string
  requiresApproval: boolean
  minNoticeMin: number
  bufferAfterMin: number
}

function toDraft(service?: BookingServiceView): Draft {
  return {
    name: service?.name ?? '',
    description: service?.description ?? '',
    durationMin: service?.durationMin ?? 30,
    kind: service?.location.kind ?? 'online-meet',
    url: service?.location.url ?? '',
    address: service?.location.address ?? '',
    priceLabel: service?.priceLabel ?? '',
    requiresApproval: service?.requiresApproval ?? false,
    minNoticeMin: service?.minNoticeMin ?? 120,
    bufferAfterMin: service?.bufferAfterMin ?? 0,
  }
}

function toInput(draft: Draft): BookingServiceInput {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    durationMin: draft.durationMin,
    location: {
      kind: draft.kind,
      url: draft.kind === 'online-link' ? draft.url.trim() : null,
      address: draft.kind === 'in-person' ? draft.address.trim() : null,
    },
    priceLabel: draft.priceLabel.trim() || null,
    requiresApproval: draft.requiresApproval,
    minNoticeMin: draft.minNoticeMin,
    bufferAfterMin: draft.bufferAfterMin,
  }
}

export function ServiceForm({
  service,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  service?: BookingServiceView
  submitLabel: string
  pending: boolean
  error: string | null
  onSubmit: (input: BookingServiceInput) => void
  onCancel?: () => void
}) {
  const { messages } = useI18n()
  const t = messages.bookingHost
  const [draft, setDraft] = useState(() => toDraft(service))
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch })
  const minutes = (n: number) =>
    messages.booking.minutes.replace('{n}', String(n))
  const notice = (n: number) =>
    n < 60 ? minutes(n) : t.services.hours.replace('{n}', String(n / 60))

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit(toInput(draft))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextField
        label={t.services.name}
        value={draft.name}
        maxLength={120}
        required
        onChange={event => set({ name: event.target.value })}
      />
      <TextField
        label={t.services.description}
        value={draft.description}
        maxLength={2000}
        onChange={event => set({ description: event.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label={t.services.duration}
          value={draft.durationMin}
          onChange={event => set({ durationMin: Number(event.target.value) })}
        >
          {DURATIONS.map(n => (
            <option key={n} value={n}>
              {minutes(n)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t.services.location}
          value={draft.kind}
          onChange={event => set({ kind: event.target.value })}
        >
          {KINDS.map(kind => (
            <option key={kind} value={kind}>
              {placeLabel(messages.booking, kind)}
            </option>
          ))}
        </SelectField>
      </div>
      {draft.kind === 'online-link' && (
        <TextField
          label={t.services.url}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={draft.url}
          maxLength={500}
          required
          onChange={event => set({ url: event.target.value })}
        />
      )}
      {draft.kind === 'in-person' && (
        <TextField
          label={t.services.address}
          value={draft.address}
          maxLength={300}
          required
          onChange={event => set({ address: event.target.value })}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label={t.services.minNotice}
          value={draft.minNoticeMin}
          onChange={event => set({ minNoticeMin: Number(event.target.value) })}
        >
          {NOTICES.map(n => (
            <option key={n} value={n}>
              {notice(n)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t.services.bufferAfter}
          value={draft.bufferAfterMin}
          onChange={event =>
            set({ bufferAfterMin: Number(event.target.value) })
          }
        >
          {BREAKS.map(n => (
            <option key={n} value={n}>
              {minutes(n)}
            </option>
          ))}
        </SelectField>
      </div>
      <TextField
        label={t.services.price}
        value={draft.priceLabel}
        maxLength={60}
        onChange={event => set({ priceLabel: event.target.value })}
      />
      <CheckField
        label={t.services.approval}
        hint={t.services.approvalHint}
        checked={draft.requiresApproval}
        onChange={requiresApproval => set({ requiresApproval })}
      />
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" isLoading={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
        )}
      </div>
    </form>
  )
}
