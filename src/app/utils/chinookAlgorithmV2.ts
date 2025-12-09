// Chinook Salmon Algorithm V2
// Salish Hybrid - Seasonal Chinook Predictive Model (SCPM)
//
// Key improvements over V1:
// 1. Layered Architecture: Physics Core (Layer 1) + Modifiers (Layer 2)
// 2. Seasonal Modes: Winter (Structure-oriented) vs Summer (Suspension-oriented)
// 3. Smooth Gradient Scoring: No score cliffs (reverseSigmoid, gaussian, powerDecay)
// 4. Dynamic Weight Distribution: Weights adjust based on season
// 5. Score Range: 0-100 (for granularity, can be divided by 10 for 0-10 compatibility)
// 6. Trollability Warnings: Blowback risk advisories (informational, not score penalty)
//
// Philosophy:
// - Winter Chinook: Structure-oriented bottom feeders (Oct 16 - Apr 14)
// - Summer Chinook: Pelagic suspension feeders (Apr 15 - Oct 15)

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import {
  reverseSigmoid,
  gaussian,
  powerDecay,
  lerp
} from './physicsHelpers'

// ==================== CONFIGURATION CONSTANTS ====================

/**
 * Chinook V2 Configuration Object
 * All tuning parameters exposed for easy adjustment
 */
export const CHINOOK_CONFIG = {
  // GLOBAL CONSTANTS
  TIDE_IDEAL_KTS: 1.2,              // Optimal trolling speed
  TIDE_WIDTH: 0.6,                  // Gaussian width for current speed
  TIDE_LAG_MINUTES: 20,             // Optimal feeding window post-slack
  TIDE_HALF_LIFE: 90,               // Power decay half-life for timing
  PRESSURE_DROP_MAX: -2.0,          // hPa/3hr drop for max score
  PRESSURE_RISE_MAX: 2.0,           // hPa/3hr rise for min score

  // MULTIPLIERS (Layer 2)
  BAIT_MULTIPLIER_MASSIVE: 1.5,    // Massive bait bonus
  BAIT_MULTIPLIER_SOME: 1.2,       // Some bait bonus
  WEEKEND_PENALTY: 0.85,           // Weekend crowd penalty (Sat/Sun 7am-12pm)

  // SAFETY THRESHOLDS
  MAX_SAFE_WIND_SUMMER: 20.0,      // Summer max safe wind (kts)
  MAX_SAFE_WIND_WINTER: 15.0,      // Winter max safe wind (kts) - stricter for cold water
  SAFETY_CAP_SCORE: 30.0,          // Maximum score when unsafe (out of 100)

  // TROLLABILITY WARNING THRESHOLDS
  TROLLABILITY_LARGE_TIDE_M: 3.5,  // Large tidal range threshold
  TROLLABILITY_EXTREME_TIDE_M: 4.5, // Extreme tidal range threshold
  TROLLABILITY_FAR_FROM_SLACK_MIN: 60, // Minutes - far from slack
  TROLLABILITY_VERY_FAR_MIN: 90,   // Minutes - very far from slack

  // SEASONAL PROFILES
  WINTER: {
    START_MONTH: 10,                // October
    START_DAY: 16,                  // Oct 16
    END_MONTH: 4,                   // April
    END_DAY: 14,                    // Apr 14
    WIND_SIGMOID_CENTER: 12.0,      // Wind scoring center (stricter)
    WEIGHTS: {
      tide: 0.45,                   // 45% - Heavy tide emphasis
      light: 0.15,                  // 15% - Light less important
      seaState: 0.15,               // 15% - Safety
      pressure: 0.15,               // 15% - Biological
      solunar: 0.10                 // 10% - Gravitational
    }
  },
  SUMMER: {
    START_MONTH: 4,                 // April
    START_DAY: 15,                  // Apr 15
    END_MONTH: 10,                  // October
    END_DAY: 15,                    // Oct 15
    WIND_SIGMOID_CENTER: 15.0,      // Wind scoring center (standard)
    WEIGHTS: {
      tide: 0.35,                   // 35% - Moderate tide emphasis
      light: 0.25,                  // 25% - Light very important
      seaState: 0.15,               // 15% - Safety
      pressure: 0.15,               // 15% - Biological
      solunar: 0.10                 // 10% - Gravitational
    }
  }
}

// ==================== INTERFACES ====================

export type SeasonMode = 'winter' | 'summer'

export interface SeasonalProfile {
  mode: SeasonMode
  dateRange: string
  behavior: string
  depthStrategy: string
  weights: {
    tide: number
    light: number
    seaState: number
    pressure: number
    solunar: number
  }
}

export interface ChinookScoreResult {
  total: number // 0-100 (divide by 10 for 0-10 compatibility)
  season: SeasonalProfile
  factors: {
    [key: string]: {
      value: number
      weight: number
      score: number // 0-100
      description?: string
    }
  }
  isSafe: boolean
  safetyWarnings: string[]
  strategyAdvice: string[]
  depthAdvice: string
  trollabilityWarnings?: string[]
  modifiers: {
    bait?: { multiplier: number; applied: boolean }
    weekend?: { multiplier: number; applied: boolean }
    orca?: { detected: boolean; alertOnly: boolean }
  }
  debug?: {
    baseScoreBeforeModifiers: number
    finalScoreAfterModifiers: number
    seasonDetection: string
  }
}

export interface AlgorithmContext {
  sunrise: number
  sunset: number
  latitude: number
  longitude: number
  locationName?: string
  pressureHistory?: number[]
  // V2 Context
  cloudCover?: number          // 0-100%
  windDirection?: number       // 0-360 degrees
  currentDirection?: number    // 0-360 degrees (for wind-tide interaction)
  tidalRange?: number          // High-low difference in meters
  minutesToSlack?: number      // Minutes until next slack tide
  fishingReportText?: string   // Raw report text for bio-intel
}

// Legacy exports for backward compatibility
export interface FishingReportData {
  hasChinookCatches: boolean
  daysAgo: number
  hotspotMatch: boolean
  catchCount?: number
}

export interface PressureTrend {
  current: number
  delta3hr: number
  delta6hr?: number
  trend: string
}

// ==================== SEASONAL MODE DETECTION ====================

/**
 * Determine current seasonal mode based on date
 * Winter: Oct 16 - Apr 14 (Structure-oriented bottom feeders)
 * Summer: Apr 15 - Oct 15 (Pelagic suspension feeders)
 */
export function getSeasonalMode(date: Date): SeasonalProfile {
  const month = date.getMonth() + 1 // 1-12
  const day = date.getDate()

  // Convert to day-of-year for easier comparison
  const isWinter = (month === 10 && day >= 16) || // Oct 16-31
                   (month === 11) ||              // All November
                   (month === 12) ||              // All December
                   (month === 1) ||               // All January
                   (month === 2) ||               // All February
                   (month === 3) ||               // All March
                   (month === 4 && day <= 14)     // Apr 1-14

  if (isWinter) {
    return {
      mode: 'winter',
      dateRange: 'Oct 16 - Apr 14',
      behavior: 'Structure-oriented residents hunting Sandlance/Candlefish near bottom',
      depthStrategy: 'STATIC: Fish bottom (within 10ft of substrate)',
      weights: CHINOOK_CONFIG.WINTER.WEIGHTS
    }
  } else {
    return {
      mode: 'summer',
      dateRange: 'Apr 15 - Oct 15',
      behavior: 'Pelagic migrants hunting Herring/Pilchard in suspended bait balls',
      depthStrategy: 'DYNAMIC: Depth varies with light penetration (cloud cover)',
      weights: CHINOOK_CONFIG.SUMMER.WEIGHTS
    }
  }
}

// ==================== LAYER 1: PHYSICS CORE ====================

/**
 * Calculate Tidal Factor (Hybrid: Speed + Timing)
 * Combines current speed (60%) and tidal timing (40%)
 */
function calculateTidalScore(
  currentSpeed: number,      // knots
  minutesToSlack: number,    // minutes
  isRising: boolean
): { score: number; speedScore: number; timingScore: number; description: string } {
  // SPEED (60%): Gaussian curve centered at 1.2 kts
  const speedScore = gaussian(
    Math.abs(currentSpeed),
    CHINOOK_CONFIG.TIDE_IDEAL_KTS,
    CHINOOK_CONFIG.TIDE_WIDTH
  )

  // TIMING (40%): Power decay from 20 min post-slack
  const effectiveMinutes = Math.abs(minutesToSlack - CHINOOK_CONFIG.TIDE_LAG_MINUTES)

  const timingScore = powerDecay(
    effectiveMinutes,
    0,
    CHINOOK_CONFIG.TIDE_HALF_LIFE
  )

  // Combined score (60/40 split)
  const combinedScore = speedScore * 0.6 + timingScore * 0.4

  // Description
  let description = `${Math.abs(currentSpeed).toFixed(1)} kts, `
  description += `${minutesToSlack} min to slack`
  if (isRising) description += ' (flood)'

  return {
    score: combinedScore,
    speedScore,
    timingScore,
    description
  }
}

/**
 * Calculate Light/Depth Factor (Seasonal Strategy Logic)
 * Winter: Static bottom strategy (100 score)
 * Summer: Dynamic cloud-based depth (varies score)
 */
function calculateLightDepthScore(
  season: SeasonMode,
  cloudCover: number, // 0-100%
  sunrise: number,
  sunset: number,
  timestamp: number
): { score: number; advice: string; description: string } {
  if (season === 'winter') {
    // WINTER MODE: Static depth strategy
    return {
      score: 100,
      advice: 'Fish Bottom (within 10ft of substrate)',
      description: 'winter_static'
    }
  } else {
    // SUMMER MODE: Dynamic cloud-based depth
    let score: number
    let targetDepth: string
    let description: string

    // Check if twilight period
    const minutesFromSunrise = (timestamp - sunrise) / 60
    const minutesFromSunset = (timestamp - sunset) / 60
    const isGoldenHour = (minutesFromSunrise >= -30 && minutesFromSunrise <= 60) ||
                         (minutesFromSunset >= -60 && minutesFromSunset <= 30)

    if (isGoldenHour) {
      score = 100
      targetDepth = '30ft'
      description = 'twilight_shallow'
    } else if (cloudCover > 70) {
      score = 100
      targetDepth = '50ft'
      description = 'overcast_mid'
    } else if (cloudCover > 30) {
      score = 90
      targetDepth = '80ft'
      description = 'partly_cloudy_mid_deep'
    } else {
      // Clear/Sunny - Deep bite
      score = 85
      targetDepth = '120ft+'
      description = 'clear_deep'
    }

    return {
      score,
      advice: `Target ${targetDepth} (${description.replace('_', ' ')})`,
      description
    }
  }
}

/**
 * Calculate Sea State Factor (Safety Gatekeeper with Seasonal Wind Limits)
 */
function calculateSeaStateScore(
  windSpeed: number,    // km/h
  season: SeasonMode
): { score: number; isSafe: boolean; warning?: string } {
  const windKnots = windSpeed * 0.539957

  // Seasonal wind center
  const windCenter = season === 'winter'
    ? CHINOOK_CONFIG.WINTER.WIND_SIGMOID_CENTER
    : CHINOOK_CONFIG.SUMMER.WIND_SIGMOID_CENTER

  // Seasonal max safe wind
  const maxSafeWind = season === 'winter'
    ? CHINOOK_CONFIG.MAX_SAFE_WIND_WINTER
    : CHINOOK_CONFIG.MAX_SAFE_WIND_SUMMER

  // Smooth sigmoid scoring
  const score = reverseSigmoid(windKnots, windCenter, 0.4)

  // Safety check
  const isSafe = windKnots <= maxSafeWind
  const warning = !isSafe
    ? `⚠️ UNSAFE: Wind ${windKnots.toFixed(0)} kts exceeds ${season} limit (${maxSafeWind} kts). ${season === 'winter' ? 'Cold water hypothermia risk!' : 'Dangerous sea state.'}`
    : undefined

  return { score, isSafe, warning }
}

/**
 * Calculate Pressure Trend Factor (Linear Interpolation)
 * Exported for use by other species algorithms
 */
export function calculatePressureTrendScore(
  currentPressure: number,
  pressureHistory?: number[]
): { score: number; trend: PressureTrend } {
  if (!pressureHistory || pressureHistory.length < 12) {
    // Fallback to absolute pressure
    const score = lerp(currentPressure, 1000, 1030, 70, 30)
    return {
      score: score / 100, // Return 0-1 for compatibility
      trend: {
        current: currentPressure,
        delta3hr: 0,
        trend: 'no_history'
      }
    }
  }

  // Calculate 3-hour delta
  const len = pressureHistory.length
  const pressure3hrAgo = len >= 12 ? pressureHistory[len - 12] : pressureHistory[0]
  const delta3hr = currentPressure - pressure3hrAgo

  // Calculate 6-hour delta if available
  const delta6hr = len > 0 ? currentPressure - pressureHistory[0] : 0

  // Linear interpolation from -2.0 to +2.0 hPa
  const score = lerp(delta3hr, -2.0, 2.0, 100, 0)

  // Trend description
  let trendStr: string
  if (delta3hr <= -2.0) trendStr = 'rapidly_falling'
  else if (delta3hr <= -1.0) trendStr = 'falling'
  else if (delta3hr <= -0.5) trendStr = 'slightly_falling'
  else if (delta3hr < 0.5) trendStr = 'stable'
  else if (delta3hr < 1.0) trendStr = 'slightly_rising'
  else if (delta3hr < 2.0) trendStr = 'rising'
  else trendStr = 'rapidly_rising'

  return {
    score: score / 100, // Return 0-1 for backward compatibility with other species
    trend: {
      current: currentPressure,
      delta3hr,
      delta6hr,
      trend: trendStr
    }
  }
}

/**
 * Internal wrapper for V2 Chinook (uses 0-100 scale)
 */
function calculatePressureScore(
  currentPressure: number,
  pressureHistory?: number[]
): { score: number; trend: string; delta3hr: number } {
  const result = calculatePressureTrendScore(currentPressure, pressureHistory)
  return {
    score: result.score * 100, // Convert back to 0-100 for V2
    trend: result.trend.trend,
    delta3hr: result.trend.delta3hr
  }
}

/**
 * Calculate Solunar Factor
 */
function calculateSolunarScore(
  timestamp: number,
  _latitude: number, // eslint-disable-line @typescript-eslint/no-unused-vars
  _longitude: number // eslint-disable-line @typescript-eslint/no-unused-vars
): { score: number; periodType: string } {
  // Simplified solunar for V2
  // TODO: Use latitude/longitude for precise moon transit calculations in future
  const date = new Date(timestamp * 1000)
  const hour = date.getHours()

  // Rough major periods
  const isMajorPeriod = (hour >= 5 && hour <= 7) ||
                        (hour >= 17 && hour <= 19) ||
                        (hour >= 11 && hour <= 13) ||
                        (hour >= 23 || hour <= 1)

  if (isMajorPeriod) {
    return { score: 100, periodType: 'major' }
  } else {
    return { score: 60, periodType: 'none' }
  }
}

// ==================== LAYER 2: MODIFIERS ====================

/**
 * Apply Bait Presence Modifier
 */
function applyBaitModifier(
  baseScore: number,
  reportText?: string
): { score: number; multiplier: number; applied: boolean; presence: string } {
  if (!reportText) {
    return { score: baseScore, multiplier: 1.0, applied: false, presence: 'no_data' }
  }

  const text = reportText.toLowerCase()

  // Massive bait
  const massiveKeywords = ['herring balls', 'bait thick', 'anchovy schools', 'limiting on bait', 'wall of bait']
  const hasMassiveBait = massiveKeywords.some(keyword => text.includes(keyword))

  if (hasMassiveBait) {
    const newScore = Math.min(baseScore * CHINOOK_CONFIG.BAIT_MULTIPLIER_MASSIVE, 100)
    return {
      score: newScore,
      multiplier: CHINOOK_CONFIG.BAIT_MULTIPLIER_MASSIVE,
      applied: true,
      presence: 'massive'
    }
  }

  // Some bait
  const someKeywords = ['bait present', 'some bait', 'feed showing', 'birds working']
  const hasSomeBait = someKeywords.some(keyword => text.includes(keyword))

  if (hasSomeBait) {
    const newScore = Math.min(baseScore * CHINOOK_CONFIG.BAIT_MULTIPLIER_SOME, 100)
    return {
      score: newScore,
      multiplier: CHINOOK_CONFIG.BAIT_MULTIPLIER_SOME,
      applied: true,
      presence: 'some'
    }
  }

  return { score: baseScore, multiplier: 1.0, applied: false, presence: 'none' }
}

/**
 * Apply Weekend Crowd Penalty
 */
function applyWeekendPenalty(
  baseScore: number,
  date: Date
): { score: number; multiplier: number; applied: boolean } {
  const dayOfWeek = date.getDay()
  const hour = date.getHours()

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const isPeakHours = hour >= 7 && hour < 12

  if (isWeekend && isPeakHours) {
    return {
      score: baseScore * CHINOOK_CONFIG.WEEKEND_PENALTY,
      multiplier: CHINOOK_CONFIG.WEEKEND_PENALTY,
      applied: true
    }
  }

  return { score: baseScore, multiplier: 1.0, applied: false }
}

/**
 * Detect Orca Presence (Alert Only)
 */
function detectOrcaPresence(reportText?: string): { detected: boolean; alertMessage?: string } {
  if (!reportText) {
    return { detected: false }
  }

  const text = reportText.toLowerCase()
  const orcaKeywords = ['orca', 'orcas', 'killer whale', 'killer whales', 'whales spotted']

  const detected = orcaKeywords.some(keyword => text.includes(keyword))

  if (detected) {
    return {
      detected: true,
      alertMessage: '🐋 ORCA ALERT: Killer whales reported in area. Fish may be spooked or dispersed.'
    }
  }

  return { detected: false }
}

// ==================== TROLLABILITY WARNINGS ====================

/**
 * Calculate Trollability Risk and Generate Warnings
 */
function calculateTrollabilityWarnings(
  tidalRange: number,
  minutesToSlack: number,
  currentSpeed: number
): string[] {
  const warnings: string[] = []
  const config = CHINOOK_CONFIG

  if (tidalRange >= config.TROLLABILITY_EXTREME_TIDE_M) {
    if (minutesToSlack > config.TROLLABILITY_VERY_FAR_MIN) {
      warnings.push(
        `⚠️ EXTREME BLOWBACK RISK: ${tidalRange.toFixed(1)}m tidal range with ${minutesToSlack} min to slack`
      )
      warnings.push(
        `🎣 Gear may not reach target depth. Recommend waiting ${(minutesToSlack - 30).toFixed(0)} min for slack window.`
      )
    } else if (minutesToSlack > config.TROLLABILITY_FAR_FROM_SLACK_MIN) {
      warnings.push(
        `⚠️ HIGH BLOWBACK RISK: ${tidalRange.toFixed(1)}m exchange. Consider waiting ${(minutesToSlack - 20).toFixed(0)} min.`
      )
    }
  } else if (tidalRange >= config.TROLLABILITY_LARGE_TIDE_M) {
    if (minutesToSlack > config.TROLLABILITY_VERY_FAR_MIN) {
      warnings.push(
        `⚠️ MODERATE BLOWBACK: ${tidalRange.toFixed(1)}m range. Fishing possible but challenging.`
      )
      warnings.push(
        `💡 TIP: Use heavier downrigger balls (12-15 lbs) or wait ${(minutesToSlack - 45).toFixed(0)} min for easier fishing.`
      )
    } else if (minutesToSlack > config.TROLLABILITY_FAR_FROM_SLACK_MIN) {
      warnings.push(
        `⚠️ MILD BLOWBACK: ${tidalRange.toFixed(1)}m range. Adjust tackle for current.`
      )
    }
  }

  if (Math.abs(currentSpeed) > 3.0 && tidalRange > config.TROLLABILITY_LARGE_TIDE_M) {
    warnings.push(
      `⚙️ CURRENT: ${Math.abs(currentSpeed).toFixed(1)} kts - Use cable releases at depth to maintain target zone.`
    )
  }

  return warnings
}

// ==================== MAIN ALGORITHM ====================

/**
 * Calculate Chinook Salmon Score V2
 * Salish Hybrid - Seasonal Chinook Predictive Model
 */
export function calculateChinookSalmonScoreV2(
  weather: OpenMeteo15MinData,
  context: AlgorithmContext,
  tideData?: CHSWaterData
): ChinookScoreResult {
  const date = new Date(weather.timestamp * 1000)
  const factors: ChinookScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const strategyAdvice: string[] = []
  let isSafe = true

  // ==================== SEASONAL MODE ====================
  const season = getSeasonalMode(date)
  const weights = season.weights

  strategyAdvice.push(`SEASON: ${season.mode.toUpperCase()} (${season.dateRange})`)
  strategyAdvice.push(`Behavior: ${season.behavior}`)

  // ==================== LAYER 1: PHYSICS CORE ====================

  // TIDE
  const minutesToSlack = context.minutesToSlack ?? 180
  const currentSpeed = tideData?.currentSpeed ?? 0
  const isRising = tideData?.isRising ?? false

  const tidalResult = calculateTidalScore(currentSpeed, minutesToSlack, isRising)
  factors['tide'] = {
    value: Math.abs(currentSpeed),
    weight: weights.tide,
    score: tidalResult.score,
    description: tidalResult.description
  }

  // LIGHT/DEPTH
  const cloudCover = context.cloudCover ?? 50
  const lightResult = calculateLightDepthScore(
    season.mode,
    cloudCover,
    context.sunrise,
    context.sunset,
    weather.timestamp
  )
  factors['lightDepth'] = {
    value: cloudCover,
    weight: weights.light,
    score: lightResult.score,
    description: lightResult.description
  }

  // SEA STATE
  const seaStateResult = calculateSeaStateScore(weather.windSpeed, season.mode)
  factors['seaState'] = {
    value: weather.windSpeed * 0.539957,
    weight: weights.seaState,
    score: seaStateResult.score,
    description: seaStateResult.isSafe ? 'safe' : 'unsafe'
  }

  if (!seaStateResult.isSafe) {
    isSafe = false
    if (seaStateResult.warning) safetyWarnings.push(seaStateResult.warning)
  }

  // PRESSURE
  const pressureResult = calculatePressureScore(weather.pressure, context.pressureHistory)
  factors['pressure'] = {
    value: weather.pressure,
    weight: weights.pressure,
    score: pressureResult.score,
    description: pressureResult.trend
  }

  // SOLUNAR
  const solunarResult = calculateSolunarScore(
    weather.timestamp,
    context.latitude,
    context.longitude
  )
  factors['solunar'] = {
    value: 0,
    weight: weights.solunar,
    score: solunarResult.score,
    description: solunarResult.periodType
  }

  // ==================== BASE SCORE ====================

  let baseScore = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0
  )
  baseScore = Math.max(0, Math.min(100, baseScore))

  // ==================== LAYER 2: MODIFIERS ====================

  let finalScore = baseScore

  // Bait
  const baitResult = applyBaitModifier(finalScore, context.fishingReportText)
  finalScore = baitResult.score
  if (baitResult.applied) {
    strategyAdvice.push(
      `🎣 BAIT BONUS: ${baitResult.presence.toUpperCase()} bait detected (×${baitResult.multiplier})`
    )
  }

  // Weekend
  const weekendResult = applyWeekendPenalty(finalScore, date)
  finalScore = weekendResult.score
  if (weekendResult.applied) {
    strategyAdvice.push(
      `⚠️ WEEKEND CROWDS: Peak hours (7am-12pm) - Fish may be spooked (-15%)`
    )
    strategyAdvice.push(
      `💡 TIP: Fish early (5-7am) to beat the crowd`
    )
  }

  // Orca
  const orcaResult = detectOrcaPresence(context.fishingReportText)
  if (orcaResult.detected && orcaResult.alertMessage) {
    safetyWarnings.push(orcaResult.alertMessage)
    strategyAdvice.push(
      `🌊 Consider fishing different area or waiting for orca to pass through`
    )
  }

  // ==================== SAFETY CAP ====================

  if (!isSafe) {
    finalScore = Math.min(finalScore, CHINOOK_CONFIG.SAFETY_CAP_SCORE)
    safetyWarnings.push(
      `⚠️ Score capped at ${CHINOOK_CONFIG.SAFETY_CAP_SCORE} due to unsafe conditions`
    )
  }

  // ==================== TROLLABILITY WARNINGS ====================

  const tidalRange = context.tidalRange ?? 3.0
  const trollabilityWarnings = calculateTrollabilityWarnings(
    tidalRange,
    minutesToSlack,
    currentSpeed
  )

  // ==================== STRATEGY ADVICE ====================

  strategyAdvice.unshift(`📍 DEPTH: ${lightResult.advice}`)

  if (tidalResult.timingScore < 50) {
    strategyAdvice.push(
      `⏰ TIMING: Optimal bite is ${CHINOOK_CONFIG.TIDE_LAG_MINUTES} min post-slack. Currently ${minutesToSlack} min to slack.`
    )
  }

  finalScore = Math.max(0, Math.min(100, finalScore))

  // ==================== RETURN RESULT ====================

  return {
    total: Math.round(finalScore * 10) / 10,
    season,
    factors,
    isSafe,
    safetyWarnings,
    strategyAdvice,
    depthAdvice: lightResult.advice,
    trollabilityWarnings: trollabilityWarnings.length > 0 ? trollabilityWarnings : undefined,
    modifiers: {
      bait: baitResult.applied ? { multiplier: baitResult.multiplier, applied: true } : undefined,
      weekend: weekendResult.applied ? { multiplier: weekendResult.multiplier, applied: true } : undefined,
      orca: orcaResult.detected ? { detected: true, alertOnly: true } : undefined
    },
    debug: {
      baseScoreBeforeModifiers: Math.round(baseScore * 10) / 10,
      finalScoreAfterModifiers: Math.round(finalScore * 10) / 10,
      seasonDetection: `${season.mode} (${date.getMonth() + 1}/${date.getDate()})`
    }
  }
}

export default calculateChinookSalmonScoreV2
