import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import {
  EMPTY_ASSISTANT_PROFILE,
  MAX_NOTES,
  MAX_PEOPLE,
  appendAssistantNote,
  applyAssistantProfilePatch,
  isAssistantProfileEmpty,
  removeAssistantNote,
  sanitizeAssistantProfile,
  summarizeAssistantProfile,
  type AssistantProfile,
} from '@/value-objects/assistant-profile'

function base(overrides: Partial<AssistantProfile> = {}): AssistantProfile {
  return { ...EMPTY_ASSISTANT_PROFILE, ...overrides }
}

describe('applyAssistantProfilePatch', () => {
  it('trims a location and leaves other fields untouched', () => {
    const next = applyAssistantProfilePatch(base({ workLocation: 'Office' }), {
      homeLocation: '  Lisbon  ',
    })
    expect(next.homeLocation).toBe('Lisbon')
    expect(next.workLocation).toBe('Office')
  })

  it('clears a location with null or a blank string', () => {
    const start = base({ homeLocation: 'Lisbon' })
    expect(
      applyAssistantProfilePatch(start, { homeLocation: null }).homeLocation,
    ).toBeNull()
    expect(
      applyAssistantProfilePatch(start, { homeLocation: '   ' }).homeLocation,
    ).toBeNull()
  })

  it('rejects a location over the max length', () => {
    expect(() =>
      applyAssistantProfilePatch(base(), { homeLocation: 'a'.repeat(161) }),
    ).toThrow(ValidationError)
  })

  it('accepts whole hours and rejects out-of-range or fractional hours', () => {
    expect(applyAssistantProfilePatch(base(), { wakeHour: 0 }).wakeHour).toBe(0)
    expect(applyAssistantProfilePatch(base(), { wakeHour: 23 }).wakeHour).toBe(
      23,
    )
    expect(
      applyAssistantProfilePatch(base(), { wakeHour: null }).wakeHour,
    ).toBeNull()
    expect(() => applyAssistantProfilePatch(base(), { wakeHour: 24 })).toThrow(
      ValidationError,
    )
    expect(() =>
      applyAssistantProfilePatch(base(), { quietHoursStart: -1 }),
    ).toThrow(ValidationError)
    expect(() =>
      applyAssistantProfilePatch(base(), { briefHour: 8.5 }),
    ).toThrow(ValidationError)
  })

  it('updates the brief toggle and the quiet-hours window', () => {
    const next = applyAssistantProfilePatch(base(), {
      briefEnabled: true,
      briefHour: 7,
      quietHoursStart: 22,
      quietHoursEnd: 6,
    })
    expect(next).toMatchObject({
      briefEnabled: true,
      briefHour: 7,
      quietHoursStart: 22,
      quietHoursEnd: 6,
    })
  })

  it('sets and clears the work-hours window', () => {
    const next = applyAssistantProfilePatch(base(), {
      workHoursStart: 9,
      workHoursEnd: 18,
    })
    expect(next).toMatchObject({ workHoursStart: 9, workHoursEnd: 18 })
    const cleared = applyAssistantProfilePatch(next, { workHoursStart: null })
    expect(cleared.workHoursStart).toBeNull()
    expect(cleared.workHoursEnd).toBe(18)
    expect(() =>
      applyAssistantProfilePatch(base(), { workHoursEnd: 24 }),
    ).toThrow(ValidationError)
  })

  it('replaces the people list, trimming and dropping blank rows', () => {
    const next = applyAssistantProfilePatch(base(), {
      people: [
        { name: '  Ana  ', relationship: '  daughter  ' },
        { name: '   ', relationship: 'noise' },
        { name: 'Bob', relationship: null },
      ],
    })
    expect(next.people).toEqual([
      { name: 'Ana', relationship: 'daughter' },
      { name: 'Bob', relationship: null },
    ])
  })

  it('rejects too many people or an over-long name/relationship', () => {
    expect(() =>
      applyAssistantProfilePatch(base(), {
        people: Array.from({ length: MAX_PEOPLE + 1 }, (_, i) => ({
          name: `P${i}`,
          relationship: null,
        })),
      }),
    ).toThrow(ValidationError)
    expect(() =>
      applyAssistantProfilePatch(base(), {
        people: [{ name: 'a'.repeat(81), relationship: null }],
      }),
    ).toThrow(ValidationError)
    expect(() =>
      applyAssistantProfilePatch(base(), {
        people: [{ name: 'Ana', relationship: 'r'.repeat(61) }],
      }),
    ).toThrow(ValidationError)
  })

  it('replaces and validates the notes list', () => {
    expect(
      applyAssistantProfilePatch(base(), { notes: ['  prefers metric  '] })
        .notes,
    ).toEqual(['prefers metric'])
    expect(() => applyAssistantProfilePatch(base(), { notes: ['  '] })).toThrow(
      ValidationError,
    )
    expect(() =>
      applyAssistantProfilePatch(base(), {
        notes: Array.from({ length: MAX_NOTES + 1 }, () => 'note'),
      }),
    ).toThrow(ValidationError)
  })
})

describe('appendAssistantNote / removeAssistantNote', () => {
  it('appends a trimmed note', () => {
    const next = appendAssistantNote(base({ notes: ['one'] }), '  two  ')
    expect(next.notes).toEqual(['one', 'two'])
  })

  it('rejects a blank note or one past the cap', () => {
    expect(() => appendAssistantNote(base(), '   ')).toThrow(ValidationError)
    const full = base({ notes: Array.from({ length: MAX_NOTES }, () => 'n') })
    expect(() => appendAssistantNote(full, 'one more')).toThrow(ValidationError)
  })

  it('removes a note by index and ignores an out-of-range index', () => {
    const start = base({ notes: ['a', 'b', 'c'] })
    expect(removeAssistantNote(start, 1).notes).toEqual(['a', 'c'])
    expect(removeAssistantNote(start, 9).notes).toEqual(['a', 'b', 'c'])
    expect(removeAssistantNote(start, -1).notes).toEqual(['a', 'b', 'c'])
  })
})

describe('sanitizeAssistantProfile', () => {
  it('returns the empty profile for a non-object', () => {
    expect(sanitizeAssistantProfile(null)).toEqual(EMPTY_ASSISTANT_PROFILE)
    expect(sanitizeAssistantProfile('nope')).toEqual(EMPTY_ASSISTANT_PROFILE)
    expect(sanitizeAssistantProfile([1, 2])).toEqual(EMPTY_ASSISTANT_PROFILE)
  })

  it('keeps valid fields and drops malformed ones', () => {
    const result = sanitizeAssistantProfile({
      homeLocation: '  Lisbon  ',
      workLocation: 42,
      wakeHour: 7,
      quietHoursStart: 99,
      briefEnabled: true,
      briefHour: 'nope',
      people: [
        { name: 'Ana', relationship: 'daughter' },
        { name: '', relationship: 'x' },
        'garbage',
        { relationship: 'no name' },
      ],
      notes: ['keep', 42, '  '],
    })
    expect(result).toEqual({
      homeLocation: 'Lisbon',
      workLocation: null,
      wakeHour: 7,
      quietHoursStart: null,
      quietHoursEnd: null,
      workHoursStart: null,
      workHoursEnd: null,
      briefEnabled: true,
      briefHour: null,
      nudgesEnabled: true,
      people: [{ name: 'Ana', relationship: 'daughter' }],
      notes: ['keep'],
    })
  })

  it('caps people and notes read from storage', () => {
    const result = sanitizeAssistantProfile({
      people: Array.from({ length: MAX_PEOPLE + 5 }, (_, i) => ({
        name: `P${i}`,
      })),
      notes: Array.from({ length: MAX_NOTES + 5 }, (_, i) => `n${i}`),
    })
    expect(result.people).toHaveLength(MAX_PEOPLE)
    expect(result.notes).toHaveLength(MAX_NOTES)
  })
})

describe('isAssistantProfileEmpty', () => {
  it('is true for the empty profile and false once anything is set', () => {
    expect(isAssistantProfileEmpty(EMPTY_ASSISTANT_PROFILE)).toBe(true)
    expect(isAssistantProfileEmpty(base({ homeLocation: 'x' }))).toBe(false)
    expect(isAssistantProfileEmpty(base({ briefEnabled: true }))).toBe(false)
    expect(isAssistantProfileEmpty(base({ nudgesEnabled: false }))).toBe(false)
    expect(isAssistantProfileEmpty(base({ notes: ['n'] }))).toBe(false)
    expect(isAssistantProfileEmpty(base({ wakeHour: 6 }))).toBe(false)
    expect(isAssistantProfileEmpty(base({ workHoursStart: 9 }))).toBe(false)
  })
})

describe('nudgesEnabled', () => {
  it('defaults on and is turned off through a patch', () => {
    expect(EMPTY_ASSISTANT_PROFILE.nudgesEnabled).toBe(true)
    const off = applyAssistantProfilePatch(base(), { nudgesEnabled: false })
    expect(off.nudgesEnabled).toBe(false)
    const back = applyAssistantProfilePatch(off, { nudgesEnabled: true })
    expect(back.nudgesEnabled).toBe(true)
  })

  it('reads a stored value, defaulting to on unless explicitly false', () => {
    expect(sanitizeAssistantProfile({}).nudgesEnabled).toBe(true)
    expect(
      sanitizeAssistantProfile({ nudgesEnabled: false }).nudgesEnabled,
    ).toBe(false)
    expect(
      sanitizeAssistantProfile({ nudgesEnabled: true }).nudgesEnabled,
    ).toBe(true)
  })
})

describe('summarizeAssistantProfile', () => {
  it('returns an empty string when nothing is saved', () => {
    expect(summarizeAssistantProfile(EMPTY_ASSISTANT_PROFILE)).toBe('')
  })

  it('renders one fact per line', () => {
    const summary = summarizeAssistantProfile(
      base({
        homeLocation: 'Lisbon',
        workLocation: 'Downtown',
        wakeHour: 7,
        quietHoursStart: 22,
        quietHoursEnd: 6,
        workHoursStart: 9,
        workHoursEnd: 18,
        people: [
          { name: 'Ana', relationship: 'daughter' },
          { name: 'Bob', relationship: null },
        ],
        notes: ['prefers metric'],
      }),
    )
    expect(summary).toContain('Home: Lisbon')
    expect(summary).toContain('Work: Downtown')
    expect(summary).toContain('wakes around 7:00')
    expect(summary).toContain('Quiet hours 22:00-6:00')
    expect(summary).toContain('Work hours 9:00-18:00')
    expect(summary).toContain('Ana (daughter)')
    expect(summary).toContain('Bob')
    expect(summary).toContain('Note: prefers metric')
  })
})
