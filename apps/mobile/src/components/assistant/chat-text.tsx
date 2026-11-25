import { Text, View } from 'react-native'
import { parseChatText, type ChatSpan } from '@lifedeck/client'

function Spans({ spans }: { spans: ChatSpan[] }) {
  if (spans.length === 0) {
    return ' '
  }
  return spans.map((span, index) => (
    <Text key={index} className={span.bold ? 'font-semibold' : undefined}>
      {span.text}
    </Text>
  ))
}

export function ChatText({ text }: { text: string }) {
  return (
    <View className="gap-0.5">
      {parseChatText(text).map((line, index) => {
        if (!line.bullet) {
          return (
            <Text key={index} className="text-ink-800 text-[14.5px]">
              <Spans spans={line.spans} />
            </Text>
          )
        }
        return (
          <View key={index} className="flex-row">
            <Text className="text-ink-800 w-4 text-[14.5px]">•</Text>
            <Text className="text-ink-800 shrink text-[14.5px]">
              <Spans spans={line.spans} />
            </Text>
          </View>
        )
      })}
    </View>
  )
}
