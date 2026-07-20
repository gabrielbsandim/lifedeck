'use client'

import { useMemo, useState } from 'react'
import { Button } from '@lifedeck/ui'
import type { SessionUser } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSetAssistantProfile } from '@/lib/api/use-account'
import { SectionCard, Toggle } from '@/components/settings/settings-ui'

type PersonDraft = { name: string; relationship: string }

const INPUT_CLASS =
  'border-line text-ink-700 focus:border-brand-300 h-[42px] min-w-0 flex-1 rounded-xl border bg-white px-3.5 text-sm outline-none'

// A whole-hour <select> for a nullable local hour (0-23); the blank option maps
// back to null so the user can leave a routine unset.
function HourSelect({
  value,
  onChange,
  label,
  unsetLabel,
  disabled,
}: {
  value: number | null
  onChange: (value: number | null) => void
  label: string
  unsetLabel: string
  disabled?: boolean
}) {
  return (
    <select
      aria-label={label}
      value={value === null ? '' : String(value)}
      disabled={disabled}
      onChange={event =>
        onChange(event.target.value === '' ? null : Number(event.target.value))
      }
      className="border-line text-ink-700 focus:border-brand-300 h-[42px] rounded-xl border bg-white px-3 text-sm outline-none"
    >
      <option value="">{unsetLabel}</option>
      {Array.from({ length: 24 }, (_, hour) => (
        <option key={hour} value={hour}>
          {String(hour).padStart(2, '0')}:00
        </option>
      ))}
    </select>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-700 text-xs font-medium">{children}</span>
}

export function AssistantMemoryCard({ user }: { user: SessionUser }) {
  const { messages } = useI18n()
  const m = messages.assistantMemory
  const setProfile = useSetAssistantProfile()
  const profile = user.assistantProfile

  const [home, setHome] = useState(profile.homeLocation ?? '')
  const [work, setWork] = useState(profile.workLocation ?? '')
  const [wakeHour, setWakeHour] = useState<number | null>(profile.wakeHour)
  const [quietStart, setQuietStart] = useState<number | null>(
    profile.quietHoursStart,
  )
  const [quietEnd, setQuietEnd] = useState<number | null>(profile.quietHoursEnd)
  const [briefEnabled, setBriefEnabled] = useState(profile.briefEnabled)
  const [briefHour, setBriefHour] = useState<number | null>(profile.briefHour)
  const [people, setPeople] = useState<PersonDraft[]>(
    profile.people.map(person => ({
      name: person.name,
      relationship: person.relationship ?? '',
    })),
  )
  const [notes, setNotes] = useState<string[]>([...profile.notes])
  const [noteDraft, setNoteDraft] = useState('')

  // The normalized payload the Save button would send, so we can both submit it
  // and diff it against what is saved to enable the button only when changed.
  const payload = useMemo(() => {
    const cleanPeople = people
      .map(person => ({
        name: person.name.trim(),
        relationship: person.relationship.trim(),
      }))
      .filter(person => person.name !== '')
      .map(person => ({
        name: person.name,
        relationship: person.relationship === '' ? null : person.relationship,
      }))
    return {
      homeLocation: home.trim() === '' ? null : home.trim(),
      workLocation: work.trim() === '' ? null : work.trim(),
      wakeHour,
      quietHoursStart: quietStart,
      quietHoursEnd: quietEnd,
      briefEnabled,
      briefHour,
      people: cleanPeople,
      notes,
    }
  }, [
    home,
    work,
    wakeHour,
    quietStart,
    quietEnd,
    briefEnabled,
    briefHour,
    people,
    notes,
  ])

  const saved = useMemo(
    () => ({
      homeLocation: profile.homeLocation,
      workLocation: profile.workLocation,
      wakeHour: profile.wakeHour,
      quietHoursStart: profile.quietHoursStart,
      quietHoursEnd: profile.quietHoursEnd,
      briefEnabled: profile.briefEnabled,
      briefHour: profile.briefHour,
      people: profile.people.map(person => ({
        name: person.name,
        relationship: person.relationship,
      })),
      notes: profile.notes,
    }),
    [profile],
  )

  const dirty = JSON.stringify(payload) !== JSON.stringify(saved)

  const addNoteDraft = () => {
    const trimmed = noteDraft.trim()
    if (trimmed === '') return
    setNotes(current => [...current, trimmed])
    setNoteDraft('')
  }

  return (
    <SectionCard className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-ink-900 text-sm font-semibold">
          {m.settingLabel}
        </span>
        <p className="text-ink-500 text-xs leading-relaxed">{m.settingHint}</p>
      </div>

      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <FieldLabel>{m.home}</FieldLabel>
          <input
            type="text"
            value={home}
            maxLength={160}
            placeholder={m.homePlaceholder}
            onChange={event => setHome(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>{m.work}</FieldLabel>
          <input
            type="text"
            value={work}
            maxLength={160}
            placeholder={m.workPlaceholder}
            onChange={event => setWork(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
        <label className="flex flex-col gap-1">
          <FieldLabel>{m.wakeHour}</FieldLabel>
          <HourSelect
            value={wakeHour}
            onChange={setWakeHour}
            label={m.wakeHour}
            unsetLabel={m.hourUnset}
          />
        </label>
        <div className="flex flex-col gap-1">
          <FieldLabel>{m.quietHours}</FieldLabel>
          <div className="flex items-center gap-2">
            <HourSelect
              value={quietStart}
              onChange={setQuietStart}
              label={`${m.quietHours} ${m.quietTo}`}
              unsetLabel={m.hourUnset}
            />
            <span className="text-ink-500 text-xs">{m.quietTo}</span>
            <HourSelect
              value={quietEnd}
              onChange={setQuietEnd}
              label={`${m.quietHours} ${m.quietTo}`}
              unsetLabel={m.hourUnset}
            />
          </div>
        </div>
      </div>

      <div className="border-line flex flex-col gap-2 border-t pt-4">
        <div className="flex max-w-xl items-center justify-between gap-3">
          <div className="flex flex-col">
            <FieldLabel>{m.dailyBrief}</FieldLabel>
            <span className="text-ink-500 text-xs">{m.dailyBriefHint}</span>
          </div>
          <Toggle
            label={m.dailyBrief}
            checked={briefEnabled}
            onChange={() => setBriefEnabled(value => !value)}
          />
        </div>
        {briefEnabled && (
          <label className="flex items-center gap-2">
            <FieldLabel>{m.briefHour}</FieldLabel>
            <HourSelect
              value={briefHour}
              onChange={setBriefHour}
              label={m.briefHour}
              unsetLabel={m.hourUnset}
            />
          </label>
        )}
      </div>

      <div className="border-line flex flex-col gap-2 border-t pt-4">
        <FieldLabel>{m.people}</FieldLabel>
        <span className="text-ink-500 text-xs">{m.peopleHint}</span>
        {people.map((person, index) => (
          <div
            key={index}
            className="flex max-w-xl flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={person.name}
              maxLength={80}
              placeholder={m.personName}
              aria-label={m.personName}
              onChange={event =>
                setPeople(current =>
                  current.map((p, i) =>
                    i === index ? { ...p, name: event.target.value } : p,
                  ),
                )
              }
              className={INPUT_CLASS}
            />
            <input
              type="text"
              value={person.relationship}
              maxLength={60}
              placeholder={m.personRelationship}
              aria-label={m.personRelationship}
              onChange={event =>
                setPeople(current =>
                  current.map((p, i) =>
                    i === index
                      ? { ...p, relationship: event.target.value }
                      : p,
                  ),
                )
              }
              className={INPUT_CLASS}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setPeople(current => current.filter((_, i) => i !== index))
              }
            >
              {m.remove}
            </Button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setPeople(current => [...current, { name: '', relationship: '' }])
          }
          className="text-brand-600 self-start text-[13px] font-semibold"
        >
          {m.addPerson}
        </button>
      </div>

      <div className="border-line flex flex-col gap-2 border-t pt-4">
        <FieldLabel>{m.notes}</FieldLabel>
        <span className="text-ink-500 text-xs">{m.notesHint}</span>
        {notes.map((note, index) => (
          <div key={index} className="flex max-w-xl items-center gap-2">
            <span className="text-ink-700 flex-1 text-sm">{note}</span>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setNotes(current => current.filter((_, i) => i !== index))
              }
            >
              {m.remove}
            </Button>
          </div>
        ))}
        <form
          className="flex max-w-xl items-center gap-2"
          onSubmit={event => {
            event.preventDefault()
            addNoteDraft()
          }}
        >
          <input
            type="text"
            value={noteDraft}
            maxLength={280}
            placeholder={m.notePlaceholder}
            aria-label={m.notePlaceholder}
            onChange={event => setNoteDraft(event.target.value)}
            className={INPUT_CLASS}
          />
          <Button
            type="submit"
            variant="ghost"
            disabled={noteDraft.trim() === ''}
          >
            {m.addNote}
          </Button>
        </form>
      </div>

      <div className="border-line flex items-center gap-3 border-t pt-4">
        <Button
          type="button"
          variant="primary"
          disabled={!dirty || setProfile.isPending}
          onClick={() => setProfile.mutate(payload)}
        >
          {m.save}
        </Button>
        {setProfile.isSuccess && !dirty && (
          <span className="text-xs font-medium text-emerald-600">
            {m.saved}
          </span>
        )}
      </div>
    </SectionCard>
  )
}
