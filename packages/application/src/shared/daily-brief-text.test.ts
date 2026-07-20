import { describe, expect, it } from 'vitest'
import {
  composeDailyBrief,
  type DailyBriefData,
} from '@/shared/daily-brief-text'

function data(overrides: Partial<DailyBriefData> = {}): DailyBriefData {
  return {
    dateLabel: 'Mon, Jul 20',
    pendingTitles: [],
    doneCount: 0,
    totalCount: 0,
    carriedOver: 0,
    events: [],
    weather: null,
    ...overrides,
  }
}

describe('composeDailyBrief', () => {
  it('greets and reports no tasks when the day is empty', () => {
    const text = composeDailyBrief('en', data())
    expect(text).toContain('☀️ Good morning!')
    expect(text).toContain('Today • Mon, Jul 20')
    expect(text).toContain('No tasks for today.')
    expect(text).toContain('Nothing scheduled.')
  })

  it('lists pending tasks with a done count and collapses the overflow', () => {
    const text = composeDailyBrief('en', {
      ...data(),
      totalCount: 8,
      doneCount: 1,
      pendingTitles: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    })
    expect(text).toContain('1/8 done')
    expect(text).toContain('• a')
    expect(text).toContain('• e')
    expect(text).not.toContain('• f')
    expect(text).toContain('+2 more')
  })

  it('says all caught up when every task is done', () => {
    const text = composeDailyBrief('en', {
      ...data(),
      totalCount: 3,
      doneCount: 3,
      pendingTitles: [],
    })
    expect(text).toContain('3/3 done')
    expect(text).toContain("You're all caught up for today.")
  })

  it('lists today’s events and collapses the overflow', () => {
    const text = composeDailyBrief('en', {
      ...data(),
      events: Array.from({ length: 7 }, (_, i) => ({
        time: `0${i}:00`,
        title: `E${i}`,
      })),
    })
    expect(text).toContain('• 00:00 E0')
    expect(text).toContain('• 04:00 E4')
    expect(text).not.toContain('E5')
    expect(text).toContain('+2 more')
  })

  it('renders a weather line with a temp range and rain chance', () => {
    const text = composeDailyBrief('en', {
      ...data(),
      weather: {
        location: 'Lisbon, Portugal',
        tempMinC: 12.4,
        tempMaxC: 20.6,
        precipitationProbabilityPct: 40,
      },
    })
    expect(text).toContain('🌤️ Lisbon, Portugal: 12–21°C, rain 40%')
  })

  it('omits the rain when the chance is zero and handles a single temp', () => {
    const text = composeDailyBrief('en', {
      ...data(),
      weather: {
        location: 'Rio',
        tempMinC: null,
        tempMaxC: 30,
        precipitationProbabilityPct: 0,
      },
    })
    expect(text).toContain('🌤️ Rio: 30°C')
    expect(text).not.toContain('rain')
  })

  it('drops the weather line entirely when both temps are missing', () => {
    const text = composeDailyBrief('en', {
      ...data(),
      weather: {
        location: 'Nowhere',
        tempMinC: null,
        tempMaxC: null,
        precipitationProbabilityPct: 50,
      },
    })
    expect(text).not.toContain('Nowhere')
  })

  it('adds a carry-over line only when something carried over', () => {
    expect(composeDailyBrief('en', { ...data(), carriedOver: 2 })).toContain(
      '2 carried over from earlier.',
    )
    expect(
      composeDailyBrief('en', { ...data(), carriedOver: 0 }),
    ).not.toContain('↩️')
  })

  it('translates the copy for Portuguese and Spanish', () => {
    expect(composeDailyBrief('pt', data())).toContain('☀️ Bom dia!')
    expect(composeDailyBrief('pt', data())).toContain(
      'Nenhuma tarefa para hoje.',
    )
    expect(composeDailyBrief('es', data())).toContain('☀️ Buenos días!')
    expect(composeDailyBrief('es', data())).toContain('Sin tareas para hoy.')
  })
})
