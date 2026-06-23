'use client'

import Link from 'next/link'
import { Card, Logo } from '@lifedeck/ui'
import type { HealthStatus } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useHealth } from '@/lib/api/use-health'

const BANNER_STYLES: Record<HealthStatus, string> = {
  ok: 'bg-success/10 text-success',
  degraded: 'bg-warning/10 text-warning',
  down: 'bg-danger/10 text-danger',
}

const DOT_STYLES: Record<HealthStatus, string> = {
  ok: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-danger',
}

export function StatusScreen() {
  const { messages, locale } = useI18n()
  const health = useHealth()
  const report = health.data

  function overallLabel(status: HealthStatus): string {
    if (status === 'down') return messages.status.down
    if (status === 'degraded') return messages.status.degraded
    return messages.status.operational
  }

  function componentLabel(name: string): string {
    const labels = messages.status.components as Record<string, string>
    return labels[name] ?? name
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Logo withWordmark size={26} />
          <Link
            href="/"
            className="text-brand-600 hover:text-brand-700 text-sm font-medium"
          >
            {messages.status.backToApp}
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.status.title}
          </h1>
          <p className="text-ink-500 mt-1 text-sm">
            {messages.status.subtitle}
          </p>
        </div>
      </header>

      {health.isPending ? (
        <Card className="p-6">
          <p className="text-ink-500 text-sm">{messages.common.loading}</p>
        </Card>
      ) : !report ? (
        <Card className="p-6">
          <p className="text-danger text-sm">{messages.common.error}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className={`flex items-center gap-3 rounded-2xl px-5 py-4 ${BANNER_STYLES[report.status]}`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${DOT_STYLES[report.status]}`}
            />
            <span className="text-base font-semibold">
              {overallLabel(report.status)}
            </span>
          </div>

          <Card className="divide-line divide-y overflow-hidden">
            {report.components.map(component => (
              <div
                key={component.name}
                className="flex items-center justify-between gap-3 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${component.status === 'up' ? 'bg-success' : 'bg-danger'}`}
                  />
                  <span className="text-ink-800 text-sm font-medium">
                    {componentLabel(component.name)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink-500 text-xs tabular-nums">
                    {component.latencyMs} ms
                  </span>
                  <span
                    className={`text-xs font-medium ${component.status === 'up' ? 'text-success' : 'text-danger'}`}
                  >
                    {component.status === 'up'
                      ? messages.status.componentUp
                      : messages.status.componentDown}
                  </span>
                </div>
              </div>
            ))}
          </Card>

          <div className="text-ink-500 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              {messages.status.lastChecked}:{' '}
              {new Date(report.checkedAt).toLocaleString(locale)}
            </span>
            {report.version ? (
              <span>
                {messages.status.version}: {report.version}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}
