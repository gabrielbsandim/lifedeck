// RN port of apps/web/src/components/settings/settings-sections.tsx. Each
// section is the same set of controls, backed by the same hooks.
import { useMemo, useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { CheckSquareIcon, DeckGlyph } from '@/components/icons'
import { AssistantMemoryCard } from '@/components/settings/assistant-memory-card'
import { ConnectionsPanel } from '@/components/settings/connections-panel'
import {
  Avatar,
  Badge,
  Button,
  Card,
  PasswordField,
  Select,
  Switch,
  Tabs,
  TextField,
} from '@/components/ui'
import { API_BASE_URL, API_PREFIX } from '@/lib/api/config'
import { deviceTimeZone } from '@/lib/api/dates'
import {
  useChangePassword,
  useDeleteAccount,
  useRemoveAvatar,
  useRenameUser,
  useSetCarryOverMode,
  useSetReminderPreferences,
  useSetTimezone,
  useSignOut,
  useUploadAvatar,
} from '@/lib/api/use-account'
import { useResendCode, useVerifyEmail } from '@/lib/api/use-auth'
import type { Messages } from '@lifedeck/i18n'
import type { SessionUser } from '@/lib/api/use-session'
import { useSession } from '@/lib/api/use-session'
import {
  useCancelSubscription,
  useSubscription,
} from '@/lib/api/use-subscription'
import {
  planName,
  renewLine,
  subscriptionBadge,
} from '@/lib/billing/plan-display'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useThemeColors } from '@/theme/tokens'

export type SectionKey =
  | 'perfil'
  | 'conexoes'
  | 'preferencias'
  | 'seguranca'
  | 'plano'
  | 'conta'

type SectionMeta = {
  key: SectionKey
  label: string
}

export function availableSections(
  user: SessionUser,
  messages: Messages,
): SectionMeta[] {
  const label: Record<SectionKey, string> = {
    perfil: messages.settings.profile,
    conexoes: messages.settings.connections,
    preferencias: messages.settings.preferences,
    seguranca: messages.settings.security,
    plano: messages.settings.plan,
    conta: messages.settings.account,
  }
  const hasConnections = Boolean(
    user.features?.calendar || user.features?.whatsapp,
  )
  const keys: SectionKey[] = ['perfil']
  if (hasConnections) {
    keys.push('conexoes')
  }
  keys.push('preferencias')
  if (user.hasPassword) {
    keys.push('seguranca')
  }
  if (user.features?.billing) {
    keys.push('plano')
  }
  keys.push('conta')
  return keys.map(key => ({ key, label: label[key] }))
}

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

// ───────────────────────── Profile ─────────────────────────

export function ProfileSection({ user }: { user: SessionUser }) {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const [name, setName] = useState(user.displayName)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [photoError, setPhotoError] = useState(false)

  const rename = useRenameUser()
  const uploadAvatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const resend = useResendCode()
  const verify = useVerifyEmail()

  async function pickPhoto() {
    setPhotoError(false)
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      return
    }
    // The avatar endpoint caps the upload at 512 KB, so crop to a square and
    // compress here rather than letting a full-resolution photo be rejected.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    })
    const asset = result.assets?.[0]
    if (result.canceled || !asset?.base64) {
      if (!result.canceled) {
        setPhotoError(true)
      }
      return
    }
    uploadAvatar.mutate({
      base64: asset.base64,
      mimeType: asset.mimeType ?? 'image/jpeg',
    })
  }

  return (
    <View className="gap-4">
      <Card className="flex-row flex-wrap items-center gap-4 p-4">
        <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
        <View className="min-w-0 flex-1">
          <Text className="text-ink-900 text-[15px] font-semibold">
            {messages.auth.photo}
          </Text>
          <Text className="text-ink-400 mt-0.5 text-xs">
            {messages.auth.photoHint}
          </Text>
          {photoError || uploadAvatar.isError ? (
            <Text className="text-danger mt-1 text-xs">
              {messages.common.error}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2">
          <Button
            variant="ghost"
            className="border-line h-9 border"
            isLoading={uploadAvatar.isPending}
            onPress={() => void pickPhoto()}
          >
            {messages.auth.changePhoto}
          </Button>
          {user.avatarUrl ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => removeAvatar.mutate()}
              className="px-2 py-1"
            >
              <Text className="text-ink-500 text-[13px] font-semibold">
                {messages.auth.removePhoto}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <Card className="gap-4 p-4">
        <View className="gap-1.5">
          <Text className="text-ink-700 text-[13px] font-semibold">
            {messages.auth.displayName}
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <TextField
                value={name}
                maxLength={80}
                onChangeText={setName}
                accessibilityLabel={messages.auth.displayName}
              />
            </View>
            <Button
              className="bg-brand-50"
              disabled={!name.trim() || name.trim() === user.displayName}
              isLoading={rename.isPending}
              onPress={() => rename.mutate({ displayName: name.trim() })}
            >
              <Text className="text-brand-accent-strong text-[13px] font-semibold">
                {rename.isSuccess ? messages.auth.saved : messages.auth.rename}
              </Text>
            </Button>
          </View>
        </View>

        <View className="gap-1.5">
          <Text className="text-ink-700 text-[13px] font-semibold">
            {messages.auth.email}
          </Text>
          <View className="border-line gap-2 rounded-xl border px-3.5 py-3">
            <View className="flex-row items-center justify-between gap-2">
              <Text
                className="text-ink-800 min-w-0 flex-1 text-sm"
                numberOfLines={1}
              >
                {user.email}
              </Text>
              {user.isEmailVerified ? (
                <Badge tone="success">
                  <View className="flex-row items-center gap-1">
                    <CheckSquareIcon size={11} color={colors.successFg} />
                    <Text className="text-success text-xs font-semibold">
                      {messages.auth.verified}
                    </Text>
                  </View>
                </Badge>
              ) : verifying ? null : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    resend.mutate()
                    setVerifying(true)
                  }}
                >
                  <Text className="text-brand-accent text-[13px] font-semibold">
                    {messages.auth.verifyEmail}
                  </Text>
                </Pressable>
              )}
            </View>
            {verifying && !user.isEmailVerified ? (
              <View className="gap-2">
                <TextField
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="123456"
                  accessibilityLabel={messages.auth.code}
                />
                {verify.isError ? (
                  <Text className="text-danger text-xs">
                    {errorText(verify.error, messages.common.error)}
                  </Text>
                ) : null}
                <Button
                  className="self-start px-5"
                  disabled={code.trim().length !== 6}
                  isLoading={verify.isPending}
                  onPress={() =>
                    verify.mutate(
                      { code: code.trim() },
                      { onSuccess: () => setVerifying(false) },
                    )
                  }
                >
                  {messages.auth.verify}
                </Button>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </View>
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

  const timeZones = useMemo(() => listTimeZones(user.timezone), [user.timezone])
  const detectedZone = deviceTimeZone()

  return (
    <View className="gap-4">
      <Card className="gap-2.5 p-4">
        <Text className="text-ink-900 text-sm font-semibold">
          {messages.carryOver.settingLabel}
        </Text>
        <Tabs
          tabs={[
            { value: 'manual', label: messages.carryOver.modeManual },
            { value: 'auto', label: messages.carryOver.modeAuto },
          ]}
          value={user.carryOverMode}
          onChange={mode => setCarryOverMode.mutate(mode as 'manual' | 'auto')}
        />
        <Text className="text-ink-500 text-xs">
          {messages.carryOver.settingHint}
        </Text>
      </Card>

      <Card className="gap-3 p-4">
        <Text className="text-ink-900 text-sm font-semibold">
          {messages.reminders.settingLabel}
        </Text>
        {(
          [
            { key: 'email', label: messages.reminders.email },
            { key: 'whatsapp', label: messages.reminders.whatsapp },
          ] as const
        ).map(({ key, label }) => {
          const enabled =
            key === 'email' ? user.reminderEmail : user.reminderWhatsapp
          return (
            <View
              key={key}
              className="flex-row items-center justify-between gap-3"
            >
              <Text className="text-ink-700 text-sm">{label}</Text>
              <Switch
                accessibilityLabel={label}
                value={enabled}
                disabled={setReminders.isPending}
                onValueChange={() => setReminders.mutate({ [key]: !enabled })}
              />
            </View>
          )
        })}
        <Text className="text-ink-500 text-xs">
          {messages.reminders.settingHint}
        </Text>
      </Card>

      <Card className="gap-2.5 p-4">
        <Select
          label={messages.timezone.settingLabel}
          title={messages.timezone.settingLabel}
          value={user.timezone}
          options={timeZones.map(zone => ({
            value: zone,
            label: zone.replace(/_/g, ' '),
          }))}
          disabled={setTimezone.isPending}
          onChange={zone => setTimezone.mutate(zone)}
        />
        {user.timezone !== detectedZone ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setTimezone.mutate(detectedZone)}
            className="self-start"
          >
            <Text className="text-brand-accent text-[13px] font-semibold">
              {messages.timezone.useDetected}
            </Text>
          </Pressable>
        ) : null}
        <Text className="text-ink-500 text-xs">
          {messages.timezone.settingHint}
        </Text>
      </Card>

      <AssistantMemoryCard user={user} />
    </View>
  )
}

// ──────────────────────── Security ─────────────────────────

export function SecuritySection() {
  const { messages } = useI18n()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const changePassword = useChangePassword()

  return (
    <Card className="gap-3 p-4">
      <Text className="text-ink-900 text-sm font-semibold">
        {messages.auth.changePassword}
      </Text>
      <PasswordField
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder={messages.auth.currentPassword}
        accessibilityLabel={messages.auth.currentPassword}
        autoComplete="current-password"
      />
      <PasswordField
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder={messages.auth.newPassword}
        accessibilityLabel={messages.auth.newPassword}
        autoComplete="new-password"
      />
      {changePassword.isError ? (
        <Text className="text-danger text-xs">
          {errorText(changePassword.error, messages.common.error)}
        </Text>
      ) : null}
      <Button
        className="self-start px-5"
        isLoading={changePassword.isPending}
        disabled={!currentPassword || newPassword.length < 8}
        onPress={() =>
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
      >
        {changePassword.isSuccess
          ? messages.auth.saved
          : messages.auth.changePassword}
      </Button>
    </Card>
  )
}

// ────────────────────── Plan & billing ─────────────────────

export function PlanSection() {
  const { messages, locale } = useI18n()
  const router = useRouter()
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
    <View className="gap-3">
      <Card className="flex-row flex-wrap items-center gap-4 p-4">
        <View className="bg-brand-600 h-11 w-11 items-center justify-center rounded-xl">
          <DeckGlyph size={24} color="#ffffff" />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-ink-900 text-base font-bold">
              {messages.settings.planWord} {planName(plan, messages)}
            </Text>
            {isPaid ? (
              <Badge tone={badge.tone === 'success' ? 'success' : 'neutral'}>
                {badge.label}
              </Badge>
            ) : null}
          </View>
          <Text className="text-ink-500 text-[13px]">
            {isPaid
              ? renewLine(plan, sub, locale, messages)
              : messages.billing.freeDesc}
          </Text>
        </View>
        <Button
          variant="ghost"
          className="border-brand-300 h-9 border"
          onPress={() => router.push('/billing')}
        >
          {isPaid ? messages.billing.changePlan : messages.billing.seePlans}
        </Button>
      </Card>

      {showCancel ? (
        <Card className="gap-3 p-4">
          <Text className="text-ink-500 text-[13px]">
            {messages.billing.cancelConfirm}
          </Text>
          {confirmingCancel ? (
            <View className="flex-row gap-2">
              <Button
                className="bg-danger h-9 flex-1"
                isLoading={cancel.isPending}
                onPress={() => {
                  cancel.mutate()
                  setConfirmingCancel(false)
                }}
              >
                {messages.billing.cancelPlan}
              </Button>
              <Button
                variant="ghost"
                className="border-line h-9 border"
                onPress={() => setConfirmingCancel(false)}
              >
                {messages.auth.cancel}
              </Button>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmingCancel(true)}
              className="self-start"
            >
              <Text className="text-danger text-[13px] font-semibold">
                {messages.billing.cancelPlan}
              </Text>
            </Pressable>
          )}
        </Card>
      ) : null}
    </View>
  )
}

// ───────────────────────── Account ─────────────────────────

export function AccountSection({ onSignedOut }: { onSignedOut: () => void }) {
  const { messages } = useI18n()
  const signOut = useSignOut()
  const deleteAccount = useDeleteAccount()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <View className="gap-3">
      <Card className="flex-row flex-wrap items-center justify-between gap-3 p-4">
        <View className="min-w-0 flex-1">
          <Text className="text-ink-900 text-sm font-semibold">
            {messages.auth.exportData}
          </Text>
          <Text className="text-ink-400 mt-0.5 text-xs">
            {messages.auth.exportDataHint}
          </Text>
        </View>
        <Button
          variant="ghost"
          className="border-line h-9 border"
          // The export is a signed-in download; opening it in the browser is
          // the only way to hand the file to the OS, and the browser session
          // carries its own cookie.
          onPress={() =>
            void Linking.openURL(`${API_BASE_URL}${API_PREFIX}/account/export`)
          }
        >
          {messages.auth.exportData}
        </Button>
      </Card>

      <Card className="flex-row items-center justify-between gap-3 p-4">
        <Text className="text-ink-900 text-sm font-semibold">
          {messages.auth.signOut}
        </Text>
        <Button
          variant="ghost"
          className="border-line h-9 border"
          isLoading={signOut.isPending}
          onPress={() => signOut.mutate(undefined, { onSuccess: onSignedOut })}
        >
          {messages.auth.signOut}
        </Button>
      </Card>

      <View className="border-danger-line bg-danger-soft gap-3 rounded-2xl border p-5">
        <View>
          <Text className="text-danger-fg text-sm font-semibold">
            {messages.auth.deleteAccount}
          </Text>
          <Text className="text-ink-500 mt-0.5 text-xs">
            {messages.auth.deleteConfirm}
          </Text>
        </View>
        {confirmingDelete ? (
          <View className="flex-row gap-2">
            <Button
              className="bg-danger h-9 flex-1"
              isLoading={deleteAccount.isPending}
              onPress={() =>
                deleteAccount.mutate(undefined, { onSuccess: onSignedOut })
              }
            >
              {messages.auth.confirmDelete}
            </Button>
            <Button
              variant="ghost"
              className="border-line h-9 border"
              onPress={() => setConfirmingDelete(false)}
            >
              {messages.auth.cancel}
            </Button>
          </View>
        ) : (
          <Button
            variant="ghost"
            className="border-danger-line h-9 self-start border"
            onPress={() => setConfirmingDelete(true)}
          >
            <Text className="text-danger text-[13px] font-semibold">
              {messages.auth.deleteAccount}
            </Text>
          </Button>
        )}
      </View>
    </View>
  )
}

export function SectionBody({
  section,
  user,
  onSignedOut,
}: {
  section: SectionKey
  user: SessionUser
  onSignedOut: () => void
}) {
  switch (section) {
    case 'perfil':
      return <ProfileSection user={user} />
    case 'conexoes':
      return <ConnectionsSection />
    case 'preferencias':
      return <PreferencesSection user={user} />
    case 'seguranca':
      return <SecuritySection />
    case 'plano':
      return <PlanSection />
    case 'conta':
      return <AccountSection onSignedOut={onSignedOut} />
  }
}
