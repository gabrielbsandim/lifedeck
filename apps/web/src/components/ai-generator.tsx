'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Skeleton, cn } from '@lifedeck/ui'
import type { GenerationBrief } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useGenerateList,
  useSaveDraftList,
  type DraftList,
} from '@/lib/api/use-ai'
import { CheckIcon, PlusIcon, SparkleIcon } from '@/components/icons'

type Category = GenerationBrief['category']
type Scale = GenerationBrief['scale']

const CATEGORIES: Category[] = [
  'wedding',
  'trip',
  'moving',
  'event',
  'project',
  'other',
]
const SCALES: Scale[] = ['small', 'medium', 'large']

export function AiGenerator() {
  const { messages, locale } = useI18n()
  const router = useRouter()
  const generate = useGenerateList()
  const save = useSaveDraftList()

  const [category, setCategory] = useState<Category>('wedding')
  const [scale, setScale] = useState<Scale>('medium')
  const [description, setDescription] = useState('')
  const [draft, setDraft] = useState<DraftList | null>(null)

  const t = messages.ai

  function categoryLabel(value: Category): string {
    const map: Record<Category, string> = {
      wedding: t.categoryWedding,
      trip: t.categoryTrip,
      moving: t.categoryMoving,
      event: t.categoryEvent,
      project: t.categoryProject,
      other: t.categoryOther,
    }
    return map[value]
  }

  function scaleLabel(value: Scale): string {
    const map: Record<Scale, string> = {
      small: t.scaleSmall,
      medium: t.scaleMedium,
      large: t.scaleLarge,
    }
    return map[value]
  }

  function submitBrief(event: FormEvent) {
    event.preventDefault()
    const trimmed = description.trim()
    if (!trimmed) {
      return
    }
    const brief: GenerationBrief = {
      category,
      scale,
      description: trimmed,
      locale,
    }
    generate.mutate(brief, {
      onSuccess: result =>
        setDraft({
          title: result.title,
          tasks: result.tasks.map(task => ({
            title: task.title,
            note: task.note,
          })),
        }),
    })
  }

  function updateTask(index: number, value: string) {
    setDraft(current =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task, i) =>
              i === index ? { ...task, title: value } : task,
            ),
          }
        : current,
    )
  }

  function removeTask(index: number) {
    setDraft(current =>
      current
        ? { ...current, tasks: current.tasks.filter((_, i) => i !== index) }
        : current,
    )
  }

  function addTask() {
    setDraft(current =>
      current
        ? { ...current, tasks: [...current.tasks, { title: '', note: null }] }
        : current,
    )
  }

  function saveDraft() {
    if (!draft) {
      return
    }
    const cleaned: DraftList = {
      title: draft.title.trim() || categoryLabel(category),
      tasks: draft.tasks
        .map(task => ({ title: task.title.trim(), note: task.note }))
        .filter(task => task.title.length > 0),
    }
    save.mutate(cleaned, {
      onSuccess: list => router.push(`/lists/${list.id}`),
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">{t.title}</h1>
        <p className="text-ink-500 text-sm">{t.subtitle}</p>
      </header>

      {draft ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-success/15 text-success flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[9px]">
              <CheckIcon size={14} />
            </span>
            <span className="text-ink-900 text-[15px] font-bold">
              {t.draftTitle}
            </span>
            <span className="text-ink-500 text-[13px]">
              · {t.draftSubtitle}
            </span>
          </div>

          <input
            value={draft.title}
            onChange={event =>
              setDraft({ ...draft, title: event.target.value })
            }
            aria-label={t.listTitleLabel}
            maxLength={120}
            className="border-line text-ink-900 focus:border-brand-600 h-12 rounded-[14px] border-[1.5px] bg-white px-4 text-base font-semibold outline-none"
          />

          <div className="border-line overflow-hidden rounded-2xl border bg-white">
            {draft.tasks.map((task, index) => (
              <div
                key={index}
                className="border-line/60 relative flex min-h-[52px] items-center gap-2.5 border-b pl-4 pr-1.5 last:border-b-0"
              >
                <span className="bg-brand-300 h-[7px] w-[7px] flex-none rounded-full" />
                <input
                  value={task.title}
                  onChange={event => updateTask(index, event.target.value)}
                  placeholder={t.taskPlaceholder}
                  maxLength={280}
                  className="text-ink-800 h-11 min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeTask(index)}
                  aria-label={t.remove}
                  className="text-ink-300 hover:text-danger flex h-8 w-8 flex-none items-center justify-center transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTask}
              className="text-brand-600 flex h-[46px] w-full items-center justify-center gap-1.5 text-[13.5px] font-semibold"
            >
              <PlusIcon size={14} strokeWidth={2.4} />
              {t.addTask}
            </button>
          </div>

          <button
            type="button"
            onClick={saveDraft}
            disabled={
              save.isPending || draft.tasks.every(task => !task.title.trim())
            }
            className="bg-brand-600 active:bg-brand-700 mt-1 flex h-12 items-center justify-center rounded-[14px] text-[15px] font-semibold text-white shadow-[0_4px_16px_-4px_oklch(0.52_0.22_280/0.5)] disabled:opacity-60"
          >
            {save.isPending ? t.saving : t.save}
          </button>
          <button
            type="button"
            onClick={() => setDraft(null)}
            disabled={save.isPending}
            className="text-brand-600 h-11 text-sm font-semibold"
          >
            {t.regenerate}
          </button>
          {save.isError ? (
            <p className="text-danger text-sm">{messages.common.error}</p>
          ) : null}
        </div>
      ) : generate.isPending ? (
        <div className="flex flex-col items-center gap-3.5 px-0 pb-5 pt-11 text-center">
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="from-brand-600 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br to-violet-500 text-white shadow-[0_12px_32px_-8px_oklch(0.52_0.22_280/0.5)]"
          >
            <span
              className="flex animate-spin"
              style={{ animationDuration: '2.4s' }}
            >
              <SparkleIcon size={26} />
            </span>
          </motion.span>
          <span className="text-ink-900 text-base font-bold">
            {t.generating}
          </span>
          <div className="mt-1.5 flex w-full flex-col gap-2">
            <Skeleton className="h-[52px] rounded-[14px]" />
            <Skeleton className="h-[52px] rounded-[14px]" />
            <Skeleton className="h-[52px] rounded-[14px]" />
          </div>
        </div>
      ) : (
        <form onSubmit={submitBrief} className="flex flex-col gap-4">
          <div>
            <p className="text-ink-700 px-0.5 pb-2 text-[13px] font-semibold">
              {t.category}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(value => {
                const active = category === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategory(value)}
                    className={cn(
                      'h-11 truncate rounded-[13px] border-[1.5px] px-1 text-[13px] font-semibold transition-colors active:scale-[0.96]',
                      active
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-line text-ink-700 bg-white',
                    )}
                  >
                    {categoryLabel(value)}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-ink-700 px-0.5 pb-2 text-[13px] font-semibold">
              {t.scale}
            </p>
            <div className="border-line flex gap-[3px] rounded-[13px] border bg-white p-[3px]">
              {SCALES.map(value => {
                const active = scale === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScale(value)}
                    className={cn(
                      'h-9 flex-1 rounded-[10px] text-[13px] font-semibold transition-colors',
                      active
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-ink-600',
                    )}
                  >
                    {scaleLabel(value)}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-ink-700 px-0.5 pb-2 text-[13px] font-semibold">
              {t.description}
            </p>
            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder={t.descriptionPlaceholder}
              maxLength={2000}
              required
              className="border-line text-ink-800 focus:border-brand-600 min-h-[110px] w-full resize-none rounded-[14px] border-[1.5px] bg-white px-3.5 py-3 text-sm leading-[1.45] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!description.trim()}
            className="bg-brand-600 active:bg-brand-700 flex h-[50px] items-center justify-center gap-2.5 rounded-[14px] text-[15px] font-semibold text-white shadow-[0_4px_16px_-4px_oklch(0.52_0.22_280/0.5)] disabled:opacity-60"
          >
            <SparkleIcon size={18} />
            {t.generate}
          </button>
          {generate.isError ? (
            <p className="text-danger text-sm">{t.error}</p>
          ) : null}
        </form>
      )}
    </section>
  )
}
