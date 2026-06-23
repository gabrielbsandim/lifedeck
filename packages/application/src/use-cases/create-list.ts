import { List, asEntityId } from '@lifedeck/domain'
import {
  createListSchema,
  type CreateListInput,
  type ListView,
} from '@/dtos/list-dto'
import { toListView } from '@/mappers/list-mapper'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'

type Dependencies = {
  lists: ListRepository
  ids: IdGenerator
  clock: Clock
}

export function makeCreateList({ lists, ids, clock }: Dependencies) {
  return async function createList(
    ownerId: string,
    input: CreateListInput,
  ): Promise<ListView> {
    const { title, type, visibility, referenceDate } =
      createListSchema.parse(input)

    const list = List.create({
      id: ids.generate(),
      ownerId: asEntityId(ownerId),
      title,
      type: type ?? 'standalone',
      visibility: visibility ?? 'private',
      referenceDate: referenceDate
        ? new Date(`${referenceDate}T00:00:00.000Z`)
        : null,
      createdAt: clock.now(),
    })

    await lists.save(list)

    return toListView(list)
  }
}
