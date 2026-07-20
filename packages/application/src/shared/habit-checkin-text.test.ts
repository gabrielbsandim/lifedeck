import { describe, expect, it } from 'vitest'
import { composeHabitCheckin } from '@/shared/habit-checkin-text'

describe('composeHabitCheckin', () => {
  it('asks about the habit by name in each language', () => {
    expect(composeHabitCheckin('en', 'Meditate')).toContain(
      'Did you Meditate today?',
    )
    expect(composeHabitCheckin('pt', 'Meditar')).toContain(
      'Você fez "Meditar" hoje?',
    )
    expect(composeHabitCheckin('es', 'Meditar')).toContain(
      '¿Hiciste "Meditar" hoy?',
    )
  })
})
