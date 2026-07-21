import { describe, expect, it } from 'vitest'
import { messages } from '@lifedeck/i18n'
import { compareRows } from '@/lib/billing/compare-rows'

const en = messages.en

describe('compareRows', () => {
  const rows = compareRows(en)

  it('lists every comparison feature with a localized label', () => {
    expect(rows).toHaveLength(15)
    for (const row of rows) {
      expect(row.label.length).toBeGreaterThan(0)
    }
    expect(rows[0]!.label).toBe(en.billing.compareDailyLists)
  })

  it('keeps assistant memory baseline and caps habits on free', () => {
    const memory = rows.find(r => r.label === en.billing.compareMemory)!
    expect([memory.free, memory.pro, memory.premium]).toEqual([
      true,
      true,
      true,
    ])
    const habits = rows.find(r => r.label === en.billing.compareHabits)!
    expect(habits.free).toBe('sample')
    expect(habits.pro).toBe(true)
  })

  it('reserves nudges, find-me-time and extra calendars for premium', () => {
    for (const key of [
      'compareNudges',
      'compareFindTime',
      'compareAllCalendars',
    ] as const) {
      const row = rows.find(r => r.label === en.billing[key])!
      expect(row.free).toBe(false)
      expect(row.pro).toBe(false)
      expect(row.premium).toBe(true)
    }
  })

  it('unlocks the daily brief on paid plans', () => {
    const row = rows.find(r => r.label === en.billing.compareBrief)!
    expect(row.free).toBe(false)
    expect(row.pro).toBe(true)
    expect(row.premium).toBe(true)
  })

  it('grants the free-tier features to every plan', () => {
    for (const key of ['compareDailyLists', 'compareSharing'] as const) {
      const row = rows.find(r => r.label === en.billing[key])!
      expect(row.free).toBe(true)
      expect(row.pro).toBe(true)
      expect(row.premium).toBe(true)
    }
  })

  it('treats the WhatsApp assistant as a sample on free and full on paid plans', () => {
    const row = rows.find(r => r.label === en.billing.compareAssistant)!
    expect(row.free).toBe('sample')
    expect(row.pro).toBe(true)
    expect(row.premium).toBe(true)
  })

  it('locks Google Calendar and reminders behind a paid plan', () => {
    for (const key of ['compareCalendar', 'compareReminders'] as const) {
      const row = rows.find(r => r.label === en.billing[key])!
      expect(row.free).toBe(false)
      expect(row.pro).toBe(true)
      expect(row.premium).toBe(true)
    }
  })

  it('reserves the stronger model and higher limits for premium', () => {
    for (const key of ['compareStrongerAi', 'compareHigherLimits'] as const) {
      const row = rows.find(r => r.label === en.billing[key])!
      expect(row.free).toBe(false)
      expect(row.pro).toBe(false)
      expect(row.premium).toBe(true)
    }
  })

  it('localizes labels per catalog', () => {
    const pt = compareRows(messages.pt)
    expect(pt[0]!.label).toBe(messages.pt.billing.compareDailyLists)
  })
})
