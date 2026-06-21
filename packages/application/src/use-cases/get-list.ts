import { asEntityId } from '@taskin/domain'
import { type ListView } from '@/dtos/list-dto'
import { toListView } from '@/mappers/list-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'

type Dependencies = {
  lists: ListRepository
}

export function makeGetList({ lists }: Dependencies) {
  return async function getList(
    id: string,
    requesterId: string | null,
  ): Promise<ListView> {
    const list = await lists.findById(asEntityId(id))
    if (!list) {
      throw new NotFoundError('List')
    }

    const isOwner =
      requesterId !== null && list.isOwnedBy(asEntityId(requesterId))
    if (list.visibility !== 'link' && !isOwner) {
      throw new NotFoundError('List')
    }

    return toListView(list)
  }
}
