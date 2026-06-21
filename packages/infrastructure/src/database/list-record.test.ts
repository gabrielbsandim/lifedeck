import { describe, expect, it } from 'vitest'
import {
  toDomainList,
  toListRecord,
  type ListRecord,
} from '@/database/list-record'

const RECORD: ListRecord = {
  id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  ownerId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  title: 'Wedding',
  type: 'daily',
  visibility: 'link',
  referenceDate: new Date('2026-06-21T00:00:00.000Z'),
  createdAt: new Date('2026-06-21T10:00:00.000Z'),
  updatedAt: new Date('2026-06-21T11:00:00.000Z'),
}

describe('list-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const list = toDomainList(RECORD)
    expect(toListRecord(list)).toEqual(RECORD)
  })

  it('maps a standalone list with no reference date', () => {
    const list = toDomainList({
      ...RECORD,
      type: 'standalone',
      visibility: 'private',
      referenceDate: null,
    })
    const record = toListRecord(list)
    expect(record.type).toBe('standalone')
    expect(record.referenceDate).toBeNull()
  })
})
