# V2 Algorithm Data Sources - Implementation Guide

This document shows how to wire up the missing data fields for the V2 physics-based algorithms.

## Current Status

### ✅ Already Working (No Changes Needed)

| Field | Source | Location |
|-------|--------|----------|
| `windSpeed` | Open Meteo API | `openMeteoApi.ts:78,202` |
| `windDirection` | Open Meteo API | `openMeteoApi.ts:79,203` |
| `pressure` | Open Meteo API | `openMeteoApi.ts:76,200` |
| `cloudCover` | Open Meteo API | `openMeteoApi.ts:77,201` |
| `precipitation` | Open Meteo API | `openMeteoApi.ts:73,197` |
| `currentSpeed` | CHS Tide API | `chsTideApi.ts` |
| `tidalRange` | CHS Tide API | `chsTideApi.ts` |
| `waterTemperature` | CHS Tide API | `chsTideApi.ts` |
| `fishingReportText` | Fishing Reports Scraper | `scrape-fishing-report.ts` |
| Sun Elevation Function | `getSolarAltitude()` | `astronomicalCalculations.ts:139` |

### ❌ Need to Add

| Field | Source | Required For | Priority |
|-------|--------|--------------|----------|
| `swellHeight` | Open Meteo Marine API | Lingcod, Halibut, Rockfish | HIGH |
| `swellPeriod` | Open Meteo Marine API | Lingcod, Halibut, Rockfish | HIGH |
| `currentDirection` | Estimated from tide | Wind-tide interaction | MEDIUM |
| `sunElevation` | Call `getSolarAltitude()` | Chinook, Coho, Sockeye | MEDIUM |
| `riverTemp` | River Gauge API (optional) | Sockeye thermal blockade | LOW |

---

## Implementation Steps

### Step 1: Add Marine API Fetch Function

Create `src/app/utils/openMeteoMarineApi.ts`:

```typescript
// Open-Meteo Marine API for swell data
// Documentation: https://open-meteo.com/en/docs/marine-weather-api

export interface MarineData {
  swellHeight: number      // meters
  swellPeriod: number      // seconds
  waveHeight: number       // meters
  wavePeriod: number       // seconds
  waveDirection: number    // degrees
}

export async function fetchMarineData(
  latitude: number,
  longitude: number
): Promise<MarineData | null> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: 'swell_wave_height,swell_wave_period,wave_height,wave_period,wave_direction',
      timezone: 'auto',
      forecast_days: '7'
    })

    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`
    )

    if (!response.ok) {
      console.error('[Marine API] Failed to fetch:', response.status)
      return null
    }

    const data = await response.json()

    // Get current hour data (index 0)
    const hourly = data.hourly
    if (!hourly) return null

    return {
      swellHeight: hourly.swell_wave_height?.[0] ?? 0.5,
      swellPeriod: hourly.swell_wave_period?.[0] ?? 8,
      waveHeight: hourly.wave_height?.[0] ?? 0.5,
      wavePeriod: hourly.wave_period?.[0] ?? 6,
      waveDirection: hourly.wave_direction?.[0] ?? 0
    }
  } catch (error) {
    console.error('[Marine API] Error:', error)
    return null
  }
}
```

### Step 2: Add Helper to Calculate Extended Context

Create `src/app/utils/extendedContextBuilder.ts`:

```typescript
import { OpenMeteo15MinData, OpenMeteoDailyData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { getSolarAltitude } from './astronomicalCalculations'
import { fetchMarineData } from './openMeteoMarineApi'
import type { ExtendedAlgorithmContext } from './speciesAlgorithms'

/**
 * Build Extended Algorithm Context with all physics data
 *
 * This function enriches basic weather/tide data with calculated fields
 * needed for V2 algorithms (sun elevation, swell data, directions, etc.)
 */
export async function buildExtendedContext(
  weather: OpenMeteo15MinData,
  dailyData: OpenMeteoDailyData,
  tideData: CHSWaterData | undefined,
  location: { latitude: number; longitude: number; name: string },
  pressureHistory: number[],
  fishingReportText?: string
): Promise<ExtendedAlgorithmContext> {
  const timestamp = weather.timestamp
  const date = new Date(timestamp * 1000)

  // Parse sunrise/sunset to Unix timestamps
  const sunriseTimestamp = new Date(dailyData.sunrise).getTime() / 1000
  const sunsetTimestamp = new Date(dailyData.sunset).getTime() / 1000

  // Calculate sun elevation (0-90 degrees)
  const sunElevation = Math.max(
    getSolarAltitude(date, location.latitude, location.longitude),
    0
  )

  // Fetch marine data (swell height/period) - optional, has fallback
  const marineData = await fetchMarineData(location.latitude, location.longitude)

  // Estimate current direction from tide phase
  // Simplified: Flood = generally northward (0°), Ebb = generally southward (180°)
  // In production, would use actual current direction from models
  const currentDirection = tideData?.isRising ? 0 : 180

  // Calculate time to next slack (simplified estimate)
  const timeToNextSlack = estimateTimeToSlack(tideData)

  // Calculate precipitation 24h sum (simplified from hourly rate)
  const precipitation24h = weather.precipitation * 24 // Rough estimate

  // Calculate max temp in last 24h (simplified)
  const maxTemp24h = dailyData.maxTemp

  return {
    // Basic temporal
    sunrise: sunriseTimestamp,
    sunset: sunsetTimestamp,
    latitude: location.latitude,
    longitude: location.longitude,
    locationName: location.name,

    // Calculated fields
    sunElevation,
    windDirection: weather.windDirection,
    currentDirection,

    // Marine data
    swellHeight: marineData?.swellHeight,
    swellPeriod: marineData?.swellPeriod,

    // Tide fields
    tidalRange: tideData?.tidalRange,
    timeToNextSlack,
    minutesToSlack: timeToNextSlack,

    // Aggregate fields
    precipitation24h,
    maxTemp24h,
    cloudCover: weather.cloudCover,
    pressureHistory,

    // Bio-intel
    fishingReportText
  }
}

/**
 * Estimate time to next slack tide (minutes)
 * Simplified calculation - in production would use tide predictions
 */
function estimateTimeToSlack(tideData: CHSWaterData | undefined): number {
  if (!tideData) return 180 // Default 3 hours

  const currentSpeed = Math.abs(tideData.currentSpeed || 0)

  // Very rough estimate based on current speed
  // Slower current = closer to slack
  if (currentSpeed < 0.3) return 15  // Near slack
  if (currentSpeed < 1.0) return 60  // ~1 hour
  if (currentSpeed < 2.0) return 120 // ~2 hours
  return 180 // ~3 hours (peak current)
}
```

### Step 3: Update Your Main Page to Use Extended Context

In `src/app/page.tsx` (or wherever you calculate species scores):

```typescript
import { buildExtendedContext } from './utils/extendedContextBuilder'
import { calculateSpeciesSpecificScore } from './utils/speciesAlgorithms'

// Inside your forecast calculation:
async function calculateForecast() {
  // ... existing weather/tide fetch ...

  // Build extended context with all physics data
  const extendedContext = await buildExtendedContext(
    weatherData,        // OpenMeteo15MinData
    dailyData,          // OpenMeteoDailyData
    tideData,           // CHSWaterData
    location,           // { latitude, longitude, name }
    pressureHistory,    // number[]
    fishingReportText   // string from your scraper
  )

  // Now call species algorithm with extended context
  const score = calculateSpeciesSpecificScore(
    selectedSpecies,
    weatherData,
    tideData,
    extendedContext  // ← This now has all V2 fields!
  )
}
```

---

## Quick Start (Minimal Implementation)

If you want to **skip Marine API** for now, use fallback estimates:

```typescript
// Estimate swell from wind (rough approximation)
const swellHeight = weather.windSpeed > 0
  ? Math.min((weather.windSpeed / 3.6) * 0.1, 2.0)
  : 0.5

const swellPeriod = 8 // Default moderate period

const extendedContext = {
  sunrise,
  sunset,
  latitude,
  longitude,
  locationName,
  sunElevation: Math.max(getSolarAltitude(date, lat, lng), 0),
  windDirection: weather.windDirection, // Already available!
  currentDirection: tideData?.isRising ? 0 : 180, // Estimate
  swellHeight, // Estimated from wind
  swellPeriod, // Default
  tidalRange: tideData?.tidalRange,
  minutesToSlack: estimateTimeToSlack(tideData),
  precipitation24h: weather.precipitation * 24,
  maxTemp24h: dailyData.maxTemp,
  cloudCover: weather.cloudCover,
  pressureHistory,
  fishingReportText
}
```

---

## Summary

**What you need to do:**

1. ✅ **Wind direction** - Already fetched, just pass it through
2. ✅ **Sun elevation** - Already exists, just call `getSolarAltitude()`
3. ⚠️ **Swell data** - Add Marine API fetch OR use wind-based estimate
4. ✅ **Current direction** - Estimate from `tideData.isRising` (flood=0°, ebb=180°)

**The algorithms will work with estimates** - Marine API adds accuracy but isn't required for basic functionality. All physics helpers have sensible defaults.

Would you like me to:
1. Create the full `extendedContextBuilder.ts` file?
2. Show you where to integrate it in your main page?
3. Add the Marine API fetch function?