import { ValidationError, isListType, type ListType } from '@lifedeck/domain'
import {
  parsePageCursor,
  parsePageLimit,
  type PageParams,
} from '@lifedeck/application'

export function parsePageParams(request: Request): PageParams {
  const params = new URL(request.url).searchParams
  return {
    limit: parsePageLimit(params.get('limit')),
    cursor: parsePageCursor(params.get('cursor')),
  }
}

export function parseListTypeFilter(request: Request): ListType | null {
  const raw = new URL(request.url).searchParams.get('type')
  if (raw === null || raw === '') {
    return null
  }
  if (!isListType(raw)) {
    throw new ValidationError('type must be "daily" or "standalone"')
  }
  return raw
}
