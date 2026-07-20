import { describe, expect, it } from 'vitest'
import { composeNudge } from '@/shared/nudge-text'

describe('composeNudge', () => {
  it('names the task and how long it has lingered, in each language', () => {
    expect(
      composeNudge('en', { taskTitle: 'Call dentist', days: 3 }),
    ).toContain('"Call dentist" has been on your list for 3 days')
    expect(
      composeNudge('pt', { taskTitle: 'Ligar dentista', days: 4 }),
    ).toContain('"Ligar dentista" está na sua lista há 4 dias')
    expect(
      composeNudge('es', { taskTitle: 'Llamar dentista', days: 5 }),
    ).toContain('"Llamar dentista" lleva 5 días')
  })
})
