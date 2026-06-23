'use client'

import { useState, type FormEvent } from 'react'
import { Button, Card, TextField } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useCreateGuest } from '@/lib/api/use-session'
import { AuthDialog } from '@/components/auth-dialog'

export function OnboardingCard() {
  const { messages, locale } = useI18n()
  const [name, setName] = useState('')
  const [signInOpen, setSignInOpen] = useState(false)
  const createGuest = useCreateGuest()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const displayName = name.trim()
    if (!displayName) {
      return
    }
    createGuest.mutate({ displayName, locale })
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {messages.onboarding.title}
      </h1>
      <p className="text-ink-500 mt-1 text-sm">
        {messages.onboarding.subtitle}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <TextField
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder={messages.onboarding.namePlaceholder}
          aria-label={messages.onboarding.namePlaceholder}
          autoFocus
          maxLength={80}
        />
        <Button
          type="submit"
          isLoading={createGuest.isPending}
          disabled={!name.trim()}
        >
          {messages.onboarding.start}
        </Button>
        {createGuest.isError && (
          <p className="text-danger text-sm">{messages.common.error}</p>
        )}
      </form>

      <button
        type="button"
        onClick={() => setSignInOpen(true)}
        className="text-brand-600 hover:text-brand-700 mt-4 text-sm font-medium"
      >
        {messages.auth.haveAccount}
      </button>

      <AuthDialog
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        initialMode="signin"
      />
    </Card>
  )
}
