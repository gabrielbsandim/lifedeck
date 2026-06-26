import { describe, expect, it } from 'vitest'
import { ValidationError } from '@lifedeck/domain'
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  buildPageFrom,
  comparePageKeysDesc,
  encodePageCursor,
  isAfterCursor,
  parsePageCursor,
  parsePageLimit,
} from '@/pagination'

describe('parsePageLimit', () => {
  it('defaults when missing', () => {
    expect(parsePageLimit(null)).toBe(DEFAULT_PAGE_LIMIT)
    expect(parsePageLimit(undefined)).toBe(DEFAULT_PAGE_LIMIT)
    expect(parsePageLimit('')).toBe(DEFAULT_PAGE_LIMIT)
  })

  it('clamps to the maximum', () => {
    expect(parsePageLimit('1000')).toBe(MAX_PAGE_LIMIT)
  })

  it('accepts a valid value', () => {
    expect(parsePageLimit('25')).toBe(25)
  })

  it('rejects non-positive or non-integer values', () => {
    expect(() => parsePageLimit('0')).toThrow(ValidationError)
    expect(() => parsePageLimit('-3')).toThrow(ValidationError)
    expect(() => parsePageLimit('2.5')).toThrow(ValidationError)
    expect(() => parsePageLimit('abc')).toThrow(ValidationError)
  })
})

describe('cursor codec', () => {
  it('round-trips a cursor', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z')
    const encoded = encodePageCursor(createdAt, 'list-1')
    const decoded = parsePageCursor(encoded)
    expect(decoded).toEqual({ createdAt, id: 'list-1' })
  })

  it('returns null for missing cursor', () => {
    expect(parsePageCursor(null)).toBeNull()
    expect(parsePageCursor(undefined)).toBeNull()
    expect(parsePageCursor('')).toBeNull()
  })

  it('rejects a cursor without a separator', () => {
    const malformed = Buffer.from('nocolon', 'utf8').toString('base64url')
    expect(() => parsePageCursor(malformed)).toThrow(ValidationError)
  })

  it('rejects a cursor with a non-numeric timestamp', () => {
    const malformed = Buffer.from('abc:list-1', 'utf8').toString('base64url')
    expect(() => parsePageCursor(malformed)).toThrow(ValidationError)
  })

  it('rejects a cursor with an empty id', () => {
    const malformed = Buffer.from('123:', 'utf8').toString('base64url')
    expect(() => parsePageCursor(malformed)).toThrow(ValidationError)
  })

  it('keeps colons that appear inside the id', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z')
    const decoded = parsePageCursor(encodePageCursor(createdAt, 'a:b:c'))
    expect(decoded).toEqual({ createdAt, id: 'a:b:c' })
  })
})

describe('ordering helpers', () => {
  it('orders newest first, breaking ties by id descending', () => {
    const older = { createdAt: new Date('2026-01-01T00:00:00.000Z'), id: 'b' }
    const newer = { createdAt: new Date('2026-01-02T00:00:00.000Z'), id: 'a' }
    const tieA = { createdAt: new Date('2026-01-02T00:00:00.000Z'), id: 'a' }
    const tieB = { createdAt: new Date('2026-01-02T00:00:00.000Z'), id: 'b' }
    expect(comparePageKeysDesc(newer, older)).toBeLessThan(0)
    expect(comparePageKeysDesc(older, newer)).toBeGreaterThan(0)
    expect(comparePageKeysDesc(tieB, tieA)).toBeLessThan(0)
    expect(comparePageKeysDesc(tieA, tieA)).toBe(0)
  })

  it('builds a page from pre-ordered rows with a sentinel extra row', () => {
    const key = (row: { createdAt: Date; id: string }) => row
    const rows = [
      { createdAt: new Date('2026-01-03T00:00:00.000Z'), id: 'c' },
      { createdAt: new Date('2026-01-02T00:00:00.000Z'), id: 'b' },
      { createdAt: new Date('2026-01-01T00:00:00.000Z'), id: 'a' },
    ]
    const page = buildPageFrom(rows, 2, key)
    expect(page.items.map(row => row.id)).toEqual(['c', 'b'])
    expect(parsePageCursor(page.nextCursor)).toEqual({
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      id: 'b',
    })
  })

  it('builds a final page with no next cursor', () => {
    const key = (row: { createdAt: Date; id: string }) => row
    const rows = [{ createdAt: new Date('2026-01-01T00:00:00.000Z'), id: 'a' }]
    const page = buildPageFrom(rows, 2, key)
    expect(page.items.map(row => row.id)).toEqual(['a'])
    expect(page.nextCursor).toBeNull()
  })

  it('detects items after a cursor', () => {
    const cursor = { createdAt: new Date('2026-01-02T00:00:00.000Z'), id: 'm' }
    const older = { createdAt: new Date('2026-01-01T00:00:00.000Z'), id: 'z' }
    const newer = { createdAt: new Date('2026-01-03T00:00:00.000Z'), id: 'a' }
    expect(isAfterCursor(older, cursor)).toBe(true)
    expect(isAfterCursor(newer, cursor)).toBe(false)
    expect(isAfterCursor(cursor, cursor)).toBe(false)
  })
})
