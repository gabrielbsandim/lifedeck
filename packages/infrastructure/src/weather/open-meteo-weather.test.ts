import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenMeteoWeatherProvider } from '@/weather/open-meteo-weather'

const GEO = 'https://geo.test/search'
const FORECAST = 'https://forecast.test/forecast'

function ok(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload }
}

function notOk(status = 500) {
  return { ok: false, status, json: async () => ({}) }
}

// 16 consecutive days starting 2026-07-19, so range filtering and the horizon
// edge are both exercised against a known calendar.
function dailyPayload() {
  const time: string[] = []
  const day = 24 * 60 * 60 * 1000
  const start = Date.UTC(2026, 6, 19)
  for (let i = 0; i < 16; i++) {
    time.push(new Date(start + i * day).toISOString().slice(0, 10))
  }
  return {
    timezone: 'Europe/Lisbon',
    current: { temperature_2m: 18.4, weather_code: 2 },
    daily: {
      time,
      weather_code: time.map(() => 61),
      temperature_2m_max: time.map((_, i) => 20 + i),
      temperature_2m_min: time.map((_, i) => 10 + i),
      precipitation_probability_max: time.map(() => 40),
    },
  }
}

// Routes the two outbound calls (geocode, then forecast) by URL, so a test can
// override either leg independently.
function stubFetch(options?: {
  geo?: unknown
  forecast?: unknown
  throwOnForecast?: boolean
}) {
  const geoResponse = options?.geo ?? ok({ results: [defaultPlace()] })
  const forecastResponse = options?.forecast ?? ok(dailyPayload())
  const fetchMock = vi.fn(async (input: string | URL) => {
    const url = String(input)
    if (url.startsWith(GEO)) return geoResponse
    if (options?.throwOnForecast) throw new Error('network')
    return forecastResponse
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function defaultPlace() {
  return {
    name: 'Lisbon',
    latitude: 38.72,
    longitude: -9.14,
    country: 'Portugal',
  }
}

function provider() {
  return new OpenMeteoWeatherProvider(GEO, FORECAST)
}

describe('OpenMeteoWeatherProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('geocodes the place then returns a default window of daily forecast', async () => {
    const fetchMock = stubFetch()

    const result = await provider().getForecast({ location: 'Lisbon' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.forecast.location).toBe('Lisbon, Portugal')
    expect(result.forecast.timezone).toBe('Europe/Lisbon')
    expect(result.forecast.days).toHaveLength(7)
    expect(result.forecast.days[0]).toMatchObject({
      date: '2026-07-19',
      weekday: 'Sunday',
      condition: 'Slight rain',
      tempMaxC: 20,
      tempMinC: 10,
      precipitationProbabilityPct: 40,
    })

    // Current conditions come back alongside the daily forecast.
    expect(result.forecast.current).toEqual({
      temperatureC: 18.4,
      condition: 'Partly cloudy',
    })

    // First call geocodes with the raw place name; second hits the forecast API.
    const geoUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(geoUrl).toContain('name=Lisbon')
    const forecastUrl = String(fetchMock.mock.calls[1]?.[0])
    expect(forecastUrl).toContain('latitude=38.72')
    expect(forecastUrl).toContain('timezone=auto')
    expect(forecastUrl).toContain('current=temperature_2m')
  })

  it('returns a null current block when the provider omits it', async () => {
    stubFetch({
      forecast: ok({
        timezone: 'Europe/Lisbon',
        daily: {
          time: ['2026-07-19'],
          weather_code: [1],
          temperature_2m_max: [22],
          temperature_2m_min: [12],
          precipitation_probability_max: [0],
        },
      }),
    })

    const result = await provider().getForecast({ location: 'Lisbon' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.forecast.current).toBeNull()
  })

  it('narrows to an explicit from/to range', async () => {
    stubFetch()

    const result = await provider().getForecast({
      location: 'Lisbon',
      from: '2026-07-25',
      to: '2026-07-27',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.forecast.days.map(d => d.date)).toEqual([
      '2026-07-25',
      '2026-07-26',
      '2026-07-27',
    ])
  })

  it('returns a single day when only `from` is given', async () => {
    stubFetch()

    const result = await provider().getForecast({
      location: 'Lisbon',
      from: '2026-07-22',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.forecast.days.map(d => d.date)).toEqual(['2026-07-22'])
  })

  it('snaps a request one day before the forecast to its first day (timezone skew)', async () => {
    // A user behind the place asks for "today" (their date), which is a day
    // before the place's own first forecast date. Without the grace clamp this
    // filters to nothing and wrongly reads as out_of_range.
    stubFetch()

    const result = await provider().getForecast({
      location: 'Lisbon',
      from: '2026-07-18',
      to: '2026-07-18',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.forecast.days.map(d => d.date)).toEqual(['2026-07-19'])
  })

  it('snaps a request one day past the horizon to its last day (timezone skew)', async () => {
    // Last forecast day is 2026-08-03; a user ahead of the place asks for the
    // next day. One-day grace clamps it to the last available day.
    stubFetch()

    const result = await provider().getForecast({
      location: 'Lisbon',
      from: '2026-08-04',
      to: '2026-08-04',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.forecast.days.map(d => d.date)).toEqual(['2026-08-03'])
  })

  it('returns every day when the forecast is shorter than the default window', async () => {
    stubFetch({
      forecast: ok({
        timezone: 'Europe/Lisbon',
        daily: {
          time: ['2026-07-19', '2026-07-20', '2026-07-21'],
          weather_code: [0, 1, 2],
          temperature_2m_max: [20, 21, 22],
          temperature_2m_min: [10, 11, 12],
          precipitation_probability_max: [0, 10, 20],
        },
      }),
    })

    const result = await provider().getForecast({ location: 'Lisbon' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.forecast.days.map(d => d.date)).toEqual([
      '2026-07-19',
      '2026-07-20',
      '2026-07-21',
    ])
  })

  it('reports not_found when geocoding has no results', async () => {
    stubFetch({ geo: ok({ results: [] }) })

    const result = await provider().getForecast({ location: 'Nowhereville' })

    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('reports out_of_range when the day is past the forecast horizon', async () => {
    stubFetch()

    const result = await provider().getForecast({
      location: 'Lisbon',
      from: '2026-09-01',
    })

    expect(result).toEqual({ ok: false, reason: 'out_of_range' })
  })

  it('reports unavailable when the forecast call fails', async () => {
    stubFetch({ throwOnForecast: true })

    const result = await provider().getForecast({ location: 'Lisbon' })

    expect(result).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('treats a non-ok geocoding response as an unknown place', async () => {
    stubFetch({ geo: notOk(503) })

    const result = await provider().getForecast({ location: 'Lisbon' })

    // A non-ok geocode yields no place, which surfaces as not_found.
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('reports unavailable when the forecast payload has no days', async () => {
    stubFetch({ forecast: ok({ timezone: 'UTC', daily: { time: [] } }) })

    const result = await provider().getForecast({ location: 'Lisbon' })

    expect(result).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('reports not_found when the geocoding payload omits results entirely', async () => {
    stubFetch({ geo: ok({}) })

    const result = await provider().getForecast({ location: 'Lisbon' })

    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('reports unavailable on a non-ok forecast response', async () => {
    stubFetch({ forecast: notOk(500) })

    const result = await provider().getForecast({ location: 'Lisbon' })

    expect(result).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('fills gaps with sensible fallbacks and omits the country when absent', async () => {
    stubFetch({
      geo: ok({ results: [{ name: 'Atlantis', latitude: 0, longitude: 0 }] }),
      forecast: ok({
        // timezone omitted → defaults to UTC.
        daily: {
          time: ['2026-07-19', '2026-07-20'],
          weather_code: [999], // unknown code, then missing → both "Unknown".
          temperature_2m_max: [], // missing → NaN.
          // temperature_2m_min omitted entirely → NaN.
          precipitation_probability_max: [null], // null, then missing → null.
        },
      }),
    })

    const result = await provider().getForecast({ location: 'Atlantis' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.forecast.location).toBe('Atlantis')
    expect(result.forecast.timezone).toBe('UTC')
    expect(result.forecast.days[0]).toMatchObject({
      condition: 'Unknown',
      precipitationProbabilityPct: null,
    })
    expect(result.forecast.days[0]?.tempMaxC).toBeNull()
    expect(result.forecast.days[0]?.tempMinC).toBeNull()
    expect(result.forecast.days[1]?.condition).toBe('Unknown')
    expect(result.forecast.days[1]?.precipitationProbabilityPct).toBeNull()
  })

  it('resolves a place to its canonical name', async () => {
    stubFetch()

    const result = await provider().resolveLocation('lisbon')

    expect(result).toEqual({ ok: true, location: 'Lisbon, Portugal' })
  })

  it('resolves to not_found for an unknown place', async () => {
    stubFetch({ geo: ok({ results: [] }) })

    const result = await provider().resolveLocation('nowhereville')

    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('resolves to unavailable when geocoding throws', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('network')
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await provider().resolveLocation('lisbon')

    expect(result).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('leaves the weekday blank for an unparseable date', async () => {
    stubFetch({
      forecast: ok({
        timezone: 'UTC',
        daily: {
          time: ['not-a-date'],
          weather_code: [0],
          temperature_2m_max: [15],
          temperature_2m_min: [5],
          precipitation_probability_max: [0],
        },
      }),
    })

    // A range that brackets the bogus token so it is not filtered out.
    const result = await provider().getForecast({
      location: 'Lisbon',
      from: 'a',
      to: 'z',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.forecast.days[0]).toMatchObject({
      date: 'not-a-date',
      weekday: '',
      condition: 'Clear sky',
    })
  })
})
