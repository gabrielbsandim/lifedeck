// RN port of apps/web/src/components/assistant-chat.tsx: the WhatsApp-style
// thread with the assistant. Same turn model (text / photo / voice), same
// action cards, same locked and quota upsells. Recording swaps MediaRecorder
// for expo-audio and the file input for expo-image-picker; everything else is
// the web logic.
import { useCallback, useRef, useState } from 'react'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ActionCard } from '@/components/assistant/action-card'
import {
  ImageIcon,
  MicIcon,
  SendIcon,
  SparkleIcon,
  TrashIcon,
} from '@/components/icons'
import { ApiError } from '@/lib/api/client'
import {
  useSendAssistantMessage,
  type AssistantAction,
  type AssistantSendInput,
} from '@/lib/api/use-assistant'
import { useVoiceRecorder } from '@/lib/media/use-voice-recorder'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

// One entry in the visible thread. User turns and the assistant's words are
// text; a photo or a voice note is a media turn; a card is a receipt for a tool
// the assistant ran; error and upsell are system states rendered inline like the
// assistant is speaking.
type ChatItem =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'user-image'; url: string }
  | { id: string; kind: 'user-voice' }
  | { id: string; kind: 'assistant'; text: string }
  | { id: string; kind: 'card'; action: AssistantAction }
  | { id: string; kind: 'error' }
  | { id: string; kind: 'upsell'; variant: 'locked' | 'quota' }

let counter = 0
function nextId(): string {
  counter += 1
  return `item-${counter}`
}

function formatElapsed(seconds: number): string {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

export default function AssistantScreen() {
  const { messages, locale } = useI18n()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const t = messages.assistant
  const router = useRouter()
  const send = useSendAssistantMessage()
  const voice = useVoiceRecorder()

  const [items, setItems] = useState<ChatItem[]>([])
  const [input, setInput] = useState('')
  const [locked, setLocked] = useState(false)
  const lastTurn = useRef<AssistantSendInput | null>(null)
  const scroller = useRef<ScrollView>(null)

  const isEmpty = items.length === 0
  const pending = send.isPending

  // Send one turn (text, image, or voice) and fold the reply into the thread.
  // `optimistic` is the user bubble to show immediately; on a retry it is
  // already in the thread, so pass null to skip re-adding it.
  const runTurn = useCallback(
    async (payload: AssistantSendInput, optimistic: ChatItem | null) => {
      if (pending) {
        return
      }
      if (optimistic) {
        lastTurn.current = payload
      }
      setItems(prev => {
        const cleaned = prev.filter(item => item.kind !== 'error')
        return optimistic ? [...cleaned, optimistic] : cleaned
      })
      try {
        const reply = await send.mutateAsync(payload)
        setItems(prev => {
          const next = [...prev]
          if (reply.text.trim()) {
            next.push({ id: nextId(), kind: 'assistant', text: reply.text })
          }
          for (const action of reply.actions) {
            next.push({ id: nextId(), kind: 'card', action })
          }
          return next
        })
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          setLocked(true)
          setItems(prev => [
            ...prev,
            { id: nextId(), kind: 'upsell', variant: 'locked' },
          ])
          return
        }
        if (error instanceof ApiError && error.code === 'QUOTA_EXCEEDED') {
          setItems(prev => [
            ...prev,
            { id: nextId(), kind: 'upsell', variant: 'quota' },
          ])
          return
        }
        setItems(prev => [...prev, { id: nextId(), kind: 'error' }])
      }
    },
    [pending, send],
  )

  const dispatch = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) {
        return
      }
      setInput('')
      void runTurn(
        { text: trimmed, locale },
        { id: nextId(), kind: 'user', text: trimmed },
      )
    },
    [locale, runTurn],
  )

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    })
    const asset = result.assets?.[0]
    if (result.canceled || !asset) {
      return
    }
    void runTurn(
      {
        image: {
          uri: asset.uri,
          name: asset.fileName ?? 'photo.jpg',
          mimeType: asset.mimeType ?? 'image/jpeg',
        },
        locale,
      },
      { id: nextId(), kind: 'user-image', url: asset.uri },
    )
  }

  async function startRecording() {
    if (pending || locked) {
      return
    }
    const started = await voice.start()
    if (!started) {
      Alert.alert(t.micUnavailable)
    }
  }

  async function stopRecording(shouldDeliver: boolean) {
    const file = await voice.stop(shouldDeliver)
    if (file) {
      void runTurn(
        { audio: file, locale },
        { id: nextId(), kind: 'user-voice' },
      )
    }
  }

  function retry() {
    if (lastTurn.current) {
      void runTurn(lastTurn.current, null)
    }
  }

  function reset() {
    setItems([])
    setInput('')
    setLocked(false)
  }

  const hasText = input.trim().length > 0
  const canSend = hasText && !pending && !locked

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.bottom + 56}
      className="bg-bg flex-1"
      style={{ paddingTop: insets.top }}
    >
      <View className="border-line flex-row items-center gap-3 border-b px-4 pb-3 pt-2">
        <View className="bg-brand-600 h-11 w-11 items-center justify-center rounded-full">
          <SparkleIcon size={22} color="#ffffff" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-ink-900 text-base font-bold">{t.name}</Text>
          <Text className="text-ink-500 text-[12.5px]">
            {pending ? t.statusTyping : t.statusOnline}
          </Text>
        </View>
        {!isEmpty ? (
          <Pressable
            accessibilityRole="button"
            onPress={reset}
            className="border-line bg-surface h-9 justify-center rounded-[10px] border px-3.5"
          >
            <Text className="text-ink-600 text-[13px] font-semibold">
              {t.newConversation}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scroller}
        onContentSizeChange={() =>
          scroller.current?.scrollToEnd({ animated: true })
        }
        contentContainerClassName="gap-3 px-4 py-4"
        keyboardShouldPersistTaps="handled"
      >
        {isEmpty ? (
          <>
            <AssistantRow>
              <Text className="text-ink-800 text-[14.5px] font-semibold">
                {t.welcomeTitle}
              </Text>
              <Text className="text-ink-600 mt-1 text-[14.5px]">
                {t.welcomeBody}
              </Text>
            </AssistantRow>
            <View className="flex-row flex-wrap gap-2 pl-[39px]">
              {Object.values(t.chips).map(chip => (
                <Pressable
                  key={chip}
                  accessibilityRole="button"
                  onPress={() => dispatch(chip)}
                  className="border-brand-200 bg-surface h-9 justify-center rounded-full border px-4"
                >
                  <Text className="text-brand-accent-strong text-[13.5px] font-semibold">
                    {chip}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {items.map(item => {
          if (item.kind === 'user') {
            return (
              <View key={item.id} className="items-end">
                <View className="bg-brand-600 max-w-[78%] rounded-2xl rounded-br-sm px-3.5 py-2.5">
                  <Text className="text-[14.5px] text-white">{item.text}</Text>
                </View>
              </View>
            )
          }
          if (item.kind === 'user-image') {
            return (
              <View key={item.id} className="items-end">
                <Image
                  source={{ uri: item.url }}
                  accessibilityLabel={t.photo}
                  className="h-48 w-48 rounded-2xl rounded-br-sm"
                  resizeMode="cover"
                />
              </View>
            )
          }
          if (item.kind === 'user-voice') {
            return (
              <View key={item.id} className="items-end">
                <View className="bg-brand-600 max-w-[78%] flex-row items-center gap-2.5 rounded-2xl rounded-br-sm px-3.5 py-2.5">
                  <MicIcon size={20} color="#ffffff" />
                  <Text className="text-[12.5px] text-white/90">
                    {t.voiceMessage}
                  </Text>
                </View>
              </View>
            )
          }
          if (item.kind === 'assistant') {
            return (
              <AssistantRow key={item.id}>
                <Text className="text-ink-800 text-[14.5px]">{item.text}</Text>
              </AssistantRow>
            )
          }
          if (item.kind === 'card') {
            return (
              <ActionCard
                key={item.id}
                action={item.action}
                messages={messages}
                locale={locale}
                onOpenLists={() => router.push('/lists')}
                onOpenToday={() => router.push('/')}
              />
            )
          }
          if (item.kind === 'error') {
            return (
              <AssistantRow key={item.id} tone="danger">
                <Text className="text-ink-700 text-[14.5px]">
                  {t.errorTitle}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={retry}
                  className="bg-brand-600 mt-2.5 h-9 items-center justify-center rounded-[11px] px-4"
                >
                  <Text className="text-[13.5px] font-semibold text-white">
                    {t.retry}
                  </Text>
                </Pressable>
              </AssistantRow>
            )
          }
          return (
            <UpsellCard
              key={item.id}
              variant={item.variant}
              onUpgrade={() => router.push('/billing')}
            />
          )
        })}

        {pending ? (
          <AssistantRow>
            <View className="flex-row items-center gap-1.5">
              {[0, 1, 2].map(dot => (
                <View
                  key={dot}
                  className="bg-ink-300 h-[7px] w-[7px] rounded-full"
                />
              ))}
            </View>
          </AssistantRow>
        ) : null}
      </ScrollView>

      <View
        className="border-line bg-surface border-t px-4 py-3"
        style={{ paddingBottom: 12 }}
      >
        {voice.recording ? (
          <View className="h-12 flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.cancel}
              onPress={() => void stopRecording(false)}
              className="h-11 w-11 items-center justify-center rounded-full"
            >
              <TrashIcon size={20} color={colors.danger} />
            </Pressable>
            <View className="bg-danger h-2.5 w-2.5 rounded-full" />
            <Text className="text-ink-700 flex-1 text-[14px] font-semibold">
              {t.recording} {formatElapsed(voice.elapsed)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.sendAudio}
              onPress={() => void stopRecording(true)}
              className="bg-brand-600 h-12 w-12 items-center justify-center rounded-full"
            >
              <SendIcon size={20} color="#ffffff" />
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center gap-2.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.attach}
              disabled={pending || locked}
              onPress={() => void pickImage()}
              className={cn(
                'h-11 w-11 items-center justify-center rounded-full',
                (pending || locked) && 'opacity-40',
              )}
            >
              <ImageIcon size={21} color={colors.ink['500']} />
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => dispatch(input)}
              editable={!locked}
              returnKeyType="send"
              placeholder={t.inputPlaceholder}
              placeholderTextColor={colors.ink['400']}
              accessibilityLabel={t.inputPlaceholder}
              className="border-line text-ink-800 bg-surface h-12 flex-1 rounded-full border-[1.5px] px-5 text-[14.5px]"
            />
            {hasText ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.send}
                disabled={!canSend}
                onPress={() => dispatch(input)}
                className={cn(
                  'bg-brand-600 h-12 w-12 items-center justify-center rounded-full',
                  !canSend && 'opacity-40',
                )}
              >
                <SendIcon size={20} color="#ffffff" />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.recordAudio}
                disabled={pending || locked}
                onPress={() => void startRecording()}
                className={cn(
                  'bg-brand-50 h-12 w-12 items-center justify-center rounded-full',
                  (pending || locked) && 'opacity-40',
                )}
              >
                <MicIcon size={20} color={colors.brand.accentStrong} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

function AssistantRow({
  children,
  tone = 'brand',
}: {
  children: React.ReactNode
  tone?: 'brand' | 'danger'
}) {
  return (
    <View className="flex-row items-end gap-2.5">
      <View
        className={cn(
          'h-[30px] w-[30px] items-center justify-center rounded-full',
          tone === 'danger' ? 'bg-danger-soft' : 'bg-brand-600',
        )}
      >
        <SparkleIcon size={16} color="#ffffff" />
      </View>
      <View className="border-line bg-surface max-w-[78%] rounded-2xl rounded-bl-sm border px-3.5 py-2.5">
        {children}
      </View>
    </View>
  )
}

function UpsellCard({
  variant,
  onUpgrade,
}: {
  variant: 'locked' | 'quota'
  onUpgrade: () => void
}) {
  const { messages } = useI18n()
  const t = messages.assistant
  return (
    <View className="bg-brand-600 flex-row items-center gap-4 rounded-[18px] p-[22px]">
      <View className="min-w-0 flex-1">
        <View className="h-6 justify-center self-start rounded-full bg-white/20 px-2.5">
          <Text className="text-[11px] font-bold text-white">
            {t.planBadge}
          </Text>
        </View>
        <Text className="mt-2 text-lg font-bold text-white">
          {variant === 'locked' ? t.lockedTitle : t.quotaTitle}
        </Text>
        <Text className="mt-1 text-[13.5px] text-white/85">
          {variant === 'locked' ? t.lockedBody : t.quotaBody}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onUpgrade}
        className="h-[42px] justify-center rounded-full bg-white px-5"
      >
        <Text className="text-brand-700 text-[14px] font-semibold">
          {t.upgrade}
        </Text>
      </Pressable>
    </View>
  )
}
