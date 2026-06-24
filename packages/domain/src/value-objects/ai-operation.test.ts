import { describe, expect, it } from 'vitest'
import {
  AI_OPERATIONS,
  creditCostOf,
  isAiOperation,
} from '@/value-objects/ai-operation'

describe('ai-operation', () => {
  it('recognizes known operations', () => {
    expect(isAiOperation('listGeneration')).toBe(true)
    expect(isAiOperation('assistantPro')).toBe(true)
    expect(isAiOperation('mining')).toBe(false)
  })

  it('weights the premium model above the flat operations', () => {
    expect(creditCostOf('listGeneration')).toBe(1)
    expect(creditCostOf('assistantText')).toBe(1)
    expect(creditCostOf('assistantPro')).toBeGreaterThan(
      creditCostOf('assistantText'),
    )
  })

  it('assigns a positive cost to every operation', () => {
    for (const operation of AI_OPERATIONS) {
      expect(creditCostOf(operation)).toBeGreaterThan(0)
    }
  })
})
