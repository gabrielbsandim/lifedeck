import { describe, expect, it } from 'vitest'
import { moveInOrder } from '@/lib/api/reorder'

describe('moveInOrder', () => {
  it('moves an item up', () => {
    expect(moveInOrder(['a', 'b', 'c'], 1, 'up')).toEqual(['b', 'a', 'c'])
  })

  it('moves an item down', () => {
    expect(moveInOrder(['a', 'b', 'c'], 1, 'down')).toEqual(['a', 'c', 'b'])
  })

  it('returns the same array when moving the first item up', () => {
    const ids = ['a', 'b']
    expect(moveInOrder(ids, 0, 'up')).toBe(ids)
  })

  it('returns the same array when moving the last item down', () => {
    const ids = ['a', 'b']
    expect(moveInOrder(ids, 1, 'down')).toBe(ids)
  })
})
