// A single day of forecast, already resolved to the queried place's own local
// civil dates. Temperatures are Celsius; the assistant translates the English
// `condition` label into the user's language when it replies.
export type WeatherDay = {
  /** Civil date in the place's local time, YYYY-MM-DD. */
  date: string
  /** English weekday name for that local date, e.g. Saturday. */
  weekday: string
  /** Human-readable sky condition, e.g. "Light rain", "Partly cloudy". */
  condition: string
  tempMinC: number
  tempMaxC: number
  /** Max chance of precipitation that day, 0-100, or null when unavailable. */
  precipitationProbabilityPct: number | null
}

export type WeatherForecast = {
  /** Resolved place name, e.g. "Lisbon, Portugal". */
  location: string
  /** IANA time zone the forecast dates are expressed in. */
  timezone: string
  days: WeatherDay[]
}

// A closed result so the assistant can react without exceptions: it tells the
// user plainly when a place is unknown, the date is past the forecast horizon,
// or the provider is unreachable, instead of inventing weather.
export type WeatherLookup =
  | { ok: true; forecast: WeatherForecast }
  | { ok: false; reason: 'not_found' | 'out_of_range' | 'unavailable' }

export type WeatherQuery = {
  /** Free-text place name to geocode, e.g. "Rio de Janeiro". */
  location: string
  /** First civil date of interest, YYYY-MM-DD in the place's local time. */
  from?: string
  /** Last civil date of interest, YYYY-MM-DD. Defaults to a short window. */
  to?: string
}

// A stateless, read-only weather source. It needs no user data — the place and
// dates come straight from the assistant, and the forecast horizon is the
// provider's (roughly two weeks ahead).
export interface WeatherProvider {
  getForecast(query: WeatherQuery): Promise<WeatherLookup>
}
