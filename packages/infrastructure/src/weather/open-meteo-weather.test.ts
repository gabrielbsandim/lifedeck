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

    // First call geocodes with the raw place name; second hits the forecast API.
    const geoUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(geoUrl).toContain('name=Lisbon')
    const forecastUrl = String(fetchMock.mock.calls[1]?.[0])
    expect(forecastUrl).toContain('latitude=38.72')
    expect(forecastUrl).toContain('timezone=auto')
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
    expect(result.forecast.days[0]?.tempMaxC).toBeNaN()
    expect(result.forecast.days[0]?.tempMinC).toBeNaN()
    expect(result.forecast.days[1]?.condition).toBe('Unknown')
    expect(result.forecast.days[1]?.precipitationProbabilityPct).toBeNull()
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
