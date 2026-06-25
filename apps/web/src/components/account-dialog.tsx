'use client'

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  PasswordField,
  TextField,
} from '@lifedeck/ui'
import type { SessionUser } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useChangePassword,
  useDeleteAccount,
  useRemoveAvatar,
  useRenameUser,
  useSetCarryOverMode,
  useSetTimezone,
  useSignOut,
  useUploadAvatar,
} from '@/lib/api/use-account'
import { browserTimeZone } from '@/lib/api/dates'
import { resizeImageToSquare } from '@/lib/api/image'
import { useResendCode, useVerifyEmail } from '@/lib/api/use-auth'

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function listTimeZones(current: string): string[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : []
  const zones = new Set<string>(['UTC', ...supported])
  zones.add(current)
  return Array.from(zones).sort()
}

export function AccountDialog({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user: SessionUser
}) {
  const { messages } = useI18n()
  const [name, setName] = useState(user.displayName)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const rename = useRenameUser()
  const setCarryOverMode = useSetCarryOverMode()
  const setTimezone = useSetTimezone()
  const uploadAvatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const changePassword = useChangePassword()
  const signOut = useSignOut()
  const deleteAccount = useDeleteAccount()
  const resend = useResendCode()
  const verify = useVerifyEmail()
  const photoInput = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState(false)

  async function onPickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    setPhotoError(false)
    try {
      const image = await resizeImageToSquare(file)
      uploadAvatar.mutate(image)
    } catch {
      setPhotoError(true)
    }
  }

  const timeZones = useMemo(() => listTimeZones(user.timezone), [user.timezone])
  const detectedZone = browserTimeZone()

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
        <div className="flex items-center gap-4">
          <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
          <div className="flex flex-col gap-1.5">
            <span className="text-ink-700 text-sm font-medium">
              {messages.auth.photo}
            </span>
            <div className="flex items-center gap-2">
              <input
                ref={photoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onPickPhoto}
              />
              <Button
                variant="ghost"
                className="h-8 px-3 text-xs"
                isLoading={uploadAvatar.isPending}
                onClick={() => photoInput.current?.click()}
              >
                {messages.auth.changePhoto}
              </Button>
              {user.avatarUrl && (
                <button
                  type="button"
                  onClick={() => removeAvatar.mutate()}
                  disabled={removeAvatar.isPending}
                  className="text-ink-500 hover:text-danger text-xs font-medium"
                >
                  {messages.auth.removePhoto}
                </button>
              )}
            </div>
            {photoError || uploadAvatar.isError ? (
              <span className="text-danger text-xs">
                {messages.common.error}
              </span>
            ) : (
              <span className="text-ink-400 text-xs">
                {messages.auth.photoHint}
              </span>
            )}
          </div>
        </div>

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

        {user.hasPassword && (
          <form onSubmit={submitPassword} className="flex flex-col gap-2">
            <PasswordField
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              label={messages.auth.currentPassword}
              showLabel={messages.auth.showPassword}
              hideLabel={messages.auth.hidePassword}
              autoComplete="current-password"
            />
            <PasswordField
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              label={messages.auth.newPassword}
              showLabel={messages.auth.showPassword}
              hideLabel={messages.auth.hidePassword}
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
        )}

        <div className="border-line flex flex-col gap-2 border-t pt-4">
          <span className="text-ink-700 text-sm font-medium">
            {messages.carryOver.settingLabel}
          </span>
          <p className="text-ink-500 text-xs">
            {messages.carryOver.settingHint}
          </p>
          <div className="flex flex-col gap-1.5 sm:flex-row">
            {(['manual', 'auto'] as const).map(mode => {
              const active = user.carryOverMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCarryOverMode.mutate(mode)}
                  disabled={setCarryOverMode.isPending}
                  className={
                    active
                      ? 'border-brand-300 bg-brand-50 text-brand-700 flex-1 rounded-lg border px-3 py-2 text-xs font-medium'
                      : 'border-line text-ink-600 flex-1 rounded-lg border px-3 py-2 text-xs font-medium'
                  }
                >
                  {mode === 'manual'
                    ? messages.carryOver.modeManual
                    : messages.carryOver.modeAuto}
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-line flex flex-col gap-2 border-t pt-4">
          <span className="text-ink-700 text-sm font-medium">
            {messages.timezone.settingLabel}
          </span>
          <p className="text-ink-500 text-xs">
            {messages.timezone.settingHint}
          </p>
          <select
            value={user.timezone}
            onChange={event => setTimezone.mutate(event.target.value)}
            disabled={setTimezone.isPending}
            aria-label={messages.timezone.settingLabel}
            className="border-line text-ink-700 focus:border-brand-300 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none"
          >
            {timeZones.map(zone => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          {user.timezone !== detectedZone && (
            <button
              type="button"
              onClick={() => setTimezone.mutate(detectedZone)}
              disabled={setTimezone.isPending}
              className="text-brand-600 hover:text-brand-700 self-start text-xs font-medium"
            >
              {messages.timezone.useDetected}
            </button>
          )}
        </div>

        {user.features?.billing && (
          <div className="border-line flex flex-col gap-2 border-t pt-4">
            <span className="text-ink-700 text-sm font-medium">
              {messages.billing.title}
            </span>
            <a
              href="/settings/billing"
              onClick={onClose}
              className="text-brand-600 hover:text-brand-700 self-start text-xs font-medium"
            >
              {messages.billing.manage}
            </a>
          </div>
        )}

        <div className="border-line flex flex-col gap-3 border-t pt-4">
          <a
            href="/api/v1/account/export"
            download="lifedeck-export.json"
            className="text-brand-600 hover:text-brand-700 self-start text-xs font-medium"
            title={messages.auth.exportDataHint}
          >
            {messages.auth.exportData}
          </a>
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
