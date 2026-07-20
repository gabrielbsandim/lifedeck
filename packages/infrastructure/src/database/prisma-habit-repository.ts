import type { EntityId, Habit } from '@lifedeck/domain'
import type { HabitRepository } from '@lifedeck/application'
import type { PrismaClient, Prisma } from '@prisma/client'
import {
  toDomainHabit,
  toHabitRecord,
  type HabitRecord,
} from '@/database/habit-record'

function toRow(record: HabitRecord) {
  return {
    id: record.id,
    ownerId: record.ownerId,
    title: record.title,
    cadence: record.cadence as unknown as Prisma.InputJsonValue,
    checkinHour: record.checkinHour,
    active: record.active,
    createdAt: record.createdAt,
  }
}

function fromRow(row: {
  id: string
  ownerId: string
  title: string
  cadence: Prisma.JsonValue
  checkinHour: number | null
  active: boolean
  createdAt: Date
}): Habit {
  return toDomainHabit({
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    cadence: row.cadence as unknown as HabitRecord['cadence'],
    checkinHour: row.checkinHour,
    active: row.active,
    createdAt: row.createdAt,
  })
}

export class PrismaHabitRepository implements HabitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(habit: Habit): Promise<void> {
    const record = toRow(toHabitRecord(habit))
    await this.prisma.habit.upsert({
      where: { id: record.id },
      create: record,
      update: {
        title: record.title,
        cadence: record.cadence,
        checkinHour: record.checkinHour,
        active: record.active,
      },
    })
  }

  async findById(id: EntityId): Promise<Habit | null> {
    const row = await this.prisma.habit.findUnique({ where: { id } })
    return row ? fromRow(row) : null
  }

  async listByOwner(ownerId: EntityId): Promise<Habit[]> {
    const rows = await this.prisma.habit.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(fromRow)
  }

  async countByOwner(ownerId: EntityId): Promise<number> {
    return this.prisma.habit.count({ where: { ownerId } })
  }

  async listActiveWithCheckin(): Promise<Habit[]> {
    const rows = await this.prisma.habit.findMany({
      where: { active: true, checkinHour: { not: null } },
    })
    return rows.map(fromRow)
  }

  async delete(id: EntityId): Promise<void> {
    await this.prisma.habit.delete({ where: { id } })
  }
}
