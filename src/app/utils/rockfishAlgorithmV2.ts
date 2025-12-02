// Rockfish Algorithm V2
// Optimized for structure-dwelling bottom fish in BC waters
//
// V2 Bio-Mechanics Philosophy:
// - Rockfish require precise boat positioning over structure (spot lock)
// - Resultant Drift combines wind + current vectors - if you can't stop, you can't fish
// - Swell Heave affects vertical jig control - need stable platform
// - Barometric sensitivity - swim bladders stressed by rapid pressure changes
// - Overcast conditions trigger suspended feeding behavior
// - Seasonality handled by regulatory gatekeeper (closed = 0)
//
// Key V2 Features:
// 1. Resultant Drift (Spot Lock) - Vector combination of wind + current
// 2. Swell Heave - Vertical stability for jigging
// 3. Barometric Stability - Swim bladder sensitivity
// 4. Light/Cloud Cover - Overcast triggers active feeding
// 5. Regulatory Gatekeeper - Species-specific closures
// 6. Slack Tide Access - Still important but reduced weight

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { AlgorithmContext } from './chinookAlgorithmV2'
import {
  calculateResultantDrift,
  calculateSwellHeave,
  calculateBarometricStability,
  calculateRockfishLightConditions,
  checkRockfishRegulations,
  type ResultantDriftResult,
  type SwellHeaveResult,
  type BarometricStabilityResult,
  type RockfishLightResult,
  type RockfishRegulationResult
} from './physicsHelpers'

// ==================== INTERFACES ====================

export interface RockfishScoreResult {
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
  isInSeason: boolean
  isInRCA: boolean // Rockfish Conservation Area flag
  algorithmVersion: string
  strategyAdvice?: string[]
  advisories?: string[] // Barotrauma and other advisories
  regulations?: RockfishRegulationResult
  debug?: {
    resultantDrift?: ResultantDriftResult
    swellHeave?: SwellHeaveResult
    barometricStability?: BarometricStabilityResult
    lightConditions?: RockfishLightResult
  }
}

// ==================== WEIGHT CONFIGURATION ====================

// V2 Weights - Bio-Mechanics focused
const WEIGHTS = {
  // RESULTANT DRIFT (40%) - Can you hold position? If not, can't fish.
  resultantDrift: 0.40,     // Vector combination of wind + current

  // SWELL HEAVE (20%) - Vertical stability for jigging
  swellHeave: 0.20,         // Heave rate affects jig control

  // TIDAL ACCESS (15%) - Reduced from 40% - physics covered by drift
  slackTide: 0.15,          // Still need slack for vertical presentation

  // LIGHT CONDITIONS (10%) - Overcast triggers suspended feeding
  lightConditions: 0.10,    // Cloud cover importance increased

  // BAROMETRIC STABILITY (10%) - Swim bladder sensitivity
  barometricStability: 0.10, // Pressure changes affect fish activity

  // WIND SAFETY (5%) - Moved to resultantDrift for mechanics, kept for safety
  windSafety: 0.05,         // Safety threshold only
}

// Legacy weights for reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LEGACY_WEIGHTS = {
  slackTide: 0.40,
  tidalRange: 0.10,
  timeOfDay: 0.10,
  wind: 0.20,
  waveHeight: 0.15,
  seasonality: 0.05,
}

// ==================== SLACK TIDE ====================

/**
 * Calculate slack tide score for Rockfish
 * CRITICAL: Only time you can fish vertically without snagging
 * Uses smooth exponential decay instead of if/else blocks
 */
export function calculateSlackTideScore(
  tideData?: CHSWaterData
): { score: number; description: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_tide_data' }
  }

  const currentSpeed = Math.abs(tideData.currentSpeed || 0)

  // Exponential decay: score = e^(-k * current)
  // At 0 knots = 1.0, at 1 knot ≈ 0.4, at 2 knots ≈ 0.15
  const k = 0.9  // Decay constant
  const score = Math.exp(-k * currentSpeed)

  let description: string
  if (currentSpeed <= 0.1) {
    description = 'perfect_slack'
  } else if (currentSpeed <= 0.3) {
    description = 'near_slack'
  } else if (currentSpeed <= 0.5) {
    description = 'good_window'
  } else if (currentSpeed <= 1.0) {
    description = 'moderate_flow'
  } else if (currentSpeed <= 1.5) {
    description = 'difficult'
  } else {
    description = 'not_fishable'
  }

  return { score: Math.max(score, 0.05), description }
}

// ==================== TIDAL RANGE ====================

/**
 * Calculate tidal range score for Rockfish
 * INVERTED: Small range (neap) = longer slack window = better
 */
export function calculateTidalRangeScore(
  tideData?: CHSWaterData
): { score: number; description: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_data' }
  }

  const tidalRange = Math.abs(tideData.tidalRange || 0)

  // Inverted scoring - neap tides preferred
  if (tidalRange <= 1.0) {
    return { score: 1.0, description: 'neap_tide_ideal' }
  } else if (tidalRange <= 1.5) {
    return { score: 0.85, description: 'small_range_good' }
  } else if (tidalRange <= 2.0) {
    return { score: 0.7, description: 'moderate_range' }
  } else if (tidalRange <= 2.5) {
    return { score: 0.5, description: 'large_range' }
  } else {
    return { score: 0.3, description: 'spring_tide_short_slack' }
  }
}

// ==================== TIME OF DAY ====================

/**
 * Calculate time of day score for Rockfish
 * Golden hours provide best light penetration for deep fish
 */
export function calculateTimeOfDayScore(
  timestamp: number,
  sunrise: number,
  sunset: number
): { score: number; condition: string } {
  const currentTime = timestamp
  const minutesFromSunrise = (currentTime - sunrise) / 60
  const minutesToSunset = (sunset - currentTime) / 60

  // Golden hours - 90 minutes around sunrise/sunset
  if ((minutesFromSunrise >= 0 && minutesFromSunrise <= 90) ||
      (minutesToSunset >= 0 && minutesToSunset <= 90)) {
    return { score: 1.0, condition: 'golden_hour' }
  }

  // Extended golden - 90-150 minutes
  if ((minutesFromSunrise > 90 && minutesFromSunrise <= 150) ||
      (minutesToSunset > 90 && minutesToSunset <= 150)) {
    return { score: 0.8, condition: 'extended_golden' }
  }

  // Midday - still productive for deep dwellers
  if (minutesFromSunrise > 150 && minutesToSunset > 150) {
    return { score: 0.6, condition: 'midday' }
  }

  // Night/twilight
  if (minutesFromSunrise < 0 || minutesToSunset < 0) {
    return { score: 0.5, condition: 'twilight' }
  }

  return { score: 0.5, condition: 'night' }
}

// ==================== WIND ====================

/**
 * Calculate wind score for Rockfish
 * Must maintain position over structure - spot lock critical
 */
export function calculateRockfishWindScore(
  windSpeed: number // km/h
): { score: number; description: string; isSafe: boolean; warning?: string } {
  const windKnots = windSpeed * 0.539957

  if (windKnots > 20) {
    return {
      score: 0.0,
      description: 'dangerous',
      isSafe: false,
      warning: `Unsafe: Wind ${Math.round(windKnots)} knots - cannot maintain position`
    }
  }

  // Smooth decay curve instead of hard thresholds
  // score = 1 - (windKnots/25)^2 (capped at 0)
  const score = Math.max(1 - Math.pow(windKnots / 20, 2), 0)

  let description: string
  if (windKnots < 8) {
    description = 'ideal_spot_lock'
  } else if (windKnots < 12) {
    description = 'good'
  } else if (windKnots < 15) {
    description = 'moderate'
  } else {
    description = 'difficult'
  }

  return { score, description, isSafe: true }
}

// ==================== WAVE HEIGHT ====================

/**
 * Calculate wave height score for Rockfish
 * Stricter than other species - need to stay precisely over target
 */
export function calculateRockfishWaveScore(
  windSpeed: number // km/h
): { score: number; description: string; isSafe: boolean; warning?: string } {
  const waveHeight = Math.min((windSpeed / 3.6) * 0.1, 5.0)

  // Stricter threshold: 1.5m limit
  if (waveHeight > 1.5) {
    return {
      score: 0.0,
      description: 'dangerous',
      isSafe: false,
      warning: `Unsafe: Wave height ${waveHeight.toFixed(1)}m - cannot stay over target`
    }
  }

  // Smooth scoring
  const score = Math.max(1 - Math.pow(waveHeight / 1.8, 2), 0)

  let description: string
  if (waveHeight < 0.5) {
    description = 'calm'
  } else if (waveHeight < 1.0) {
    description = 'moderate'
  } else {
    description = 'challenging'
  }

  return { score, description, isSafe: true }
}

// ==================== SEASONALITY ====================

/**
 * Calculate seasonality score for Rockfish
 * Based on weather feasibility for offshore fishing
 * May-September best for offshore conditions
 */
export function calculateRockfishSeasonalityScore(
  date: Date
): { score: number; description: string } {
  const month = date.getMonth() + 1

  if (month >= 5 && month <= 9) {
    return { score: 1.0, description: 'prime_offshore_season' }
  } else if (month === 4 || month === 10) {
    return { score: 0.7, description: 'shoulder_season' }
  } else if (month === 3 || month === 11) {
    return { score: 0.5, description: 'marginal_offshore' }
  } else {
    return { score: 0.3, description: 'difficult_offshore_conditions' }
  }
}

// ==================== RCA CHECK ====================

/**
 * Check if location is in Rockfish Conservation Area
 * Returns informational flag - actual check would need coordinates
 * In production, this would check against DFO RCA boundaries database
 * For now, always returns false
 */
export function checkRCAStatus(): { isInRCA: boolean; warning?: string } {
  // Placeholder - coordinates would be used in production
  return {
    isInRCA: false,
    warning: undefined
  }
}

// ==================== BAROTRAUMA ADVISORY ====================

/**
 * Generate barotrauma advisory based on fishing depth
 * Informational only - does not affect score
 */
export function getBarotraumaAdvisory(): string {
  return 'Rockfish caught from depths >20m may suffer barotrauma. Use descending devices for release to minimize mortality.'
}

// ==================== MAIN ALGORITHM ====================

export interface RockfishAlgorithmContext extends AlgorithmContext {
  isInRCA?: boolean // Pre-computed RCA status
  fishingDepth?: number // meters
  // V2 Improvements - Extended context
  swellHeight?: number         // Meters
  swellPeriod?: number         // Seconds - critical for heave calculation
  windDirection?: number       // Degrees (0-360)
  currentDirection?: number    // Degrees (0-360)
  cloudCover?: number          // 0-100%
}

/**
 * Calculate Rockfish fishing score v2
 *
 * V2 Bio-Mechanics Philosophy:
 * - Resultant Drift is the primary factor - if you can't hold position, you can't fish
 * - Swell Heave affects vertical jig control
 * - Barometric stability - swim bladders sensitive to pressure changes
 * - Overcast conditions trigger suspended feeding behavior
 * - Seasonality handled by regulatory gatekeeper
 */
export function calculateRockfishScoreV2(
  weather: OpenMeteo15MinData,
  context: RockfishAlgorithmContext,
  tideData?: CHSWaterData
): RockfishScoreResult {
  const factors: RockfishScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const strategyAdvice: string[] = []
  const advisories: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp * 1000)
  const month = date.getMonth() + 1
  const hour = date.getHours()

  // ==================== REGULATORY GATEKEEPER ====================

  // Check RCA status (if provided)
  const isInRCA = context.isInRCA ?? false
  if (isInRCA) {
    return {
      total: 0,
      factors: {},
      isSafe: false,
      safetyWarnings: ['This location is within a Rockfish Conservation Area - fishing prohibited'],
      isInSeason: false,
      isInRCA: true,
      algorithmVersion: 'rockfish-v2.0',
      strategyAdvice: ['RCA closure - find alternative location'],
      advisories: []
    }
  }

  // Check species-specific regulations
  const regulations = checkRockfishRegulations(month)
  advisories.push(...regulations.warnings)

  // ==================== RESULTANT DRIFT (40%) ====================
  // Vector combination of wind + current - can you hold position?

  const windSpeedKnots = weather.windSpeed * 0.539957 // km/h to knots
  const windDirection = context.windDirection ?? 0
  const currentSpeed = Math.abs(tideData?.currentSpeed || 0)
  const currentDirection = context.currentDirection ?? (tideData?.isRising ? 0 : 180)

  const resultantDrift = calculateResultantDrift(
    windSpeedKnots,
    windDirection,
    currentSpeed,
    currentDirection
  )

  factors['resultantDrift'] = {
    value: `${resultantDrift.driftSpeed} kts`,
    weight: WEIGHTS.resultantDrift,
    score: resultantDrift.score,
    description: resultantDrift.recommendation
  }

  strategyAdvice.push(resultantDrift.recommendation)

  if (!resultantDrift.canHoldPosition) {
    isSafe = false
    safetyWarnings.push('Cannot hold position over structure - drift too fast')
  }

  // ==================== SWELL HEAVE (20%) ====================
  // Vertical stability for jigging

  const swellHeight = context.swellHeight ?? (weather.windSpeed > 0 ? Math.min((weather.windSpeed / 3.6) * 0.1, 2.0) : 0.3)
  const swellPeriod = context.swellPeriod ?? 8

  const swellHeave = calculateSwellHeave(swellHeight, swellPeriod)

  factors['swellHeave'] = {
    value: `${swellHeight.toFixed(1)}m @ ${swellPeriod}s`,
    weight: WEIGHTS.swellHeave,
    score: swellHeave.score,
    description: `${swellHeave.comfort} - heave ${swellHeave.heaveRate} m/s`
  }

  if (swellHeave.warning) {
    safetyWarnings.push(swellHeave.warning)
    strategyAdvice.push(swellHeave.warning)
  }

  if (swellHeave.comfort === 'unfishable') {
    isSafe = false
  }

  // ==================== SLACK TIDE (15%) ====================
  // Still important for vertical presentation, but reduced from 40%

  const { score: slackScore, description: slackDesc } = calculateSlackTideScore(tideData)

  factors['slackTide'] = {
    value: tideData?.currentSpeed ?? 0,
    weight: WEIGHTS.slackTide,
    score: slackScore,
    description: slackDesc
  }

  if (slackDesc === 'perfect_slack' || slackDesc === 'near_slack') {
    strategyAdvice.push('Slack tide window - optimal for vertical presentation')
  }

  // ==================== LIGHT CONDITIONS (10%) ====================
  // Overcast triggers suspended feeding

  const cloudCover = context.cloudCover ?? weather.cloudCover ?? 50
  const lightConditions = calculateRockfishLightConditions(cloudCover, hour)

  factors['lightConditions'] = {
    value: `${cloudCover}% cloud`,
    weight: WEIGHTS.lightConditions,
    score: lightConditions.score,
    description: lightConditions.condition
  }

  if (lightConditions.recommendation) {
    strategyAdvice.push(lightConditions.recommendation)
  }

  // ==================== BAROMETRIC STABILITY (10%) ====================
  // Swim bladder sensitivity

  const barometricStability = calculateBarometricStability(
    weather.pressure,
    context.pressureHistory
  )

  factors['barometricStability'] = {
    value: `${barometricStability.changeRate} hPa/hr`,
    weight: WEIGHTS.barometricStability,
    score: barometricStability.score,
    description: barometricStability.trend
  }

  if (barometricStability.warning) {
    strategyAdvice.push(barometricStability.warning)
  }

  // ==================== WIND SAFETY (5%) ====================
  // Safety threshold only - mechanics in resultantDrift

  const windResult = calculateRockfishWindScore(weather.windSpeed)

  factors['windSafety'] = {
    value: `${Math.round(windSpeedKnots)} kts`,
    weight: WEIGHTS.windSafety,
    score: windResult.isSafe ? 1.0 : 0.0,
    description: windResult.isSafe ? 'safe' : 'dangerous'
  }

  if (!windResult.isSafe) {
    isSafe = false
    if (windResult.warning) safetyWarnings.push(windResult.warning)
  }

  // ==================== ADVISORIES ====================

  advisories.push(getBarotraumaAdvisory())

  // ==================== CALCULATE TOTAL ====================

  let total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // Prime time bonus - all conditions align
  if (resultantDrift.score >= 0.9 &&
      swellHeave.comfort === 'stable' &&
      slackScore >= 0.8 &&
      lightConditions.condition === 'overcast_ideal') {
    total = Math.min(total * 1.1, 10)
    strategyAdvice.push('🎯 PRIME TIME: Stable boat + slack tide + overcast = rockfish actively feeding!')
  }

  // Safety capping
  if (!isSafe) {
    total = Math.min(total, 3.0)
    strategyAdvice.unshift('⚠️ Conditions unsafe - score capped')
  }

  // Clamp to 0-10 range
  total = Math.min(Math.max(total, 0), 10)

  // Always in season for rockfish (regulations handle species-specific closures)
  const isInSeason = true

  return {
    total: Math.round(total * 100) / 100,
    factors,
    isSafe,
    safetyWarnings,
    isInSeason,
    isInRCA: false,
    algorithmVersion: 'rockfish-v2.0',
    strategyAdvice,
    advisories,
    regulations,
    debug: {
      resultantDrift,
      swellHeave,
      barometricStability,
      lightConditions
    }
  }
}

export default calculateRockfishScoreV2
