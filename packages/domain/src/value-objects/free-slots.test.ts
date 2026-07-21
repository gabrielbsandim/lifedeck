import { describe, expect, it } from 'vitest'
import {
  findFreeSlots,
  subtractIntervals,
  type TimeInterval,
} from '@/value-objects/free-slots'

// All fixtures live on one UTC day so wall-clock HH:MM reads directly.
const at = (hhmm: string): Date => new Date(`2026-07-20T${hhmm}:00.000Z`)
const iv = (start: string, end: string): TimeInterval => ({
  start: at(start),
  end: at(end),
})
const starts = (slots: TimeInterval[]): string[] =>
  slots.map(slot => slot.start.toISOString().slice(11, 16))
const ends = (slots: TimeInterval[]): string[] =>
  slots.map(slot => slot.end.toISOString().slice(11, 16))

describe('subtractIntervals', () => {
  it('cuts a block out of a window, leaving the head and tail', () => {
    const free = subtractIntervals(
      [iv('09:00', '12:00')],
      [iv('10:00', '11:00')],
    )
    expect(starts(free)).toEqual(['09:00', '11:00'])
    expect(ends(free)).toEqual(['10:00', '12:00'])
  })

  it('returns the whole window when there are no blocks', () => {
    expect(subtractIntervals([iv('09:00', '12:00')], [])).toEqual([
      iv('09:00', '12:00'),
    ])
  })

  it('merges overlapping blocks before cutting and spans windows', () => {
    const free = subtractIntervals(
      [iv('09:00', '10:00'), iv('11:00', '12:00')],
      [iv('09:30', '11:30')],
    )
    expect(starts(free)).toEqual(['09:00', '11:30'])
    expect(ends(free)).toEqual(['09:30', '12:00'])
  })
})

describe('findFreeSlots', () => {
  it('enumerates grid-aligned slots across an open window', () => {
    const slots = findFreeSlots({
      windows: [iv('09:00', '12:00')],
      busy: [],
      durationMin: 60,
      granularityMin: 30,
    })
    expect(starts(slots)).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00'])
    expect(ends(slots)).toEqual(['10:00', '10:30', '11:00', '11:30', '12:00'])
  })

  it('splits the window around a busy event', () => {
    const slots = findFreeSlots({
      windows: [iv('09:00', '17:00')],
      busy: [iv('10:00', '11:00')],
      durationMin: 60,
      granularityMin: 60,
      maxResults: 20,
    })
    expect(starts(slots)).toEqual([
      '09:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
    ])
    expect(starts(slots)).not.toContain('10:00')
  })

  it('merges overlapping busy events so the gap is a single block', () => {
    const slots = findFreeSlots({
      windows: [iv('09:00', '13:00')],
      busy: [iv('09:30', '10:30'), iv('10:00', '11:00')],
      durationMin: 30,
      granularityMin: 30,
    })
    expect(starts(slots)).toEqual(['09:00', '11:00', '11:30', '12:00', '12:30'])
  })

  it('treats touching busy events as one continuous block', () => {
    const slots = findFreeSlots({
      windows: [iv('09:00', '11:00')],
      busy: [iv('09:00', '10:00'), iv('10:00', '11:00')],
      durationMin: 30,
      granularityMin: 30,
    })
    expect(slots).toEqual([])
  })

  it('returns nothing when the window is fully busy', () => {
    expect(
      findFreeSlots({
        windows: [iv('09:00', '10:00')],
        busy: [iv('08:00', '11:00')],
        durationMin: 30,
      }),
    ).toEqual([])
  })

  it('returns nothing when the duration exceeds every gap', () => {
    expect(
      findFreeSlots({
        windows: [iv('09:00', '10:00')],
        busy: [],
        durationMin: 90,
      }),
    ).toEqual([])
  })

  it('ignores busy intervals outside the window', () => {
    const slots = findFreeSlots({
      windows: [iv('09:00', '10:00')],
      busy: [iv('12:00', '13:00')],
      durationMin: 30,
      granularityMin: 30,
    })
    expect(starts(slots)).toEqual(['09:00', '09:30'])
  })

  it('caps the number of slots at maxResults', () => {
    const slots = findFreeSlots({
      windows: [iv('09:00', '17:00')],
      busy: [],
      durationMin: 30,
      granularityMin: 30,
      maxResults: 3,
    })
    expect(starts(slots)).toEqual(['09:00', '09:30', '10:00'])
  })

  it('snaps a mid-grid gap start up to the window grid', () => {
    // A busy head pushes the first gap to 09:07; the grid is anchored to the
    // window start (09:00), so the first slot rounds up to 09:30.
    const slots = findFreeSlots({
      windows: [iv('09:00', '11:00')],
      busy: [iv('09:00', '09:07')],
      durationMin: 60,
      granularityMin: 30,
    })
    expect(starts(slots)).toEqual(['09:30', '10:00'])
  })

  it('aligns the grid to the window start, not the UTC epoch', () => {
    // A window that starts at a non-:00/:30 UTC time (e.g. 09:00 in a UTC+05:30
    // zone) must still yield slots on the window's own hourly rhythm, not the
    // epoch grid (which would push the first slot to 04:00Z / 09:30 local).
    const slots = findFreeSlots({
      windows: [iv('03:30', '06:30')],
      busy: [],
      durationMin: 60,
      granularityMin: 60,
    })
    expect(starts(slots)).toEqual(['03:30', '04:30', '05:30'])
  })

  it('guards against non-positive parameters', () => {
    const args = { windows: [iv('09:00', '17:00')], busy: [] }
    expect(findFreeSlots({ ...args, durationMin: 0 })).toEqual([])
    expect(
      findFreeSlots({ ...args, durationMin: 30, granularityMin: 0 }),
    ).toEqual([])
    expect(findFreeSlots({ ...args, durationMin: 30, maxResults: 0 })).toEqual(
      [],
    )
  })
})
