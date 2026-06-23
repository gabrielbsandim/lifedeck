'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Card, TextField } from '@lifedeck/ui'
import type { GenerationBrief } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useGenerateList,
  useSaveDraftList,
  type DraftList,
} from '@/lib/api/use-ai'

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

const fieldClass =
  'border-line bg-bg focus:border-brand-500 focus:ring-brand-100 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4'

export function AiGenerator() {
  const { messages, locale } = useI18n()
  const router = useRouter()
  const generate = useGenerateList()
  const save = useSaveDraftList()

  const [category, setCategory] = useState<Category>('wedding')
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
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
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(targetDate ? { targetDate } : {}),
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
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-brand-600 text-sm font-medium">
          ← {t.backToToday}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-ink-500 text-sm">{t.subtitle}</p>
      </header>

      {draft ? (
        <Card className="flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{t.draftTitle}</h2>
            <p className="text-ink-500 text-sm">{t.draftSubtitle}</p>
          </div>

          <TextField
            value={draft.title}
            onChange={event =>
              setDraft({ ...draft, title: event.target.value })
            }
            aria-label={t.listTitleLabel}
            maxLength={120}
          />

          <ul className="flex flex-col gap-2">
            {draft.tasks.map((task, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  className={fieldClass}
                  value={task.title}
                  onChange={event => updateTask(index, event.target.value)}
                  placeholder={t.taskPlaceholder}
                  maxLength={280}
                />
                <button
                  type="button"
                  onClick={() => removeTask(index)}
                  className="text-ink-400 px-2 text-sm hover:text-red-600"
                  aria-label={t.remove}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={addTask}
            className="text-brand-600 hover:text-brand-700 self-start text-sm font-medium"
          >
            + {t.addTask}
          </button>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={saveDraft}
              isLoading={save.isPending}
              disabled={draft.tasks.every(task => !task.title.trim())}
            >
              {save.isPending ? t.saving : t.save}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraft(null)}
              disabled={save.isPending}
            >
              {t.regenerate}
            </Button>
          </div>
          {save.isError ? (
            <p className="text-sm text-red-600">{messages.common.error}</p>
          ) : null}
        </Card>
      ) : (
        <Card className="p-6 sm:p-8">
          <form onSubmit={submitBrief} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-ink-700 text-sm font-medium">
                {t.category}
              </span>
              <select
                className={fieldClass}
                value={category}
                onChange={event => setCategory(event.target.value as Category)}
              >
                {CATEGORIES.map(value => (
                  <option key={value} value={value}>
                    {categoryLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-ink-700 text-sm font-medium">
                {t.scale}
              </span>
              <select
                className={fieldClass}
                value={scale}
                onChange={event => setScale(event.target.value as Scale)}
              >
                {SCALES.map(value => (
                  <option key={value} value={value}>
                    {scaleLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-ink-700 text-sm font-medium">
                {t.listTitleLabel}
              </span>
              <TextField
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder={t.listTitlePlaceholder}
                maxLength={120}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-ink-700 text-sm font-medium">
                {t.targetDate}
              </span>
              <input
                type="date"
                className={fieldClass}
                value={targetDate}
                onChange={event => setTargetDate(event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-ink-700 text-sm font-medium">
                {t.description}
              </span>
              <textarea
                className={`${fieldClass} min-h-32 resize-y`}
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder={t.descriptionPlaceholder}
                maxLength={2000}
                required
              />
            </label>

            <Button
              type="submit"
              isLoading={generate.isPending}
              disabled={!description.trim()}
            >
              {generate.isPending ? t.generating : t.generate}
            </Button>
            {generate.isError ? (
              <p className="text-sm text-red-600">{t.error}</p>
            ) : null}
          </form>
        </Card>
      )}
    </section>
  )
}
