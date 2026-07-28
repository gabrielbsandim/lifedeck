// RN port of apps/web/src/components/calendar/calendar-connections-manager.tsx.
// Google connects through an OAuth redirect, which on native means opening the
// system browser at the same web route; Apple and cal.com take a secret typed
// straight into the app.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Badge, Button, Card, TextField } from '@/components/ui'
import { API_BASE_URL, API_PREFIX } from '@/lib/api/config'
import {
  useCalendarConnections,
  useConnectAppleCalendar,
  useConnectCalcomCalendar,
  useDisconnectCalendar,
  useSetDefaultCalendar,
} from '@/lib/api/use-calendar-connections'
import { useI18n } from '@/lib/i18n/messages-provider'

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  calcom: 'cal.com',
}

export function CalendarConnectionsManager({
  enabled = true,
  premium = false,
}: {
  enabled?: boolean
  premium?: boolean
}) {
  const { messages } = useI18n()
  const t = messages.calendar
  const c = t.connect
  const connections = useCalendarConnections(enabled)
  const disconnect = useDisconnectCalendar()
  const setDefault = useSetDefaultCalendar()
  const connectApple = useConnectAppleCalendar()
  const connectCalcom = useConnectCalcomCalendar()
  const [form, setForm] = useState<'apple' | 'calcom' | null>(null)
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  // Once at least one calendar is connected the card collapses to a compact
  // summary so it stops taking a big slice of the calendar screen.
  const [expanded, setExpanded] = useState(false)

  const list = connections.data ?? []
  const connected = list.length > 0
  const pending = connectApple.isPending || connectCalcom.isPending
  const error = connectApple.isError || connectCalcom.isError

  function openForm(provider: 'apple' | 'calcom') {
    setForm(provider)
    setEmail('')
    setSecret('')
    connectApple.reset()
    connectCalcom.reset()
  }

  function submitForm() {
    const trimmedEmail = email.trim()
    const trimmedSecret = secret.trim()
    if (!trimmedEmail || !trimmedSecret) {
      return
    }
    const onSuccess = () => setForm(null)
    if (form === 'apple') {
      connectApple.mutate(
        { email: trimmedEmail, appPassword: trimmedSecret },
        { onSuccess },
      )
    } else {
      connectCalcom.mutate(
        { email: trimmedEmail, apiKey: trimmedSecret },
        { onSuccess },
      )
    }
  }

  function connectGoogle() {
    // The OAuth consent screen cannot render inside the app, so it opens in the
    // system browser; the callback sets the browser session's cookie and the
    // app's next `connections` refetch picks the connection up.
    void WebBrowser.openBrowserAsync(
      `${API_BASE_URL}${API_PREFIX}/calendar/google/connect`,
    )
  }

  if (!enabled) {
    return null
  }

  if (connected && !expanded) {
    return (
      <Card className="flex-row items-center gap-3 p-4">
        <View className="min-w-0 flex-1">
          <Text className="text-ink-800 text-sm font-semibold">
            {t.connectedCalendars}
          </Text>
          <Text className="text-ink-500 text-xs" numberOfLines={1}>
            {list
              .map(
                connection =>
                  PROVIDER_LABEL[connection.provider] ?? connection.provider,
              )
              .join(' · ')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded(true)}
          className="px-2 py-1"
        >
          <Text className="text-brand-accent text-xs font-semibold">
            {t.edit}
          </Text>
        </Pressable>
      </Card>
    )
  }

  return (
    <Card className="gap-3 p-4">
      <Text className="text-ink-800 text-sm font-semibold">
        {t.connectedCalendars}
      </Text>

      {list.map(connection => (
        <View
          key={connection.id}
          className="border-line flex-row items-center gap-2 border-t pt-3"
        >
          <View className="min-w-0 flex-1">
            <Text className="text-ink-800 text-sm" numberOfLines={1}>
              {connection.accountEmail}
            </Text>
            <Text className="text-ink-500 text-xs">
              {PROVIDER_LABEL[connection.provider] ?? connection.provider}
            </Text>
          </View>
          {connection.isDefault ? (
            <Badge tone="brand">{t.defaultCalendar}</Badge>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setDefault.mutate(connection.id)}
              className="px-2 py-1"
            >
              <Text className="text-brand-accent text-xs font-semibold">
                {t.makeDefault}
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => disconnect.mutate(connection.id)}
            className="px-2 py-1"
          >
            <Text className="text-danger text-xs font-semibold">
              {t.disconnectCalendar}
            </Text>
          </Pressable>
        </View>
      ))}

      {form ? (
        <View className="border-line gap-2 border-t pt-3">
          <TextField
            label={form === 'apple' ? c.appleEmail : c.calcomEmail}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextField
            label={form === 'apple' ? c.applePassword : c.calcomApiKey}
            value={secret}
            onChangeText={setSecret}
            secureTextEntry
            autoCapitalize="none"
          />
          <Text className="text-ink-500 text-xs">
            {form === 'apple' ? c.applePasswordHint : c.calcomReadOnly}
          </Text>
          {error ? (
            <Text className="text-danger text-sm">{c.connectError}</Text>
          ) : null}
          <View className="flex-row gap-2">
            <Button
              className="flex-1"
              isLoading={pending}
              disabled={!email.trim() || !secret.trim()}
              onPress={submitForm}
            >
              {pending ? c.connecting : c.connect}
            </Button>
            <Button variant="ghost" onPress={() => setForm(null)}>
              {c.cancel}
            </Button>
          </View>
        </View>
      ) : (
        <View className="border-line gap-2 border-t pt-3">
          <Button
            variant="ghost"
            className="border-line border"
            onPress={connectGoogle}
          >
            {t.connectGoogle}
          </Button>
          {premium ? (
            <>
              <Button
                variant="ghost"
                className="border-line border"
                onPress={() => openForm('apple')}
              >
                {c.connectApple}
              </Button>
              <Button
                variant="ghost"
                className="border-line border"
                onPress={() => openForm('calcom')}
              >
                {c.connectCalcom}
              </Button>
            </>
          ) : null}
          {connected ? (
            <>
              <Text className="text-ink-500 text-xs">
                {t.defaultCalendarHint}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpanded(false)}
                className="self-start px-2 py-1"
              >
                <Text className="text-ink-400 text-xs font-semibold">
                  {c.cancel}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}
    </Card>
  )
}
