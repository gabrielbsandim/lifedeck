'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@lifedeck/ui'
import { SiteFooter } from '@/components/site-footer'

export function LegalShell({
  updatedAt,
  title,
  intro,
  children,
}: {
  updatedAt: string
  title: string
  intro: ReactNode
  children: ReactNode
}) {
  return (
    <div className="bg-bg flex min-h-dvh flex-col">
      <header className="border-line sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="inline-flex items-center">
            <Logo withWordmark size={26} />
          </Link>
          <Link
            href="/"
            className="text-ink-500 hover:text-ink-800 text-sm transition"
          >
            ← Voltar ao app
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">
        <p className="text-brand-600 mb-2 text-sm font-medium">{updatedAt}</p>
        <h1 className="text-ink-900 mb-6 text-4xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-ink-600 mb-12 text-base leading-relaxed">{intro}</p>
        {children}
      </main>

      <SiteFooter />
    </div>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-10">
      <h2 className="text-ink-900 mb-4 text-xl font-semibold">{title}</h2>
      <div className="text-ink-600 [&_a]:text-brand-600 [&_strong]:text-ink-800 space-y-3 text-base leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold [&_ul]:mt-2 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  )
}
