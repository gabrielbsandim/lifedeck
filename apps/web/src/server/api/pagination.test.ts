// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ValidationError } from '@lifedeck/domain'
import { DEFAULT_PAGE_LIMIT, encodePageCursor } from '@lifedeck/application'
import { parseListTypeFilter, parsePageParams } from '@/server/api/pagination'

function request(query: string): Request {
  return new Request(`https://lifedeck.com.br/api/v1/lists${query}`)
}

describe('parsePageParams', () => {
  it('defaults the limit and cursor when absent', () => {
    const params = parsePageParams(request(''))
    expect(params).toEqual({ limit: DEFAULT_PAGE_LIMIT, cursor: null })
  })

  it('reads limit and a valid cursor', () => {
    const cursor = encodePageCursor(new Date('2026-06-01T00:00:00.000Z'), 'l1')
    const params = parsePageParams(
      request(`?limit=10&cursor=${encodeURIComponent(cursor)}`),
    )
    expect(params.limit).toBe(10)
    expect(params.cursor).toEqual({
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      id: 'l1',
    })
  })

  it('rejects an invalid limit', () => {
    expect(() => parsePageParams(request('?limit=0'))).toThrow(ValidationError)
  })

  it('rejects a malformed cursor', () => {
    expect(() => parsePageParams(request('?cursor=not-a-cursor'))).toThrow(
      ValidationError,
    )
  })
})

describe('parseListTypeFilter', () => {
  it('returns null when no type is given', () => {
    expect(parseListTypeFilter(request(''))).toBeNull()
    expect(parseListTypeFilter(request('?type='))).toBeNull()
  })

  it('returns a valid list type', () => {
    expect(parseListTypeFilter(request('?type=daily'))).toBe('daily')
    expect(parseListTypeFilter(request('?type=standalone'))).toBe('standalone')
  })

  it('rejects an unknown type', () => {
    expect(() => parseListTypeFilter(request('?type=weekly'))).toThrow(
      ValidationError,
    )
  })
})
