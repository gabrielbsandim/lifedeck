import { ValidationError } from '@lifedeck/domain'

export type PageCursor = {
  createdAt: Date
  id: string
}

export type PageParams = {
  limit: number
  cursor: PageCursor | null
}

export type Page<T> = {
  items: T[]
  nextCursor: string | null
}

export const DEFAULT_PAGE_LIMIT = 50
export const MAX_PAGE_LIMIT = 100

export function parsePageLimit(raw: string | null | undefined): number {
  if (raw === null || raw === undefined || raw === '') {
    return DEFAULT_PAGE_LIMIT
  }
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new ValidationError('limit must be a positive integer')
  }
  return Math.min(value, MAX_PAGE_LIMIT)
}

export function encodePageCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.getTime()}:${id}`, 'utf8').toString(
    'base64url',
  )
}

export function parsePageCursor(
  raw: string | null | undefined,
): PageCursor | null {
  if (raw === null || raw === undefined || raw === '') {
    return null
  }
  const decoded = Buffer.from(raw, 'base64url').toString('utf8')
  const separator = decoded.indexOf(':')
  if (separator === -1) {
    throw new ValidationError('Invalid cursor')
  }
  const millis = Number(decoded.slice(0, separator))
  const id = decoded.slice(separator + 1)
  if (!Number.isFinite(millis) || id === '') {
    throw new ValidationError('Invalid cursor')
  }
  return { createdAt: new Date(millis), id }
}

export function comparePageKeysDesc(
  a: { createdAt: Date; id: string },
  b: { createdAt: Date; id: string },
): number {
  const byTime = b.createdAt.getTime() - a.createdAt.getTime()
  if (byTime !== 0) {
    return byTime
  }
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}

export function isAfterCursor(
  item: { createdAt: Date; id: string },
  cursor: PageCursor,
): boolean {
  return comparePageKeysDesc(item, cursor) > 0
}

export function buildPageFrom<T>(
  rows: T[],
  limit: number,
  key: (row: T) => { createdAt: Date; id: string },
): Page<T> {
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  const nextCursor =
    hasMore && last ? encodePageCursor(key(last).createdAt, key(last).id) : null
  return { items, nextCursor }
}

export function paginateByCreatedAt<T>(
  items: T[],
  params: PageParams,
  key: (item: T) => { createdAt: Date; id: string },
): Page<T> {
  const cursor = params.cursor
  const ordered = [...items].sort((a, b) => comparePageKeysDesc(key(a), key(b)))
  const after = cursor
    ? ordered.filter(item => isAfterCursor(key(item), cursor))
    : ordered
  const slice = after.slice(0, params.limit)
  const last = slice[slice.length - 1]
  const nextCursor =
    after.length > params.limit && last
      ? encodePageCursor(key(last).createdAt, key(last).id)
      : null
  return { items: slice, nextCursor }
}
