'use client'

import Link from 'next/link'
import { Logo } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { SiteFooter } from '@/components/site-footer'
import { renderRichText } from '@/components/legal/rich-text'

export function LegalScreen({ doc }: { doc: 'terms' | 'privacy' }) {
  const { messages } = useI18n()
  const content = messages.legal[doc]

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
            ← {messages.legal.backToApp}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">
        <p className="text-brand-600 mb-2 text-sm font-medium">
          {messages.legal.updatedAt}
        </p>
        <h1 className="text-ink-900 mb-6 text-4xl font-bold tracking-tight">
          {content.title}
        </h1>
        <p className="text-ink-600 mb-12 text-base leading-relaxed">
          {renderRichText(content.intro)}
        </p>

        {content.sections.map(section => (
          <section key={section.title} className="mb-10">
            <h2 className="text-ink-900 mb-4 text-xl font-semibold">
              {section.title}
            </h2>
            <div className="text-ink-600 [&_a]:text-brand-600 [&_strong]:text-ink-800 space-y-3 text-base leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold [&_ul]:mt-2 [&_ul]:space-y-1.5">
              {section.blocks.map((block, index) =>
                block.kind === 'p' ? (
                  <p key={index}>{renderRichText(block.text)}</p>
                ) : (
                  <ul key={index}>
                    {block.items.map((item, itemIndex) => (
                      <li key={itemIndex}>{renderRichText(item)}</li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          </section>
        ))}
      </main>

      <SiteFooter />
    </div>
  )
}
