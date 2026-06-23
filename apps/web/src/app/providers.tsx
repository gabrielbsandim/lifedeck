'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Locale, Messages } from '@lifedeck/i18n'
import { MessagesProvider } from '@/lib/i18n/messages-provider'

type ProvidersProps = {
  locale: Locale
  messages: Messages
  children: ReactNode
}

export function Providers({ locale, messages, children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <MessagesProvider locale={locale} messages={messages}>
        {children}
      </MessagesProvider>
    </QueryClientProvider>
  )
}
