// Pink Salmon Algorithm V2
// Optimized for odd-year runs in BC coastal waters
//
// V2 Bio-Mechanics Philosophy:
// - Pinks are "chaos feeders" - massive schools, shallow, visual cues
// - Surface texture critical - need 4-12 kts "salmon chop", not glass calm
// - Estuary rip lines - target where river meets ocean (ebb tide flush)
// - Schooling intel override - runs are binary (millions or zero)
// - Strict odd-year enforcement - even years = no run
//
// Key V2 Features:
// 1. Surface Texture (Salmon Chop) - Optimal 4-12 kts for ripple
// 2. Estuary Flush Dynamics - Rip line strength from ebb magnitude
// 3. Schooling Intel - Bio-intel override from fishing reports
// 4. Strict odd-year gatekeeper
// 5. Visual hunting adjustments - Overcast bonus, turbidity penalty

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { isOddYear } from './astronomicalCalculations'
import { AlgorithmContext } from './chinookAlgorithmV2'
import {
  calculateSurfaceTexture,
  calculateEstuaryFlush,
  detectPinkSchoolingIntel,
  type SurfaceTextureResult,
  type EstuaryFlushResult,
  type SchoolingIntelResult
} from './physicsHelpers'

// ==================== INTERFACES ====================

export interface PinkScoreResult {
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
  isOddYear: boolean
  algorithmVersion: string
  strategyAdvice?: string[]
  debug?: {
    surfaceTexture?: SurfaceTextureResult
    estuaryFlush?: EstuaryFlushResult
    schoolingIntel?: SchoolingIntelResult
    dayOfYear?: number
  }
}

// ==================== WEIGHT CONFIGURATION ====================

// V2 Weights - Seam & Surface Calculator
const WEIGHTS = {
  // ESTUARY DYNAMICS (30%) - The rip line is where Pinks stack
  estuaryFlush: 0.30,       // Ebb magnitude creates rip lines

  // SURFACE CONDITIONS (20%) - The "Salmon Chop"
  surfaceTexture: 0.20,     // 4-12 kts ideal for ripple

  // BIO-INTEL (20%) - Run detection override
  schoolingIntel: 0.20,     // Reports of schools present

  // SEASONALITY (15%) - Still important but reduced
  seasonality: 0.15,        // Odd-year + bell curve around Aug 15

  // VISUAL HUNTING (10%) - Light + cloud cover
  lightConditions: 0.10,    // Overcast bonus for visual hunters

  // WATER CLARITY (5%) - Turbidity penalty
  waterClarity: 0.05,       // Heavy rain = murky = bad
}

// Legacy weights for reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LEGACY_WEIGHTS = {
  seasonality: 0.25,
  tidalPhase: 0.20,
  lightConditions: 0.10,
  currentFlow: 0.10,
  waterClarity: 0.10,
  pressureTrend: 0.05,
  waterTemp: 0.10,
  precipitation: 0.05,
  seaState: 0.05,
}

// ==================== SEASONALITY ====================

/**
 * Calculate seasonality score for Pink Salmon
 * Uses bell curve centered on mid-August (day 227)
 * Returns 0 for even years
 */
export function calculatePinkSeasonalityScore(
  date: Date
): { score: number; description: string } {
  // Even years = no Pink salmon run in BC
  if (!isOddYear(date)) {
    return { score: 0.0, description: 'even_year_no_run' }
  }

  const dayOfYear = getDayOfYear(date)

  // Peak day: August 15 = day 227
  const PEAK_DAY = 227
  // Season window: July 20 (day 201) to September 30 (day 273)
  const SEASON_START = 201
  const SEASON_END = 273

  // Outside season window
  if (dayOfYear < SEASON_START || dayOfYear > SEASON_END) {
    return { score: 0.0, description: 'outside_season' }
  }

  // Calculate distance from peak (0 to ~46 days)
  const distanceFromPeak = Math.abs(dayOfYear - PEAK_DAY)

  // Bell curve scoring using Gaussian-like function
  // Score = e^(-(distance/width)^2)
  // Width of 25 days gives good falloff
  const width = 25
  const score = Math.exp(-Math.pow(distanceFromPeak / width, 2))

  // Determine description based on timing
  let description: string
  if (dayOfYear >= 213 && dayOfYear <= 243) {
    // August 1-31
    description = 'peak_run'
  } else if (dayOfYear >= 201 && dayOfYear < 213) {
    // July 20-31
    description = 'early_run'
  } else if (dayOfYear > 243 && dayOfYear <= 258) {
    // September 1-15
    description = 'late_run'
  } else {
    description = 'tail_end'
  }

  return { score: Math.max(0.1, score), description }
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

// ==================== MAIN ALGORITHM ====================

export interface PinkAlgorithmContext extends AlgorithmContext {
  cloudCover?: number
  precipitation24h?: number
  // V2 Improvements - Extended context
  fishingReportText?: string   // For schooling intel detection
}

/**
 * Calculate Pink Salmon fishing score v2
 *
 * V2 Bio-Mechanics Philosophy:
 * - Surface texture (salmon chop) critical for line-shy fish
 * - Estuary flush creates rip lines where schools stack
 * - Schooling intel overrides marginal weather
 * - Strict odd-year enforcement
 */
export function calculatePinkSalmonScoreV2(
  weather: OpenMeteo15MinData,
  context: PinkAlgorithmContext,
  tideData?: CHSWaterData
): PinkScoreResult {
  const factors: PinkScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const strategyAdvice: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp * 1000)
  const oddYear = isOddYear(date)
  const year = date.getFullYear()

  // ==================== STRICT ODD-YEAR GATEKEEPER ====================

  if (!oddYear) {
    return {
      total: 0,
      factors: {},
      isSafe: true,
      safetyWarnings: [`Even year (${year}) - Pink Salmon runs are negligible in Southern BC`],
      isInSeason: false,
      isOddYear: false,
      algorithmVersion: 'pink-v2.0',
      strategyAdvice: ['Wait for next odd year (2027, 2029, etc.) for Pink runs']
    }
  }

  // ==================== ESTUARY FLUSH (30%) ====================
  // Rip line strength from ebb tide magnitude

  const tidalRange = Math.abs(tideData?.tidalRange || 0)
  const isEbbTide = tideData?.isRising === false

  const estuaryFlush = calculateEstuaryFlush(tidalRange, isEbbTide)

  factors['estuaryFlush'] = {
    value: `${estuaryFlush.tideDrop}m drop`,
    weight: WEIGHTS.estuaryFlush,
    score: estuaryFlush.score,
    description: `${estuaryFlush.ripStrength} rip`
  }

  strategyAdvice.push(estuaryFlush.recommendation)

  // ==================== SURFACE TEXTURE (20%) ====================
  // The "Salmon Chop" - 4-12 kts ideal

  const windSpeedKnots = weather.windSpeed * 0.539957
  const surfaceTexture = calculateSurfaceTexture(windSpeedKnots)

  factors['surfaceTexture'] = {
    value: `${Math.round(windSpeedKnots)} kts`,
    weight: WEIGHTS.surfaceTexture,
    score: surfaceTexture.score,
    description: surfaceTexture.texture
  }

  strategyAdvice.push(surfaceTexture.recommendation)

  // Safety check for extreme wind
  if (windSpeedKnots > 20) {
    isSafe = false
    safetyWarnings.push(`Unsafe: Wind ${Math.round(windSpeedKnots)} knots`)
  }

  // ==================== SCHOOLING INTEL (20%) ====================
  // Bio-intel override - run detection

  const schoolingIntel = detectPinkSchoolingIntel(context.fishingReportText || '')

  factors['schoolingIntel'] = {
    value: schoolingIntel.keywords.length > 0 ? schoolingIntel.keywords.join(', ') : 'no reports',
    weight: WEIGHTS.schoolingIntel,
    score: schoolingIntel.detected ? 1.0 : 0.5,
    description: schoolingIntel.confidence
  }

  if (schoolingIntel.confidence === 'strong_run') {
    strategyAdvice.push('🐟 STRONG RUN REPORTED: Schools are in - get on the water!')
  } else if (schoolingIntel.confidence === 'slow') {
    strategyAdvice.push('Reports indicate slow fishing - be prepared for tough conditions')
  }

  // ==================== SEASONALITY (15%) ====================
  // Odd-year + bell curve around Aug 15

  const { score: seasonalityScore, description: seasonDesc } = calculatePinkSeasonalityScore(date)

  factors['seasonality'] = {
    value: date.getMonth() + 1,
    weight: WEIGHTS.seasonality,
    score: seasonalityScore,
    description: seasonDesc
  }

  // ==================== LIGHT CONDITIONS (10%) ====================
  // Overcast bonus for visual hunters

  const cloudCover = context.cloudCover ?? weather.cloudCover ?? 50
  const hour = date.getHours()

  let lightScore = 0.6 // Base daytime score

  // Dawn/dusk golden hours
  if (hour >= 5 && hour <= 8) {
    lightScore = 1.0
  } else if (hour >= 18 && hour <= 21) {
    lightScore = 1.0
  } else if (hour >= 9 && hour <= 11 || hour >= 16 && hour <= 17) {
    lightScore = 0.7
  }

  // Overcast bonus during midday
  if (hour >= 12 && hour <= 15 && cloudCover > 60) {
    lightScore = 0.7 // Boost from 0.3 base midday
    strategyAdvice.push('Overcast conditions help midday bite')
  }

  factors['lightConditions'] = {
    value: `${hour}:00, ${cloudCover}% cloud`,
    weight: WEIGHTS.lightConditions,
    score: lightScore,
    description: hour >= 5 && hour <= 8 || hour >= 18 && hour <= 21 ? 'golden_hour' : cloudCover > 60 ? 'overcast' : 'bright'
  }

  // ==================== WATER CLARITY (5%) ====================
  // Heavy rain = turbidity penalty

  const precipitation24h = context.precipitation24h ?? (weather.precipitation * 24)

  let clarityScore = 1.0
  if (precipitation24h > 15) {
    clarityScore = 0.5 // Muddy water penalty
    strategyAdvice.push('Turbid water from rain - Pinks struggle to see lures')
  } else if (precipitation24h > 30) {
    clarityScore = 0.3
    strategyAdvice.push('Very murky - consider waiting for water to clear')
  }

  factors['waterClarity'] = {
    value: `${precipitation24h.toFixed(1)}mm/24h`,
    weight: WEIGHTS.waterClarity,
    score: clarityScore,
    description: precipitation24h > 15 ? 'turbid' : precipitation24h > 5 ? 'slightly_colored' : 'clear'
  }

  // ==================== SAFETY CHECKS ====================

  if (weather.precipitation > 20) {
    isSafe = false
    safetyWarnings.push('Unsafe: Heavy precipitation/potential thunderstorm')
  }

  // ==================== CALCULATE BASE TOTAL ====================

  let total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // ==================== APPLY SCHOOLING INTEL MULTIPLIER ====================

  if (schoolingIntel.multiplier !== 1.0) {
    total = total * schoolingIntel.multiplier
    if (schoolingIntel.multiplier > 1.0) {
      strategyAdvice.push(`Run confirmed bonus: ${((schoolingIntel.multiplier - 1) * 100).toFixed(0)}%`)
    } else {
      strategyAdvice.push(`Slow reports penalty: ${((1 - schoolingIntel.multiplier) * 100).toFixed(0)}%`)
    }
  }

  // ==================== SAFETY CAPPING ====================

  if (!isSafe) {
    total = Math.min(total, 3.0)
    strategyAdvice.unshift('⚠️ Conditions unsafe - score capped')
  }

  // Clamp to 0-10 range
  total = Math.min(Math.max(total, 0), 10)

  // Determine if in season
  const isInSeason = seasonalityScore > 0.1

  return {
    total: Math.round(total * 100) / 100,
    factors,
    isSafe,
    safetyWarnings,
    isInSeason,
    isOddYear: oddYear,
    algorithmVersion: 'pink-v2.0',
    strategyAdvice,
    debug: {
      surfaceTexture,
      estuaryFlush,
      schoolingIntel,
      dayOfYear: getDayOfYear(date)
    }
  }
}

export default calculatePinkSalmonScoreV2
