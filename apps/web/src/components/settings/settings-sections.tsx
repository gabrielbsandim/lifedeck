'use client'

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import Link from 'next/link'
import { Avatar, Badge, Button, cn } from '@lifedeck/ui'
import type { WeatherLocationResolution } from '@lifedeck/application'
import type { SessionUser } from '@/lib/api/use-session'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useChangePassword,
  useDeleteAccount,
  useRemoveAvatar,
  useRenameUser,
  useSetCarryOverMode,
  usePreviewWeatherLocation,
  useSetReminderPreferences,
  useSetTimezone,
  useSetWeatherLocation,
  useSignOut,
  useUploadAvatar,
} from '@/lib/api/use-account'
import {
  useCancelSubscription,
  useSubscription,
} from '@/lib/api/use-subscription'
import { browserTimeZone } from '@/lib/api/dates'
import { resizeImageToSquare } from '@/lib/api/image'
import { useResendCode, useVerifyEmail } from '@/lib/api/use-auth'
import { ConnectionsPanel } from '@/components/connections/connections-panel'
import { CheckSquareIcon, DeckGlyph } from '@/components/icons'
import {
  SectionCard,
  SegmentedControl,
  Toggle,
} from '@/components/settings/settings-ui'
import {
  planName,
  renewLine,
  subscriptionBadge,
} from '@/lib/billing/plan-display'

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

const inputClass =
  'border-line text-ink-800 focus:border-brand-300 h-[42px] w-full rounded-xl border-[1.5px] bg-white px-3.5 text-sm outline-none'

const fieldLabelClass = 'text-ink-700 text-[13px] font-semibold'

// ───────────────────────── Profile ─────────────────────────

export function ProfileSection({ user }: { user: SessionUser }) {
  const { messages } = useI18n()
  const [name, setName] = useState(user.displayName)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [photoError, setPhotoError] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)

  const rename = useRenameUser()
  const uploadAvatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const resend = useResendCode()
  const verify = useVerifyEmail()

  async function onPickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    setPhotoError(false)
    try {
      uploadAvatar.mutate(await resizeImageToSquare(file))
    } catch {
      setPhotoError(true)
    }
  }

  function submitRename(event: FormEvent) {
    event.preventDefault()
    rename.mutate({ displayName: name.trim() })
  }

  function submitCode(event: FormEvent) {
    event.preventDefault()
    verify.mutate(
      { code: code.trim() },
      { onSuccess: () => setVerifying(false) },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard className="flex flex-wrap items-center gap-4">
        <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-ink-900 text-[15px] font-semibold">
            {messages.auth.photo}
          </p>
          <p className="text-ink-400 mt-0.5 text-xs">
            {messages.auth.photoHint}
          </p>
          {(photoError || uploadAvatar.isError) && (
            <p className="text-danger mt-1 text-xs">{messages.common.error}</p>
          )}
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onPickPhoto}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            disabled={uploadAvatar.isPending}
            className="border-line text-ink-700 hover:bg-bg h-9 rounded-[10px] border bg-white px-3.5 text-[13px] font-semibold disabled:opacity-50"
          >
            {messages.auth.changePhoto}
          </button>
          {user.avatarUrl && (
            <button
              type="button"
              onClick={() => removeAvatar.mutate()}
              disabled={removeAvatar.isPending}
              className="text-ink-500 hover:text-danger h-9 rounded-[10px] px-3 text-[13px] font-semibold disabled:opacity-50"
            >
              {messages.auth.removePhoto}
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard className="flex flex-col gap-4">
        <form onSubmit={submitRename} className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>{messages.auth.displayName}</span>
          <div className="flex gap-2">
            <input
              value={name}
              maxLength={80}
              onChange={event => setName(event.target.value)}
              aria-label={messages.auth.displayName}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={
                rename.isPending ||
                !name.trim() ||
                name.trim() === user.displayName
              }
              className="bg-brand-50 text-brand-700 h-[42px] shrink-0 rounded-xl px-4 text-[13px] font-semibold disabled:opacity-50"
            >
              {rename.isSuccess ? messages.auth.saved : messages.auth.rename}
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>{messages.auth.email}</span>
          <div className="border-line flex flex-col gap-2 rounded-xl border px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-800 min-w-0 truncate text-sm">
                {user.email}
              </span>
              {user.isEmailVerified ? (
                <Badge tone="success" className="shrink-0">
                  <CheckSquareIcon size={11} />
                  {messages.auth.verified}
                </Badge>
              ) : (
                !verifying && (
                  <button
                    type="button"
                    onClick={() => {
                      resend.mutate()
                      setVerifying(true)
                    }}
                    className="text-brand-600 shrink-0 text-[13px] font-semibold"
                  >
                    {messages.auth.verifyEmail}
                  </button>
                )
              )}
            </div>
            {verifying && !user.isEmailVerified && (
              <form onSubmit={submitCode} className="flex flex-col gap-2">
                <input
                  value={code}
                  onChange={event => setCode(event.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  aria-label={messages.auth.code}
                  className={inputClass}
                />
                {verify.isError && (
                  <p className="text-danger text-xs">
                    {errorText(verify.error, messages.common.error)}
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-10 self-start px-5"
                  disabled={code.trim().length !== 6}
                  isLoading={verify.isPending}
                >
                  {messages.auth.verify}
                </Button>
              </form>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ─────────────────────── Connections ───────────────────────

export function ConnectionsSection() {
  return <ConnectionsPanel />
}

// ─────────────────────── Preferences ───────────────────────

export function PreferencesSection({ user }: { user: SessionUser }) {
  const { messages } = useI18n()
  const setCarryOverMode = useSetCarryOverMode()
  const setReminders = useSetReminderPreferences()
  const setTimezone = useSetTimezone()
  const setWeatherLocation = useSetWeatherLocation()
  const previewWeatherLocation = usePreviewWeatherLocation()

  const timeZones = useMemo(() => listTimeZones(user.timezone), [user.timezone])
  const detectedZone = browserTimeZone()

  const [weatherLocation, setWeatherLocationDraft] = useState(
    user.weatherLocation ?? '',
  )
  // Holds the last geocoder check tied to the exact text it ran on, so a stale
  // result never shows against a since-edited value.
  const [weatherPreview, setWeatherPreview] = useState<{
    for: string
    result: WeatherLocationResolution
  } | null>(null)
  const savedWeatherLocation = user.weatherLocation ?? ''
  const trimmedWeatherLocation = weatherLocation.trim()
  const weatherLocationDirty = trimmedWeatherLocation !== savedWeatherLocation

  const checkWeatherLocation = () => {
    if (trimmedWeatherLocation === '' || !weatherLocationDirty) {
      setWeatherPreview(null)
      return
    }
    previewWeatherLocation.mutate(trimmedWeatherLocation, {
      onSuccess: result =>
        setWeatherPreview({ for: trimmedWeatherLocation, result }),
      onError: () => setWeatherPreview(null),
    })
  }
  const previewForCurrent =
    weatherPreview && weatherPreview.for === trimmedWeatherLocation
      ? weatherPreview.result
      : null
  const weatherLocationNotFound =
    previewForCurrent !== null &&
    !previewForCurrent.ok &&
    previewForCurrent.reason === 'not_found'
  const saveWeatherLocation = () => {
    if (!weatherLocationDirty || weatherLocationNotFound) return
    setWeatherLocation.mutate(
      trimmedWeatherLocation === '' ? null : trimmedWeatherLocation,
    )
    setWeatherPreview(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard className="flex flex-col gap-2.5">
        <span className="text-ink-900 text-sm font-semibold">
          {messages.carryOver.settingLabel}
        </span>
        <SegmentedControl
          className="max-w-md"
          value={user.carryOverMode}
          disabled={setCarryOverMode.isPending}
          onChange={mode => setCarryOverMode.mutate(mode)}
          options={[
            { value: 'manual', label: messages.carryOver.modeManual },
            { value: 'auto', label: messages.carryOver.modeAuto },
          ]}
        />
        <p className="text-ink-500 text-xs leading-relaxed">
          {messages.carryOver.settingHint}
        </p>
      </SectionCard>

      <SectionCard className="flex flex-col gap-3">
        <span className="text-ink-900 text-sm font-semibold">
          {messages.reminders.settingLabel}
        </span>
        {(
          [
            { key: 'email', label: messages.reminders.email },
            { key: 'whatsapp', label: messages.reminders.whatsapp },
          ] as const
        ).map(({ key, label }) => {
          const enabled =
            key === 'email' ? user.reminderEmail : user.reminderWhatsapp
          return (
            <div
              key={key}
              className="flex max-w-md items-center justify-between gap-3"
            >
              <span className="text-ink-700 text-sm">{label}</span>
              <Toggle
                label={label}
                checked={enabled}
                disabled={setReminders.isPending}
                onChange={() => setReminders.mutate({ [key]: !enabled })}
              />
            </div>
          )
        })}
        <p className="text-ink-500 text-xs leading-relaxed">
          {messages.reminders.settingHint}
        </p>
      </SectionCard>

      <SectionCard className="flex flex-col gap-2.5">
        <span className="text-ink-900 text-sm font-semibold">
          {messages.timezone.settingLabel}
        </span>
        <select
          value={user.timezone}
          onChange={event => setTimezone.mutate(event.target.value)}
          disabled={setTimezone.isPending}
          aria-label={messages.timezone.settingLabel}
          className="border-line text-ink-700 focus:border-brand-300 h-[42px] w-full max-w-md rounded-xl border bg-white px-3.5 text-sm outline-none"
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
            className="text-brand-600 self-start text-[13px] font-semibold"
          >
            {messages.timezone.useDetected}
          </button>
        )}
        <p className="text-ink-500 text-xs leading-relaxed">
          {messages.timezone.settingHint}
        </p>
      </SectionCard>

      <SectionCard className="flex flex-col gap-2.5">
        <span className="text-ink-900 text-sm font-semibold">
          {messages.weatherLocation.settingLabel}
        </span>
        <form
          className="flex max-w-md flex-wrap items-center gap-2"
          onSubmit={event => {
            event.preventDefault()
            saveWeatherLocation()
          }}
        >
          <input
            type="text"
            value={weatherLocation}
            maxLength={160}
            onChange={event => {
              setWeatherLocationDraft(event.target.value)
              setWeatherPreview(null)
            }}
            onBlur={checkWeatherLocation}
            disabled={setWeatherLocation.isPending}
            placeholder={messages.weatherLocation.placeholder}
            aria-label={messages.weatherLocation.settingLabel}
            className="border-line text-ink-700 focus:border-brand-300 h-[42px] min-w-0 flex-1 rounded-xl border bg-white px-3.5 text-sm outline-none"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={
              !weatherLocationDirty ||
              weatherLocationNotFound ||
              setWeatherLocation.isPending
            }
          >
            {messages.weatherLocation.save}
          </Button>
        </form>
        {weatherLocationDirty && previewWeatherLocation.isPending && (
          <p className="text-ink-500 text-xs">
            {messages.weatherLocation.checking}
          </p>
        )}
        {!previewWeatherLocation.isPending && previewForCurrent?.ok && (
          <p className="text-xs font-medium text-emerald-600">
            {messages.weatherLocation.found}: {previewForCurrent.location}
          </p>
        )}
        {!previewWeatherLocation.isPending && weatherLocationNotFound && (
          <p className="text-xs font-medium text-red-600">
            {messages.weatherLocation.notFound}
          </p>
        )}
        {savedWeatherLocation !== '' && (
          <button
            type="button"
            onClick={() => {
              setWeatherLocationDraft('')
              setWeatherLocation.mutate(null)
            }}
            disabled={setWeatherLocation.isPending}
            className="text-brand-600 self-start text-[13px] font-semibold"
          >
            {messages.weatherLocation.clear}
          </button>
        )}
        <p className="text-ink-500 text-xs leading-relaxed">
          {messages.weatherLocation.settingHint}
        </p>
      </SectionCard>
    </div>
  )
}

// ──────────────────────── Security ─────────────────────────

export function SecuritySection() {
  const { messages } = useI18n()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const changePassword = useChangePassword()

  function submit(event: FormEvent) {
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

  return (
    <SectionCard className="max-w-lg">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <span className="text-ink-900 text-sm font-semibold">
          {messages.auth.changePassword}
        </span>
        <input
          type="password"
          value={currentPassword}
          onChange={event => setCurrentPassword(event.target.value)}
          placeholder={messages.auth.currentPassword}
          aria-label={messages.auth.currentPassword}
          autoComplete="current-password"
          className={inputClass}
        />
        <input
          type="password"
          value={newPassword}
          onChange={event => setNewPassword(event.target.value)}
          placeholder={messages.auth.newPassword}
          aria-label={messages.auth.newPassword}
          autoComplete="new-password"
          className={inputClass}
        />
        {changePassword.isError && (
          <p className="text-danger text-xs">
            {errorText(changePassword.error, messages.common.error)}
          </p>
        )}
        <Button
          type="submit"
          className="h-[42px] self-start px-5"
          isLoading={changePassword.isPending}
          disabled={!currentPassword || newPassword.length < 8}
        >
          {changePassword.isSuccess
            ? messages.auth.saved
            : messages.auth.changePassword}
        </Button>
      </form>
    </SectionCard>
  )
}

// ────────────────────── Plan & billing ─────────────────────

export function PlanSection() {
  const { messages, locale } = useI18n()
  const session = useSession()
  const plan = session.data?.plan ?? 'free'
  const isPaid = plan !== 'free'
  const subscription = useSubscription(isPaid)
  const cancel = useCancelSubscription()
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const sub = subscription.data?.subscription ?? null
  const badge = subscriptionBadge(sub, messages)
  const showCancel =
    isPaid && sub && !sub.cancelAtPeriodEnd && sub.status !== 'canceled'

  return (
    <div className="flex flex-col gap-3">
      <SectionCard className="flex flex-wrap items-center gap-4">
        <span className="from-brand-600 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br to-violet-500">
          <DeckGlyph size={24} className="text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-ink-900 text-base font-bold">
              {messages.settings.planWord} {planName(plan, messages)}
            </span>
            {isPaid && (
              <Badge
                tone={badge.tone === 'warning' ? 'neutral' : badge.tone}
                className={
                  badge.tone === 'warning'
                    ? 'bg-warning/15 text-warning'
                    : undefined
                }
              >
                {badge.label}
              </Badge>
            )}
          </div>
          <span className="text-ink-500 text-[13px]">
            {isPaid
              ? renewLine(plan, sub, locale, messages)
              : messages.billing.freeDesc}
          </span>
        </div>
        <Link
          href="/settings/billing"
          className="border-brand-300 text-brand-700 hover:bg-brand-50 h-9 shrink-0 rounded-[11px] border px-4 text-[13px] font-semibold leading-9"
        >
          {isPaid ? messages.billing.changePlan : messages.billing.seePlans}
        </Link>
      </SectionCard>

      {showCancel && (
        <SectionCard className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-ink-500 text-[13px]">
            {messages.billing.cancelConfirm}
          </span>
          {confirmingCancel ? (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => {
                  cancel.mutate()
                  setConfirmingCancel(false)
                }}
                disabled={cancel.isPending}
                className="bg-danger h-9 rounded-[10px] px-3.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {messages.billing.cancelPlan}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingCancel(false)}
                className="border-line text-ink-700 h-9 rounded-[10px] border bg-white px-3.5 text-[13px] font-semibold"
              >
                {messages.auth.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="text-danger shrink-0 text-[13px] font-semibold"
            >
              {messages.billing.cancelPlan}
            </button>
          )}
        </SectionCard>
      )}
    </div>
  )
}

// ───────────────────────── Account ─────────────────────────

export function AccountSection({ onSignedOut }: { onSignedOut: () => void }) {
  const { messages } = useI18n()
  const signOut = useSignOut()
  const deleteAccount = useDeleteAccount()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <SectionCard className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-ink-900 text-sm font-semibold">
            {messages.auth.exportData}
          </div>
          <div className="text-ink-400 mt-0.5 text-xs">
            {messages.auth.exportDataHint}
          </div>
        </div>
        <a
          href="/api/v1/account/export"
          download="lifedeck-export.json"
          className="border-line text-ink-700 hover:bg-bg h-9 rounded-[10px] border bg-white px-3.5 text-[13px] font-semibold leading-9"
        >
          {messages.auth.exportData}
        </a>
      </SectionCard>

      <SectionCard className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-ink-900 text-sm font-semibold">
          {messages.auth.signOut}
        </div>
        <button
          type="button"
          onClick={() => signOut.mutate(undefined, { onSuccess: onSignedOut })}
          disabled={signOut.isPending}
          className="border-line text-ink-700 hover:bg-bg h-9 rounded-[10px] border bg-white px-3.5 text-[13px] font-semibold disabled:opacity-50"
        >
          {messages.auth.signOut}
        </button>
      </SectionCard>

      <div className="border-danger/25 bg-danger/[0.04] flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5">
        <div>
          <div className="text-danger text-sm font-semibold">
            {messages.auth.deleteAccount}
          </div>
          <div className="text-ink-500 mt-0.5 text-xs">
            {messages.auth.deleteConfirm}
          </div>
        </div>
        {confirmingDelete ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() =>
                deleteAccount.mutate(undefined, { onSuccess: onSignedOut })
              }
              disabled={deleteAccount.isPending}
              className="bg-danger h-9 rounded-[10px] px-3.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {messages.auth.confirmDelete}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="border-line text-ink-700 h-9 rounded-[10px] border bg-white px-3.5 text-[13px] font-semibold"
            >
              {messages.auth.cancel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={cn(
              'border-danger/40 text-danger h-9 shrink-0 rounded-[10px] border bg-white px-3.5 text-[13px] font-semibold',
            )}
          >
            {messages.auth.deleteAccount}
          </button>
        )}
      </div>
    </div>
  )
}
