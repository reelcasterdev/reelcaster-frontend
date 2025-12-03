// Halibut Algorithm V2
// Optimized for Pacific Halibut fishing in BC waters
//
// Key improvements over V1:
// 1. Tidal Slope calculation (time proximity to slack)
// 2. Remove redundant moon phase (captured by tidal range)
// 3. Add barometric pressure trend
// 4. Light factor rewards low-light + slack intersection
// 5. Use tide height changes for current slope
//
// "Bottom & Comfort" enhancements:
// 6. Swell Period GATEKEEPER (short period + >1.5m = unfishable)
// 7. Wind-Tide safety with anchor safety cap
// 8. Bait/scent factor for anchor placement

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import {
  PressureTrend,
  AlgorithmContext
} from './chinookAlgorithmV2'
import {
  calculateWindTideInteraction,
  calculateSwellQuality,
  calculateBaitPresenceScore,
} from './physicsHelpers'
import type { FishingReportIntel } from '../types/algorithmTypes'

// ==================== INTERFACES ====================

export interface HalibutScoreResult {
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
  gatekeeper?: {
    triggered: boolean
    reason?: string
  }
  debug?: {
    pressureTrend?: PressureTrend
    lightCondition?: string
    slackProximity?: string
    anchorSafetyCap?: boolean
  }
}

// ==================== WEIGHT CONFIGURATION ====================

const WEIGHTS = {
  // TIDAL FACTORS (40%)
  tidalSlope: 0.30,         // Proximity to slack tide (still king)
  tidalRange: 0.10,         // Large exchange (reduced - captured by slope)

  // SEA STATE FACTORS (30%)
  swellQuality: 0.15,       // NEW: Replaces wave height - period-based comfort
  windTideSafety: 0.15,     // NEW: Wind-tide interaction for anchor safety

  // TIMING FACTORS (20%)
  seasonality: 0.10,        // March-November, peak May-September
  lightTideInteraction: 0.10, // Low-light + slack intersection

  // BIO FACTORS (10%)
  baitScent: 0.10,          // NEW: Bait presence for anchor placement
}

// ==================== TIDAL SLOPE ====================

/**
 * Calculate tidal slope score (proximity to slack tide)
 * Halibut bite best 30 min before to 30 min after slack
 * Uses time to slack if available, otherwise estimates from current speed
 */
export function calculateTidalSlopeScore(
  tideData?: CHSWaterData,
  timeToNextSlack?: number // minutes
): { score: number; description: string; proximity: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_tide_data', proximity: 'unknown' }
  }

  const currentSpeed = Math.abs(tideData.currentSpeed || 0)

  // If we have explicit time to slack
  if (timeToNextSlack !== undefined) {
    if (timeToNextSlack <= 30) {
      return { score: 1.0, description: 'slack_window', proximity: 'at_slack' }
    } else if (timeToNextSlack <= 60) {
      return { score: 0.9, description: 'approaching_slack', proximity: 'near_slack' }
    } else if (timeToNextSlack <= 90) {
      return { score: 0.7, description: 'pre_slack_window', proximity: 'moderate' }
    } else if (timeToNextSlack <= 120) {
      return { score: 0.5, description: 'building_flow', proximity: 'early' }
    } else {
      return { score: 0.3, description: 'mid_tide', proximity: 'far_from_slack' }
    }
  }

  // Fallback: estimate from current speed
  // <0.3 knots = slack, 0.3-0.8 = approaching, 0.8-1.5 = moderate, >1.5 = strong
  if (currentSpeed <= 0.3) {
    return { score: 1.0, description: 'slack_tide', proximity: 'at_slack' }
  } else if (currentSpeed <= 0.8) {
    return { score: 0.85, description: 'near_slack', proximity: 'near_slack' }
  } else if (currentSpeed <= 1.5) {
    return { score: 0.5, description: 'moderate_flow', proximity: 'moderate' }
  } else if (currentSpeed <= 2.5) {
    return { score: 0.3, description: 'strong_flow', proximity: 'strong' }
  } else {
    return { score: 0.1, description: 'very_strong_flow', proximity: 'extreme' }
  }
}

// ==================== TIDAL RANGE ====================

/**
 * Calculate tidal range score for Halibut
 * Larger exchanges move more fish to feeding areas
 * But extreme exchanges shorten the slack window
 */
export function calculateTidalRangeScore(
  tideData?: CHSWaterData
): { score: number; description: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_data' }
  }

  const tidalRange = Math.abs(tideData.tidalRange || 0)

  if (tidalRange >= 2.5 && tidalRange <= 4.0) {
    return { score: 1.0, description: 'optimal_exchange' }
  } else if (tidalRange >= 2.0 && tidalRange < 2.5) {
    return { score: 0.9, description: 'strong_exchange' }
  } else if (tidalRange > 4.0 && tidalRange <= 5.0) {
    return { score: 0.8, description: 'large_exchange' }
  } else if (tidalRange >= 1.5 && tidalRange < 2.0) {
    return { score: 0.7, description: 'moderate_exchange' }
  } else if (tidalRange > 5.0) {
    return { score: 0.5, description: 'extreme_exchange_short_slack' }
  } else {
    return { score: 0.4, description: 'minimal_exchange' }
  }
}

// ==================== SEASONALITY ====================

/**
 * Calculate seasonality score for Halibut
 * Open season typically March 1 - November 30
 * Peak: May-September when fish are shallower
 */
export function calculateHalibutSeasonalityScore(
  date: Date
): { score: number; description: string } {
  const month = date.getMonth() + 1

  if (month >= 5 && month <= 9) {
    return { score: 1.0, description: 'peak_season' }
  } else if (month === 4 || month === 10) {
    return { score: 0.8, description: 'shoulder_season' }
  } else if (month === 3 || month === 11) {
    return { score: 0.6, description: 'early_late_season' }
  } else if (month === 12 || month <= 2) {
    return { score: 0.1, description: 'closed_season' }
  }

  return { score: 0.5, description: 'unknown' }
}

// ==================== LIGHT + TIDE INTERACTION ====================

/**
 * Calculate light and tide interaction score
 * Bonus when low-light conditions coincide with slack tide
 * Halibut are ambush predators - best in low light near slack
 */
export function calculateLightTideInteractionScore(
  timestamp: number,
  sunrise: number,
  sunset: number,
  tideData?: CHSWaterData,
  timeToNextSlack?: number
): { score: number; condition: string } {
  const currentTime = timestamp
  const minutesFromSunrise = (currentTime - sunrise) / 60
  const minutesToSunset = (sunset - currentTime) / 60

  // Determine light level (0-1, where 1 = low light)
  let lightFactor: number
  let lightCondition: string

  if ((minutesFromSunrise >= 0 && minutesFromSunrise <= 90) ||
      (minutesToSunset >= 0 && minutesToSunset <= 90)) {
    lightFactor = 1.0
    lightCondition = 'golden_hour'
  } else if ((minutesFromSunrise >= -30 && minutesFromSunrise < 0) ||
             (minutesToSunset >= -30 && minutesToSunset < 0)) {
    lightFactor = 0.9
    lightCondition = 'twilight'
  } else if ((minutesFromSunrise > 90 && minutesFromSunrise <= 150) ||
             (minutesToSunset > 90 && minutesToSunset <= 150)) {
    lightFactor = 0.6
    lightCondition = 'shoulder_hours'
  } else if (minutesFromSunrise > 150 && minutesToSunset > 150) {
    lightFactor = 0.3
    lightCondition = 'midday'
  } else {
    lightFactor = 0.4
    lightCondition = 'night'
  }

  // Determine tide factor (proximity to slack)
  let tideFactor: number
  const currentSpeed = Math.abs(tideData?.currentSpeed || 0)

  if (timeToNextSlack !== undefined) {
    tideFactor = timeToNextSlack <= 45 ? 1.0 : timeToNextSlack <= 90 ? 0.7 : 0.4
  } else {
    tideFactor = currentSpeed <= 0.5 ? 1.0 : currentSpeed <= 1.0 ? 0.7 : 0.4
  }

  // Interaction: bonus when both factors are high
  const baseScore = (lightFactor + tideFactor) / 2
  const interactionBonus = (lightFactor >= 0.7 && tideFactor >= 0.7) ? 0.2 : 0

  return {
    score: Math.min(baseScore + interactionBonus, 1.0),
    condition: `${lightCondition}_${tideFactor >= 0.7 ? 'near_slack' : 'moving_tide'}`
  }
}

// ==================== SWELL QUALITY (with GATEKEEPER) ====================

/**
 * Calculate swell quality score for Halibut
 * GATEKEEPER: Short period (<6s) with height >1.5m = unfishable (score 0)
 * Uses period-to-height ratio for comfort assessment
 */
export function calculateHalibutSwellQualityScore(
  swellHeight: number,
  swellPeriod: number
): { score: number; description: string; isSafe: boolean; isGatekeeperTriggered: boolean; warning?: string } {
  // GATEKEEPER: Short period chop is unfishable for halibut
  if (swellPeriod < 6 && swellHeight > 1.5) {
    return {
      score: 0.0,
      description: 'gatekeeper_triggered',
      isSafe: false,
      isGatekeeperTriggered: true,
      warning: 'UNFISHABLE: Short period chop (${swellPeriod}s/${swellHeight.toFixed(1)}m). Cannot hold bottom or anchor safely.'
    }
  }

  // Use physics helper for detailed assessment
  const swell = calculateSwellQuality(swellHeight, swellPeriod)

  return {
    score: swell.score,
    description: swell.comfort,
    isSafe: swell.comfort !== 'dangerous',
    isGatekeeperTriggered: false,
    warning: swell.warning
  }
}

// ==================== WIND-TIDE SAFETY (with ANCHOR CAP) ====================

/**
 * Calculate wind-tide safety score for Halibut
 * ANCHOR SAFETY CAP: Opposing wind >15kt = max 40% score
 * Critical for holding position while bottom fishing
 */
export function calculateHalibutWindTideSafetyScore(
  windSpeed: number, // knots
  windDirection: number,
  currentSpeed: number,
  currentDirection: number
): { score: number; description: string; isSafe: boolean; isAnchorCapped: boolean; warning?: string } {
  const windTide = calculateWindTideInteraction(
    windDirection,
    windSpeed,
    currentDirection,
    currentSpeed
  )

  let score = windTide.score
  let isAnchorCapped = false
  let warning = windTide.warning

  // ANCHOR SAFETY CAP: Opposing wind >15kt makes anchoring very difficult
  if (windTide.isOpposing && windSpeed > 15) {
    score = Math.min(score, 0.4)
    isAnchorCapped = true
    warning = `ANCHOR CAP: Wind opposing tide at ${Math.round(windSpeed)}kt. Anchoring difficult. Consider drift fishing.`
  }

  // Additional high wind check
  if (windSpeed > 25) {
    score = 0.0
    warning = `DANGEROUS: Wind ${Math.round(windSpeed)}kt too strong for safe halibut fishing.`
  }

  return {
    score,
    description: windTide.severity + (windTide.isOpposing ? '_opposing' : '_aligned'),
    isSafe: windTide.severity !== 'dangerous' && windSpeed <= 25,
    isAnchorCapped,
    warning
  }
}

// ==================== BAIT/SCENT FACTOR ====================

/**
 * Calculate bait/scent factor for Halibut anchor placement
 * Halibut rely heavily on scent - bait presence indicates good anchor spots
 */
export function calculateHalibutBaitScentScore(
  baitPresence: 'none' | 'low' | 'moderate' | 'high' | 'massive',
  keywords: string[] = []
): { score: number; description: string; recommendation?: string } {
  const bait = calculateBaitPresenceScore(baitPresence, keywords)

  // Halibut-specific recommendations
  let recommendation = bait.recommendation
  if (baitPresence === 'massive' || baitPresence === 'high') {
    recommendation = 'Strong bait scent. Anchor here - halibut will be staged below bait schools.'
  } else if (baitPresence === 'none') {
    recommendation = 'No bait reported. Use fresh cut bait and scent trail to attract fish.'
  }

  return {
    score: bait.score,
    description: bait.presence,
    recommendation
  }
}

// ==================== MAIN ALGORITHM ====================

export interface HalibutAlgorithmContext extends Omit<AlgorithmContext, 'fishingReports'> {
  timeToNextSlack?: number

  // Bottom & Comfort enhancements
  windDirection?: number       // Degrees (0-360)
  currentDirection?: number    // Degrees (0-360)
  swellHeight?: number         // Meters
  swellPeriod?: number         // Seconds

  // Bio-intel (extended type with bait presence)
  fishingReports?: FishingReportIntel
}

/**
 * Calculate Halibut fishing score v2
 *
 * Bottom & Comfort enhancements:
 * - Swell Period GATEKEEPER (short period + >1.5m = unfishable)
 * - Wind-Tide safety with anchor safety cap
 * - Bait/scent factor for anchor placement
 */
export function calculateHalibutScoreV2(
  weather: OpenMeteo15MinData,
  context: HalibutAlgorithmContext,
  tideData?: CHSWaterData
): HalibutScoreResult {
  const factors: HalibutScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const recommendations: string[] = []
  let isSafe = true
  let gatekeeperTriggered = false
  let gatekeeperReason: string | undefined

  const date = new Date(weather.timestamp * 1000)
  const windSpeedKnots = (weather.windSpeed || 0) * 0.539957

  // ==================== GATEKEEPER CHECK ====================

  // Check swell quality FIRST - can trigger gatekeeper
  const swellResult = calculateHalibutSwellQualityScore(
    context.swellHeight ?? 0.5,
    context.swellPeriod ?? 8
  )

  if (swellResult.isGatekeeperTriggered) {
    gatekeeperTriggered = true
    gatekeeperReason = swellResult.warning
    isSafe = false
    safetyWarnings.push(swellResult.warning || 'Unfishable conditions')
  }

  // ==================== TIDAL FACTORS (40%) ====================

  // 1. Tidal Slope (30%)
  const { score: slopeScore, description: slopeDesc, proximity } = calculateTidalSlopeScore(
    tideData,
    context.timeToNextSlack
  )
  factors['tidalSlope'] = {
    value: context.timeToNextSlack ?? (tideData?.currentSpeed ?? 0),
    weight: WEIGHTS.tidalSlope,
    score: slopeScore,
    description: slopeDesc
  }

  // 2. Tidal Range (10%)
  const { score: rangeScore, description: rangeDesc } = calculateTidalRangeScore(tideData)
  factors['tidalRange'] = {
    value: tideData?.tidalRange ?? 0,
    weight: WEIGHTS.tidalRange,
    score: rangeScore,
    description: rangeDesc
  }

  // ==================== SEA STATE FACTORS (30%) ====================

  // 3. Swell Quality (15%) - Already calculated above
  factors['swellQuality'] = {
    value: `${context.swellHeight?.toFixed(1) ?? '?'}m/${context.swellPeriod ?? '?'}s`,
    weight: WEIGHTS.swellQuality,
    score: swellResult.score,
    description: swellResult.description
  }
  if (swellResult.warning && !gatekeeperTriggered) {
    safetyWarnings.push(swellResult.warning)
  }
  if (!swellResult.isSafe) {
    isSafe = false
  }

  // 4. Wind-Tide Safety (15%)
  const windTideResult = calculateHalibutWindTideSafetyScore(
    windSpeedKnots,
    context.windDirection ?? 0,
    tideData?.currentSpeed ?? 0,
    context.currentDirection ?? 180
  )
  factors['windTideSafety'] = {
    value: `${windSpeedKnots.toFixed(1)}kt`,
    weight: WEIGHTS.windTideSafety,
    score: windTideResult.score,
    description: windTideResult.description
  }
  if (windTideResult.warning) {
    safetyWarnings.push(windTideResult.warning)
  }
  if (!windTideResult.isSafe) {
    isSafe = false
  }

  // ==================== TIMING FACTORS (20%) ====================

  // 5. Seasonality (10%)
  const { score: seasonScore, description: seasonDesc } = calculateHalibutSeasonalityScore(date)
  factors['seasonality'] = {
    value: date.getMonth() + 1,
    weight: WEIGHTS.seasonality,
    score: seasonScore,
    description: seasonDesc
  }

  // 6. Light + Tide Interaction (10%)
  const { score: interactionScore, condition: lightCondition } = calculateLightTideInteractionScore(
    weather.timestamp,
    context.sunrise,
    context.sunset,
    tideData,
    context.timeToNextSlack
  )
  factors['lightTideInteraction'] = {
    value: date.getHours() + date.getMinutes() / 60,
    weight: WEIGHTS.lightTideInteraction,
    score: interactionScore,
    description: lightCondition
  }

  // ==================== BIO FACTORS (10%) ====================

  // 7. Bait/Scent (10%)
  const baitPresence = context.fishingReports?.baitPresence || 'none'
  const baitKeywords = context.fishingReports?.keywordsFound || []
  const baitResult = calculateHalibutBaitScentScore(baitPresence, baitKeywords)
  factors['baitScent'] = {
    value: baitPresence,
    weight: WEIGHTS.baitScent,
    score: baitResult.score,
    description: baitResult.description
  }
  if (baitResult.recommendation) {
    recommendations.push(baitResult.recommendation)
  }

  // ==================== ADDITIONAL SAFETY CHECKS ====================

  // Strong current safety for anchoring/drifting
  if (tideData?.currentSpeed && Math.abs(tideData.currentSpeed) > 3.5) {
    isSafe = false
    safetyWarnings.push(`Dangerous current: ${Math.abs(tideData.currentSpeed).toFixed(1)} knots`)
  }

  // ==================== CALCULATE TOTAL ====================

  let total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // GATEKEEPER: If triggered, score is 0
  if (gatekeeperTriggered) {
    total = 0
    recommendations.unshift('GATEKEEPER TRIGGERED: Conditions unfishable. Wait for better swell period.')
  }

  // Safety capping (if not already gated)
  if (!gatekeeperTriggered && !isSafe) {
    total = Math.min(total, 3.0)
    recommendations.unshift('CONDITIONS UNSAFE: Score capped due to dangerous conditions.')
  }

  // Closed season check
  const month = date.getMonth() + 1
  if (month === 12 || month <= 2) {
    total = Math.min(total, 1.0)
    safetyWarnings.push('Halibut season typically closed December-February')
  }

  // Clamp to 0-10 range
  total = Math.min(Math.max(total, 0), 10)

  // Determine if in season
  const isInSeason = seasonScore > 0.3

  return {
    total: Math.round(total * 100) / 100,
    factors,
    isSafe,
    safetyWarnings,
    recommendations,
    isInSeason,
    algorithmVersion: 'halibut-v2.0',
    gatekeeper: gatekeeperTriggered ? {
      triggered: true,
      reason: gatekeeperReason
    } : undefined,
    debug: {
      pressureTrend: undefined, // Removed from this version
      lightCondition,
      slackProximity: proximity,
      anchorSafetyCap: windTideResult.isAnchorCapped
    }
  }
}

export default calculateHalibutScoreV2
