// Chinook Salmon Algorithm V2
// Redesigned with scientifically-backed factors and proper weighting
//
// Key improvements over V1:
// 1. Dynamic light/time scoring using actual sunrise/sunset
// 2. Pressure trend analysis (3hr/6hr deltas)
// 3. Solunar major/minor periods
// 4. Location-aware seasonality
// 5. Fishing report integration
// 6. Merged sea state (wind + waves)
// 7. Safety score capping
//
// V2 Improvements (Physics-based):
// 8. Trollability/Blowback factor - penalizes large tidal exchanges
// 9. Predator Suppression - Orca detection from fishing reports
// 10. Depth advice instead of light penalty
// 11. Seasonal mode (Feeder vs Spawner) with dynamic weights
// 12. Bait presence scoring

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import {
  calculateTrollabilityScore,
  detectPredatorPresence,
  getChinookDepthAdvice,
  getChinookSeasonalMode,
  calculateBaitPresenceScore,
  parseBaitPresenceFromText,
  calculateWindTideInteraction,
  type TrollabilityResult,
  type PredatorPresenceResult,
  type ChinookDepthAdvice,
  type ChinookSeasonalMode
} from './physicsHelpers'

// ==================== INTERFACES ====================

export interface ChinookScoreResult {
  total: number
  factors: {
    [key: string]: {
      value: number
      weight: number
      score: number
      description?: string
    }
  }
  isSafe: boolean
  safetyWarnings: string[]
  isInSeason: boolean
  strategyAdvice?: string[]
  depthAdvice?: ChinookDepthAdvice
  seasonalMode?: ChinookSeasonalMode
  debug?: {
    pressureTrend?: PressureTrend
    solunarPeriod?: SolunarPeriodInfo
    lightCondition?: string
    trollability?: TrollabilityResult
    predatorPresence?: PredatorPresenceResult
  }
}

export interface PressureTrend {
  current: number
  delta3hr: number
  delta6hr: number
  trend: 'rapidly_falling' | 'falling' | 'stable' | 'rising' | 'rapidly_rising'
}

export interface SolunarPeriodInfo {
  inMajorPeriod: boolean
  inMinorPeriod: boolean
  periodType: 'major' | 'minor' | 'none'
  minutesToNextPeriod?: number
}

export interface FishingReportData {
  hasChinookCatches: boolean
  daysAgo: number
  hotspotMatch: boolean
  catchCount?: number
}

export interface AlgorithmContext {
  sunrise: number  // Unix timestamp
  sunset: number   // Unix timestamp
  latitude: number
  longitude: number
  locationName?: string
  pressureHistory?: number[]  // Last 6 hours of pressure readings
  fishingReports?: FishingReportData
  // V2 Improvements - Extended context
  sunElevation?: number        // Sun angle above horizon (0-90 degrees)
  windDirection?: number       // Wind direction (0-360 degrees)
  currentDirection?: number    // Current direction (0-360 degrees)
  tidalRange?: number          // High-low difference in meters
  minutesToSlack?: number      // Minutes until next slack tide
  cloudCover?: number          // Cloud cover percentage (0-100)
  fishingReportText?: string   // Raw report text for bio-intel parsing
}

// ==================== WEIGHT CONFIGURATION ====================

// Base weights - adjusted dynamically by seasonal mode
const BASE_WEIGHTS = {
  // TIDAL MECHANICS (30%) - King of Chinook factors
  tidalCurrent: 0.15,       // Current flow
  trollability: 0.15,       // Blowback/depth control

  // LIGHT & DEPTH (20%) - Guides depth, not penalty
  lightDepth: 0.20,         // Sun elevation -> depth advice

  // BAIT PRESENCE (20%) - Critical for feeders
  baitPresence: 0.20,       // Bio-intel from reports

  // SOLUNAR (10%)
  solunar: 0.10,            // Major/minor periods

  // BAROMETER (10%)
  pressureTrend: 0.10,      // Pressure change

  // SAFETY/CONDITIONS (10%)
  seaState: 0.05,           // Wind + waves
  precipitation: 0.03,      // Rain
  waterTemp: 0.02,          // Temperature
}

// Dynamic weight adjustments based on seasonal mode
function getSeasonalWeights(mode: 'feeder' | 'spawner') {
  if (mode === 'feeder') {
    // Feeder mode (Dec-May): Emphasize bait and light
    return {
      ...BASE_WEIGHTS,
      tidalCurrent: 0.12,
      trollability: 0.13,
      lightDepth: 0.22,
      baitPresence: 0.23,
      solunar: 0.10,
      pressureTrend: 0.10,
      seaState: 0.05,
      precipitation: 0.03,
      waterTemp: 0.02,
    }
  } else {
    // Spawner mode (Jun-Sep): Emphasize tidal mechanics
    return {
      ...BASE_WEIGHTS,
      tidalCurrent: 0.18,
      trollability: 0.17,
      lightDepth: 0.18,
      baitPresence: 0.17,
      solunar: 0.10,
      pressureTrend: 0.10,
      seaState: 0.05,
      precipitation: 0.03,
      waterTemp: 0.02,
    }
  }
}

// Legacy weights for backward compatibility if seasonal mode unavailable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LEGACY_WEIGHTS = {
  // PRESENCE FACTORS (35%)
  seasonality: 0.20,      // Run timing - when fish are present
  catchReports: 0.15,     // Recent verified catches

  // ACTIVITY FACTORS (45%)
  lightTime: 0.15,        // Dawn/dusk golden hours
  tidalCurrent: 0.12,     // Current flow for bait movement
  pressureTrend: 0.10,    // Barometric pressure change
  solunar: 0.08,          // Major/minor feeding periods

  // CONDITIONS FACTORS (20%)
  waterTemp: 0.08,        // Optimal temperature range
  seaState: 0.07,         // Wind + wave conditions
  precipitation: 0.05,    // Rain/weather conditions
}

// ==================== PHASE 1: DYNAMIC LIGHT/TIME SCORING ====================

/**
 * Calculate light/time score based on actual sunrise/sunset times
 * Uses civil twilight and golden hour concepts
 */
export function calculateDynamicLightScore(
  timestamp: number,
  sunrise: number,
  sunset: number
): { score: number; condition: string } {
  const currentTime = timestamp

  // Calculate minutes from sunrise and sunset
  const minutesFromSunrise = (currentTime - sunrise) / 60
  const minutesFromSunset = (currentTime - sunset) / 60
  const minutesToSunrise = -minutesFromSunrise
  const minutesToSunset = -minutesFromSunset

  // Civil twilight is approximately 30-40 minutes before sunrise / after sunset
  const CIVIL_TWILIGHT_MINUTES = 35
  const GOLDEN_HOUR_MINUTES = 60
  const EXTENDED_GOLDEN_MINUTES = 90

  let score: number
  let condition: string

  // Dawn period (before and after sunrise)
  if (minutesToSunrise > 0 && minutesToSunrise <= CIVIL_TWILIGHT_MINUTES) {
    // Civil twilight before sunrise - excellent
    score = 0.9
    condition = 'civil_twilight_dawn'
  } else if (minutesFromSunrise >= 0 && minutesFromSunrise <= 30) {
    // Golden hour - peak (0-30 min after sunrise)
    score = 1.0
    condition = 'golden_hour_dawn'
  } else if (minutesFromSunrise > 30 && minutesFromSunrise <= GOLDEN_HOUR_MINUTES) {
    // Golden hour - good (30-60 min after sunrise)
    score = 0.9
    condition = 'golden_hour_dawn_late'
  } else if (minutesFromSunrise > GOLDEN_HOUR_MINUTES && minutesFromSunrise <= EXTENDED_GOLDEN_MINUTES) {
    // Extended golden hour (60-90 min after sunrise)
    score = 0.75
    condition = 'morning_early'
  }
  // Dusk period (before and after sunset)
  else if (minutesToSunset > 0 && minutesToSunset <= 30) {
    // Golden hour - peak (0-30 min before sunset)
    score = 1.0
    condition = 'golden_hour_dusk'
  } else if (minutesToSunset > 30 && minutesToSunset <= GOLDEN_HOUR_MINUTES) {
    // Golden hour - good (30-60 min before sunset)
    score = 0.9
    condition = 'golden_hour_dusk_early'
  } else if (minutesToSunset > GOLDEN_HOUR_MINUTES && minutesToSunset <= EXTENDED_GOLDEN_MINUTES) {
    // Extended golden hour (60-90 min before sunset)
    score = 0.75
    condition = 'afternoon_late'
  } else if (minutesFromSunset >= 0 && minutesFromSunset <= CIVIL_TWILIGHT_MINUTES) {
    // Civil twilight after sunset - good
    score = 0.85
    condition = 'civil_twilight_dusk'
  }
  // Mid-morning (90 min to 4 hours after sunrise)
  else if (minutesFromSunrise > EXTENDED_GOLDEN_MINUTES && minutesFromSunrise <= 240) {
    score = 0.5
    condition = 'mid_morning'
  }
  // Late afternoon (4 hours to 90 min before sunset)
  else if (minutesToSunset > EXTENDED_GOLDEN_MINUTES && minutesToSunset <= 240) {
    score = 0.5
    condition = 'late_afternoon'
  }
  // Midday (between mid-morning and late afternoon)
  else if (minutesFromSunrise > 240 && minutesToSunset > 240) {
    score = 0.3
    condition = 'midday'
  }
  // Night (outside civil twilight)
  else if (minutesToSunrise > CIVIL_TWILIGHT_MINUTES || minutesFromSunset > CIVIL_TWILIGHT_MINUTES) {
    // Night fishing can still produce, especially in summer
    score = 0.15
    condition = 'night'
  }
  // Default fallback
  else {
    score = 0.4
    condition = 'transition'
  }

  return { score, condition }
}

// ==================== PHASE 1.2: SEASONALITY SCORING ====================

/**
 * Calculate seasonality score based on BC Chinook run timing
 * Different curves for different regions
 */
export function calculateSeasonalityScore(
  date: Date,
  locationName?: string
): { score: number; runType: string } {
  const month = date.getMonth() + 1  // 1-12
  const day = date.getDate()

  // Determine which seasonal curve to use based on location
  // Default to Victoria/Sidney/Sooke timing
  const isNorthern = locationName?.toLowerCase().includes('campbell') ||
                     locationName?.toLowerCase().includes('port hardy') ||
                     locationName?.toLowerCase().includes('prince rupert')

  let score: number
  let runType: string

  if (isNorthern) {
    // Northern BC (Campbell River, Port Hardy, Prince Rupert)
    // Peak: July-September (Fraser River sockeye brings Chinook)
    switch (month) {
      case 1: score = 0.3; runType = 'winter_resident'; break
      case 2: score = 0.4; runType = 'winter_feeder'; break
      case 3: score = 0.5; runType = 'early_spring'; break
      case 4: score = 0.6; runType = 'spring_feeder'; break
      case 5: score = 0.7; runType = 'late_spring'; break
      case 6: score = 0.85; runType = 'early_migrant'; break
      case 7: score = 1.0; runType = 'peak_migration'; break
      case 8: score = 1.0; runType = 'peak_migration'; break
      case 9: score = 0.9; runType = 'late_migration'; break
      case 10: score = 0.6; runType = 'fall_resident'; break
      case 11: score = 0.4; runType = 'late_fall'; break
      case 12: score = 0.3; runType = 'winter_resident'; break
      default: score = 0.5; runType = 'unknown'
    }
  } else {
    // Southern BC (Victoria, Sidney, Sooke, Vancouver)
    // Has both winter feeders and summer migrants
    switch (month) {
      case 1:
        score = 0.45
        runType = 'winter_feeder'
        break
      case 2:
        // Winter feeder season starts ramping up
        score = day < 15 ? 0.55 : 0.65
        runType = 'winter_feeder'
        break
      case 3:
        score = 0.7
        runType = 'winter_feeder_peak'
        break
      case 4:
        // Late winter feeders + transition
        score = day < 15 ? 0.65 : 0.6
        runType = 'spring_transition'
        break
      case 5:
        // Transition period - feeders leaving, migrants not yet arrived
        score = 0.55
        runType = 'spring_transition'
        break
      case 6:
        // Early migrants starting to show
        score = day < 15 ? 0.7 : 0.8
        runType = 'early_migration'
        break
      case 7:
        // Peak summer migration begins
        score = day < 15 ? 0.9 : 1.0
        runType = 'peak_migration'
        break
      case 8:
        // Peak continues - Fraser run, local returns
        score = 1.0
        runType = 'peak_migration'
        break
      case 9:
        // Late migration - larger fish
        score = day < 15 ? 0.9 : 0.8
        runType = 'late_migration'
        break
      case 10:
        // Transition to fall/winter
        score = day < 15 ? 0.6 : 0.5
        runType = 'fall_transition'
        break
      case 11:
        score = 0.4
        runType = 'late_fall'
        break
      case 12:
        // Winter feeders returning
        score = day < 15 ? 0.35 : 0.4
        runType = 'early_winter'
        break
      default:
        score = 0.5
        runType = 'unknown'
    }
  }

  return { score, runType }
}

// ==================== PHASE 2: PRESSURE TREND ANALYSIS ====================

/**
 * Analyze barometric pressure trend
 * Requires pressure history (array of readings from past 6 hours)
 */
export function calculatePressureTrendScore(
  currentPressure: number,
  pressureHistory?: number[]
): { score: number; trend: PressureTrend } {
  // Default trend if no history available
  const defaultTrend: PressureTrend = {
    current: currentPressure,
    delta3hr: 0,
    delta6hr: 0,
    trend: 'stable'
  }

  if (!pressureHistory || pressureHistory.length < 2) {
    // Fall back to absolute pressure scoring if no history
    let score: number
    if (currentPressure < 1008) {
      score = 0.9  // Low pressure - stormy, fish active
    } else if (currentPressure < 1013) {
      score = 0.7  // Below normal
    } else if (currentPressure <= 1017) {
      score = 0.5  // Normal
    } else if (currentPressure <= 1022) {
      score = 0.4  // High pressure
    } else {
      score = 0.2  // Very high - bluebird conditions
    }

    return { score, trend: defaultTrend }
  }

  // Calculate deltas
  // Assuming pressureHistory is ordered oldest to newest
  // Index 0 = 6 hours ago, last index = most recent before current
  const len = pressureHistory.length
  const pressure3hrAgo = len >= 12 ? pressureHistory[len - 12] : pressureHistory[0]  // 12 x 15min = 3hr
  const pressure6hrAgo = pressureHistory[0]

  const delta3hr = currentPressure - pressure3hrAgo
  const delta6hr = currentPressure - pressure6hrAgo

  // Determine trend
  let trendType: PressureTrend['trend']
  let score: number

  if (delta6hr < -2.5 || delta3hr < -1.5) {
    trendType = 'rapidly_falling'
    score = 1.0  // Prime feeding trigger - approaching storm
  } else if (delta6hr < -1.0 || delta3hr < -0.5) {
    trendType = 'falling'
    score = 0.85  // Excellent - fish are active
  } else if (delta6hr >= -1.0 && delta6hr <= 1.0 && delta3hr >= -0.5 && delta3hr <= 0.5) {
    trendType = 'stable'
    score = 0.5  // Neutral - predictable but not triggering
  } else if (delta6hr > 1.0 || delta3hr > 0.5) {
    trendType = 'rising'
    score = 0.25  // Poor - post-front conditions
  } else {
    trendType = 'rapidly_rising'
    score = 0.1  // Very poor - high pressure lockjaw
  }

  const trend: PressureTrend = {
    current: currentPressure,
    delta3hr,
    delta6hr,
    trend: trendType
  }

  return { score, trend }
}

// ==================== PHASE 3: SOLUNAR PERIODS ====================

/**
 * Calculate moon transit times for solunar periods
 * Major periods: Moon overhead (upper transit) and underfoot (lower transit)
 * Minor periods: Moonrise and moonset
 */
export function getMoonTransitTimes(
  date: Date,
  latitude: number,
  longitude: number
): { majorPeriods: number[]; minorPeriods: number[] } {
  // Simplified moon transit calculation
  // For production, consider using a library like suncalc or astronomia

  // Moon phase affects timing slightly but we use day of year as primary driver
  // getMoonPhase(date) could be used for more accurate calculations
  const dayOfYear = getDayOfYear(date)

  // Approximate moon transit times based on phase and location
  // Moon rises ~50 minutes later each day on average
  const baseMoonRiseHour = (dayOfYear * 50 / 60) % 24

  // Adjust for longitude (rough approximation)
  const longitudeOffset = (longitude + 123) / 15  // BC is around -123

  // Moon overhead is approximately 6 hours after moonrise
  // Moon underfoot is approximately 12 hours after moon overhead
  const moonRiseHour = (baseMoonRiseHour + longitudeOffset) % 24
  const moonSetHour = (moonRiseHour + 12.4) % 24  // Moon is up ~12.4 hours
  const moonOverheadHour = (moonRiseHour + 6.2) % 24
  const moonUnderfootHour = (moonOverheadHour + 12) % 24

  // Convert to timestamps
  const baseDate = new Date(date)
  baseDate.setHours(0, 0, 0, 0)
  const basestamp = baseDate.getTime() / 1000

  const majorPeriods = [
    basestamp + moonOverheadHour * 3600,
    basestamp + moonUnderfootHour * 3600
  ]

  const minorPeriods = [
    basestamp + moonRiseHour * 3600,
    basestamp + moonSetHour * 3600
  ]

  return { majorPeriods, minorPeriods }
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

/**
 * Calculate solunar score for a given timestamp
 */
export function calculateSolunarScore(
  timestamp: number,
  latitude: number,
  longitude: number
): { score: number; periodInfo: SolunarPeriodInfo } {
  const date = new Date(timestamp * 1000)
  const { majorPeriods, minorPeriods } = getMoonTransitTimes(date, latitude, longitude)

  const MAJOR_WINDOW_MINUTES = 45  // ±45 minutes from transit
  const MINOR_WINDOW_MINUTES = 30  // ±30 minutes from rise/set

  let inMajorPeriod = false
  let inMinorPeriod = false
  let minutesToNextPeriod = Infinity

  // Check major periods
  for (const transitTime of majorPeriods) {
    const diffMinutes = Math.abs(timestamp - transitTime) / 60
    if (diffMinutes <= MAJOR_WINDOW_MINUTES) {
      inMajorPeriod = true
      break
    }
    // Track time to next period
    if (transitTime > timestamp) {
      const minsToThis = (transitTime - timestamp) / 60
      minutesToNextPeriod = Math.min(minutesToNextPeriod, minsToThis)
    }
  }

  // Check minor periods
  if (!inMajorPeriod) {
    for (const transitTime of minorPeriods) {
      const diffMinutes = Math.abs(timestamp - transitTime) / 60
      if (diffMinutes <= MINOR_WINDOW_MINUTES) {
        inMinorPeriod = true
        break
      }
      // Track time to next period
      if (transitTime > timestamp) {
        const minsToThis = (transitTime - timestamp) / 60
        minutesToNextPeriod = Math.min(minutesToNextPeriod, minsToThis)
      }
    }
  }

  let score: number
  let periodType: 'major' | 'minor' | 'none'

  if (inMajorPeriod) {
    score = 1.0
    periodType = 'major'
  } else if (inMinorPeriod) {
    score = 0.7
    periodType = 'minor'
  } else {
    score = 0.3  // Baseline - fish can still bite outside solunar windows
    periodType = 'none'
  }

  const periodInfo: SolunarPeriodInfo = {
    inMajorPeriod,
    inMinorPeriod,
    periodType,
    minutesToNextPeriod: minutesToNextPeriod === Infinity ? undefined : Math.round(minutesToNextPeriod)
  }

  return { score, periodInfo }
}

// ==================== PHASE 4: FISHING REPORTS ====================

/**
 * Calculate score based on recent fishing reports
 * Time decay: more recent = more valuable
 */
export function calculateCatchReportScore(
  reportData?: FishingReportData
): number {
  if (!reportData || !reportData.hasChinookCatches) {
    return 0.3  // Neutral - no evidence doesn't mean no fish
  }

  const { daysAgo, hotspotMatch } = reportData

  // Time decay function
  let baseScore: number
  if (daysAgo <= 1) {
    baseScore = 1.0  // Caught today/yesterday
  } else if (daysAgo <= 2) {
    baseScore = 0.85
  } else if (daysAgo <= 4) {
    baseScore = 0.65
  } else if (daysAgo <= 7) {
    baseScore = 0.45
  } else if (daysAgo <= 14) {
    baseScore = 0.3
  } else {
    baseScore = 0.2  // Old reports - minimal value
  }

  // Hotspot match bonus
  if (hotspotMatch) {
    return baseScore  // Full score for exact location
  } else {
    return baseScore * 0.7  // 70% for same general area
  }
}

// ==================== PHASE 5: MERGED FACTORS ====================

/**
 * Calculate tidal current score
 * Focuses on current speed, with tide phase bonus
 */
export function calculateTidalCurrentScore(
  tideData?: CHSWaterData
): { score: number; description: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_tide_data' }
  }

  const currentSpeed = Math.abs(tideData.currentSpeed || 0)
  const isRising = tideData.isRising

  let score: number
  let description: string

  if (currentSpeed >= 0.5 && currentSpeed <= 2.0) {
    // Optimal - moderate moving water
    score = 1.0
    description = 'optimal_current'
  } else if (currentSpeed >= 0.3 && currentSpeed < 0.5) {
    // Light current - still good
    score = 0.75
    description = 'light_current'
  } else if (currentSpeed < 0.3) {
    // Slack tide - can be good for jigging
    score = 0.5
    description = 'slack_tide'
  } else if (currentSpeed > 2.0 && currentSpeed <= 3.5) {
    // Strong current - difficult but can produce
    score = 0.4
    description = 'strong_current'
  } else {
    // Very strong - dangerous and unproductive
    score = 0.1
    description = 'dangerous_current'
  }

  // Incoming tide bonus (many anglers prefer flood tide)
  if (isRising && score > 0.3) {
    score = Math.min(score + 0.1, 1.0)
    description += '_incoming'
  }

  return { score, description }
}

/**
 * Calculate sea state score (merged wind + waves)
 */
export function calculateSeaStateScore(
  windSpeed: number,  // km/h
  windGusts: number,  // km/h
  waveHeight?: number  // meters (actual data if available)
): { score: number; description: string; isSafe: boolean; warning?: string } {
  const windKnots = windSpeed * 0.539957
  const gustKnots = windGusts * 0.539957

  // Estimate wave height if not provided
  const estimatedWaveHeight = waveHeight ?? Math.min((windSpeed / 3.6) * 0.1, 5.0)

  let score: number
  let description: string
  let isSafe = true
  let warning: string | undefined

  // Safety checks first
  if (windKnots > 25 || gustKnots > 35) {
    score = 0.0
    description = 'dangerous_wind'
    isSafe = false
    warning = `Dangerous wind conditions: ${Math.round(windKnots)} knots (gusts ${Math.round(gustKnots)})`
  } else if (estimatedWaveHeight > 2.0) {
    score = 0.0
    description = 'dangerous_waves'
    isSafe = false
    warning = `Dangerous wave height: ${estimatedWaveHeight.toFixed(1)}m`
  }
  // Scoring for safe conditions
  else if (estimatedWaveHeight >= 0.3 && estimatedWaveHeight <= 0.8 && windKnots >= 5 && windKnots <= 15) {
    // "Salmon chop" - ideal conditions
    score = 1.0
    description = 'salmon_chop'
  } else if (estimatedWaveHeight < 0.3 && windKnots < 5) {
    // Calm - fishable but fish may be spooky
    score = 0.7
    description = 'calm_glassy'
  } else if (estimatedWaveHeight <= 1.0 && windKnots <= 18) {
    // Moderate - comfortable fishing
    score = 0.8
    description = 'moderate_chop'
  } else if (estimatedWaveHeight <= 1.5 && windKnots <= 22) {
    // Getting rough but still fishable
    score = 0.5
    description = 'rough'
  } else if (estimatedWaveHeight <= 2.0) {
    // Uncomfortable but technically fishable
    score = 0.25
    description = 'very_rough'
  } else {
    score = 0.3
    description = 'moderate'
  }

  return { score, description, isSafe, warning }
}

/**
 * Calculate water temperature score
 */
export function calculateWaterTempScore(
  waterTemp?: number
): { score: number; description: string } {
  if (waterTemp === undefined) {
    return { score: 0.5, description: 'no_data' }
  }

  // Chinook optimal: 9-13°C
  if (waterTemp >= 9 && waterTemp <= 13) {
    return { score: 1.0, description: 'optimal' }
  } else if (waterTemp >= 7 && waterTemp < 9) {
    return { score: 0.75, description: 'cool' }
  } else if (waterTemp > 13 && waterTemp <= 15) {
    return { score: 0.75, description: 'warm' }
  } else if (waterTemp >= 5 && waterTemp < 7) {
    return { score: 0.5, description: 'cold' }
  } else if (waterTemp > 15 && waterTemp <= 17) {
    return { score: 0.5, description: 'too_warm' }
  } else if (waterTemp < 5) {
    return { score: 0.2, description: 'very_cold' }
  } else {
    return { score: 0.2, description: 'too_hot' }
  }
}

/**
 * Calculate precipitation score
 */
export function calculatePrecipitationScore(
  precipitation: number  // mm
): { score: number; description: string } {
  if (precipitation <= 0.1) {
    return { score: 0.9, description: 'dry' }
  } else if (precipitation <= 2) {
    // Light rain - can be ideal (low light, washes food)
    return { score: 1.0, description: 'light_rain' }
  } else if (precipitation <= 5) {
    return { score: 0.7, description: 'moderate_rain' }
  } else if (precipitation <= 10) {
    return { score: 0.4, description: 'heavy_rain' }
  } else {
    return { score: 0.2, description: 'very_heavy_rain' }
  }
}

// ==================== MAIN ALGORITHM ====================

/**
 * Calculate Chinook Salmon fishing score v2
 *
 * Enhanced with physics-based factors:
 * - Trollability/Blowback for deep trolling control
 * - Predator Suppression (Orca detection)
 * - Depth advice instead of light penalty
 * - Seasonal mode (Feeder vs Spawner) with dynamic weights
 * - Bait presence scoring
 */
export function calculateChinookSalmonScoreV2(
  weather: OpenMeteo15MinData,
  context: AlgorithmContext,
  tideData?: CHSWaterData
): ChinookScoreResult {
  const factors: ChinookScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const strategyAdvice: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp * 1000)
  const month = date.getMonth()

  // ==================== SEASONAL MODE ====================
  const seasonalMode = getChinookSeasonalMode(month)
  const weights = getSeasonalWeights(seasonalMode.mode)

  strategyAdvice.push(`${seasonalMode.mode.toUpperCase()} MODE (${seasonalMode.monthRange}): ${seasonalMode.behavior}`)

  // ==================== DEPTH ADVICE (Light -> Depth) ====================
  const sunElevation = context.sunElevation ?? estimateSunElevation(weather.timestamp, context.sunrise, context.sunset)
  const cloudCover = context.cloudCover ?? 50
  const depthAdvice = getChinookDepthAdvice(sunElevation, cloudCover)

  // Light score - for Chinook, we don't penalize high sun, we just adjust depth
  // Score based on how actionable the conditions are (always fishable with right depth)
  let lightDepthScore = 0.7 // Base - always decent with proper depth
  if (depthAdvice.isDeepBite) {
    // Deep bite is prime time for experienced trollers
    lightDepthScore = 0.85
    strategyAdvice.push(depthAdvice.advice)
  } else if (sunElevation < 25) {
    // Low light golden hours
    lightDepthScore = 1.0
  }

  factors['lightDepth'] = {
    value: sunElevation,
    weight: weights.lightDepth,
    score: lightDepthScore,
    description: depthAdvice.isDeepBite ? 'deep_bite' : `depth_${depthAdvice.recommendedDepth}`
  }

  // ==================== TIDAL CURRENT ====================
  const { score: currentScore, description: currentDesc } = calculateTidalCurrentScore(tideData)
  factors['tidalCurrent'] = {
    value: tideData?.currentSpeed ?? 0,
    weight: weights.tidalCurrent,
    score: currentScore,
    description: currentDesc
  }

  // ==================== TROLLABILITY / BLOWBACK ====================
  const tidalRange = context.tidalRange ?? 3.0 // Default moderate range
  const minutesToSlack = context.minutesToSlack ?? 180 // Default 3 hours
  const trollability = calculateTrollabilityScore(
    tidalRange,
    minutesToSlack,
    tideData?.currentSpeed ? Math.abs(tideData.currentSpeed) : undefined
  )

  factors['trollability'] = {
    value: tidalRange,
    weight: weights.trollability,
    score: trollability.score,
    description: trollability.blowbackLevel
  }

  if (trollability.warning) {
    strategyAdvice.push(trollability.warning)
  }
  if (trollability.recommendation) {
    strategyAdvice.push(trollability.recommendation)
  }

  // ==================== BAIT PRESENCE ====================
  let baitPresence: 'none' | 'low' | 'moderate' | 'high' | 'massive' = 'moderate'
  let baitKeywords: string[] = []

  if (context.fishingReportText) {
    const parsed = parseBaitPresenceFromText(context.fishingReportText)
    baitPresence = parsed.presence
    baitKeywords = parsed.keywords
  }

  const baitResult = calculateBaitPresenceScore(baitPresence, baitKeywords)
  factors['baitPresence'] = {
    value: baitKeywords.length,
    weight: weights.baitPresence,
    score: baitResult.score,
    description: baitPresence
  }

  if (baitResult.recommendation) {
    strategyAdvice.push(baitResult.recommendation)
  }

  // ==================== SOLUNAR ====================
  const { score: solunarScore, periodInfo } = calculateSolunarScore(
    weather.timestamp,
    context.latitude,
    context.longitude
  )
  factors['solunar'] = {
    value: periodInfo.periodType === 'major' ? 2 : periodInfo.periodType === 'minor' ? 1 : 0,
    weight: weights.solunar,
    score: solunarScore,
    description: periodInfo.periodType
  }

  // ==================== PRESSURE TREND ====================
  const { score: pressureScore, trend: pressureTrend } = calculatePressureTrendScore(
    weather.pressure,
    context.pressureHistory
  )
  factors['pressureTrend'] = {
    value: weather.pressure,
    weight: weights.pressureTrend,
    score: pressureScore,
    description: pressureTrend.trend
  }

  // ==================== SEA STATE ====================
  const seaState = calculateSeaStateScore(
    weather.windSpeed,
    weather.windGusts
  )
  factors['seaState'] = {
    value: weather.windSpeed,
    weight: weights.seaState,
    score: seaState.score,
    description: seaState.description
  }

  if (!seaState.isSafe) {
    isSafe = false
    if (seaState.warning) {
      safetyWarnings.push(seaState.warning)
    }
  }

  // ==================== WIND-TIDE INTERACTION ====================
  // Add wind-tide safety check if directions available
  if (context.windDirection !== undefined && context.currentDirection !== undefined) {
    const windTide = calculateWindTideInteraction(
      context.windDirection,
      weather.windSpeed * 0.539957, // Convert km/h to knots
      context.currentDirection,
      tideData?.currentSpeed ? Math.abs(tideData.currentSpeed) : 0
    )

    if (windTide.warning) {
      safetyWarnings.push(windTide.warning)
    }
    if (windTide.severity === 'dangerous') {
      isSafe = false
    }
  }

  // ==================== PRECIPITATION ====================
  const { score: precipScore, description: precipDesc } = calculatePrecipitationScore(
    weather.precipitation
  )
  factors['precipitation'] = {
    value: weather.precipitation,
    weight: weights.precipitation,
    score: precipScore,
    description: precipDesc
  }

  // ==================== WATER TEMPERATURE ====================
  const { score: waterTempScore, description: tempDesc } = calculateWaterTempScore(
    tideData?.waterTemperature
  )
  factors['waterTemp'] = {
    value: tideData?.waterTemperature ?? 0,
    weight: weights.waterTemp,
    score: waterTempScore,
    description: tempDesc
  }

  // ==================== PREDATOR SUPPRESSION (ORCA) ====================
  let predatorPresence: PredatorPresenceResult = { detected: false, keywords: [], suppression: 1.0 }

  if (context.fishingReportText) {
    predatorPresence = detectPredatorPresence(context.fishingReportText)
    if (predatorPresence.warning) {
      safetyWarnings.push(predatorPresence.warning)
      strategyAdvice.push('Consider fishing different area or waiting for orca to move through.')
    }
  }

  // ==================== ADDITIONAL SAFETY CHECKS ====================

  // Lightning check
  if (weather.lightningPotential > 1500) {
    isSafe = false
    safetyWarnings.push(`High lightning risk: ${weather.lightningPotential} J/kg`)
  }

  // Current speed safety
  if (tideData?.currentSpeed && Math.abs(tideData.currentSpeed) > 4.5) {
    isSafe = false
    safetyWarnings.push(`Dangerous current: ${Math.abs(tideData.currentSpeed).toFixed(1)} knots`)
  }

  // Cold water safety
  if (tideData?.waterTemperature && tideData.waterTemperature < 6) {
    safetyWarnings.push(`Cold water warning: ${tideData.waterTemperature}°C - hypothermia risk`)
  }

  // ==================== CALCULATE TOTAL ====================

  let total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // PREDATOR SUPPRESSION: Apply Orca multiplier
  if (predatorPresence.detected) {
    total = total * predatorPresence.suppression
  }

  // BAIT OVERRIDE: Massive bait guarantees minimum score
  if (baitResult.isOverride && total < 6.0) {
    total = Math.max(total, 6.0)
    strategyAdvice.unshift('BAIT OVERRIDE: Massive bait presence guarantees good fishing!')
  }

  // SAFETY CAPPING: If unsafe, cap score at 3.0
  if (!isSafe) {
    total = Math.min(total, 3.0)
  }

  // Clamp to 0-10 range
  total = Math.min(Math.max(total, 0), 10)

  // Determine if in season
  const { score: seasonalityScore } = calculateSeasonalityScore(date, context.locationName)
  const isInSeason = seasonalityScore > 0.3

  return {
    total: Math.round(total * 100) / 100,
    factors,
    isSafe,
    safetyWarnings,
    isInSeason,
    strategyAdvice: strategyAdvice.length > 0 ? strategyAdvice : undefined,
    depthAdvice,
    seasonalMode,
    debug: {
      pressureTrend,
      solunarPeriod: periodInfo,
      lightCondition: depthAdvice.advice,
      trollability,
      predatorPresence
    }
  }
}

/**
 * Estimate sun elevation from timestamp and sunrise/sunset
 * Used when actual sun elevation isn't provided
 */
function estimateSunElevation(timestamp: number, sunrise: number, sunset: number): number {
  const dayLength = sunset - sunrise
  const timeSinceSunrise = timestamp - sunrise

  if (timeSinceSunrise < 0) {
    // Before sunrise
    return Math.max(-10, timeSinceSunrise / 3600 * 10)
  }

  if (timeSinceSunrise > dayLength) {
    // After sunset
    const timeSinceSunset = timestamp - sunset
    return Math.max(-10, -timeSinceSunset / 3600 * 10)
  }

  // During daytime - parabolic curve peaking at solar noon
  const progress = timeSinceSunrise / dayLength
  const angle = Math.sin(progress * Math.PI)

  // Seasonal max elevation for BC (Lat ~49-50°)
  // Winter Solstice: ~17°, Summer Solstice: ~64°
  const date = new Date(timestamp * 1000)
  const month = date.getMonth() // 0-11
  // Cosine curve for seasonal variation
  const seasonalMax = 40 - 23 * Math.cos((month + 1) * Math.PI / 6)

  return angle * seasonalMax
}

// ==================== EXPORTS ====================

export default calculateChinookSalmonScoreV2
