import { describe, expect, it } from 'vitest'
import { makePreviewWeatherLocation } from '@/use-cases/preview-weather-location'
import type {
  WeatherLocationResolution,
  WeatherProvider,
} from '@/ports/weather-provider'

function weatherReturning(
  resolution: WeatherLocationResolution,
): WeatherProvider {
  return {
    getForecast: async () => ({ ok: false, reason: 'unavailable' }),
    resolveLocation: async () => resolution,
  }
}

describe('previewWeatherLocation', () => {
  it('returns the resolved place when found', async () => {
    const preview = makePreviewWeatherLocation({
      weather: weatherReturning({ ok: true, location: 'Lisbon, Portugal' }),
    })
    await expect(preview({ location: 'lisboa' })).resolves.toEqual({
      ok: true,
      location: 'Lisbon, Portugal',
    })
  })

  it('passes through a not_found result', async () => {
    const preview = makePreviewWeatherLocation({
      weather: weatherReturning({ ok: false, reason: 'not_found' }),
    })
    await expect(preview({ location: 'zzzzzz' })).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    })
  })

  it('rejects a blank location', async () => {
    const preview = makePreviewWeatherLocation({
      weather: weatherReturning({ ok: false, reason: 'not_found' }),
    })
    await expect(preview({ location: '   ' })).rejects.toBeTruthy()
  })
})
