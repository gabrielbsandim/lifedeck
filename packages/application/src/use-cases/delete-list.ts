import { asEntityId } from '@taskin/domain'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'

type Dependencies = {
  lists: ListRepository
}

export function makeDeleteList({ lists }: Dependencies) {
  return async function deleteList(
    userId: string,
    listId: string,
  ): Promise<void> {
    const list = await lists.findById(asEntityId(listId))
    if (!list) {
      throw new NotFoundError('List')
    }
    if (!list.isOwnedBy(asEntityId(userId))) {
      throw new ForbiddenError('list')
    }
    await lists.delete(asEntityId(listId))
  }
}
