import { weatherLocationPreviewSchema } from '@/dtos/user-dto'
import type {
  WeatherLocationResolution,
  WeatherProvider,
} from '@/ports/weather-provider'

type Dependencies = {
  weather: WeatherProvider
}

// Checks a place name against the weather provider's geocoder so settings can
// confirm it ("Lisbon, Portugal") or flag "not found" before the user saves.
export function makePreviewWeatherLocation({ weather }: Dependencies) {
  return async function previewWeatherLocation(
    input: unknown,
  ): Promise<WeatherLocationResolution> {
    const { location } = weatherLocationPreviewSchema.parse(input)
    return weather.resolveLocation(location)
  }
}
