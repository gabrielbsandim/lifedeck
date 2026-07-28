import { describe, expect, it } from 'vitest'
import {
  assignedPushBody,
  pushTitles,
  reminderPushBody,
} from '@/shared/push-text'

describe('push text', () => {
  it('titles every notification kind in each language', () => {
    for (const language of ['en', 'pt', 'es'] as const) {
      const titles = pushTitles(language)
      expect(Object.values(titles).every(value => value.length > 0)).toBe(true)
    }
    expect(pushTitles('pt').reminder).toBe('Lembrete')
    expect(pushTitles('es').brief).toBe('Tu día')
    expect(pushTitles('en').assigned).toBe('New task for you')
  })

  it('pairs a reminder with the time the caller formatted', () => {
    expect(reminderPushBody('Standup', 'today at 09:00')).toBe(
      'Standup · today at 09:00',
    )
  })

  it('pairs an assignment with its list', () => {
    expect(assignedPushBody('Buy milk', 'Groceries')).toBe(
      'Buy milk · Groceries',
    )
  })
})
