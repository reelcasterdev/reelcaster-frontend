// Chum Salmon Algorithm V2
// Optimized for late-season "storm biter" migrants in BC waters
//
// V2 Bio-Mechanics Philosophy:
// - Chums are "storm biters" - feed aggressively when other salmon shut down
// - INVERTED weather logic: Falling pressure + rain = GOOD
// - Staging behavior: Mill around river mouths in "soft water" (0.5-1.5 kts)
// - Cold water activation: < 12°C triggers aggressive feeding
// - Late-season desperation: Oct-Nov feeding frenzy before spawning
//
// Key V2 Features:
// 1. Storm Trigger - Falling pressure + rain = feeding frenzy (INVERTED)
// 2. Staging Seams - Soft water (0.5-1.5 kts) preferred over rip lines
// 3. Thermal Gate - Cold water activation (< 12°C)
// 4. Seasonality with aggression - Oct-Nov peak
// 5. Bio-intel for run timing

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { AlgorithmContext } from './chinookAlgorithmV2'
import {
  calculateStormTrigger,
  calculateStagingSeams,
  calculateThermalGate,
  type StormTriggerResult,
  type StagingSeamsResult,
  type ThermalGateResult
} from './physicsHelpers'

// ==================== INTERFACES ====================

export interface ChumScoreResult {
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
  debug?: {
    stormTrigger?: StormTriggerResult
    stagingSeams?: StagingSeamsResult
    thermalGate?: ThermalGateResult
    tidalDirection?: string
  }
}

// ==================== WEIGHT CONFIGURATION ====================

// V2 Weights - Storm Biter Model
const WEIGHTS = {
  // HYDROLOGICAL TRIGGER (35%) - INVERTED: Rain + falling pressure = GOOD
  stormTrigger: 0.35,       // Falling pressure + rain triggers feeding

  // STAGING SEAMS (25%) - Soft water (0.5-1.5 kts)
  stagingSeams: 0.25,       // Holding zones near river mouths

  // SEASONALITY (20%) - Late-season aggression
  seasonality: 0.20,        // Oct-Nov peak with desperation feeding

  // THERMAL GATE (10%) - Cold water activation
  thermalGate: 0.10,        // < 12°C = active, > 14°C = penalty

  // BIO-INTEL (10%) - Run timing from reports
  bioIntel: 0.10,           // Fishing report keywords
}

// Legacy weights for reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LEGACY_WEIGHTS = {
  seasonality: 0.20,
  tidalMovement: 0.30,
  optimalLight: 0.20,
  waterTemp: 0.10,
  pressureTrend: 0.10,
  waterClarity: 0.05,
  solunar: 0.05,
}

// ==================== SEASONALITY ====================

/**
 * Calculate seasonality score for Chum Salmon
 * Late season run: September 15 - November 30
 * Peak: October 15 - November 15
 */
export function calculateChumSeasonalityScore(
  date: Date
): { score: number; description: string } {
  const dayOfYear = getDayOfYear(date)

  // Key dates
  const SEP_15 = 258  // Season start
  const OCT_15 = 288  // Peak start
  const NOV_15 = 319  // Peak end
  const NOV_30 = 334  // Season end

  let score: number
  let description: string

  if (dayOfYear < SEP_15 - 15) {
    // Before September - off season
    score = 0.1
    description = 'off_season'
  } else if (dayOfYear >= SEP_15 - 15 && dayOfYear < SEP_15) {
    // Early September - scouts
    score = 0.4
    description = 'early_scouts'
  } else if (dayOfYear >= SEP_15 && dayOfYear < OCT_15) {
    // Sep 15 - Oct 15: building run
    const progress = (dayOfYear - SEP_15) / (OCT_15 - SEP_15)
    score = 0.5 + (0.5 * progress)
    description = 'building_run'
  } else if (dayOfYear >= OCT_15 && dayOfYear <= NOV_15) {
    // Oct 15 - Nov 15: peak run
    score = 1.0
    description = 'peak_run'
  } else if (dayOfYear > NOV_15 && dayOfYear <= NOV_30) {
    // Nov 15-30: late run
    const progress = (dayOfYear - NOV_15) / (NOV_30 - NOV_15)
    score = 1.0 - (0.4 * progress)
    description = 'late_run'
  } else if (dayOfYear > NOV_30 && dayOfYear <= NOV_30 + 15) {
    // December: tail end
    score = 0.3
    description = 'tail_end'
  } else {
    // Winter/Spring/Summer
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

// ==================== TIDAL MOVEMENT ====================

/**
 * Calculate combined tidal movement score for Chum
 * Combines current speed, tidal range, and direction
 * Ebb tide preferred for bait concentration
 */
export function calculateTidalMovementScore(
  tideData?: CHSWaterData
): { score: number; description: string; direction: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_tide_data', direction: 'unknown' }
  }

  const currentSpeed = Math.abs(tideData.currentSpeed || 0)
  const tidalRange = Math.abs(tideData.tidalRange || 0)
  const isRising = tideData.isRising

  // Determine tide direction
  const direction = isRising ? 'flood' : 'ebb'

  // Calculate base current score (1-2.5 knots optimal)
  let currentScore: number
  if (currentSpeed >= 1.0 && currentSpeed <= 2.5) {
    currentScore = 1.0
  } else if (currentSpeed >= 0.5 && currentSpeed < 1.0) {
    currentScore = 0.7
  } else if (currentSpeed > 2.5 && currentSpeed <= 3.5) {
    currentScore = 0.6
  } else if (currentSpeed < 0.5) {
    currentScore = 0.4  // Slack
  } else {
    currentScore = 0.2  // Very strong
  }

  // Calculate tidal range multiplier (larger range = more water movement)
  let rangeMultiplier: number
  if (tidalRange >= 2.5) {
    rangeMultiplier = 1.0
  } else if (tidalRange >= 2.0) {
    rangeMultiplier = 0.95
  } else if (tidalRange >= 1.5) {
    rangeMultiplier = 0.85
  } else if (tidalRange >= 1.0) {
    rangeMultiplier = 0.75
  } else {
    rangeMultiplier = 0.6
  }

  // Ebb tide bonus (bait concentrates as water leaves estuaries)
  const ebbBonus = !isRising ? 0.1 : 0

  // Combined score
  let score = (currentScore * rangeMultiplier) + ebbBonus
  score = Math.min(Math.max(score, 0), 1.0)

  // Description based on conditions
  let description: string
  if (score >= 0.9) {
    description = 'optimal_tidal_movement'
  } else if (score >= 0.7) {
    description = 'good_movement'
  } else if (score >= 0.5) {
    description = 'moderate_movement'
  } else {
    description = 'poor_movement'
  }

  if (!isRising && currentSpeed >= 0.5) {
    description = 'ebb_tide_' + description
  }

  return { score, description, direction }
}

// ==================== OPTIMAL LIGHT ====================

/**
 * Calculate optimal light score for Chum Salmon
 * Dawn and dusk preferred, but less sensitive than Coho
 */
export function calculateOptimalLightScore(
  timestamp: number,
  sunrise: number,
  sunset: number
): { score: number; condition: string } {
  const currentTime = timestamp
  const minutesFromSunrise = (currentTime - sunrise) / 60
  const minutesToSunset = (sunset - currentTime) / 60

  let score: number
  let condition: string

  // Golden hours
  if (minutesFromSunrise >= 0 && minutesFromSunrise <= 90) {
    score = 1.0
    condition = 'golden_hour_dawn'
  } else if (minutesToSunset >= 0 && minutesToSunset <= 90) {
    score = 1.0
    condition = 'golden_hour_dusk'
  }
  // Civil twilight
  else if (minutesFromSunrise >= -30 && minutesFromSunrise < 0) {
    score = 0.9
    condition = 'civil_twilight_dawn'
  } else if (minutesToSunset >= -30 && minutesToSunset < 0) {
    score = 0.85
    condition = 'civil_twilight_dusk'
  }
  // Mid-morning / Late afternoon
  else if ((minutesFromSunrise > 90 && minutesFromSunrise <= 180) ||
           (minutesToSunset > 90 && minutesToSunset <= 180)) {
    score = 0.7
    condition = 'shoulder_hours'
  }
  // Midday - less penalized than Coho (Chum less sight-dependent)
  else if (minutesFromSunrise > 180 && minutesToSunset > 180) {
    score = 0.4
    condition = 'midday'
  }
  // Night
  else {
    score = 0.3
    condition = 'night'
  }

  return { score, condition }
}

// ==================== WATER TEMPERATURE ====================

/**
 * Calculate water temperature score for Chum
 * Optimal: 8-14°C
 */
export function calculateWaterTempScore(
  waterTemp?: number
): { score: number; description: string } {
  if (waterTemp === undefined) {
    return { score: 0.5, description: 'no_data' }
  }

  if (waterTemp >= 8 && waterTemp <= 14) {
    return { score: 1.0, description: 'optimal' }
  } else if (waterTemp >= 6 && waterTemp < 8) {
    return { score: 0.7, description: 'cool' }
  } else if (waterTemp > 14 && waterTemp <= 16) {
    return { score: 0.7, description: 'warm' }
  } else if (waterTemp < 6) {
    return { score: 0.4, description: 'cold' }
  } else {
    return { score: 0.4, description: 'too_warm' }
  }
}

// ==================== WATER CLARITY ====================

/**
 * Calculate water clarity score based on recent precipitation
 * Chum are less affected by turbidity than visual hunters
 */
export function calculateWaterClarityScore(
  precipitation24h: number
): { score: number; description: string } {
  if (precipitation24h < 5) {
    return { score: 1.0, description: 'clear_water' }
  } else if (precipitation24h < 15) {
    return { score: 0.8, description: 'slightly_colored' }
  } else if (precipitation24h < 30) {
    return { score: 0.5, description: 'murky_water' }
  } else {
    return { score: 0.3, description: 'very_turbid' }
  }
}

// ==================== SOLUNAR ====================

/**
 * Calculate solunar influence score
 * Minor factor for Chum - included for completeness
 */
export function calculateSolunarScore(
  solunarMajor?: boolean,
  solunarMinor?: boolean
): { score: number; description: string } {
  if (solunarMajor) {
    return { score: 1.0, description: 'major_period' }
  } else if (solunarMinor) {
    return { score: 0.8, description: 'minor_period' }
  } else {
    return { score: 0.5, description: 'between_periods' }
  }
}

// ==================== MAIN ALGORITHM ====================

export interface ChumAlgorithmContext extends AlgorithmContext {
  cloudCover?: number
  precipitation24h?: number
  // V2 Storm Biter enhancements
  fishingReportText?: string   // For bio-intel detection
}

/**
 * Calculate Chum Salmon fishing score v2
 *
 * V2 "Storm Biter" Philosophy:
 * - INVERTED weather logic: Rain + falling pressure = feeding trigger
 * - Staging behavior in soft water (0.5-1.5 kts)
 * - Cold water activation (< 12°C)
 * - Late-season desperation feeding
 */
export function calculateChumSalmonScoreV2(
  weather: OpenMeteo15MinData,
  context: ChumAlgorithmContext,
  tideData?: CHSWaterData
): ChumScoreResult {
  const factors: ChumScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const strategyAdvice: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp * 1000)
  // Use sea surface temperature from Marine API if available
  const waterTemp = weather.seaSurfaceTemp ?? tideData?.waterTemperature ?? 10
  const currentSpeed = Math.abs(tideData?.currentSpeed || 0)

  // Log water temp source for debugging
  if (weather.seaSurfaceTemp !== undefined) {
    console.log('[Chum V2] Using Marine API water temp:', weather.seaSurfaceTemp, '°C')
  } else if (tideData?.waterTemperature !== undefined) {
    console.log('[Chum V2] Using tide data water temp:', tideData.waterTemperature, '°C')
  } else {
    console.log('[Chum V2] Using fallback water temp: 10°C')
  }

  // ==================== STORM TRIGGER (35%) ====================
  // INVERTED: Falling pressure + rain = GOOD for Chums

  // Determine pressure trend
  const pressureChange = context.pressureHistory && context.pressureHistory.length > 0
    ? weather.pressure - context.pressureHistory[0]
    : 0

  let pressureTrend: 'rising' | 'stable' | 'falling' | 'crashing'
  if (pressureChange < -2) pressureTrend = 'crashing'
  else if (pressureChange < -0.5) pressureTrend = 'falling'
  else if (pressureChange > 0.5) pressureTrend = 'rising'
  else pressureTrend = 'stable'

  const stormTrigger = calculateStormTrigger(pressureTrend, weather.precipitation)

  factors['stormTrigger'] = {
    value: `${pressureTrend}, ${weather.precipitation}mm`,
    weight: WEIGHTS.stormTrigger,
    score: stormTrigger.score,
    description: stormTrigger.stormStrength
  }

  strategyAdvice.push(stormTrigger.recommendation)

  // ==================== STAGING SEAMS (25%) ====================
  // Soft water (0.5-1.5 kts) staging zones

  const stagingSeams = calculateStagingSeams(currentSpeed)

  factors['stagingSeams'] = {
    value: `${currentSpeed.toFixed(1)} kts`,
    weight: WEIGHTS.stagingSeams,
    score: stagingSeams.score,
    description: stagingSeams.currentType
  }

  strategyAdvice.push(stagingSeams.recommendation)

  // ==================== SEASONALITY (20%) ====================
  // Late-season aggression (Oct-Nov peak)

  const { score: seasonalityScore, description: seasonDesc } = calculateChumSeasonalityScore(date)

  factors['seasonality'] = {
    value: date.getMonth() + 1,
    weight: WEIGHTS.seasonality,
    score: seasonalityScore,
    description: seasonDesc
  }

  if (seasonDesc === 'peak_run') {
    strategyAdvice.push('Peak Chum season - late-season aggression active')
  }

  // ==================== THERMAL GATE (10%) ====================
  // Cold water activation

  const thermalGate = calculateThermalGate(waterTemp)

  factors['thermalGate'] = {
    value: `${waterTemp.toFixed(1)}°C`,
    weight: WEIGHTS.thermalGate,
    score: thermalGate.score,
    description: thermalGate.isCold ? 'cold_active' : 'warm_slow'
  }

  strategyAdvice.push(thermalGate.recommendation)

  // ==================== BIO-INTEL (10%) ====================
  // Run timing from fishing reports

  const text = context.fishingReportText?.toLowerCase() || ''
  const chumKeywords = ['chum', 'chums', 'dog salmon', 'dogs', 'staging', 'river mouth']
  const foundKeywords = chumKeywords.filter(k => text.includes(k))
  const bioIntelScore = foundKeywords.length > 0 ? 1.0 : 0.5

  factors['bioIntel'] = {
    value: foundKeywords.length > 0 ? foundKeywords.join(', ') : 'no reports',
    weight: WEIGHTS.bioIntel,
    score: bioIntelScore,
    description: foundKeywords.length > 0 ? 'run_reported' : 'no_intel'
  }

  if (foundKeywords.length > 0) {
    strategyAdvice.push(`Chum activity reported: ${foundKeywords.join(', ')}`)
  }

  // ==================== SAFETY CHECKS ====================

  // Wind safety (Chums tolerate rough weather better, but still have limits)
  const windKnots = weather.windSpeed * 0.539957
  if (windKnots > 25) {
    isSafe = false
    safetyWarnings.push(`Unsafe: Wind ${Math.round(windKnots)} knots`)
  }

  // Current speed safety
  if (currentSpeed > 4.0) {
    isSafe = false
    safetyWarnings.push(`Unsafe: Current speed ${currentSpeed.toFixed(1)} knots`)
  }

  // Extreme precipitation safety (even Chums have limits)
  if (weather.precipitation > 30) {
    isSafe = false
    safetyWarnings.push('Unsafe: Extreme precipitation - visibility and safety hazard')
  }

  // ==================== CALCULATE TOTAL ====================

  let total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // Storm biter bonus - when conditions align
  if (stormTrigger.isActive && thermalGate.isCold && stagingSeams.currentType === 'soft_water') {
    total = Math.min(total * 1.15, 10)
    strategyAdvice.push('🎯 STORM BITER PRIME: Cold water + rain + staging seams = aggressive feeding!')
  }

  // Safety capping
  if (!isSafe) {
    total = Math.min(total, 3.0)
    strategyAdvice.unshift('⚠️ Conditions unsafe - score capped')
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
    isInSeason,
    algorithmVersion: 'chum-v2.0',
    strategyAdvice,
    debug: {
      stormTrigger,
      stagingSeams,
      thermalGate,
      tidalDirection: tideData?.isRising ? 'flood' : 'ebb'
    }
  }
}

export default calculateChumSalmonScoreV2
