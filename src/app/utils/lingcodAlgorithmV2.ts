// Lingcod Algorithm V2
// Optimized for structure-dependent ambush predators in BC waters
//
// V2 Bio-Mechanics Philosophy:
// - Lingcod are ambush predators that feed in current "shoulders" (0.5-1.5 knots)
// - Not dead slack like traditional thinking - they need water movement to ambush prey
// - Jigging conditions (puke ratio) critical for presenting lures
// - Rockfish/baitfish presence is a strong bio-intel signal
// - Time of day is not significant - Lingcod feed anytime if current is right
//
// Key V2 Features:
// 1. Tidal Shoulder Logic - Peak feeding at 0.5-1.5 knots, not dead slack
// 2. Swell Quality "Puke Ratio" - Period/Height ratio for jigging comfort
// 3. Rockfish Indicator - Bio-intel for prey presence (Lingcod eat Rockfish)
// 4. Seasonal Depth Strategy - Shallow/aggressive early, deep late season
// 5. Wind-Tide Safety - Opposing wind/current creates dangerous conditions
// 6. Prime time multiplier when shoulder tide + calm seas + prey present

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { AlgorithmContext } from './chinookAlgorithmV2'
import {
  calculateTidalShoulderScore,
  calculateJiggingConditions,
  detectRockfishIndicator,
  getLingcodSeasonalStrategy,
  calculateWindTideInteraction,
  type TidalShoulderResult,
  type JiggingConditionsResult,
  type RockfishIndicatorResult,
  type LingcodSeasonalStrategy
} from './physicsHelpers'

// ==================== INTERFACES ====================

export interface LingcodScoreResult {
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
  algorithmVersion: string
  strategyAdvice?: string[]
  depthStrategy?: LingcodSeasonalStrategy
  debug?: {
    primeTimeBonus?: boolean
    tidalDirection?: string
    tidalShoulder?: TidalShoulderResult
    jiggingConditions?: JiggingConditionsResult
    rockfishIndicator?: RockfishIndicatorResult
  }
}

// ==================== WEIGHT CONFIGURATION ====================

// V2 Weights - Bio-Mechanics focused
const WEIGHTS = {
  // TIDAL SHOULDER (35%) - The feeding trigger, not just access
  tidalShoulder: 0.35,      // Feeding aggression at 0.5-1.5 knots

  // SWELL QUALITY (20%) - Jigging conditions
  swellQuality: 0.20,       // Period/Height ratio for jig control

  // BIOLOGICAL (15%)
  seasonality: 0.15,        // Open season + depth strategy

  // BIO-INTEL (15%) - Prey presence
  bioIntel: 0.15,           // Rockfish/baitfish indicator

  // SAFETY (15%)
  windTideSafety: 0.15,     // Wind-against-tide + boat control
}

// Legacy weights for reference (V1)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LEGACY_WEIGHTS = {
  tidalDynamics: 0.40,
  seasonality: 0.15,
  timeOfDay: 0.05,
  pressureTrend: 0.10,
  wind: 0.10,
  waveHeight: 0.10,
  ambientLight: 0.10,
}

// ==================== TIDAL DYNAMICS ====================

/**
 * Calculate combined tidal dynamics score for Lingcod
 * Interaction model: slackScore * (0.5 + 0.5 * rangeScore) + ebbBonus
 *
 * Lingcod are structure-dependent - they need slack to feed
 * but large tidal range brings more bait through their territory
 */
export function calculateTidalDynamicsScore(
  tideData?: CHSWaterData
): { score: number; description: string; direction: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_tide_data', direction: 'unknown' }
  }

  const currentSpeed = Math.abs(tideData.currentSpeed || 0)
  const tidalRange = Math.abs(tideData.tidalRange || 0)
  const isRising = tideData.isRising
  const direction = isRising ? 'flood' : 'ebb'

  // Calculate slack tide score (critical for Lingcod)
  let slackScore: number
  if (currentSpeed <= 0.2) {
    slackScore = 1.0  // Perfect slack
  } else if (currentSpeed <= 0.5) {
    slackScore = 0.9  // Near slack - excellent
  } else if (currentSpeed <= 0.8) {
    slackScore = 0.7  // Light flow - good
  } else if (currentSpeed <= 1.2) {
    slackScore = 0.5  // Moderate - fishable
  } else if (currentSpeed <= 1.8) {
    slackScore = 0.3  // Strong - difficult
  } else {
    slackScore = 0.1  // Ripping - not worth it
  }

  // Calculate tidal range score
  let rangeScore: number
  if (tidalRange >= 2.5 && tidalRange <= 4.0) {
    rangeScore = 1.0  // Optimal exchange
  } else if (tidalRange >= 2.0 && tidalRange < 2.5) {
    rangeScore = 0.9
  } else if (tidalRange > 4.0) {
    rangeScore = 0.7  // Large but shorter slack
  } else if (tidalRange >= 1.5) {
    rangeScore = 0.6
  } else {
    rangeScore = 0.4  // Minimal bait movement
  }

  // Interaction model
  let score = slackScore * (0.5 + 0.5 * rangeScore)

  // Ebb tide bonus (+0.1) - bait flushes off structure
  if (!isRising && currentSpeed >= 0.3 && currentSpeed <= 1.5) {
    score = Math.min(score + 0.1, 1.0)
  }

  // Description
  let description: string
  if (score >= 0.85) {
    description = 'prime_tidal_window'
  } else if (score >= 0.7) {
    description = 'good_tidal_conditions'
  } else if (score >= 0.5) {
    description = 'moderate_conditions'
  } else {
    description = 'poor_tidal_conditions'
  }

  if (!isRising && currentSpeed >= 0.3 && currentSpeed <= 1.5) {
    description = 'ebb_' + description
  }

  return { score, description, direction }
}

// ==================== SEASONALITY ====================

/**
 * Calculate seasonality score for Lingcod
 * Open season: May 1 - December (varies by area)
 * Biological peak: April-May post-spawn, October pre-spawn
 */
export function calculateLingcodSeasonalityScore(
  date: Date
): { score: number; description: string } {
  const month = date.getMonth() + 1

  // Closed season (January-April in many areas)
  if (month >= 1 && month <= 3) {
    return { score: 0.1, description: 'closed_season' }
  }

  // April - Opening + post-spawn aggression
  if (month === 4) {
    return { score: 0.7, description: 'early_season' }
  }

  // May-June - Post-spawn peak feeding
  if (month === 5 || month === 6) {
    return { score: 1.0, description: 'post_spawn_peak' }
  }

  // July-August - Summer doldrums, fish deeper
  if (month === 7 || month === 8) {
    return { score: 0.7, description: 'summer_deep' }
  }

  // September-October - Pre-spawn feeding frenzy
  if (month === 9 || month === 10) {
    return { score: 0.95, description: 'pre_spawn_feeding' }
  }

  // November-December - Late season, moving deep
  if (month === 11 || month === 12) {
    return { score: 0.6, description: 'late_season' }
  }

  return { score: 0.5, description: 'unknown' }
}

// ==================== TIME OF DAY ====================

/**
 * Calculate time of day score for Lingcod
 * Minor factor - structure fish are less light-dependent
 * But dawn/dusk still show increased activity
 */
export function calculateTimeOfDayScore(
  timestamp: number,
  sunrise: number,
  sunset: number
): { score: number; condition: string } {
  const currentTime = timestamp
  const minutesFromSunrise = (currentTime - sunrise) / 60
  const minutesToSunset = (sunset - currentTime) / 60

  // Dawn/dusk bonus
  if ((minutesFromSunrise >= 0 && minutesFromSunrise <= 90) ||
      (minutesToSunset >= 0 && minutesToSunset <= 90)) {
    return { score: 1.0, condition: 'golden_hour' }
  }

  // Shoulder hours
  if ((minutesFromSunrise > 90 && minutesFromSunrise <= 180) ||
      (minutesToSunset > 90 && minutesToSunset <= 180)) {
    return { score: 0.8, condition: 'shoulder_hours' }
  }

  // Midday - still fishable for Lingcod
  if (minutesFromSunrise > 180 && minutesToSunset > 180) {
    return { score: 0.6, condition: 'midday' }
  }

  // Night
  return { score: 0.4, condition: 'night' }
}

// ==================== WIND ====================

/**
 * Calculate wind score for Lingcod
 * Critical for holding position over structure
 */
export function calculateLingcodWindScore(
  windSpeed: number // km/h
): { score: number; description: string; isSafe: boolean; warning?: string } {
  const windKnots = windSpeed * 0.539957

  if (windKnots > 20) {
    return {
      score: 0.0,
      description: 'dangerous',
      isSafe: false,
      warning: `Unsafe: Wind ${Math.round(windKnots)} knots - cannot hold over structure`
    }
  } else if (windKnots <= 8) {
    return { score: 1.0, description: 'ideal_positioning', isSafe: true }
  } else if (windKnots <= 12) {
    return { score: 0.8, description: 'good', isSafe: true }
  } else if (windKnots <= 15) {
    return { score: 0.5, description: 'challenging', isSafe: true }
  } else {
    return { score: 0.2, description: 'difficult', isSafe: true }
  }
}

// ==================== WAVE HEIGHT ====================

/**
 * Calculate wave height score for Lingcod
 * Need stability for precise structure fishing
 */
export function calculateLingcodWaveScore(
  windSpeed: number // km/h
): { score: number; description: string; isSafe: boolean; warning?: string } {
  const waveHeight = Math.min((windSpeed / 3.6) * 0.1, 5.0)

  if (waveHeight > 1.5) {
    return {
      score: 0.0,
      description: 'dangerous',
      isSafe: false,
      warning: `Unsafe: Wave height ${waveHeight.toFixed(1)}m - cannot fish structure`
    }
  } else if (waveHeight <= 0.5) {
    return { score: 1.0, description: 'calm', isSafe: true }
  } else if (waveHeight <= 1.0) {
    return { score: 0.7, description: 'moderate', isSafe: true }
  } else {
    return { score: 0.4, description: 'choppy', isSafe: true }
  }
}

// ==================== AMBIENT LIGHT ====================

/**
 * Calculate ambient light score for Lingcod
 * Overcast conditions preferred - reduces spookiness
 */
export function calculateAmbientLightScore(
  cloudCover?: number,
  precipitation?: number
): { score: number; description: string } {
  const effectiveCloud = cloudCover ?? 50
  const precip = precipitation ?? 0

  // Heavy rain is bad
  if (precip > 10) {
    return { score: 0.3, description: 'heavy_rain' }
  }

  // Overcast is ideal
  if (effectiveCloud >= 70) {
    return { score: 1.0, description: 'overcast_ideal' }
  } else if (effectiveCloud >= 50) {
    return { score: 0.8, description: 'partly_cloudy' }
  } else if (effectiveCloud >= 30) {
    return { score: 0.6, description: 'mostly_clear' }
  } else {
    return { score: 0.5, description: 'clear_bright' }
  }
}

// ==================== MAIN ALGORITHM ====================

export interface LingcodAlgorithmContext extends AlgorithmContext {
  cloudCover?: number
  // V2 Improvements - Extended context
  swellHeight?: number         // Meters
  swellPeriod?: number         // Seconds - critical for jigging comfort
  windDirection?: number       // Degrees (0-360)
  currentDirection?: number    // Degrees (0-360)
  fishingReportText?: string   // Raw report text for bio-intel parsing
}

/**
 * Calculate Lingcod fishing score v2
 *
 * V2 Bio-Mechanics Philosophy:
 * - Lingcod are ambush predators that feed in current "shoulders" (0.5-1.5 knots)
 * - Not dead slack like V1 assumed - they need water movement to ambush prey
 * - Jigging conditions (puke ratio) critical for presenting lures
 * - Rockfish/baitfish presence is a strong bio-intel signal
 * - Time of day removed - Lingcod feed anytime if current is right
 */
export function calculateLingcodScoreV2(
  weather: OpenMeteo15MinData,
  context: LingcodAlgorithmContext,
  tideData?: CHSWaterData
): LingcodScoreResult {
  const factors: LingcodScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const strategyAdvice: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp * 1000)
  const month = date.getMonth() + 1

  // ==================== SEASONAL STRATEGY (Check first for closed season) ====================

  const seasonalStrategy = getLingcodSeasonalStrategy(month)

  // HARD STOP: Closed season
  if (seasonalStrategy.mode === 'closed') {
    return {
      total: 0,
      factors: {},
      isSafe: true,
      safetyWarnings: ['Lingcod season CLOSED (January-March) - no retention allowed'],
      isInSeason: false,
      algorithmVersion: 'lingcod-v2.0',
      strategyAdvice: ['Season closed for Lingcod spawning protection'],
      depthStrategy: seasonalStrategy
    }
  }

  // ==================== TIDAL SHOULDER (35%) ====================
  // The "feeding trigger" - Lingcod ambush prey at 0.5-1.5 knots, not slack

  const currentSpeed = Math.abs(tideData?.currentSpeed || 0)
  const tidalShoulder = calculateTidalShoulderScore(currentSpeed)

  factors['tidalShoulder'] = {
    value: currentSpeed,
    weight: WEIGHTS.tidalShoulder,
    score: tidalShoulder.combinedScore,
    description: `${tidalShoulder.phase} - ${tidalShoulder.recommendation}`
  }

  if (tidalShoulder.recommendation) {
    strategyAdvice.push(tidalShoulder.recommendation)
  }

  // ==================== SWELL QUALITY / JIGGING CONDITIONS (20%) ====================
  // The "Puke Ratio" - period/height determines if you can jig effectively

  const swellHeight = context.swellHeight ?? (weather.windSpeed > 0 ? Math.min((weather.windSpeed / 3.6) * 0.1, 2.0) : 0.5)
  const swellPeriod = context.swellPeriod ?? 8 // Default to moderate if unknown

  const jiggingConditions = calculateJiggingConditions(swellHeight, swellPeriod)

  factors['swellQuality'] = {
    value: `${swellPeriod}s / ${swellHeight.toFixed(1)}m`,
    weight: WEIGHTS.swellQuality,
    score: jiggingConditions.score,
    description: `Puke ratio ${jiggingConditions.ratio === Infinity ? '∞' : jiggingConditions.ratio.toFixed(1)} - ${jiggingConditions.comfort}`
  }

  if (jiggingConditions.warning) {
    safetyWarnings.push(jiggingConditions.warning)
    strategyAdvice.push(jiggingConditions.warning)
  }

  // Unfishable swell conditions
  if (jiggingConditions.comfort === 'unfishable') {
    isSafe = false
  }

  // ==================== SEASONALITY (15%) ====================
  // Open season score + depth strategy multiplier

  factors['seasonality'] = {
    value: month,
    weight: WEIGHTS.seasonality,
    score: seasonalStrategy.multiplier,
    description: `${seasonalStrategy.mode} - Target ${seasonalStrategy.depthRange}`
  }

  strategyAdvice.push(`Depth Strategy: ${seasonalStrategy.depthRange} (${seasonalStrategy.mode})`)

  // ==================== BIO-INTEL (15%) ====================
  // Rockfish/baitfish indicator from fishing reports

  const rockfishIndicator = detectRockfishIndicator(context.fishingReportText || '')

  factors['bioIntel'] = {
    value: rockfishIndicator.keywords.length > 0 ? rockfishIndicator.keywords.join(', ') : 'none',
    weight: WEIGHTS.bioIntel,
    score: rockfishIndicator.detected ? 1.0 : 0.5, // Binary: prey present or not
    description: `${rockfishIndicator.detected ? 'prey detected' : 'no prey signal'} - ${rockfishIndicator.multiplier}x multiplier`
  }

  if (rockfishIndicator.detected && rockfishIndicator.recommendation) {
    strategyAdvice.push(rockfishIndicator.recommendation)
  }

  // ==================== WIND-TIDE SAFETY (15%) ====================
  // Wind opposing current creates dangerous conditions + boat control

  const windDirection = context.windDirection ?? 0
  const currentDirection = context.currentDirection ?? (tideData?.isRising ? 0 : 180) // Estimate from tide
  const windSpeed = weather.windSpeed * 0.539957 // Convert to knots

  const windTideInteraction = calculateWindTideInteraction(
    windSpeed,
    windDirection,
    currentSpeed,
    currentDirection
  )

  factors['windTideSafety'] = {
    value: `Wind ${Math.round(windSpeed)}kts @ ${windDirection}°`,
    weight: WEIGHTS.windTideSafety,
    score: windTideInteraction.score,
    description: windTideInteraction.severity
  }

  if (windTideInteraction.warning) {
    safetyWarnings.push(windTideInteraction.warning)
  }

  if (windTideInteraction.severity === 'dangerous') {
    isSafe = false
  }

  // ==================== CALCULATE BASE TOTAL ====================

  let total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // ==================== APPLY MULTIPLIERS ====================

  // 1. Rockfish/Prey Indicator Multiplier (up to 1.25x)
  if (rockfishIndicator.multiplier > 1.0) {
    total = total * rockfishIndicator.multiplier
    strategyAdvice.push(`Rockfish indicator bonus: ${((rockfishIndicator.multiplier - 1) * 100).toFixed(0)}%`)
  }

  // 2. Seasonal Strategy Multiplier
  if (seasonalStrategy.multiplier !== 1.0) {
    total = total * seasonalStrategy.multiplier
    if (seasonalStrategy.multiplier > 1.0) {
      strategyAdvice.push(`${seasonalStrategy.mode} season bonus: ${((seasonalStrategy.multiplier - 1) * 100).toFixed(0)}%`)
    }
  }

  // 3. Prime Time Multiplier - All conditions align
  let primeTimeBonus = false
  if (tidalShoulder.phase === 'shoulder' &&
      jiggingConditions.comfort === 'perfect' &&
      rockfishIndicator.detected) {
    total = Math.min(total * 1.15, 10)
    primeTimeBonus = true
    strategyAdvice.push('🎯 PRIME TIME: Shoulder tide + calm seas + prey present!')
  }

  // ==================== SAFETY CAPPING ====================

  if (!isSafe) {
    total = Math.min(total, 3.0)
    strategyAdvice.unshift('⚠️ Conditions unsafe - score capped')
  }

  // Clamp to 0-10 range
  total = Math.min(Math.max(total, 0), 10)

  // Determine if in season (always true here - closed season returns early)
  const isInSeason = true

  return {
    total: Math.round(total * 100) / 100,
    factors,
    isSafe,
    safetyWarnings,
    isInSeason,
    algorithmVersion: 'lingcod-v2.0',
    strategyAdvice,
    depthStrategy: seasonalStrategy,
    debug: {
      primeTimeBonus,
      tidalDirection: tideData?.isRising ? 'flood' : 'ebb',
      tidalShoulder,
      jiggingConditions,
      rockfishIndicator
    }
  }
}

export default calculateLingcodScoreV2
