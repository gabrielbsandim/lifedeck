import { parseChatText } from '@lifedeck/client'

export function ChatText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      {parseChatText(text).map((line, index) => (
        <div key={index} className="flex min-h-[1em]">
          {line.bullet ? <span className="w-4 shrink-0">•</span> : null}
          <span className="min-w-0">
            {line.spans.map((span, spanIndex) =>
              span.bold ? (
                <strong key={spanIndex} className="font-semibold">
                  {span.text}
                </strong>
              ) : (
                <span key={spanIndex}>{span.text}</span>
              ),
            )}
          </span>
        </div>
      ))}
    </div>
  )
}
