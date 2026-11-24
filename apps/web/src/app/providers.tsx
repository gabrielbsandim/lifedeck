'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { Locale, Messages } from '@lifedeck/i18n'
import { MessagesProvider } from '@/lib/i18n/messages-provider'
import { createAppQueryClient } from '@/lib/api/mutation-feedback'
import { MutationToast, type MutationNotice } from '@/components/mutation-toast'

type ProvidersProps = {
  locale: Locale
  messages: Messages
  children: ReactNode
}

export function Providers({ locale, messages, children }: ProvidersProps) {
  const [notice, setNotice] = useState<MutationNotice | null>(null)
  // A new object per failure, so the same message twice restarts its timer.
  const [queryClient] = useState(() =>
    createAppQueryClient(failure => setNotice({ failure })),
  )
  const dismiss = useCallback(() => setNotice(null), [])

  return (
    <QueryClientProvider client={queryClient}>
      <MessagesProvider locale={locale} messages={messages}>
        {children}
        <MutationToast notice={notice} onDismiss={dismiss} />
      </MessagesProvider>
    </QueryClientProvider>
  )
}
