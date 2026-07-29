import { describe, expect, it } from 'vitest'
import { composeHabitCheckin } from '@/shared/habit-checkin-text'

describe('composeHabitCheckin', () => {
  it('asks about the habit by name in each language from noon on', () => {
    expect(composeHabitCheckin('en', 'Meditate', 20)).toContain(
      'Did you Meditate today?',
    )
    expect(composeHabitCheckin('pt', 'Meditar', 12)).toContain(
      'Você fez "Meditar" hoje?',
    )
    expect(composeHabitCheckin('es', 'Meditar', 23)).toContain(
      '¿Hiciste "Meditar" hoy?',
    )
  })

  it('nudges forward instead of asking when the hour is still morning', () => {
    expect(composeHabitCheckin('en', 'Meditate', 7)).toContain(
      'Meditate is on your list for today',
    )
    expect(composeHabitCheckin('pt', 'Meditar', 0)).toContain(
      'Hoje tem "Meditar"',
    )
    expect(composeHabitCheckin('es', 'Meditar', 11)).toContain(
      'Hoy toca "Meditar"',
    )
  })
})
