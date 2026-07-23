'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@lifedeck/ui'
import { ApiError } from '@/lib/api/client'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useSendAssistantMessage,
  type AssistantAction,
} from '@/lib/api/use-assistant'
import { CalendarIcon, CheckIcon, SparkleIcon } from '@/components/icons'

// One entry in the visible thread. User turns and the assistant's words are
// text; a card is a receipt for a tool the assistant ran; error and upsell are
// system states rendered inline like the assistant is speaking.
type ChatItem =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string }
  | { id: string; kind: 'card'; action: AssistantAction }
  | { id: string; kind: 'error' }
  | { id: string; kind: 'upsell'; variant: 'locked' | 'quota' }

let counter = 0
function nextId(): string {
  counter += 1
  return `item-${counter}`
}

const BCP47: Record<string, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-ES',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

export function AssistantChat() {
  const { messages, locale } = useI18n()
  const t = messages.assistant
  const router = useRouter()
  const send = useSendAssistantMessage()

  const [items, setItems] = useState<ChatItem[]>([])
  const [input, setInput] = useState('')
  const [locked, setLocked] = useState(false)
  const lastUserText = useRef('')
  const bottom = useRef<HTMLDivElement>(null)

  const isEmpty = items.length === 0
  const pending = send.isPending

  useEffect(() => {
    // Guarded: jsdom (tests) and older engines lack scrollIntoView.
    bottom.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [items, pending])

  const dispatch = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || pending) {
        return
      }
      lastUserText.current = trimmed
      setItems(prev => [
        ...prev.filter(item => item.kind !== 'error'),
        { id: nextId(), kind: 'user', text: trimmed },
      ])
      setInput('')
      try {
        const reply = await send.mutateAsync({ text: trimmed, locale })
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
    [locale, pending, send],
  )

  function onSubmit() {
    void dispatch(input)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  function reset() {
    setItems([])
    setInput('')
    setLocked(false)
  }

  const canSend = input.trim().length > 0 && !pending && !locked

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4">
        <span className="relative flex-none">
          <span className="from-brand-600 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br to-violet-500">
            <SparkleIcon size={22} className="text-white" />
          </span>
          <span className="border-surface absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 bg-[var(--color-success)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-ink-900 text-base font-bold">{t.name}</div>
          <div className="text-ink-500 text-[12.5px]">
            {pending ? t.statusTyping : t.statusOnline}
          </div>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={reset}
            className="border-line text-ink-600 hover:bg-ink-50 flex h-9 items-center gap-1.5 rounded-[10px] border bg-white px-3.5 text-[13px] font-semibold"
          >
            {t.newConversation}
          </button>
        )}
      </div>

      {/* Thread */}
      <div className="flex flex-1 flex-col gap-3">
        {isEmpty && (
          <>
            <AssistantRow>
              <div className="text-ink-800 text-[14.5px] leading-snug">
                <p className="font-semibold">{t.welcomeTitle}</p>
                <p className="text-ink-600 mt-1">{t.welcomeBody}</p>
              </div>
            </AssistantRow>
            <div className="flex flex-wrap gap-2 pl-[39px]">
              {Object.values(t.chips).map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void dispatch(chip)}
                  className="border-brand-200 text-brand-700 hover:bg-brand-50 h-9 rounded-full border bg-white px-4 text-[13.5px] font-semibold"
                >
                  {chip}
                </button>
              ))}
            </div>
          </>
        )}

        {items.map(item => {
          if (item.kind === 'user') {
            return (
              <div key={item.id} className="flex justify-end">
                <div className="bg-brand-600 max-w-[78%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[14.5px] leading-snug text-white">
                  {item.text}
                </div>
              </div>
            )
          }
          if (item.kind === 'assistant') {
            return (
              <AssistantRow key={item.id}>
                <div className="text-ink-800 text-[14.5px] leading-snug">
                  {item.text}
                </div>
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
                <div className="text-ink-700 text-[14.5px] leading-snug">
                  {t.errorTitle}
                </div>
                <button
                  type="button"
                  onClick={() => void dispatch(lastUserText.current)}
                  className="bg-brand-600 hover:bg-brand-700 mt-2.5 h-9 rounded-[11px] px-4 text-[13.5px] font-semibold text-white"
                >
                  {t.retry}
                </button>
              </AssistantRow>
            )
          }
          return (
            <UpsellCard
              key={item.id}
              variant={item.variant}
              messages={messages}
              onUpgrade={() => router.push('/settings/billing')}
            />
          )
        })}

        {pending && (
          <AssistantRow>
            <div className="flex items-center gap-1.5">
              {[0, 0.18, 0.36].map(delay => (
                <span
                  key={delay}
                  className="bg-ink-300 h-[7px] w-[7px] rounded-full"
                  style={{
                    animation: 'ld-typing 1.2s infinite ease-in-out',
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}
            </div>
          </AssistantRow>
        )}
        <div ref={bottom} />
      </div>

      {/* Input */}
      <div className="bg-bg/95 sticky bottom-24 z-10 -mx-4 mt-3 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:bottom-4">
        <div className="flex items-center gap-2.5">
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={locked}
            placeholder={t.inputPlaceholder}
            aria-label={t.inputPlaceholder}
            className="border-line text-ink-800 focus:border-brand-500 h-12 flex-1 rounded-full border-[1.5px] bg-white px-5 text-[14.5px] outline-none disabled:opacity-60"
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
            aria-label={t.send}
            className="bg-brand-600 enabled:hover:bg-brand-700 flex h-12 w-12 flex-none items-center justify-center rounded-full text-white transition disabled:opacity-40"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
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
    <div className="flex items-end gap-2.5">
      <span
        className={cn(
          'flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full',
          tone === 'danger'
            ? 'bg-[var(--color-danger)]/12 text-[var(--color-danger)]'
            : 'from-brand-600 bg-gradient-to-br to-violet-500 text-white',
        )}
      >
        {tone === 'danger' ? <AlertIcon /> : <SparkleIcon size={16} />}
      </span>
      <div className="border-line max-w-[78%] rounded-2xl rounded-bl-sm border bg-white px-3.5 py-2.5 shadow-sm">
        {children}
      </div>
    </div>
  )
}

type Messages = ReturnType<typeof useI18n>['messages']

function ActionCard({
  action,
  messages,
  locale,
  onOpenLists,
  onOpenToday,
}: {
  action: AssistantAction
  messages: Messages
  locale: string
  onOpenLists: () => void
  onOpenToday: () => void
}) {
  const c = messages.assistant.cards
  const input = isRecord(action.input) ? action.input : {}
  const result = isRecord(action.result) ? action.result : {}

  const shell = (children: React.ReactNode) => (
    <div className="flex items-start gap-2.5">
      <span className="from-brand-600 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-gradient-to-br to-violet-500 text-white">
        <SparkleIcon size={16} />
      </span>
      <div
        className="border-line w-full min-w-0 max-w-[80%] overflow-hidden rounded-2xl border bg-white shadow-md"
        style={{ animation: 'ld-up 0.28s cubic-bezier(0.2,0,0,1)' }}
      >
        {children}
      </div>
    </div>
  )

  if (action.tool === 'addTask') {
    return shell(
      <CardHeadline
        label={c.taskAdded}
        title={str(input.title) ?? ''}
        tint="success"
        icon={<CheckIcon size={17} className="text-[var(--color-success)]" />}
      />,
    )
  }

  if (action.tool === 'addEvent') {
    return shell(
      <CardHeadline
        label={c.eventScheduled}
        title={str(input.title) ?? ''}
        subtitle={formatWhen(str(input.startsAt), locale)}
        tint="brand"
        icon={<CalendarIcon />}
      />,
    )
  }

  if (action.tool === 'addHabit') {
    return shell(
      <CardHeadline
        label={c.habitCreated}
        title={str(input.title) ?? ''}
        subtitle={cadenceLabel(input.cadence, messages)}
        tint="warning"
        icon={<FlameIcon />}
      />,
    )
  }

  if (action.tool === 'createList') {
    return shell(
      <>
        <CardHeadline
          label={c.listCreated}
          title={str(input.title) ?? ''}
          tint="violet"
          icon={<ListIcon />}
        />
        <CardButton label={c.openList} onClick={onOpenLists} />
      </>,
    )
  }

  if (action.tool === 'getToday') {
    const tasks = Array.isArray(result.tasks) ? result.tasks : []
    return shell(
      <>
        <div className="px-3.5 pt-3.5">
          <div className="text-brand-700 text-[11px] font-bold tracking-[0.05em]">
            {c.today}
          </div>
        </div>
        <div className="px-3.5 pb-1.5 pt-1">
          {tasks.length === 0 ? (
            <div className="text-ink-500 py-1 text-[13px]">{c.noEvents}</div>
          ) : (
            tasks.map((task, index) => {
              const item = isRecord(task) ? task : {}
              const done = item.status === 'done' || item.status === 'completed'
              return (
                <div key={index} className="flex items-center gap-2.5 py-1">
                  <span
                    className={cn(
                      'flex h-[18px] w-[18px] flex-none items-center justify-center rounded-md border-2',
                      done
                        ? 'border-transparent bg-[var(--color-success)] text-white'
                        : 'border-ink-200',
                    )}
                  >
                    {done && <CheckIcon size={10} className="text-white" />}
                  </span>
                  <span
                    className={cn(
                      'text-[14px]',
                      done ? 'text-ink-400 line-through' : 'text-ink-700',
                    )}
                  >
                    {str(item.title) ?? ''}
                  </span>
                </div>
              )
            })
          )}
        </div>
        <CardButton label={c.openDay} onClick={onOpenToday} />
      </>,
    )
  }

  if (action.tool === 'getWeather') {
    return renderWeather(result, shell)
  }

  if (action.tool === 'findTime') {
    const slots = Array.isArray(result.slots) ? result.slots : []
    const first = isRecord(slots[0]) ? slots[0] : null
    return shell(
      <div className="p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="bg-[var(--color-success)]/15 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] text-[var(--color-success)]">
            <ClockIcon />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold tracking-[0.05em] text-[var(--color-success)]">
              {c.freeSlot}
            </div>
            <div className="text-ink-900 mt-0.5 text-[15px] font-semibold">
              {first
                ? formatSlot(str(first.startsAt), str(first.endsAt), locale)
                : ''}
            </div>
          </div>
        </div>
      </div>,
    )
  }

  return null
}

function renderWeather(
  result: Record<string, unknown>,
  shell: (children: React.ReactNode) => React.ReactElement,
): React.ReactElement | null {
  if (result.ok !== true || !isRecord(result.forecast)) {
    return null
  }
  const forecast = result.forecast
  const current = isRecord(forecast.current) ? forecast.current : null
  const temp =
    current && typeof current.temperatureC === 'number'
      ? `${Math.round(current.temperatureC)}°`
      : '--'
  return shell(
    <div className="bg-gradient-to-br from-sky-500 to-indigo-500 p-[18px] text-white">
      <div className="text-[12.5px] opacity-85">{str(forecast.location)}</div>
      <div className="mt-0.5 text-4xl font-extrabold tracking-[-0.03em]">
        {temp}
      </div>
      {current && (
        <div className="text-[13.5px] opacity-90">{str(current.condition)}</div>
      )}
    </div>,
  )
}

function CardHeadline({
  label,
  title,
  subtitle,
  tint,
  icon,
}: {
  label: string
  title: string
  subtitle?: string | null
  tint: 'success' | 'brand' | 'warning' | 'violet'
  icon: React.ReactNode
}) {
  const tints: Record<typeof tint, string> = {
    success: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
    brand: 'bg-brand-100 text-brand-600',
    warning: 'bg-[var(--color-warning)]/18 text-[var(--color-warning)]',
    violet: 'bg-violet-100 text-violet-500',
  }
  const labelTints: Record<typeof tint, string> = {
    success: 'text-[var(--color-success)]',
    brand: 'text-brand-600',
    warning: 'text-[var(--color-warning)]',
    violet: 'text-violet-500',
  }
  return (
    <div className="flex items-start gap-2.5 p-3.5">
      <span
        className={cn(
          'flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px]',
          tints[tint],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'text-[11px] font-bold tracking-[0.05em]',
            labelTints[tint],
          )}
        >
          {label}
        </div>
        <div className="text-ink-900 mt-0.5 text-[15px] font-semibold">
          {title}
        </div>
        {subtitle && (
          <div className="text-ink-500 mt-0.5 text-[13px]">{subtitle}</div>
        )}
      </div>
    </div>
  )
}

function CardButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-line text-brand-600 hover:bg-brand-50 h-11 w-full border-t text-[13.5px] font-semibold"
    >
      {label}
    </button>
  )
}

function UpsellCard({
  variant,
  messages,
  onUpgrade,
}: {
  variant: 'locked' | 'quota'
  messages: Messages
  onUpgrade: () => void
}) {
  const t = messages.assistant
  return (
    <div className="from-brand-600 flex items-center gap-4 rounded-[18px] bg-gradient-to-br to-violet-500 p-[22px] text-white">
      <div className="min-w-0 flex-1">
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-white/20 px-2.5 text-[11px] font-bold tracking-[0.04em]">
          {t.planBadge}
        </span>
        <div className="mt-2 text-lg font-bold">
          {variant === 'locked' ? t.lockedTitle : t.quotaTitle}
        </div>
        <p className="mt-1 max-w-[400px] text-[13.5px] leading-snug text-white/85">
          {variant === 'locked' ? t.lockedBody : t.quotaBody}
        </p>
      </div>
      <button
        type="button"
        onClick={onUpgrade}
        className="text-brand-700 h-[42px] flex-none rounded-full bg-white px-5 text-[14px] font-semibold shadow-md"
      >
        {t.upgrade}
      </button>
    </div>
  )
}

function formatWhen(iso: string | null, locale: string): string | null {
  if (!iso) {
    return null
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatSlot(
  start: string | null,
  end: string | null,
  locale: string,
): string {
  const startLabel = formatWhen(start, locale)
  if (!startLabel) {
    return ''
  }
  if (!end) {
    return startLabel
  }
  const endDate = new Date(end)
  if (Number.isNaN(endDate.getTime())) {
    return startLabel
  }
  const endTime = new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(endDate)
  return `${startLabel} – ${endTime}`
}

function cadenceLabel(cadence: unknown, messages: Messages): string | null {
  if (!isRecord(cadence)) {
    return null
  }
  if (cadence.kind === 'daily') {
    return messages.habits.daily
  }
  if (cadence.kind === 'weekdays') {
    return messages.habits.weekdays
  }
  if (cadence.kind === 'times_per_week' && typeof cadence.count === 'number') {
    return `${cadence.count} ${messages.habits.timesPerWeekUnit}`
  }
  return null
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c1 3 3 4 3 7a3 3 0 0 1-6 0c0-1 .3-1.7.8-2.6C9 8 7.5 9.6 7.5 12.5A4.5 4.5 0 0 0 12 22a6 6 0 0 0 6-6c0-4.5-3.5-6.5-6-14z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}
