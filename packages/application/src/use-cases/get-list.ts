import { asEntityId } from '@taskin/domain'
import { type ListView } from '@/dtos/list-dto'
import { toListView } from '@/mappers/list-mapper'
import { canReadList } from '@/access/list-access'
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
    if (!list || !canReadList(list, requesterId)) {
      throw new NotFoundError('List')
    }

    return toListView(list)
  }
}
