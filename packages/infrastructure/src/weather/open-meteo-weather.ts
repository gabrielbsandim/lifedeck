import type {
  WeatherDay,
  WeatherLocationResolution,
  WeatherLookup,
  WeatherProvider,
  WeatherQuery,
} from '@lifedeck/application'
import { httpFetch } from '@/http/http-fetch'

// Open-Meteo is free and keyless, which is why it backs the WhatsApp weather
// tool: no secret to provision, no per-call billing. Geocoding resolves a place
// name to coordinates; the forecast endpoint then returns daily values in that
// place's own time zone (timezone=auto), so dates line up with what the user
// means by "Saturday" there.
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

// The forecast endpoint tops out around 16 days; asking for more just errors.
const MAX_FORECAST_DAYS = 16
// When the user names a place but no dates, show a week — enough for "this
// weekend" or "next week" without dumping the full horizon.
const DEFAULT_WINDOW_DAYS = 7

// WMO weather-interpretation codes → short English labels. The assistant
// translates these into the user's language when it composes the reply.
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}

type GeocodingResult = {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

type ForecastDaily = {
  time?: string[]
  weather_code?: number[]
  temperature_2m_max?: number[]
  temperature_2m_min?: number[]
  precipitation_probability_max?: (number | null)[]
}

function labelForCode(code: number | undefined): string {
  if (code === undefined) return 'Unknown'
  return WEATHER_CODE_LABELS[code] ?? 'Unknown'
}

// Weekday from a bare YYYY-MM-DD, read at noon UTC so a time-zone shift can
// never bump it to the neighbouring day.
function weekdayFor(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(parsed)
}

function formatLocation(place: GeocodingResult): string {
  return [place.name, place.country].filter(Boolean).join(', ')
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  constructor(
    private readonly geocodingUrl: string = GEOCODING_URL,
    private readonly forecastUrl: string = FORECAST_URL,
  ) {}

  async getForecast(query: WeatherQuery): Promise<WeatherLookup> {
    try {
      const place = await this.geocode(query.location)
      if (!place) return { ok: false, reason: 'not_found' }

      const forecast = await this.fetchForecast(place)
      if (!forecast) return { ok: false, reason: 'unavailable' }

      const days = this.selectDays(forecast.daily, query.from, query.to)
      if (days.length === 0) return { ok: false, reason: 'out_of_range' }

      return {
        ok: true,
        forecast: {
          location: formatLocation(place),
          timezone: forecast.timezone,
          days,
        },
      }
    } catch {
      // Timeout, network error, or malformed payload — the assistant should
      // tell the user weather is unavailable rather than guess.
      return { ok: false, reason: 'unavailable' }
    }
  }

  async resolveLocation(location: string): Promise<WeatherLocationResolution> {
    try {
      const place = await this.geocode(location)
      if (!place) return { ok: false, reason: 'not_found' }
      return { ok: true, location: formatLocation(place) }
    } catch {
      return { ok: false, reason: 'unavailable' }
    }
  }

  private async geocode(location: string): Promise<GeocodingResult | null> {
    const url = new URL(this.geocodingUrl)
    url.searchParams.set('name', location)
    url.searchParams.set('count', '1')
    url.searchParams.set('format', 'json')
    const response = await httpFetch(url)
    if (!response.ok) return null
    const body = (await response.json()) as { results?: GeocodingResult[] }
    const first = body.results?.[0]
    if (!first) return null
    return first
  }

  private async fetchForecast(
    place: GeocodingResult,
  ): Promise<{ timezone: string; daily: ForecastDaily } | null> {
    const url = new URL(this.forecastUrl)
    url.searchParams.set('latitude', String(place.latitude))
    url.searchParams.set('longitude', String(place.longitude))
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    )
    url.searchParams.set('timezone', 'auto')
    url.searchParams.set('forecast_days', String(MAX_FORECAST_DAYS))
    const response = await httpFetch(url)
    if (!response.ok) return null
    const body = (await response.json()) as {
      timezone?: string
      daily?: ForecastDaily
    }
    if (!body.daily?.time?.length) return null
    return { timezone: body.timezone ?? 'UTC', daily: body.daily }
  }

  // Filters the daily arrays to the requested [from, to] window. With no dates,
  // returns the next DEFAULT_WINDOW_DAYS. A window entirely past the horizon
  // yields nothing, which the caller reports as out_of_range.
  private selectDays(
    daily: ForecastDaily,
    from?: string,
    to?: string,
  ): WeatherDay[] {
    const dates = daily.time ?? []
    const rangeStart = from ?? dates[0]
    const rangeEnd =
      to ?? from ?? dates[Math.min(DEFAULT_WINDOW_DAYS, dates.length) - 1]

    const days: WeatherDay[] = []
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      if (date === undefined) continue
      if (rangeStart && date < rangeStart) continue
      if (rangeEnd && date > rangeEnd) continue
      days.push({
        date,
        weekday: weekdayFor(date),
        condition: labelForCode(daily.weather_code?.[i]),
        tempMaxC: daily.temperature_2m_max?.[i] ?? Number.NaN,
        tempMinC: daily.temperature_2m_min?.[i] ?? Number.NaN,
        precipitationProbabilityPct:
          daily.precipitation_probability_max?.[i] ?? null,
      })
    }
    return days
  }
}
