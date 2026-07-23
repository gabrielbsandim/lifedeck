'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCalendarConnections,
  useConnectAppleCalendar,
  useConnectCalcomCalendar,
  useDisconnectCalendar,
  useSetDefaultCalendar,
} from '@/lib/api/use-calendar-connections'

const linkClass =
  'border-line text-ink-700 hover:bg-bg inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors'
const inputClass =
  'border-line text-ink-800 focus-visible:border-brand-600 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none'

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  calcom: 'cal.com',
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.8h5.35c-.25 1.4-1.5 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.1 12 6.1c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.7 3.5 14.6 2.6 12 2.6 6.95 2.6 2.85 6.7 2.85 12s4.1 9.4 9.15 9.4c5.28 0 8.78-3.71 8.78-8.94 0-.6-.06-1.06-.43-1.36Z"
      />
    </svg>
  )
}

function Chevron({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink-400 shrink-0"
      aria-hidden
    >
      <path d={dir === 'down' ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6'} />
    </svg>
  )
}

export function CalendarConnectionsManager({
  enabled = true,
  premium = false,
}: {
  enabled?: boolean
  premium?: boolean
}) {
  const { messages } = useI18n()
  const t = messages.calendar
  const c = t.connect
  const connections = useCalendarConnections(enabled)
  const disconnect = useDisconnectCalendar()
  const setDefault = useSetDefaultCalendar()
  const connectApple = useConnectAppleCalendar()
  const connectCalcom = useConnectCalcomCalendar()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [form, setForm] = useState<'apple' | 'calcom' | null>(null)
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  // Once at least one calendar is connected the card collapses to a compact
  // summary so it stops taking a big slice of the calendar screen; the user
  // expands it to manage connections.
  const [expanded, setExpanded] = useState(false)
  const list = connections.data ?? []
  const connected = list.length > 0

  const pending = connectApple.isPending || connectCalcom.isPending
  const error = connectApple.isError || connectCalcom.isError

  function openForm(provider: 'apple' | 'calcom') {
    setForm(provider)
    setEmail('')
    setSecret('')
    connectApple.reset()
    connectCalcom.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const done = () => setForm(null)
    if (form === 'apple') {
      connectApple.mutate({ email, appPassword: secret }, { onSuccess: done })
    } else if (form === 'calcom') {
      connectCalcom.mutate({ email, apiKey: secret }, { onSuccess: done })
    }
  }

  if (connected && !expanded) {
    const primary = list.find(item => item.isDefault) ?? list[0]
    return (
      <section className="border-line rounded-xl border">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-between gap-2 p-4 text-left"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-ink-900 shrink-0 text-sm font-semibold">
              {t.connectedCalendars}
            </span>
            <span className="text-ink-500 min-w-0 truncate text-xs">
              {primary?.accountEmail ?? t.googleAccount}
              {list.length > 1 ? ` +${list.length - 1}` : ''}
            </span>
          </span>
          <Chevron dir="down" />
        </button>
      </section>
    )
  }

  return (
    <section className="border-line flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {connected ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-ink-900 flex items-center gap-1.5 text-sm font-semibold"
          >
            {t.connectedCalendars}
            <Chevron dir="up" />
          </button>
        ) : (
          <h2 className="text-ink-900 text-sm font-semibold">
            {t.connectedCalendars}
          </h2>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/v1/calendar/google/connect" className={linkClass}>
            <GoogleGlyph />
            {list.length > 0 ? t.addAnotherCalendar : t.connectGoogle}
          </a>
          {premium && (
            <>
              <button
                type="button"
                onClick={() => openForm('apple')}
                className={linkClass}
              >
                {c.connectApple}
              </button>
              <button
                type="button"
                onClick={() => openForm('calcom')}
                className={linkClass}
              >
                {c.connectCalcom}
              </button>
            </>
          )}
        </div>
      </div>

      {form && (
        <form
          onSubmit={submit}
          className="border-line flex flex-col gap-2 rounded-lg border bg-white/50 p-3"
        >
          <input
            type="email"
            required
            value={email}
            placeholder={form === 'apple' ? c.appleEmail : c.calcomEmail}
            aria-label={form === 'apple' ? c.appleEmail : c.calcomEmail}
            onChange={e => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            value={secret}
            placeholder={form === 'apple' ? c.applePassword : c.calcomApiKey}
            aria-label={form === 'apple' ? c.applePassword : c.calcomApiKey}
            onChange={e => setSecret(e.target.value)}
            className={inputClass}
          />
          <p className="text-ink-500 text-xs">
            {form === 'apple' ? c.applePasswordHint : c.calcomReadOnly}
          </p>
          {error && <p className="text-xs text-red-600">{c.connectError}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? c.connecting : c.connect}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              {c.cancel}
            </Button>
          </div>
        </form>
      )}

      {list.length > 0 && (
        <ul className="flex flex-col divide-y divide-[color:var(--line,#e5e7eb)]">
          {list.map(connection => (
            <li key={connection.id} className="flex flex-col gap-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="text-ink-700 truncate text-sm">
                    {connection.accountEmail ?? t.googleAccount}
                  </span>
                  <span className="text-ink-400 shrink-0 text-xs">
                    {PROVIDER_LABEL[connection.provider] ?? connection.provider}
                  </span>
                  {connection.isDefault && (
                    <span className="shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {t.defaultCalendar}
                    </span>
                  )}
                </div>
                {confirmingId !== connection.id && (
                  <div className="flex shrink-0 items-center gap-3">
                    {!connection.isDefault && (
                      <button
                        type="button"
                        onClick={() => setDefault.mutate(connection.id)}
                        disabled={setDefault.isPending}
                        className="text-ink-600 text-xs hover:underline disabled:opacity-50"
                      >
                        {t.makeDefault}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmingId(connection.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      {t.disconnectCalendar}
                    </button>
                  </div>
                )}
              </div>
              {confirmingId === connection.id && (
                <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
                  <p className="text-xs text-red-700">{t.disconnectConfirm}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        disconnect.mutate(connection.id)
                        setConfirmingId(null)
                      }}
                      disabled={disconnect.isPending}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {t.disconnectCalendar}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="text-ink-600 px-2 text-xs font-medium hover:underline"
                    >
                      {c.cancel}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-ink-500 text-xs">{t.defaultCalendarHint}</p>
    </section>
  )
}
