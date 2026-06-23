'use client'

import { LogoMark } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { COMPANY_CNPJ, COMPANY_EMAIL, COMPANY_NAME } from '@/lib/site'

export function SiteFooter() {
  const { messages } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-ink-900 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-12">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              <LogoMark size={24} />
            </span>
            <span className="text-lg font-bold tracking-tight">Lifedeck</span>
          </div>
          <p className="max-w-md text-balance text-sm text-white/70">
            {messages.footer.description}
          </p>
        </div>

        <div className="flex flex-col gap-1 text-sm text-white/55">
          <span className="font-medium text-white/80">{COMPANY_NAME}</span>
          <span>CNPJ: {COMPANY_CNPJ}</span>
          <a
            href={`mailto:${COMPANY_EMAIL}`}
            className="w-fit transition hover:text-white"
          >
            {COMPANY_EMAIL}
          </a>
        </div>

        <div className="border-t border-white/10 pt-6 text-xs text-white/45">
          {messages.footer.rights.replace('{year}', String(year))}
        </div>
      </div>
    </footer>
  )
}
