'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@lifedeck/ui'

export function StatusPage({
  code,
  title,
  body,
  homeLabel,
  action,
}: {
  code?: string
  title: string
  body: string
  homeLabel: string
  action?: ReactNode
}) {
  return (
    <main className="bg-bg flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <Link href="/" aria-label="Lifedeck" className="inline-flex">
        <Logo withWordmark size={28} />
      </Link>
      <div className="mt-12">
        {code && (
          <p className="text-brand-accent mb-2 text-sm font-semibold tracking-wide">
            {code}
          </p>
        )}
        <h1 className="text-ink-900 text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
      </div>
      <p className="text-ink-500 mt-3 max-w-sm text-[15px] leading-relaxed">
        {body}
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        {action}
        <Link
          href="/"
          className="border-line text-ink-700 hover:bg-surface inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-medium transition-colors"
        >
          {homeLabel}
        </Link>
      </div>
    </main>
  )
}
