'use client'

import { useEffect } from 'react'
import { Toast } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import type { MutationFailure } from '@/lib/api/mutation-feedback'
import { CloseIcon } from '@/components/icons'

const VISIBLE_MS = 6000

export type MutationNotice = { failure: MutationFailure }

export function MutationToast({
  notice,
  onDismiss,
}: {
  notice: MutationNotice | null
  onDismiss: () => void
}) {
  const { messages } = useI18n()

  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = setTimeout(onDismiss, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [notice, onDismiss])

  if (!notice) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-6">
      <Toast
        tone="error"
        className="pointer-events-auto w-full max-w-md"
        action={
          <button
            type="button"
            onClick={onDismiss}
            aria-label={messages.common.dismiss}
            className="text-ink-400 hover:text-ink-700 -mr-1 flex h-8 w-8 flex-none items-center justify-center rounded-lg"
          >
            <CloseIcon size={16} />
          </button>
        }
      >
        {messages.common[notice.failure]}
      </Toast>
    </div>
  )
}
