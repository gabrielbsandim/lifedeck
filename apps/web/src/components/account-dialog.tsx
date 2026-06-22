'use client'

import { useState, type FormEvent } from 'react'
import { Badge, Button, Dialog, TextField } from '@taskin/ui'
import type { UserView } from '@taskin/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useChangePassword,
  useDeleteAccount,
  useRenameUser,
  useSignOut,
} from '@/lib/api/use-account'
import { useResendCode, useVerifyEmail } from '@/lib/api/use-auth'

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function AccountDialog({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user: UserView
}) {
  const { messages } = useI18n()
  const [name, setName] = useState(user.displayName)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const rename = useRenameUser()
  const changePassword = useChangePassword()
  const signOut = useSignOut()
  const deleteAccount = useDeleteAccount()
  const resend = useResendCode()
  const verify = useVerifyEmail()

  function submitRename(event: FormEvent) {
    event.preventDefault()
    rename.mutate({ displayName: name.trim() })
  }

  function submitPassword(event: FormEvent) {
    event.preventDefault()
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('')
          setNewPassword('')
        },
      },
    )
  }

  function startVerify() {
    resend.mutate()
    setVerifying(true)
  }

  function submitCode(event: FormEvent) {
    event.preventDefault()
    verify.mutate(
      { code: code.trim() },
      { onSuccess: () => setVerifying(false) },
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title={messages.auth.account}>
      <div className="flex flex-col gap-5">
        <div className="border-line flex flex-col gap-2 rounded-xl border bg-white p-3">
          <span className="text-ink-700 text-sm">{user.email}</span>
          {user.isEmailVerified ? (
            <Badge tone="shared">{messages.auth.verified}</Badge>
          ) : verifying ? (
            <form onSubmit={submitCode} className="flex flex-col gap-2">
              <TextField
                value={code}
                onChange={event => setCode(event.target.value)}
                label={messages.auth.code}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
              />
              {verify.isError && (
                <p className="text-danger text-xs">
                  {errorText(verify.error, messages.common.error)}
                </p>
              )}
              <Button
                type="submit"
                className="h-9"
                disabled={code.trim().length !== 6}
                isLoading={verify.isPending}
              >
                {messages.auth.verify}
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-500 text-xs">
                {messages.auth.unverified}
              </span>
              <Button
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={startVerify}
              >
                {messages.auth.verifyEmail}
              </Button>
            </div>
          )}
        </div>

        <form onSubmit={submitRename} className="flex flex-col gap-2">
          <TextField
            value={name}
            onChange={event => setName(event.target.value)}
            label={messages.auth.displayName}
            maxLength={80}
          />
          <Button
            type="submit"
            variant="ghost"
            className="self-start text-xs"
            isLoading={rename.isPending}
            disabled={!name.trim() || name.trim() === user.displayName}
          >
            {rename.isSuccess ? messages.auth.saved : messages.auth.rename}
          </Button>
        </form>

        <form onSubmit={submitPassword} className="flex flex-col gap-2">
          <TextField
            type="password"
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
            label={messages.auth.currentPassword}
            autoComplete="current-password"
          />
          <TextField
            type="password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            label={messages.auth.newPassword}
            autoComplete="new-password"
          />
          {changePassword.isError && (
            <p className="text-danger text-xs">
              {errorText(changePassword.error, messages.common.error)}
            </p>
          )}
          <Button
            type="submit"
            variant="ghost"
            className="self-start text-xs"
            isLoading={changePassword.isPending}
            disabled={!currentPassword || newPassword.length < 8}
          >
            {changePassword.isSuccess
              ? messages.auth.saved
              : messages.auth.changePassword}
          </Button>
        </form>

        <div className="border-line flex flex-col gap-3 border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => signOut.mutate(undefined, { onSuccess: onClose })}
            isLoading={signOut.isPending}
          >
            {messages.auth.signOut}
          </Button>

          {confirmingDelete ? (
            <div className="flex flex-col gap-2">
              <p className="text-danger text-xs">
                {messages.auth.deleteConfirm}
              </p>
              <div className="flex gap-2">
                <Button
                  className="bg-danger h-9 flex-1 text-xs hover:opacity-90"
                  isLoading={deleteAccount.isPending}
                  onClick={() =>
                    deleteAccount.mutate(undefined, { onSuccess: onClose })
                  }
                >
                  {messages.auth.confirmDelete}
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 text-xs"
                  onClick={() => setConfirmingDelete(false)}
                >
                  {messages.auth.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-danger self-start text-xs font-medium"
            >
              {messages.auth.deleteAccount}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
