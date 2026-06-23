import { ShareLink, asEntityId } from '@lifedeck/domain'
import type { MemberRole } from '@lifedeck/domain'

export type ShareLinkRecord = {
  id: string
  listId: string
  token: string
  role: MemberRole
  expiresAt: Date | null
  createdAt: Date
}

export function toDomainShareLink(record: ShareLinkRecord): ShareLink {
  return ShareLink.restore({
    id: asEntityId(record.id),
    listId: asEntityId(record.listId),
    token: record.token,
    role: record.role,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  })
}

export function toShareLinkRecord(link: ShareLink): ShareLinkRecord {
  const props = link.toJSON()
  return {
    id: props.id,
    listId: props.listId,
    token: props.token,
    role: props.role,
    expiresAt: props.expiresAt,
    createdAt: props.createdAt,
  }
}
