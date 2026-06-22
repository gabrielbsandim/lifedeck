import { asEntityId } from '@taskin/domain'
import { type ListView } from '@/dtos/list-dto'
import { toListView } from '@/mappers/list-mapper'
import { resolveListAccess } from '@/access/list-access'
import { NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'

type Dependencies = {
  lists: ListRepository
  memberships: MembershipRepository
}

export function makeGetList({ lists, memberships }: Dependencies) {
  return async function getList(
    id: string,
    requesterId: string | null,
  ): Promise<ListView> {
    const list = await lists.findById(asEntityId(id))
    if (!list) {
      throw new NotFoundError('List')
    }

    const access = await resolveListAccess(list, requesterId, memberships)
    if (!access.canRead) {
      throw new NotFoundError('List')
    }

    return toListView(list)
  }
}
