import { Fragment } from 'react'
import { Linking, Text, View } from 'react-native'
import { API_BASE_URL } from '@/lib/api/config'
import { useI18n } from '@/lib/i18n/messages-provider'
import { parseRichText, type RichSegment } from '@/lib/legal/rich-text'
import { Screen } from '@/components/ui'

function RichText({ segments }: { segments: RichSegment[] }) {
  return segments.map((segment, index) => (
    <Fragment key={index}>{renderSegment(segment)}</Fragment>
  ))
}

function renderSegment(segment: RichSegment) {
  switch (segment.kind) {
    case 'text':
      return segment.text
    case 'bold':
      return (
        <Text className="text-ink-800 font-semibold">
          <RichText segments={segment.children} />
        </Text>
      )
    case 'link':
      return (
        <Text
          accessibilityRole="link"
          className="text-brand-accent underline"
          onPress={() => void Linking.openURL(segment.href)}
        >
          {segment.text}
        </Text>
      )
  }
}

function Paragraph({ text }: { text: string }) {
  return (
    <Text className="text-ink-600 text-[15px] leading-6">
      <RichText segments={parseRichText(text, API_BASE_URL)} />
    </Text>
  )
}

/** Terms or Privacy, rendered from the same copy the web pages use. */
export function LegalDocument({ doc }: { doc: 'terms' | 'privacy' }) {
  const { messages } = useI18n()
  const content = messages.legal[doc]

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-brand-accent text-sm font-medium">
          {messages.legal.updatedAt}
        </Text>
        <Text
          accessibilityRole="header"
          className="text-ink-900 text-[28px] font-bold"
        >
          {content.title}
        </Text>
      </View>
      <Paragraph text={content.intro} />
      {content.sections.map(section => (
        <View key={section.title} className="gap-3">
          <Text
            accessibilityRole="header"
            className="text-ink-900 text-lg font-semibold"
          >
            {section.title}
          </Text>
          {section.blocks.map((block, index) =>
            block.kind === 'p' ? (
              <Paragraph key={index} text={block.text} />
            ) : (
              <View key={index} className="gap-1.5 pl-1">
                {block.items.map((item, itemIndex) => (
                  <View key={itemIndex} className="flex-row gap-2">
                    <Text className="text-ink-400 text-[15px] leading-6">
                      •
                    </Text>
                    <View className="flex-1">
                      <Paragraph text={item} />
                    </View>
                  </View>
                ))}
              </View>
            ),
          )}
        </View>
      ))}
    </Screen>
  )
}

/** The two legal links, for the sign-in gate and the account settings. */
export function LegalLinks({
  onOpen,
}: {
  onOpen: (doc: 'terms' | 'privacy') => void
}) {
  const { messages } = useI18n()
  return (
    <View className="flex-row justify-center gap-4">
      <Text
        accessibilityRole="link"
        className="text-ink-500 text-xs underline"
        onPress={() => onOpen('terms')}
      >
        {messages.footer.terms}
      </Text>
      <Text
        accessibilityRole="link"
        className="text-ink-500 text-xs underline"
        onPress={() => onOpen('privacy')}
      >
        {messages.footer.privacy}
      </Text>
    </View>
  )
}
