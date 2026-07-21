import { ValidationError } from '@/shared/domain-error'

// A small, durable memory the assistant reads on every turn and writes to when
// the user shares a lasting fact (home, work, routine, family, preference). It
// is deliberately narrow and fully user-visible/clearable; never a place for
// secrets or sensitive data. Persisted as a single JSON column on the user.

export const MAX_PROFILE_LOCATION_LENGTH = 160
export const MAX_PERSON_NAME_LENGTH = 80
export const MAX_PERSON_RELATIONSHIP_LENGTH = 60
export const MAX_PEOPLE = 20
export const MAX_NOTE_LENGTH = 280
export const MAX_NOTES = 50

export type AssistantPerson = {
  name: string
  relationship: string | null
}

export type AssistantProfile = {
  /** Free-text place; used for weather and the daily brief. */
  homeLocation: string | null
  /** Free-text place; used by smart scheduling / commute-aware answers. */
  workLocation: string | null
  /** Local hour (0-23) the user usually wakes; bounds the earliest message. */
  wakeHour: number | null
  /** Local hours (0-23) between which we never message proactively. */
  quietHoursStart: number | null
  quietHoursEnd: number | null
  /** Local hours (0-23) that bound the working day; smart scheduling only
   *  proposes focus blocks inside this window. */
  workHoursStart: number | null
  workHoursEnd: number | null
  /** Whether the daily brief is on, and the local hour (0-23) it should send. */
  briefEnabled: boolean
  briefHour: number | null
  /** Whether proactive nudges are on. Defaults to on; the per-feature opt-out. */
  nudgesEnabled: boolean
  people: AssistantPerson[]
  notes: string[]
}

export const EMPTY_ASSISTANT_PROFILE: AssistantProfile = {
  homeLocation: null,
  workLocation: null,
  wakeHour: null,
  quietHoursStart: null,
  quietHoursEnd: null,
  workHoursStart: null,
  workHoursEnd: null,
  briefEnabled: false,
  briefHour: null,
  nudgesEnabled: true,
  people: [],
  notes: [],
}

// A partial update: only the provided keys change. A nullable field set to null
// clears it. `people` and `notes` replace the whole list when provided.
export type AssistantProfilePatch = Partial<{
  homeLocation: string | null
  workLocation: string | null
  wakeHour: number | null
  quietHoursStart: number | null
  quietHoursEnd: number | null
  workHoursStart: number | null
  workHoursEnd: number | null
  briefEnabled: boolean
  briefHour: number | null
  nudgesEnabled: boolean
  people: AssistantPerson[]
  notes: string[]
}>

function cleanLocation(value: string | null, field: string): string | null {
  if (value === null) {
    return null
  }
  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }
  if (trimmed.length > MAX_PROFILE_LOCATION_LENGTH) {
    throw new ValidationError(
      `${field} must be at most ${MAX_PROFILE_LOCATION_LENGTH} characters.`,
    )
  }
  return trimmed
}

function cleanHour(value: number | null, field: string): number | null {
  if (value === null) {
    return null
  }
  if (!Number.isInteger(value) || value < 0 || value > 23) {
    throw new ValidationError(`${field} must be a whole hour between 0 and 23.`)
  }
  return value
}

function cleanPeople(people: AssistantPerson[]): AssistantPerson[] {
  if (people.length > MAX_PEOPLE) {
    throw new ValidationError(`You can save at most ${MAX_PEOPLE} people.`)
  }
  const cleaned: AssistantPerson[] = []
  for (const person of people) {
    const name = person.name.trim()
    if (name === '') {
      // A blank name is a no-op row from the form, not an error; drop it.
      continue
    }
    if (name.length > MAX_PERSON_NAME_LENGTH) {
      throw new ValidationError(
        `A person's name must be at most ${MAX_PERSON_NAME_LENGTH} characters.`,
      )
    }
    const relationshipRaw = person.relationship?.trim() ?? ''
    if (relationshipRaw.length > MAX_PERSON_RELATIONSHIP_LENGTH) {
      throw new ValidationError(
        `A relationship must be at most ${MAX_PERSON_RELATIONSHIP_LENGTH} characters.`,
      )
    }
    cleaned.push({
      name,
      relationship: relationshipRaw === '' ? null : relationshipRaw,
    })
  }
  return cleaned
}

function cleanNote(note: string): string {
  const trimmed = note.trim()
  if (trimmed === '') {
    throw new ValidationError('A note must not be empty.')
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new ValidationError(
      `A note must be at most ${MAX_NOTE_LENGTH} characters.`,
    )
  }
  return trimmed
}

function cleanNotes(notes: string[]): string[] {
  if (notes.length > MAX_NOTES) {
    throw new ValidationError(`You can save at most ${MAX_NOTES} notes.`)
  }
  return notes.map(cleanNote)
}

// Applies a validated patch on top of the current profile, returning a new one.
// Throws ValidationError on any invalid field, so a bad set never persists.
export function applyAssistantProfilePatch(
  current: AssistantProfile,
  patch: AssistantProfilePatch,
): AssistantProfile {
  const next: AssistantProfile = { ...current }
  if (patch.homeLocation !== undefined) {
    next.homeLocation = cleanLocation(patch.homeLocation, 'Home location')
  }
  if (patch.workLocation !== undefined) {
    next.workLocation = cleanLocation(patch.workLocation, 'Work location')
  }
  if (patch.wakeHour !== undefined) {
    next.wakeHour = cleanHour(patch.wakeHour, 'Wake hour')
  }
  if (patch.quietHoursStart !== undefined) {
    next.quietHoursStart = cleanHour(patch.quietHoursStart, 'Quiet hours start')
  }
  if (patch.quietHoursEnd !== undefined) {
    next.quietHoursEnd = cleanHour(patch.quietHoursEnd, 'Quiet hours end')
  }
  if (patch.workHoursStart !== undefined) {
    next.workHoursStart = cleanHour(patch.workHoursStart, 'Work hours start')
  }
  if (patch.workHoursEnd !== undefined) {
    next.workHoursEnd = cleanHour(patch.workHoursEnd, 'Work hours end')
  }
  if (patch.briefEnabled !== undefined) {
    next.briefEnabled = patch.briefEnabled
  }
  if (patch.briefHour !== undefined) {
    next.briefHour = cleanHour(patch.briefHour, 'Brief hour')
  }
  if (patch.nudgesEnabled !== undefined) {
    next.nudgesEnabled = patch.nudgesEnabled
  }
  if (patch.people !== undefined) {
    next.people = cleanPeople(patch.people)
  }
  if (patch.notes !== undefined) {
    next.notes = cleanNotes(patch.notes)
  }
  return next
}

// Appends one note, enforcing the cap. Used by the agent's incremental "remember
// this" path; the web replaces the whole list through applyAssistantProfilePatch.
export function appendAssistantNote(
  current: AssistantProfile,
  note: string,
): AssistantProfile {
  const cleaned = cleanNote(note)
  if (current.notes.length >= MAX_NOTES) {
    throw new ValidationError(`You can save at most ${MAX_NOTES} notes.`)
  }
  return { ...current, notes: [...current.notes, cleaned] }
}

// Removes the note at the given index; an out-of-range index is a no-op.
export function removeAssistantNote(
  current: AssistantProfile,
  index: number,
): AssistantProfile {
  if (!Number.isInteger(index) || index < 0 || index >= current.notes.length) {
    return current
  }
  return {
    ...current,
    notes: current.notes.filter((_, i) => i !== index),
  }
}

function coerceString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed.slice(0, max)
}

function coerceHour(value: unknown): number | null {
  return Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= 23
    ? (value as number)
    : null
}

function coercePeople(value: unknown): AssistantPerson[] {
  if (!Array.isArray(value)) {
    return []
  }
  const people: AssistantPerson[] = []
  for (const entry of value.slice(0, MAX_PEOPLE)) {
    if (typeof entry !== 'object' || entry === null) {
      continue
    }
    const name = coerceString(
      (entry as { name?: unknown }).name,
      MAX_PERSON_NAME_LENGTH,
    )
    if (name === null) {
      continue
    }
    people.push({
      name,
      relationship: coerceString(
        (entry as { relationship?: unknown }).relationship,
        MAX_PERSON_RELATIONSHIP_LENGTH,
      ),
    })
  }
  return people
}

function coerceNotes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const notes: string[] = []
  for (const entry of value.slice(0, MAX_NOTES)) {
    const note = coerceString(entry, MAX_NOTE_LENGTH)
    if (note !== null) {
      notes.push(note)
    }
  }
  return notes
}

// Leniently reads a stored (possibly malformed or legacy) JSON value into a
// valid profile, mirroring the timezone fallback: never throw on read, just
// drop anything that does not fit and fall back to the empty profile.
export function sanitizeAssistantProfile(value: unknown): AssistantProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...EMPTY_ASSISTANT_PROFILE }
  }
  const raw = value as Record<string, unknown>
  return {
    homeLocation: coerceString(raw.homeLocation, MAX_PROFILE_LOCATION_LENGTH),
    workLocation: coerceString(raw.workLocation, MAX_PROFILE_LOCATION_LENGTH),
    wakeHour: coerceHour(raw.wakeHour),
    quietHoursStart: coerceHour(raw.quietHoursStart),
    quietHoursEnd: coerceHour(raw.quietHoursEnd),
    workHoursStart: coerceHour(raw.workHoursStart),
    workHoursEnd: coerceHour(raw.workHoursEnd),
    briefEnabled: raw.briefEnabled === true,
    briefHour: coerceHour(raw.briefHour),
    // Defaults on: only an explicit false opts out, so legacy rows keep nudges.
    nudgesEnabled: raw.nudgesEnabled !== false,
    people: coercePeople(raw.people),
    notes: coerceNotes(raw.notes),
  }
}

// True when nothing has been saved yet, so callers can skip a memory block.
export function isAssistantProfileEmpty(profile: AssistantProfile): boolean {
  return (
    profile.homeLocation === null &&
    profile.workLocation === null &&
    profile.wakeHour === null &&
    profile.quietHoursStart === null &&
    profile.quietHoursEnd === null &&
    profile.workHoursStart === null &&
    profile.workHoursEnd === null &&
    !profile.briefEnabled &&
    profile.briefHour === null &&
    profile.nudgesEnabled &&
    profile.people.length === 0 &&
    profile.notes.length === 0
  )
}

// A compact one-line-per-fact summary the assistant reads as context. Returns an
// empty string when nothing is saved. The facts are the user's own words; the
// caller is responsible for labelling them as untrusted in the prompt.
export function summarizeAssistantProfile(profile: AssistantProfile): string {
  const lines: string[] = []
  if (profile.homeLocation) {
    lines.push(`Home: ${profile.homeLocation}`)
  }
  if (profile.workLocation) {
    lines.push(`Work: ${profile.workLocation}`)
  }
  if (profile.wakeHour !== null) {
    lines.push(`Usually wakes around ${profile.wakeHour}:00`)
  }
  if (profile.quietHoursStart !== null && profile.quietHoursEnd !== null) {
    lines.push(
      `Quiet hours ${profile.quietHoursStart}:00-${profile.quietHoursEnd}:00`,
    )
  }
  if (profile.workHoursStart !== null && profile.workHoursEnd !== null) {
    lines.push(
      `Work hours ${profile.workHoursStart}:00-${profile.workHoursEnd}:00`,
    )
  }
  if (profile.people.length > 0) {
    lines.push(
      `People: ${profile.people
        .map(p => (p.relationship ? `${p.name} (${p.relationship})` : p.name))
        .join(', ')}`,
    )
  }
  for (const note of profile.notes) {
    lines.push(`Note: ${note}`)
  }
  return lines.join('\n')
}
