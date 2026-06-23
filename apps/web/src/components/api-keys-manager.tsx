'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { API_SCOPES, type ApiScope } from '@lifedeck/domain'
import type { ApiKeyView, CreatedApiKeyView } from '@lifedeck/application'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  TextField,
} from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from '@/lib/api/use-api-keys'

function formatDate(value: string | null, locale: string): string {
  return value ? new Date(value).toLocaleDateString(locale) : ''
}

function keyState(key: ApiKeyView): 'active' | 'revoked' | 'expired' {
  if (key.revokedAt) {
    return 'revoked'
  }
  if (key.expiresAt && new Date(key.expiresAt) <= new Date()) {
    return 'expired'
  }
  return 'active'
}

export function ApiKeysManager() {
  const { messages, locale } = useI18n()
  const t = messages.developers
  const keys = useApiKeys()
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()

  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiScope[]>(['tasks:read'])
  const [expiresInDays, setExpiresInDays] = useState('')
  const [created, setCreated] = useState<CreatedApiKeyView | null>(null)
  const [copied, setCopied] = useState(false)

  function toggleScope(scope: ApiScope) {
    setScopes(current =>
      current.includes(scope)
        ? current.filter(value => value !== scope)
        : [...current, scope],
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const days = Number(expiresInDays)
    createKey.mutate(
      {
        name: name.trim(),
        scopes,
        expiresInDays: Number.isFinite(days) && days > 0 ? days : undefined,
      },
      {
        onSuccess: result => {
          setCreated(result)
          setCopied(false)
          setName('')
          setScopes(['tasks:read'])
          setExpiresInDays('')
        },
      },
    )
  }

  async function copySecret() {
    if (created) {
      await navigator.clipboard.writeText(created.secret)
      setCopied(true)
    }
  }

  const items = keys.data ?? []

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-ink-500 text-sm">{t.subtitle}</p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/docs"
            className="text-brand-600 text-sm font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.docsLink} →
          </Link>
          <Link href="/status" className="text-brand-600 text-sm font-medium">
            {messages.status.title} →
          </Link>
        </div>
      </header>

      {created ? (
        <Card className="border-brand-200 bg-brand-50 flex flex-col gap-3">
          <span className="text-ink-800 text-sm font-semibold">
            {t.createdTitle}
          </span>
          <p className="text-ink-500 text-xs">{t.createdHint}</p>
          <code className="bg-ink-900 overflow-x-auto rounded-lg px-3 py-2 text-xs text-white">
            {created.secret}
          </code>
          <div className="flex gap-2">
            <Button className="h-9 text-xs" onClick={copySecret}>
              {copied ? t.copied : t.copy}
            </Button>
            <Button
              variant="ghost"
              className="h-9 text-xs"
              onClick={() => setCreated(null)}
            >
              {t.done}
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <TextField
              value={name}
              onChange={event => setName(event.target.value)}
              label={t.name}
              placeholder={t.namePlaceholder}
              maxLength={80}
            />
            <fieldset className="flex flex-col gap-2">
              <legend className="text-ink-700 mb-1 text-sm font-medium">
                {t.scopes}
              </legend>
              <div className="flex flex-wrap gap-2">
                {API_SCOPES.map(scope => {
                  const checked = scopes.includes(scope)
                  return (
                    <label
                      key={scope}
                      className={
                        checked
                          ? 'border-brand-300 bg-brand-50 text-brand-700 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium'
                          : 'border-line text-ink-600 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium'
                      }
                    >
                      <input
                        type="checkbox"
                        className="accent-brand-600"
                        checked={checked}
                        onChange={() => toggleScope(scope)}
                      />
                      {scope}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <TextField
              type="number"
              value={expiresInDays}
              onChange={event => setExpiresInDays(event.target.value)}
              label={t.expiry}
              placeholder={t.noExpiry}
              min={1}
              max={365}
            />
            <Button
              type="submit"
              className="self-start"
              isLoading={createKey.isPending}
              disabled={!name.trim() || scopes.length === 0}
            >
              {t.generate}
            </Button>
          </form>
        </Card>
      )}

      {keys.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={t.empty} />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(key => {
            const state = keyState(key)
            return (
              <li key={key.id}>
                <Card className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-ink-800 truncate text-sm font-semibold">
                        {key.name}
                      </span>
                      <code className="text-ink-500 text-xs">
                        {key.prefix}…
                      </code>
                    </div>
                    {state === 'expired' ? (
                      <Badge tone="neutral">{t.expiredBadge}</Badge>
                    ) : state === 'revoked' ? (
                      <Badge tone="neutral">{t.revokedBadge}</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        className="text-danger h-8 px-2 text-xs"
                        isLoading={
                          revokeKey.isPending && revokeKey.variables === key.id
                        }
                        onClick={() => revokeKey.mutate(key.id)}
                      >
                        {t.revoke}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {key.scopes.map(scope => (
                      <span
                        key={scope}
                        className="bg-bg text-ink-500 rounded px-1.5 py-0.5 text-[11px]"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                  <span className="text-ink-400 text-xs">
                    {key.lastUsedAt
                      ? `${t.lastUsed}: ${formatDate(key.lastUsedAt, locale)}`
                      : t.neverUsed}
                  </span>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
