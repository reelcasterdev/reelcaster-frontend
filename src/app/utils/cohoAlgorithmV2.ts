// Coho Salmon Algorithm V2
// Optimized for aggressive visual feeders in BC coastal waters
//
// Key improvements over V1:
// 1. Dynamic light calculation with cloud cover (critical for visual hunters)
// 2. Smoothed seasonality curve (peak September)
// 3. Barometric pressure trend analysis
// 4. Tide turn bonus (feeding trigger)
// 5. Removed water temp (rarely limiting for coastal Coho)
//
// "Visual Hunter" enhancements:
// 6. Sun elevation penalty (high bright sun drives fish deep)
// 7. Bait presence override (massive bait = minimum 80% score)
// 8. Wind-against-tide sea state calculation
// 9. Freshet/river turbidity scoring for estuary fishing

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import {
  calculatePressureTrendScore,
  PressureTrend,
  AlgorithmContext
} from './chinookAlgorithmV2'
import {
  calculateWindTideInteraction,
  calculateSwellQuality,
  calculateFreshetStatus,
  calculateBaitPresenceScore,
} from './physicsHelpers'
import type { FishingReportIntel } from '../types/algorithmTypes'

// ==================== INTERFACES ====================

export interface CohoScoreResult {
  total: number
  factors: {
    [key: string]: {
      value: number | string
      weight: number
      score: number
      description?: string
    }
  }
  isSafe: boolean
  safetyWarnings: string[]
  recommendations: string[]
  isInSeason: boolean
  algorithmVersion: string
  debug?: {
    pressureTrend?: PressureTrend
    lightCondition?: string
    tideTurnBonus?: boolean
    baitOverride?: boolean
    sunAnglePenalty?: number
  }
}

// ==================== WEIGHT CONFIGURATION ====================

const WEIGHTS = {
  // PRESENCE FACTORS (35%)
  seasonality: 0.15,        // Peak September timing (reduced per Gemini feedback)
  baitPresence: 0.20,       // Bio-intel from reports (increased per Gemini)

  // ACTIVITY FACTORS (35%)
  lightAndStealth: 0.20,    // Light + cloud cover + sun elevation (critical for visual hunters)
  currentFlow: 0.15,        // Active currents for tide lines

  // CONDITIONS FACTORS (30%)
  seaSurfaceState: 0.15,    // Wind-against-tide + swell quality combined
  pressureTrend: 0.10,      // Barometric pressure trend
  riverTurbidity: 0.05,     // Freshet detection (will be applied as multiplier)
}

// ==================== SEASONALITY ====================

/**
 * Calculate seasonality score for Coho Salmon
 * Linear ramp: Aug 1 (0.5) -> Sep 15 peak (1.0) -> Oct 31 (0.5)
 */
export function calculateCohoSeasonalityScore(
  date: Date
): { score: number; description: string } {
  const dayOfYear = getDayOfYear(date)

  // Key dates (approximate day of year)
  const AUG_1 = 213
  const SEP_15 = 258  // Peak
  const OCT_31 = 304

  let score: number
  let description: string

  if (dayOfYear < AUG_1 - 30) {
    // Before July - off season
    score = 0.2
    description = 'off_season'
  } else if (dayOfYear >= AUG_1 - 30 && dayOfYear < AUG_1) {
    // July - early arrivals
    score = 0.5
    description = 'early_arrivals'
  } else if (dayOfYear >= AUG_1 && dayOfYear < SEP_15) {
    // Aug 1 to Sep 15 - ramp up
    const progress = (dayOfYear - AUG_1) / (SEP_15 - AUG_1)
    score = 0.5 + (0.5 * progress)
    description = dayOfYear < 244 ? 'building_run' : 'near_peak'
  } else if (dayOfYear >= SEP_15 && dayOfYear <= SEP_15 + 15) {
    // Sep 15-30 - peak
    score = 1.0
    description = 'peak_run'
  } else if (dayOfYear > SEP_15 + 15 && dayOfYear <= OCT_31) {
    // Oct - declining
    const progress = (dayOfYear - (SEP_15 + 15)) / (OCT_31 - (SEP_15 + 15))
    score = 1.0 - (0.5 * progress)
    description = 'late_run'
  } else if (dayOfYear > OCT_31 && dayOfYear <= OCT_31 + 30) {
    // November - tail end
    score = 0.3
    description = 'tail_end'
  } else {
    // Winter/Spring
    score = 0.1
    description = 'off_season'
  }

  return { score: Math.max(0.1, score), description }
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

// ==================== LIGHT + CLOUD COVER + SUN ELEVATION ====================

/**
 * Calculate combined light, cloud cover, and sun elevation score for Coho
 * Coho are visual hunters - bright midday is heavily penalized
 * Cloud cover can make midday fishable
 * High sun angle (>45°) with clear skies drives fish deep
 */
export function calculateLightCloudScore(
  timestamp: number,
  sunrise: number,
  sunset: number,
  cloudCover?: number,
  sunElevation?: number
): { score: number; condition: string; sunAnglePenalty: number; depthRecommendation?: string } {
  const currentTime = timestamp
  const minutesFromSunrise = (currentTime - sunrise) / 60
  const minutesToSunset = (sunset - currentTime) / 60

  // Effective cloud cover (default to partial)
  const effectiveCloudCover = cloudCover ?? 50
  const effectiveSunAngle = sunElevation ?? 30

  let baseScore: number
  let condition: string
  let sunAnglePenalty = 1.0
  let depthRecommendation: string | undefined

  // Golden hours - always excellent regardless of clouds
  if (minutesFromSunrise >= 0 && minutesFromSunrise <= 90) {
    // Dawn golden hour
    baseScore = 1.0
    condition = 'golden_hour_dawn'
  } else if (minutesToSunset >= 0 && minutesToSunset <= 90) {
    // Dusk golden hour
    baseScore = 1.0
    condition = 'golden_hour_dusk'
  }
  // Civil twilight
  else if (minutesFromSunrise >= -35 && minutesFromSunrise < 0) {
    baseScore = 0.9
    condition = 'civil_twilight_dawn'
  } else if (minutesToSunset >= -35 && minutesToSunset < 0) {
    baseScore = 0.85
    condition = 'civil_twilight_dusk'
  }
  // Mid-morning / Late afternoon
  else if ((minutesFromSunrise > 90 && minutesFromSunrise <= 180) ||
           (minutesToSunset > 90 && minutesToSunset <= 180)) {
    baseScore = 0.6
    condition = 'shoulder_hours'
  }
  // Midday - heavily penalized for Coho
  else if (minutesFromSunrise > 180 && minutesToSunset > 180) {
    // Base midday score is very low for visual hunters
    baseScore = 0.2
    condition = 'midday'

    // Cloud cover can significantly improve midday
    // At 100% cloud cover, add up to 0.5 to the score
    if (effectiveCloudCover > 50) {
      const cloudBonus = 0.5 * ((effectiveCloudCover - 50) / 50)
      baseScore += cloudBonus
      condition = 'midday_overcast'
    }
  }
  // Night
  else {
    baseScore = 0.3
    condition = 'night'
  }

  // Sun Angle Penalty: High bright sun drives fish deep (applies to final score)
  if (effectiveSunAngle > 45 && effectiveCloudCover < 25) {
    sunAnglePenalty = 0.7
    condition += '_high_sun_penalty'
    depthRecommendation = 'High bright sun. Fish are deep. Use downriggers >60ft or wait for evening.'
  } else if (effectiveSunAngle > 45 && effectiveCloudCover < 50) {
    sunAnglePenalty = 0.85
    depthRecommendation = 'Sun angle high but partial clouds. Fish 40-80ft.'
  } else if (effectiveSunAngle > 30 && effectiveCloudCover < 30) {
    depthRecommendation = 'Moderate sun penetration. Fish 30-60ft.'
  }

  return { score: Math.min(baseScore, 1.0), condition, sunAnglePenalty, depthRecommendation }
}

// ==================== CURRENT FLOW WITH TIDE TURN ====================

/**
 * Calculate current flow score for Coho
 * Active currents (1.5-3 knots) create tide lines - prime for Coho
 * Includes tide turn bonus
 */
export function calculateCurrentFlowScore(
  tideData?: CHSWaterData,
  timeToNextSlack?: number // minutes to next slack tide
): { score: number; description: string; tideTurnBonus: boolean } {
  if (!tideData) {
    return { score: 0.5, description: 'no_tide_data', tideTurnBonus: false }
  }

  const currentSpeed = Math.abs(tideData.currentSpeed || 0)
  let tideTurnBonus = false

  // Check for tide turn window (+/- 45 minutes of high/low)
  if (timeToNextSlack !== undefined && timeToNextSlack <= 45) {
    tideTurnBonus = true
  }

  let score: number
  let description: string

  if (currentSpeed >= 1.5 && currentSpeed <= 3.0) {
    // Optimal - visible tide lines, concentrates bait
    score = 1.0
    description = 'optimal_tide_lines'
  } else if (currentSpeed >= 1.0 && currentSpeed < 1.5) {
    score = 0.8
    description = 'good_flow'
  } else if (currentSpeed > 3.0 && currentSpeed <= 4.0) {
    score = 0.5
    description = 'strong_but_fishable'
  } else if (currentSpeed >= 0.5 && currentSpeed < 1.0) {
    score = 0.6
    description = 'moderate_flow'
  } else if (currentSpeed < 0.5) {
    // Slack tide - normally penalized but bonus if near tide turn
    score = tideTurnBonus ? 0.8 : 0.3
    description = tideTurnBonus ? 'tide_turn_window' : 'dead_slack'
  } else {
    // > 4 knots
    score = 0.2
    description = 'too_strong'
  }

  // Apply tide turn bonus to non-slack scenarios too
  if (tideTurnBonus && score < 0.8) {
    score = Math.min(score + 0.15, 1.0)
    description += '_tide_turn'
  }

  return { score, description, tideTurnBonus }
}

// ==================== SEA SURFACE STATE (Wind-Tide + Swell) ====================

/**
 * Calculate combined sea surface state score for Coho
 * Integrates wind-against-tide interaction and swell quality
 */
export function calculateSeaSurfaceStateScore(
  windSpeed: number, // knots
  windDirection: number,
  currentSpeed: number,
  currentDirection: number,
  swellHeight: number,
  swellPeriod: number
): { score: number; description: string; isSafe: boolean; warnings: string[] } {
  const warnings: string[] = []

  // Calculate Wind-Tide interaction
  const windTide = calculateWindTideInteraction(
    windDirection,
    windSpeed,
    currentDirection,
    currentSpeed
  )

  // Calculate Swell Quality
  const swell = calculateSwellQuality(swellHeight, swellPeriod)

  // Add warnings
  if (windTide.warning) warnings.push(windTide.warning)
  if (swell.warning) warnings.push(swell.warning)

  // Combine scores (wind-tide slightly more important for small craft)
  const combinedScore = windTide.score * 0.6 + swell.score * 0.4

  // Determine safety
  const isSafe = windTide.severity !== 'dangerous' && swell.comfort !== 'dangerous'

  // Build description
  let description = `${windTide.severity}_${swell.comfort}`
  if (windTide.isOpposing) {
    description = 'wind_against_tide_' + description
  }

  return {
    score: Math.max(0, Math.min(1, combinedScore)),
    description,
    isSafe,
    warnings,
  }
}

// ==================== RIVER TURBIDITY (Freshet) ====================

/**
 * Calculate river turbidity score using freshet logic
 * Critical for estuary fishing near river mouths
 */
export function calculateRiverTurbidityScore(
  precipitation24h: number,
  maxTemp24h: number,
  month: number
): { score: number; description: string; isBlownOut: boolean; warning?: string } {
  const freshet = calculateFreshetStatus(precipitation24h, maxTemp24h, month)

  return {
    score: freshet.turbidityScore,
    description: freshet.severity,
    isBlownOut: freshet.isBlownOut,
    warning: freshet.warning,
  }
}

// ==================== MAIN ALGORITHM ====================

export interface CohoAlgorithmContext extends Omit<AlgorithmContext, 'fishingReports'> {
  cloudCover?: number
  timeToNextSlack?: number

  // Visual Hunter enhancements
  sunElevation?: number        // Degrees (0-90)
  windDirection?: number       // Degrees (0-360)
  currentDirection?: number    // Degrees (0-360)
  swellHeight?: number         // Meters
  swellPeriod?: number         // Seconds
  precipitation24h?: number    // mm total in last 24h
  maxTemp24h?: number          // Celsius

  // Bio-intel (extended type with bait presence)
  fishingReports?: FishingReportIntel
}

/**
 * Calculate Coho Salmon fishing score v2
 *
 * Visual Hunter enhancements:
 * - Sun elevation penalty for high bright conditions
 * - Bait presence override for massive bait balls
 * - Wind-against-tide sea state calculation
 * - Freshet/river turbidity scoring
 */
export function calculateCohoSalmonScoreV2(
  weather: OpenMeteo15MinData,
  context: CohoAlgorithmContext,
  tideData?: CHSWaterData
): CohoScoreResult {
  const factors: CohoScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const recommendations: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp * 1000)
  const month = date.getMonth()

  // ==================== PRESENCE FACTORS (35%) ====================

  // 1. Seasonality (20%)
  const { score: seasonalityScore, description: seasonDesc } = calculateCohoSeasonalityScore(date)
  factors['seasonality'] = {
    value: date.getMonth() + 1,
    weight: WEIGHTS.seasonality,
    score: seasonalityScore,
    description: seasonDesc
  }

  // 2. Bait Presence (15%) - NEW
  const baitPresence = context.fishingReports?.baitPresence || 'none'
  const baitKeywords = context.fishingReports?.keywordsFound || []
  const bait = calculateBaitPresenceScore(baitPresence, baitKeywords)
  factors['baitPresence'] = {
    value: baitPresence,
    weight: WEIGHTS.baitPresence,
    score: bait.score,
    description: bait.presence
  }
  if (bait.recommendation) recommendations.push(bait.recommendation)

  // ==================== ACTIVITY FACTORS (35%) ====================

  // 3. Light & Stealth (20%) - Enhanced with Sun Elevation
  const { score: lightScore, condition: lightCondition, sunAnglePenalty, depthRecommendation } = calculateLightCloudScore(
    weather.timestamp,
    context.sunrise,
    context.sunset,
    context.cloudCover ?? weather.cloudCover,
    context.sunElevation
  )
  factors['lightAndStealth'] = {
    value: context.sunElevation ?? (date.getHours() + date.getMinutes() / 60),
    weight: WEIGHTS.lightAndStealth,
    score: lightScore,
    description: lightCondition
  }
  if (depthRecommendation) recommendations.push(depthRecommendation)

  // 4. Current Flow (15%)
  const { score: currentScore, description: currentDesc, tideTurnBonus } = calculateCurrentFlowScore(
    tideData,
    context.timeToNextSlack
  )
  factors['currentFlow'] = {
    value: tideData?.currentSpeed ?? 0,
    weight: WEIGHTS.currentFlow,
    score: currentScore,
    description: currentDesc
  }

  // ==================== CONDITIONS FACTORS (30%) ====================

  // 5. Sea Surface State (15%) - NEW: Wind-Tide + Swell combined
  const windSpeedKnots = (weather.windSpeed || 0) * 0.539957
  const seaState = calculateSeaSurfaceStateScore(
    windSpeedKnots,
    context.windDirection ?? 0,
    tideData?.currentSpeed ?? 0,
    context.currentDirection ?? 180, // Default opposite to wind
    context.swellHeight ?? 0.5,
    context.swellPeriod ?? 8
  )
  factors['seaSurfaceState'] = {
    value: `${windSpeedKnots.toFixed(1)}kt/${context.swellHeight?.toFixed(1) ?? '?'}m`,
    weight: WEIGHTS.seaSurfaceState,
    score: seaState.score,
    description: seaState.description
  }
  if (!seaState.isSafe) {
    isSafe = false
  }
  safetyWarnings.push(...seaState.warnings)

  // 6. Pressure Trend (10%)
  const { score: pressureScore, trend: pressureTrend } = calculatePressureTrendScore(
    weather.pressure,
    context.pressureHistory
  )
  factors['pressureTrend'] = {
    value: weather.pressure,
    weight: WEIGHTS.pressureTrend,
    score: pressureScore,
    description: pressureTrend.trend
  }

  // 7. River Turbidity (5%) - NEW: Freshet detection
  const turbidity = calculateRiverTurbidityScore(
    context.precipitation24h ?? weather.precipitation ?? 0,
    context.maxTemp24h ?? weather.temp ?? 15,
    month
  )
  factors['riverTurbidity'] = {
    value: turbidity.description,
    weight: WEIGHTS.riverTurbidity,
    score: turbidity.score,
    description: turbidity.description
  }
  if (turbidity.warning) {
    recommendations.push(turbidity.warning)
  }
  if (turbidity.isBlownOut) {
    recommendations.push('Consider offshore instead of estuary fishing.')
  }

  // ==================== ADDITIONAL SAFETY CHECKS ====================

  // Current speed safety
  if (tideData?.currentSpeed && Math.abs(tideData.currentSpeed) > 4.5) {
    isSafe = false
    safetyWarnings.push(`Dangerous current: ${Math.abs(tideData.currentSpeed).toFixed(1)} knots`)
  }

  // ==================== CALCULATE TOTAL ====================

  let total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // ==================== VISUAL HUNTER MODIFIERS ====================

  // 1. Sun Angle Penalty
  let baitOverride = false
  if (sunAnglePenalty < 1.0) {
    total = total * sunAnglePenalty
  }

  // 2. Glass Calm Penalty (Coho are line-shy in dead calm)
  // windSpeedKnots already defined earlier (line 450)
  const cloudCover = context.cloudCover ?? 50
  if (windSpeedKnots < 4 && cloudCover < 50) {
    total = total * 0.85
    recommendations.push('⚠️ GLASS CALM: Fish are line-shy. Lengthen leaders and drop gear deeper')
  }

  // 3. Freshet Multiplier (Turbid water shuts down visual feeding)
  if (turbidity.isBlownOut) {
    total = total * 0.4
    recommendations.unshift('🚨 RIVER BLOWN OUT: Turbidity shuts down visual feeding')
  }

  // 4. Bait Override: Massive bait guarantees minimum 80% score
  if (bait.isOverride && total < 8.0) {
    total = Math.max(total, 8.0)
    baitOverride = true
    recommendations.unshift('BAIT OVERRIDE: Massive bait presence. Predators stacked regardless of other conditions.')
  }

  // Safety capping
  if (!isSafe) {
    total = Math.min(total, 3.0)
    recommendations.unshift('CONDITIONS UNSAFE: Score capped due to dangerous sea state.')
  }

  // Clamp to 0-10 range
  total = Math.min(Math.max(total, 0), 10)

  // Determine if in season
  const isInSeason = seasonalityScore > 0.3

  return {
    total: Math.round(total * 100) / 100,
    factors,
    isSafe,
    safetyWarnings,
    recommendations,
    isInSeason,
    algorithmVersion: 'coho-v2.0',
    debug: {
      pressureTrend,
      lightCondition,
      tideTurnBonus,
      baitOverride,
      sunAnglePenalty
    }
  }
}

export default calculateCohoSalmonScoreV2
