import { asEntityId, type List } from '@taskin/domain'

export function canEditList(list: List, requesterId: string | null): boolean {
  return requesterId !== null && list.isOwnedBy(asEntityId(requesterId))
}

export function canReadList(list: List, requesterId: string | null): boolean {
  return list.visibility === 'link' || canEditList(list, requesterId)
}
