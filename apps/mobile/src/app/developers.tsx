// RN port of apps/web/src/components/api-keys-manager.tsx.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { API_SCOPES, type ApiScope } from '@lifedeck/domain'
import type { ApiKeyView, CreatedApiKeyView } from '@lifedeck/application'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  TextField,
} from '@/components/ui'
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from '@/lib/api/use-api-keys'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'

function formatDate(value: string | null, locale: string): string {
  return value ? new Date(value).toLocaleDateString(locale) : ''
}

function keyState(key: ApiKeyView): 'active' | 'revoked' | 'expired' {
  if (key.revokedAt) {
    return 'revoked'
  }
  if (key.expiresAt && new Date(key.expiresAt) <= new Date()) {
    return 'expired'
  }
  return 'active'
}

export default function DevelopersScreen() {
  const { messages, locale } = useI18n()
  const t = messages.developers
  const keys = useApiKeys()
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()

  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiScope[]>(['tasks:read'])
  const [expiresInDays, setExpiresInDays] = useState('')
  const [created, setCreated] = useState<CreatedApiKeyView | null>(null)
  const [copied, setCopied] = useState(false)

  function toggleScope(scope: ApiScope) {
    setScopes(current =>
      current.includes(scope)
        ? current.filter(value => value !== scope)
        : [...current, scope],
    )
  }

  function submit() {
    const days = Number(expiresInDays)
    createKey.mutate(
      {
        name: name.trim(),
        scopes,
        expiresInDays: Number.isFinite(days) && days > 0 ? days : undefined,
      },
      {
        onSuccess: (result: CreatedApiKeyView) => {
          setCreated(result)
          setCopied(false)
          setName('')
          setScopes(['tasks:read'])
          setExpiresInDays('')
        },
      },
    )
  }

  async function copySecret() {
    if (created) {
      await Clipboard.setStringAsync(created.secret)
      setCopied(true)
    }
  }

  const items = keys.data ?? []

  return (
    <Screen
      refreshing={keys.isRefetching}
      onRefresh={() => void keys.refetch()}
    >
      <View className="gap-2">
        <Text className="text-ink-900 text-2xl font-semibold">{t.title}</Text>
        <Text className="text-ink-500 text-sm">{t.subtitle}</Text>
      </View>

      {created ? (
        <Card className="border-brand-200 bg-brand-50 gap-3 p-4">
          <Text className="text-ink-800 text-sm font-semibold">
            {t.createdTitle}
          </Text>
          <Text className="text-ink-500 text-xs">{t.createdHint}</Text>
          <View className="bg-inverse rounded-lg px-3 py-2">
            <Text className="text-xs text-white">{created.secret}</Text>
          </View>
          <View className="flex-row gap-2">
            <Button className="h-9" onPress={() => void copySecret()}>
              {copied ? t.copied : t.copy}
            </Button>
            <Button
              variant="ghost"
              className="h-9"
              onPress={() => setCreated(null)}
            >
              {t.done}
            </Button>
          </View>
        </Card>
      ) : (
        <Card className="gap-4 p-4">
          <TextField
            value={name}
            onChangeText={setName}
            label={t.name}
            placeholder={t.namePlaceholder}
            maxLength={80}
          />
          <View className="gap-2">
            <Text className="text-ink-700 text-sm font-medium">{t.scopes}</Text>
            <View className="flex-row flex-wrap gap-2">
              {API_SCOPES.map(scope => {
                const checked = scopes.includes(scope)
                return (
                  <Pressable
                    key={scope}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() => toggleScope(scope)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5',
                      checked
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-line bg-surface',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-xs font-medium',
                        checked ? 'text-brand-accent-strong' : 'text-ink-600',
                      )}
                    >
                      {scope}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
          <TextField
            value={expiresInDays}
            onChangeText={setExpiresInDays}
            label={t.expiry}
            placeholder={t.noExpiry}
            keyboardType="number-pad"
          />
          <Button
            className="self-start px-5"
            isLoading={createKey.isPending}
            disabled={!name.trim() || scopes.length === 0}
            onPress={submit}
          >
            {t.generate}
          </Button>
        </Card>
      )}

      {keys.isLoading ? (
        <View className="gap-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      ) : items.length === 0 ? (
        <EmptyState title={t.empty} />
      ) : (
        <View className="gap-2">
          {items.map(key => {
            const state = keyState(key)
            return (
              <Card key={key.id} className="gap-2 p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1 gap-1">
                    <Text
                      className="text-ink-800 text-sm font-semibold"
                      numberOfLines={1}
                    >
                      {key.name}
                    </Text>
                    <Text className="text-ink-500 text-xs">{key.prefix}…</Text>
                  </View>
                  {state === 'expired' ? (
                    <Badge tone="neutral">{t.expiredBadge}</Badge>
                  ) : state === 'revoked' ? (
                    <Badge tone="neutral">{t.revokedBadge}</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      className="h-8 px-2"
                      isLoading={
                        revokeKey.isPending && revokeKey.variables === key.id
                      }
                      onPress={() => revokeKey.mutate(key.id)}
                    >
                      <Text className="text-danger text-xs font-semibold">
                        {t.revoke}
                      </Text>
                    </Button>
                  )}
                </View>
                <View className="flex-row flex-wrap gap-1.5">
                  {key.scopes.map(scope => (
                    <View key={scope} className="bg-bg rounded px-1.5 py-0.5">
                      <Text className="text-ink-500 text-[11px]">{scope}</Text>
                    </View>
                  ))}
                </View>
                <Text className="text-ink-400 text-xs">
                  {key.lastUsedAt
                    ? `${t.lastUsed}: ${formatDate(key.lastUsedAt, locale)}`
                    : t.neverUsed}
                </Text>
              </Card>
            )
          })}
        </View>
      )}
    </Screen>
  )
}
