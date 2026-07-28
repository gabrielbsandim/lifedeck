// RN port of apps/web/src/components/share-dialog.tsx. Copying uses
// expo-clipboard instead of navigator.clipboard, and the share URL is built
// from the configured API host (the app has no window.location).
import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Button, Dialog, Tabs, TextField } from '@/components/ui'
import { API_BASE_URL } from '@/lib/api/config'
import {
  useCreateShareLink,
  useInviteToList,
  useRevokeShareLink,
  useShareLinks,
} from '@/lib/api/use-share'
import { useI18n } from '@/lib/i18n/messages-provider'

function shareUrl(token: string): string {
  return `${API_BASE_URL}/share/${token}`
}

type ShareDialogProps = {
  listId: string
  open: boolean
  onClose: () => void
}

export function ShareDialog({ listId, open, onClose }: ShareDialogProps) {
  const { messages } = useI18n()
  const links = useShareLinks(listId, open)
  const createLink = useCreateShareLink(listId)
  const revokeLink = useRevokeShareLink(listId)
  const invite = useInviteToList(listId)
  const [role, setRole] = useState<'viewer' | 'editor'>('editor')
  const [inviteEmail, setInviteEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const resetCopied = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetCopied.current) {
        clearTimeout(resetCopied.current)
      }
    },
    [],
  )

  const link = links.data?.[0] ?? null

  async function copyLink() {
    if (!link) {
      return
    }
    await Clipboard.setStringAsync(shareUrl(link.token))
    setCopied(true)
    resetCopied.current = setTimeout(() => setCopied(false), 1500)
  }

  function submitInvite() {
    const email = inviteEmail.trim()
    if (!email) {
      return
    }
    invite.mutate({ email, role }, { onSuccess: () => setInviteEmail('') })
  }

  return (
    <Dialog open={open} onClose={onClose} title={messages.share.title}>
      <View className="gap-4">
        <Text className="text-ink-500 text-sm">
          {messages.share.description}
        </Text>

        <Tabs
          tabs={[
            { value: 'editor', label: messages.share.roleEditor },
            { value: 'viewer', label: messages.share.roleViewer },
          ]}
          value={role}
          onChange={value => setRole(value as 'viewer' | 'editor')}
        />

        {link ? (
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <View className="border-line bg-surface h-10 min-w-0 flex-1 justify-center rounded-xl border px-3">
                <Text className="text-ink-600 text-xs" numberOfLines={1}>
                  {shareUrl(link.token)}
                </Text>
              </View>
              <Button className="h-10 px-4" onPress={() => void copyLink()}>
                {copied ? messages.share.copied : messages.share.copy}
              </Button>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => revokeLink.mutate(link.id)}
              className="self-start"
            >
              <Text className="text-ink-400 text-xs font-medium">
                {messages.share.revoke}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Button
            isLoading={createLink.isPending}
            onPress={() => createLink.mutate({ role })}
          >
            {messages.share.create}
          </Button>
        )}

        <View className="border-line gap-2 border-t pt-4">
          <Text className="text-ink-700 text-sm font-medium">
            {messages.share.inviteTitle}
          </Text>
          <TextField
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder={messages.share.emailPlaceholder}
            accessibilityLabel={messages.share.inviteTitle}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            onPress={submitInvite}
            isLoading={invite.isPending}
            disabled={!inviteEmail.trim()}
          >
            {messages.share.sendInvite}
          </Button>
          {invite.isSuccess ? (
            <Text className="text-success text-xs">
              {messages.share.invited}
            </Text>
          ) : null}
        </View>

        <Button variant="ghost" onPress={onClose}>
          {messages.share.close}
        </Button>
      </View>
    </Dialog>
  )
}
