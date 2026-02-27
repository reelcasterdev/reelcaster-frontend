/**
 * Unified Forecast Data Provider
 *
 * Central orchestrator implementing the layered data architecture:
 *
 *   Layer 1 — Open Meteo (Primary Weather, free/unlimited)
 *   Layer 2 — DFO/CHS (Primary Tide for BC, hard override)
 *   Layer 3 — Stormglass (Enrichment: water temp, astronomy, tide fallback)
 *
 * Returns a ForecastDataBundle with DataSourceMetadata tracking data origins.
 */

import {
  fetchOpenMeteoWeather,
  fetchOpenMeteoMarine,
  mergeMarineData,
  ProcessedOpenMeteoData,
} from './openMeteoApi'
import { fetchCHSTideDataByCoordinates, CHSWaterData } from './chsTideApi'
import {
  fetchStormglassWeather,
  fetchStormglassAstronomy,
  fetchStormglassTideExtremes,
  fetchStormglassTideSeaLevel,
  sgBestValue,
  StormglassAstronomyResponse,
  StormglassWeatherResponse,
} from './stormglassApi'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AstronomyData {
  days: AstronomyDay[]
}

export interface AstronomyDay {
  date: string
  moonPhase?: number    // 0-1 (0 = new, 0.5 = full)
  moonPhaseName?: string
  moonrise?: string
  moonset?: string
  moonTransit?: string
  sunrise?: string
  sunset?: string
}

export interface DataSourceMetadata {
  weather: 'open-meteo'
  marine: 'open-meteo' | null
  tide: 'iwls' | 'stormglass' | null
  tideStationCode?: string
  tideStationName?: string
  tideStationDistanceKm?: number
  waterTemperature: 'stormglass' | 'open-meteo' | null
  astronomy: 'stormglass' | null
  stormglassAvailable: boolean
}

export interface ForecastDataBundle {
  weather: ProcessedOpenMeteoData
  marine: ProcessedOpenMeteoData['minutely15'] | null
  tide: CHSWaterData | null
  astronomy: AstronomyData | null
  /** Stormglass water temperature (hourly) when available — prefer over Open Meteo SST */
  stormglassWaterTemp?: { timestamp: number; value: number }[]
  metadata: DataSourceMetadata
}

export interface ForecastBundleOptions {
  forecastDays?: number           // default 14
  marineDays?: number             // default 7
  tideStationCode?: string        // explicit station override
  tideMaxRadiusKm?: number        // default 20
  includeStormglass?: boolean     // default true (graceful degradation if key missing)
}

// ─── Provider ───────────────────────────────────────────────────────────────

export async function fetchForecastBundle(
  lat: number,
  lon: number,
  options: ForecastBundleOptions = {},
): Promise<ForecastDataBundle> {
  const {
    forecastDays = 14,
    marineDays = 7,
    tideStationCode,
    tideMaxRadiusKm = 20,
    includeStormglass = true,
  } = options

  // ── Layer 1: Open Meteo (always) ──────────────────────────────────────
  const [weatherResult, marineResult] = await Promise.all([
    fetchOpenMeteoWeather({ lat, lon }, forecastDays),
    fetchOpenMeteoMarine({ lat, lon }, marineDays),
  ])

  if (!weatherResult.success || !weatherResult.data) {
    throw new Error(weatherResult.error || 'Failed to fetch Open Meteo weather')
  }

  const weatherData = weatherResult.data
  let marine: ProcessedOpenMeteoData['minutely15'] | null = null

  if (marineResult.success && marineResult.data) {
    weatherData.minutely15 = mergeMarineData(
      weatherData.minutely15,
      marineResult.data.hourly,
    )
    marine = weatherData.minutely15
  }

  // ── Layer 2: DFO/CHS Tide (primary for BC) ───────────────────────────
  let tide: CHSWaterData | null = null
  try {
    tide = await fetchCHSTideDataByCoordinates(lat, lon, tideStationCode, undefined, tideMaxRadiusKm)
  } catch (err) {
    console.warn('DFO tide fetch failed:', err)
  }

  // ── Layer 3: Stormglass (enrichment) ──────────────────────────────────
  let astronomy: AstronomyData | null = null
  let sgWeather: StormglassWeatherResponse | null = null
  let sgWaterTempSeries: { timestamp: number; value: number }[] | undefined
  let stormglassAvailable = false

  if (includeStormglass) {
    // Fire Stormglass requests in parallel — they're independent
    const sgPromises: [
      Promise<StormglassWeatherResponse | null>,
      Promise<StormglassAstronomyResponse | null>,
    ] = [
      fetchStormglassWeather(lat, lon, ['waterTemperature']),
      fetchStormglassAstronomy(lat, lon),
    ]

    // If no DFO tide station found, also try Stormglass tide as fallback
    const needTideFallback = !tide
    const tideExtremesPromise = needTideFallback
      ? fetchStormglassTideExtremes(lat, lon)
      : Promise.resolve(null)
    const tideSeaLevelPromise = needTideFallback
      ? fetchStormglassTideSeaLevel(lat, lon)
      : Promise.resolve(null)

    const [sgWeatherRes, sgAstroRes, sgTideExtRes, sgTideSeaRes] = await Promise.all([
      ...sgPromises,
      tideExtremesPromise,
      tideSeaLevelPromise,
    ])

    sgWeather = sgWeatherRes
    stormglassAvailable = sgWeather !== null || sgAstroRes !== null

    // Extract water temperature series
    if (sgWeather?.hours) {
      sgWaterTempSeries = sgWeather.hours
        .map(h => ({
          timestamp: new Date(h.time).getTime() / 1000,
          value: sgBestValue(h.waterTemperature as any),
        }))
        .filter((r): r is { timestamp: number; value: number } => r.value !== undefined)
    }

    // Convert astronomy response
    if (sgAstroRes?.data) {
      astronomy = {
        days: sgAstroRes.data.map(d => ({
          date: d.time,
          moonPhase: d.moonPhase?.current?.value,
          moonPhaseName: d.moonPhase?.current?.text,
          moonrise: d.moonrise,
          moonset: d.moonset,
          moonTransit: d.moonTransit,
          sunrise: d.sunrise,
          sunset: d.sunset,
        })),
      }
    }

    // Stormglass tide fallback (only if no DFO station)
    if (needTideFallback && sgTideExtRes?.data && sgTideSeaRes?.data) {
      tide = buildTideDataFromStormglass(sgTideExtRes.data, sgTideSeaRes.data)
    }
  }

  // ── Build metadata ────────────────────────────────────────────────────
  const metadata: DataSourceMetadata = {
    weather: 'open-meteo',
    marine: marineResult.success ? 'open-meteo' : null,
    tide: tide?.dataSource ?? (tide ? 'iwls' : null),
    tideStationCode: tide?.stationCode,
    tideStationName: tide?.station?.name,
    tideStationDistanceKm: tide?.stationDistanceKm,
    waterTemperature: sgWaterTempSeries?.length ? 'stormglass' : (marine ? 'open-meteo' : null),
    astronomy: astronomy ? 'stormglass' : null,
    stormglassAvailable,
  }

  return {
    weather: weatherData,
    marine,
    tide,
    astronomy,
    stormglassWaterTemp: sgWaterTempSeries,
    metadata,
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a minimal CHSWaterData from Stormglass tide data.
 * Used only as fallback when no DFO station is within radius.
 */
function buildTideDataFromStormglass(
  extremes: { height: number; time: string; type: 'high' | 'low' }[],
  seaLevels: { height: number; time: string }[],
): CHSWaterData | null {
  if (!extremes.length || !seaLevels.length) return null

  const now = Date.now() / 1000
  const waterLevels = seaLevels.map(sl => ({
    timestamp: new Date(sl.time).getTime() / 1000,
    height: sl.height,
    type: 'predicted' as const,
  }))
  const tideEvents = extremes.map(e => ({
    timestamp: new Date(e.time).getTime() / 1000,
    height: e.height,
    type: e.type,
  }))

  const nextTideIndex = tideEvents.findIndex(t => t.timestamp > now)
  const nextTide = nextTideIndex >= 0 ? tideEvents[nextTideIndex] : tideEvents[tideEvents.length - 1]
  const previousTide = nextTideIndex > 0 ? tideEvents[nextTideIndex - 1] : tideEvents[0]

  const isRising = nextTide.type === 'high'
  const timeDiffHours = (nextTide.timestamp - previousTide.timestamp) / 3600
  const heightDiff = Math.abs(nextTide.height - previousTide.height)
  const changeRate = timeDiffHours > 0 ? heightDiff / timeDiffHours : 0
  const timeToNextTide = (nextTide.timestamp - now) / 60

  const currentWl = waterLevels.find(wl => wl.timestamp >= now) ?? waterLevels[waterLevels.length - 1]

  return {
    station: {
      id: 'stormglass',
      code: 'SG',
      name: 'Stormglass Estimated',
      latitude: 0,
      longitude: 0,
      type: 'estimated',
      timezone: 'UTC',
    },
    waterLevels,
    tideEvents,
    currentHeight: currentWl.height,
    nextTide,
    previousTide,
    tidalRange: heightDiff,
    isRising,
    changeRate,
    timeToNextTide,
    dataSource: 'stormglass',
  }
}
