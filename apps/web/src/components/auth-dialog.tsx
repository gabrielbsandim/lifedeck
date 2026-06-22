'use client'

import { useState, type FormEvent } from 'react'
import { Button, Dialog, TextField } from '@taskin/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useRegister,
  useResendCode,
  useSignIn,
  useVerifyEmail,
} from '@/lib/api/use-auth'

type Mode = 'register' | 'signin'

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function AuthDialog({
  open,
  onClose,
  initialMode = 'register',
}: {
  open: boolean
  onClose: () => void
  initialMode?: Mode
}) {
  const { messages } = useI18n()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState('')

  const register = useRegister()
  const signIn = useSignIn()
  const verify = useVerifyEmail()
  const resend = useResendCode()

  function close() {
    setVerifying(false)
    setPassword('')
    setCode('')
    onClose()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'register') {
      register.mutate(
        { email: email.trim(), password },
        { onSuccess: () => setVerifying(true) },
      )
    } else {
      signIn.mutate({ email: email.trim(), password }, { onSuccess: close })
    }
  }

  function submitCode(event: FormEvent) {
    event.preventDefault()
    verify.mutate({ code: code.trim() }, { onSuccess: close })
  }

  const title = verifying
    ? messages.auth.verifyTitle
    : mode === 'register'
      ? messages.auth.createAccount
      : messages.auth.signIn

  return (
    <Dialog open={open} onClose={close} title={title}>
      {verifying ? (
        <form onSubmit={submitCode} className="flex flex-col gap-3">
          <p className="text-ink-500 text-sm">{messages.auth.verifySubtitle}</p>
          <TextField
            value={code}
            onChange={event => setCode(event.target.value)}
            label={messages.auth.code}
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            autoFocus
          />
          {verify.isError && (
            <p className="text-danger text-sm">
              {errorText(verify.error, messages.common.error)}
            </p>
          )}
          <Button
            type="submit"
            isLoading={verify.isPending}
            disabled={code.trim().length !== 6}
          >
            {messages.auth.verify}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => resend.mutate()}
            isLoading={resend.isPending}
          >
            {resend.isSuccess ? messages.auth.resent : messages.auth.resend}
          </Button>
        </form>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-ink-500 text-sm">
            {mode === 'register'
              ? messages.auth.createAccountSubtitle
              : messages.auth.signInSubtitle}
          </p>
          <TextField
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            label={messages.auth.email}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />
          <TextField
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            label={messages.auth.password}
            autoComplete={
              mode === 'register' ? 'new-password' : 'current-password'
            }
          />
          {(register.isError || signIn.isError) && (
            <p className="text-danger text-sm">
              {errorText(register.error ?? signIn.error, messages.common.error)}
            </p>
          )}
          <Button
            type="submit"
            isLoading={register.isPending || signIn.isPending}
            disabled={!email.trim() || !password}
          >
            {mode === 'register'
              ? messages.auth.register
              : messages.auth.signIn}
          </Button>
          <a
            href="/api/v1/auth/google"
            className="border-line text-ink-700 hover:bg-bg flex h-11 items-center justify-center rounded-xl border bg-white text-sm font-medium transition"
          >
            {messages.auth.continueWithGoogle}
          </a>
          <button
            type="button"
            onClick={() => setMode(mode === 'register' ? 'signin' : 'register')}
            className="text-brand-600 hover:text-brand-700 text-sm font-medium"
          >
            {mode === 'register'
              ? messages.auth.haveAccount
              : messages.auth.noAccount}
          </button>
        </form>
      )}
    </Dialog>
  )
}
