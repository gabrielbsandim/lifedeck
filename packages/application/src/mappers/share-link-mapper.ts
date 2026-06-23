import type { ShareLink } from '@lifedeck/domain'
import type { ShareLinkView } from '@/dtos/share-link-dto'

export function toShareLinkView(link: ShareLink): ShareLinkView {
  const props = link.toJSON()
  return {
    id: props.id,
    listId: props.listId,
    token: props.token,
    role: props.role,
    expiresAt: props.expiresAt ? props.expiresAt.toISOString() : null,
    createdAt: props.createdAt.toISOString(),
  }
}
