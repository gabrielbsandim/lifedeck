import { describe, expect, it } from 'vitest'
import { List } from '@/entities/list'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'

const ID = asEntityId('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')
const OWNER = asEntityId('a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f')
const CREATED_AT = new Date('2026-06-21T10:00:00.000Z')
const REFERENCE = new Date('2026-06-21T00:00:00.000Z')

function create(overrides: Partial<Parameters<typeof List.create>[0]> = {}) {
  return List.create({
    id: ID,
    ownerId: OWNER,
    title: 'Wedding',
    type: 'standalone',
    visibility: 'private',
    referenceDate: null,
    createdAt: CREATED_AT,
    ...overrides,
  })
}

describe('List', () => {
  it('creates a standalone list and drops any reference date', () => {
    const list = create({ referenceDate: REFERENCE })
    const props = list.toJSON()

    expect(list.id).toBe(ID)
    expect(list.ownerId).toBe(OWNER)
    expect(list.title).toBe('Wedding')
    expect(list.visibility).toBe('private')
    expect(props).toMatchObject({
      id: ID,
      ownerId: OWNER,
      title: 'Wedding',
      type: 'standalone',
      visibility: 'private',
      referenceDate: null,
      updatedAt: CREATED_AT,
    })
  })

  it('keeps the reference date for daily lists', () => {
    const list = create({ type: 'daily', referenceDate: REFERENCE })
    expect(list.toJSON().referenceDate).toEqual(REFERENCE)
  })

  it('rejects an empty title', () => {
    expect(() => create({ title: '  ' })).toThrow(ValidationError)
  })

  it('rejects a title longer than 120 characters', () => {
    expect(() => create({ title: 'a'.repeat(121) })).toThrow(ValidationError)
  })

  it('checks ownership', () => {
    const list = create()
    expect(list.isOwnedBy(OWNER)).toBe(true)
    expect(list.isOwnedBy(ID)).toBe(false)
  })

  it('renames and touches updatedAt', () => {
    const list = create()
    const later = new Date('2026-06-22T10:00:00.000Z')
    list.rename('  Honeymoon  ', later)
    expect(list.title).toBe('Honeymoon')
    expect(list.toJSON().updatedAt).toEqual(later)
    expect(() => list.rename('', later)).toThrow(ValidationError)
  })

  it('updates visibility and touches updatedAt', () => {
    const list = create()
    const later = new Date('2026-06-22T10:00:00.000Z')
    list.setVisibility('link', later)
    expect(list.visibility).toBe('link')
    expect(list.toJSON().updatedAt).toEqual(later)
  })

  it('restores from persisted props', () => {
    const props = create().toJSON()
    expect(List.restore(props).toJSON()).toEqual(props)
  })
})
