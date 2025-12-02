// Dungeness Crab Algorithm V2
// Optimized for passive trap fishing in BC waters
//
// V2 Bio-Mechanics Philosophy:
// - Crabbing is passive/asynchronous - you set traps and wait
// - Scent hydraulics: Current creates "scent tunnel" for crab recruitment
// - Soak Score (biological) vs Haul Score (retrieval safety) separation
// - Nocturnal flood bonus: Crabs ride incoming tide into shallows at night
// - Molt quality index: Temperature indicates hard shell vs soft shell quality
//
// Key V2 Features:
// 1. Scent Hydraulics - Optimal 0.8-1.5 kts for maximum scent dispersal
// 2. Molt Quality Index - Temperature-based meat quality prediction
// 3. Nocturnal Flood Bonus - Up to 1.3x when flood tide + darkness align
// 4. Retrieval Safety - Future timestamp analysis for haul conditions
// 5. Soak duration parameter - Analyze conditions over 6-24 hour windows

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { AlgorithmContext } from './chinookAlgorithmV2'
import {
  calculateScentHydraulics,
  calculateMoltQualityIndex,
  calculateNocturnalFloodBonus,
  calculateRetrievalSafety,
  type ScentHydraulicsResult,
  type MoltQualityResult,
  type NocturnalFloodResult,
  type RetrievalSafetyResult
} from './physicsHelpers'

// ==================== INTERFACES ====================

export interface CrabScoreResult {
  total: number
  soakScore?: number // Biological/feeding score during soak
  haulScore?: number // Retrieval safety score
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
  moltQuality?: MoltQualityResult
  debug?: {
    scentHydraulics?: ScentHydraulicsResult
    nocturnalFlood?: NocturnalFloodResult
    retrievalSafety?: RetrievalSafetyResult
    moltStatus?: string
  }
}

// ==================== WEIGHT CONFIGURATION ====================

// V2 Weights - Soak Score (Biological/Feeding)
const SOAK_WEIGHTS = {
  scentHydraulics: 0.40,    // Current speed over soak duration
  moltQuality: 0.25,        // Temperature-based meat quality
  tideDirection: 0.15,      // Flood > Ebb (crabs move in)
  photoperiod: 0.15,        // % of soak during night
  barometer: 0.05,          // Rising pressure = better retention
}

// Legacy weights for reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LEGACY_WEIGHTS = {
  moltCycle: 0.35,
  tidalActivity: 0.25,
  timeOfDay: 0.15,
  moonPhase: 0.10,
  pressureTrend: 0.05,
  safetyConditions: 0.10,
}


// ==================== MAIN ALGORITHM ====================

export interface CrabAlgorithmContext extends AlgorithmContext {
  // V2 Soak-based scoring
  soakDurationHours?: number   // Hours of soak time (default 12)
  windDirection?: number       // Degrees (0-360)
  currentDirection?: number    // Degrees (0-360)
  // Note: For soak analysis, we need forecasted tide/weather data
  // This simplified version uses current conditions as proxy
}

/**
 * Calculate Dungeness Crab fishing score v2
 *
 * V2 Soak-Based Scoring:
 * - Soak Score: Biological feeding/recruitment during trap soak
 * - Haul Score: Retrieval safety at future timestamp
 * - Final score combines both with nocturnal flood bonus
 *
 * @param soakDurationHours - Default 12 hours (typical overnight soak)
 */
export function calculateCrabScoreV2(
  weather: OpenMeteo15MinData,
  context: CrabAlgorithmContext,
  tideData?: CHSWaterData
): CrabScoreResult {
  const factors: CrabScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const strategyAdvice: string[] = []
  let isSafe = true

  const soakDurationHours = context.soakDurationHours ?? 12
  const waterTemp = tideData?.waterTemperature ?? 10 // Default cold water
  const currentSpeed = Math.abs(tideData?.currentSpeed || 0)

  // ==================== SCENT HYDRAULICS (40%) ====================
  // Analyze current over soak duration (simplified: use current value as proxy)
  // In production, would fetch forecast data for full soak period

  const currentSpeeds = Array(soakDurationHours).fill(currentSpeed)
  const scentHydraulics = calculateScentHydraulics(currentSpeeds)

  factors['scentHydraulics'] = {
    value: `${scentHydraulics.averageCurrentSpeed} kts avg`,
    weight: SOAK_WEIGHTS.scentHydraulics,
    score: scentHydraulics.score,
    description: scentHydraulics.recommendation
  }

  strategyAdvice.push(scentHydraulics.recommendation)

  if (scentHydraulics.trapRollRisk) {
    safetyWarnings.push('Trap roll risk during soak - secure gear properly')
  }

  // ==================== MOLT QUALITY INDEX (25%) ====================

  const moltQuality = calculateMoltQualityIndex(waterTemp)

  factors['moltQuality'] = {
    value: `${waterTemp.toFixed(1)}°C`,
    weight: SOAK_WEIGHTS.moltQuality,
    score: moltQuality.score,
    description: moltQuality.quality
  }

  strategyAdvice.push(moltQuality.advice)

  // ==================== TIDE DIRECTION (15%) ====================
  // Flood tide > Ebb tide (crabs move into shallows on flood)

  const isFlood = tideData?.isRising ?? true
  const tideDirectionScore = isFlood ? 1.0 : 0.7

  factors['tideDirection'] = {
    value: isFlood ? 'flood' : 'ebb',
    weight: SOAK_WEIGHTS.tideDirection,
    score: tideDirectionScore,
    description: isFlood ? 'Flood - crabs moving in' : 'Ebb - crabs moving out'
  }

  // ==================== PHOTOPERIOD (15%) ====================
  // % of soak during night (simplified: if deploy now, how much is night?)

  const isNight = weather.timestamp < context.sunrise || weather.timestamp > context.sunset
  const photoperiodScore = isNight ? 1.0 : 0.5 // Simplified binary

  factors['photoperiod'] = {
    value: isNight ? 'night soak' : 'day soak',
    weight: SOAK_WEIGHTS.photoperiod,
    score: photoperiodScore,
    description: isNight ? 'Night deployment - ideal' : 'Day deployment - less active'
  }

  // ==================== BAROMETER (5%) ====================
  // Rising pressure correlates with better trap retention

  const pressureChange = context.pressureHistory && context.pressureHistory.length > 0
    ? weather.pressure - context.pressureHistory[0]
    : 0

  const barometerScore = pressureChange > 0 ? 0.8 : pressureChange === 0 ? 0.6 : 0.4

  factors['barometer'] = {
    value: `${pressureChange >= 0 ? '+' : ''}${pressureChange.toFixed(1)} hPa`,
    weight: SOAK_WEIGHTS.barometer,
    score: barometerScore,
    description: pressureChange > 0 ? 'rising' : pressureChange === 0 ? 'stable' : 'falling'
  }

  // ==================== CALCULATE SOAK SCORE ====================

  const soakScore = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // ==================== NOCTURNAL FLOOD BONUS ====================

  const nocturnalFlood = calculateNocturnalFloodBonus(
    weather.timestamp,
    soakDurationHours,
    context.sunset,
    context.sunrise,
    isFlood
  )

  strategyAdvice.push(nocturnalFlood.advice)

  // ==================== HAUL SCORE (RETRIEVAL SAFETY) ====================
  // Check conditions at retrieval time (simplified: use current conditions)

  const waveHeight = Math.min((weather.windSpeed / 3.6) * 0.1, 5.0)
  const retrievalSafety = calculateRetrievalSafety(
    weather.windSpeed,
    currentSpeed,
    waveHeight
  )

  const haulScore = retrievalSafety.score * 10

  safetyWarnings.push(...retrievalSafety.warnings)
  strategyAdvice.push(...retrievalSafety.recommendations)

  if (!retrievalSafety.isSafe) {
    isSafe = false
  }

  // ==================== COMBINE SCORES ====================

  // Final score = (Soak Score * Nocturnal Flood Multiplier) * 0.7 + Haul Score * 0.3
  // Soak matters more, but unsafe haul ruins the trip
  let total = (soakScore * nocturnalFlood.multiplier) * 0.7 + haulScore * 0.3

  // Safety capping
  if (!isSafe) {
    total = Math.min(total, 3.0)
    strategyAdvice.unshift('⚠️ Unsafe retrieval conditions - score capped')
  }

  // Clamp to 0-10 range
  total = Math.min(Math.max(total, 0), 10)

  // Year-round season (quality varies by molt cycle)
  const isInSeason = true

  return {
    total: Math.round(total * 100) / 100,
    soakScore: Math.round(soakScore * 100) / 100,
    haulScore: Math.round(haulScore * 100) / 100,
    factors,
    isSafe,
    safetyWarnings,
    isInSeason,
    algorithmVersion: 'crab-v2.0',
    strategyAdvice,
    moltQuality,
    debug: {
      scentHydraulics,
      nocturnalFlood,
      retrievalSafety,
      moltStatus: moltQuality.quality
    }
  }
}

export default calculateCrabScoreV2
