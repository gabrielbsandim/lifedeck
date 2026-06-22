import { asEntityId } from '@taskin/domain'
import { renameListSchema, type ListView } from '@/dtos/list-dto'
import { toListView } from '@/mappers/list-mapper'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { ListRepository } from '@/ports/list-repository'

type Dependencies = {
  lists: ListRepository
  clock: Clock
}

export function makeRenameList({ lists, clock }: Dependencies) {
  return async function renameList(
    userId: string,
    listId: string,
    input: unknown,
  ): Promise<ListView> {
    const { title } = renameListSchema.parse(input)

    const list = await lists.findById(asEntityId(listId))
    if (!list) {
      throw new NotFoundError('List')
    }
    if (!list.isOwnedBy(asEntityId(userId))) {
      throw new ForbiddenError('list')
    }

    list.rename(title, clock.now())
    await lists.save(list)

    return toListView(list)
  }
}
