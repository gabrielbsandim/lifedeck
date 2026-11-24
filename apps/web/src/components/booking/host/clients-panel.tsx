'use client'

import { useState, type FormEvent } from 'react'
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Skeleton,
  TextField,
} from '@lifedeck/ui'
import type { BookingClientView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useBookingClients, useSaveBookingClient } from '@/lib/api/use-booking'
import { FormError, errorMessage } from '@/components/booking/host/fields'

type Editing = { client: BookingClientView | null } | null

function ClientForm({
  client,
  onDone,
}: {
  client: BookingClientView | null
  onDone: () => void
}) {
  const { messages } = useI18n()
  const t = messages.bookingHost
  const save = useSaveBookingClient()
  const [name, setName] = useState(client?.name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      {
        id: client?.id,
        input: {
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        },
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField
        label={t.clients.name}
        value={name}
        maxLength={120}
        required
        onChange={event => setName(event.target.value)}
      />
      <TextField
        label={t.clients.email}
        type="email"
        value={email}
        maxLength={254}
        onChange={event => setEmail(event.target.value)}
      />
      <TextField
        label={t.clients.phone}
        type="tel"
        value={phone}
        maxLength={32}
        onChange={event => setPhone(event.target.value)}
      />
      <TextField
        label={t.clients.notes}
        value={notes}
        maxLength={1000}
        onChange={event => setNotes(event.target.value)}
      />
      <FormError message={errorMessage(save.error, t.failed)} />
      <div className="flex gap-2">
        <Button type="submit" isLoading={save.isPending}>
          {t.save}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t.cancel}
        </Button>
      </div>
    </form>
  )
}

export function ClientsPanel() {
  const { messages } = useI18n()
  const t = messages.bookingHost
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const clients = useBookingClients(search)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            label={t.clients.search}
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <Button onClick={() => setEditing({ client: null })}>
          {t.clients.add}
        </Button>
      </div>
      {clients.isPending && <Skeleton className="h-32 w-full rounded-2xl" />}
      {clients.data?.length === 0 && <EmptyState title={t.clients.empty} />}
      {clients.data?.map(client => (
        <Card
          key={client.id}
          className="flex items-center justify-between gap-3 p-4"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold">{client.name}</p>
            <p className="text-ink-500 truncate text-sm">
              {[client.email, client.phone].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Button variant="ghost" onClick={() => setEditing({ client })}>
            {t.edit}
          </Button>
        </Card>
      ))}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.client?.name ?? t.clients.add}
      >
        {editing && (
          <ClientForm client={editing.client} onDone={() => setEditing(null)} />
        )}
      </Dialog>
    </div>
  )
}
