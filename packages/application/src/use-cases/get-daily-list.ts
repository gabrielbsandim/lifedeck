import { List, asEntityId } from '@taskin/domain'
import { z } from 'zod'
import { type ListView } from '@/dtos/list-dto'
import { toListView } from '@/mappers/list-mapper'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'

const dateSchema = z.string().date()

type Dependencies = {
  lists: ListRepository
  ids: IdGenerator
  clock: Clock
}

export function makeGetDailyList({ lists, ids, clock }: Dependencies) {
  return async function getDailyList(
    ownerId: string,
    date: string,
  ): Promise<ListView> {
    const day = dateSchema.parse(date)
    const owner = asEntityId(ownerId)
    const referenceDate = new Date(`${day}T00:00:00.000Z`)

    const existing = await lists.findDailyByOwnerAndDate(owner, referenceDate)
    if (existing) {
      return toListView(existing)
    }

    const list = List.create({
      id: ids.generate(),
      ownerId: owner,
      title: day,
      type: 'daily',
      visibility: 'private',
      referenceDate,
      createdAt: clock.now(),
    })

    await lists.save(list)

    return toListView(list)
  }
}
