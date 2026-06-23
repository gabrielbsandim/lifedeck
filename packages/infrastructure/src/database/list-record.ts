import { List, asEntityId } from '@lifedeck/domain'
import type { ListType, Visibility } from '@lifedeck/domain'

export type ListRecord = {
  id: string
  ownerId: string
  title: string
  type: ListType
  visibility: Visibility
  referenceDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export function toDomainList(record: ListRecord): List {
  return List.restore({
    id: asEntityId(record.id),
    ownerId: asEntityId(record.ownerId),
    title: record.title,
    type: record.type,
    visibility: record.visibility,
    referenceDate: record.referenceDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
}

export function toListRecord(list: List): ListRecord {
  const props = list.toJSON()
  return {
    id: props.id,
    ownerId: props.ownerId,
    title: props.title,
    type: props.type,
    visibility: props.visibility,
    referenceDate: props.referenceDate,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  }
}
