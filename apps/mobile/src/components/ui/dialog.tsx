// RN rebuild of @lifedeck/ui Dialog. The web renders a fixed overlay with a
// focus trap; here the platform Modal owns focus and the hardware back button,
// so the port keeps only the visual contract: a scrim, a centered card or a
// bottom sheet with a grab handle, and a title.
import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { cn } from '@/lib/cn'

export type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  variant?: 'center' | 'sheet'
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  variant = 'center',
}: DialogProps) {
  const sheet = variant === 'sheet'

  return (
    <Modal
      visible={open}
      transparent
      animationType={sheet ? 'slide' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* The scrim closes on tap, mirroring the web overlay click. */}
        <Pressable
          onPress={onClose}
          accessibilityLabel={title}
          className={cn(
            'flex-1 bg-black/40',
            sheet ? 'justify-end' : 'items-center justify-center p-4',
          )}
        >
          {/* Swallow taps inside the card so they never reach the scrim. */}
          <Pressable
            onPress={() => {}}
            className={cn(
              'bg-surface w-full p-5',
              sheet ? 'max-h-[85%] rounded-t-2xl' : 'max-w-sm rounded-2xl',
            )}
          >
            {sheet ? (
              <View className="bg-line mx-auto mb-4 h-1 w-9 rounded-full" />
            ) : null}
            <Text className="text-ink-800 mb-4 text-base font-semibold">
              {title}
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
