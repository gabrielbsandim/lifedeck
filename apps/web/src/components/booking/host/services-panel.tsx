'use client'

import { useState } from 'react'
import { Badge, Button, Card, Dialog, EmptyState } from '@lifedeck/ui'
import type { BookingServiceView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useArchiveBookingService,
  useCreateBookingService,
  useReorderBookingServices,
  useUpdateBookingService,
} from '@/lib/api/use-booking'
import { placeLabel } from '@/components/booking/booking-page-view'
import { errorMessage } from '@/components/booking/host/fields'
import { ServiceForm } from '@/components/booking/host/service-form'

type Editing = { service: BookingServiceView | null } | null

function swap(ids: string[], index: number, delta: number): string[] {
  const next = [...ids]
  const target = index + delta
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

export function ServicesPanel({
  services,
}: {
  services: BookingServiceView[]
}) {
  const { messages } = useI18n()
  const t = messages.bookingHost
  const [editing, setEditing] = useState<Editing>(null)
  const create = useCreateBookingService()
  const update = useUpdateBookingService()
  const archive = useArchiveBookingService()
  const reorder = useReorderBookingServices()
  const active = services
    .filter(service => service.active)
    .sort((a, b) => a.position - b.position)
  const ids = active.map(service => service.id)
  const saving = create.isPending || update.isPending
  const close = () => {
    create.reset()
    update.reset()
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {active.length === 0 && <EmptyState title={t.services.empty} />}
      {active.map((service, index) => (
        <Card key={service.id} className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{service.name}</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge>
                  {messages.booking.minutes.replace(
                    '{n}',
                    String(service.durationMin),
                  )}
                </Badge>
                <Badge>
                  {placeLabel(messages.booking, service.location.kind)}
                </Badge>
                {service.requiresApproval && (
                  <Badge tone="brand">{messages.booking.needsApproval}</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-none gap-1">
              <button
                type="button"
                aria-label={`${t.services.moveUp} ${service.name}`}
                disabled={index === 0}
                onClick={() => reorder.mutate(swap(ids, index, -1))}
                className="text-ink-500 h-8 w-8 rounded-lg disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`${t.services.moveDown} ${service.name}`}
                disabled={index === active.length - 1}
                onClick={() => reorder.mutate(swap(ids, index, 1))}
                className="text-ink-500 h-8 w-8 rounded-lg disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing({ service })}>
              {t.edit}
            </Button>
            <Button
              variant="ghost"
              isLoading={archive.isPending && archive.variables === service.id}
              onClick={() => archive.mutate(service.id)}
            >
              {t.services.archive}
            </Button>
          </div>
        </Card>
      ))}
      <Button
        className="self-start"
        onClick={() => setEditing({ service: null })}
      >
        {t.services.add}
      </Button>

      <Dialog
        open={editing !== null}
        onClose={close}
        title={editing?.service ? editing.service.name : t.services.add}
      >
        {editing && (
          <ServiceForm
            service={editing.service ?? undefined}
            submitLabel={t.save}
            pending={saving}
            error={errorMessage(create.error ?? update.error, t.failed)}
            onCancel={close}
            onSubmit={input => {
              const id = editing.service?.id
              if (id) {
                update.mutate({ id, input }, { onSuccess: close })
                return
              }
              create.mutate(input, { onSuccess: close })
            }}
          />
        )}
      </Dialog>
    </div>
  )
}
