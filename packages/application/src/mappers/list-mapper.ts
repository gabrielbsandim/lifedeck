import type { List } from '@lifedeck/domain'
import type { ListView } from '@/dtos/list-dto'

export function toListView(list: List): ListView {
  const props = list.toJSON()
  return {
    id: props.id,
    ownerId: props.ownerId,
    title: props.title,
    type: props.type,
    visibility: props.visibility,
    referenceDate: props.referenceDate
      ? props.referenceDate.toISOString().slice(0, 10)
      : null,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  }
}
