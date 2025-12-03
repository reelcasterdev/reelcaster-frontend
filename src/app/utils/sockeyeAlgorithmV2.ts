// Sockeye Salmon Algorithm V2
// Redesigned for "Interception Model" - Traffic Dynamics, not Feeding Triggers
//
// V2 Bio-Mechanics Philosophy:
// - Sockeye DO NOT FEED in saltwater - they are migrating, not hunting
// - "Traffic Dynamics": Model flow of traffic, traffic jams (stacking), lane discipline (depth corridors)
// - Thermal blockade: Hot rivers cause fish to stack in saltwater = excellent fishing
// - Tidal treadmill: Ebb tide = fish hold against current = easier to intercept
// - Depth corridor: Fish run in specific depth "tube" based on light penetration
// - Bio-intel override: School sightings/commercial openings = 1.5x multiplier
//
// Key V2 Features:
// 1. Thermal Blockade - Hot rivers (>19°C) cause stacking in saltwater
// 2. Tidal Treadmill - Ebb tide interception (fish hold position)
// 3. Bio-Intel Override - Commercial openings/school sightings up to 1.5x
// 4. Depth Corridor Advice - Light-based depth recommendations
// 5. DFO Regulatory Gatekeeper - Most fisheries closed

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { AlgorithmContext } from './chinookAlgorithmV2'
import {
  calculateThermalBlockade,
  calculateTidalTreadmill,
  calculateSockeyeDepthCorridor,
  detectSockeyeBioIntel,
  type ThermalBlockadeResult,
  type TidalTreadmillResult,
  type CorridorDepthResult,
  type SockeyeBioIntelResult
} from './physicsHelpers'

// ==================== INTERFACES ====================

export interface SockeyeScoreResult {
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
  fisheryStatus: 'open' | 'closed' | 'unknown'
  algorithmVersion: string
  strategyAdvice?: string[]
  depthCorridor?: CorridorDepthResult
  debug?: {
    thermalBlockade?: ThermalBlockadeResult
    tidalTreadmill?: TidalTreadmillResult
    bioIntel?: SockeyeBioIntelResult
    runTiming?: string
  }
}

// ==================== RIVER RUN DATA ====================

// Major Sockeye runs in BC with typical timing
// In production, this would come from DFO data
export interface RiverRunInfo {
  riverName: string
  peakStartDay: number  // Day of year
  peakEndDay: number
  totalRunDays: number
}

const MAJOR_SOCKEYE_RUNS: RiverRunInfo[] = [
  { riverName: 'Fraser River (Early Stuart)', peakStartDay: 182, peakEndDay: 196, totalRunDays: 28 }, // July 1-15
  { riverName: 'Fraser River (Early Summer)', peakStartDay: 196, peakEndDay: 213, totalRunDays: 35 }, // July 15 - Aug 1
  { riverName: 'Fraser River (Summer)', peakStartDay: 213, peakEndDay: 244, totalRunDays: 45 }, // Aug 1 - Sep 1
  { riverName: 'Fraser River (Late Summer)', peakStartDay: 244, peakEndDay: 274, totalRunDays: 40 }, // Sep 1 - Oct 1
  { riverName: 'Skeena River', peakStartDay: 196, peakEndDay: 227, totalRunDays: 45 }, // July 15 - Aug 15
  { riverName: 'Nass River', peakStartDay: 182, peakEndDay: 213, totalRunDays: 40 }, // July 1 - Aug 1
]

// ==================== WEIGHT CONFIGURATION ====================

// V2 Weights - Interception Model (Traffic Dynamics)
const WEIGHTS = {
  // BIO-INTEL (35%) - Are the fish actually here?
  bioIntel: 0.35,           // School sightings, commercial openings

  // THERMAL STACKING (25%) - Hot rivers cause saltwater stacking
  thermalBlockade: 0.25,    // River temp vs ocean temp

  // TIDAL RESISTANCE (20%) - Ebb = fish hold position
  tidalTreadmill: 0.20,     // Ebb interception window

  // RUN TIMING (15%) - Calendar-based (reduced - bio-intel overrides)
  runTiming: 0.15,          // River-specific run timing

  // CORRIDOR PHYSICS (5%) - Determines depth, not score
  corridorLight: 0.05,      // Light conditions (mostly for depth advice)
}

// Legacy weights for reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LEGACY_WEIGHTS = {
  runTiming: 0.40,
  tidalPhase: 0.20,
  lightTime: 0.15,
  pressureTrend: 0.10,
  riverConditions: 0.10,
  tidalRange: 0.05,
}

// ==================== FISHERY STATUS GATEKEEPER ====================

/**
 * Check if Sockeye fishery is open
 * Most Sockeye fisheries are CLOSED or highly restricted
 * This is a gatekeeper - returns 0 if fishery is closed
 */
export function checkSockeyeFisheryStatus(
  date: Date,
  fisheryOpen?: boolean // Would come from DFO API
): { isOpen: boolean; status: 'open' | 'closed' | 'unknown'; message: string } {
  // If explicit status provided
  if (fisheryOpen !== undefined) {
    return {
      isOpen: fisheryOpen,
      status: fisheryOpen ? 'open' : 'closed',
      message: fisheryOpen
        ? 'DFO fishery is open for Sockeye'
        : 'DFO Sockeye fishery is currently closed'
    }
  }

  // Estimate based on typical Fraser River openings (July-August)
  const month = date.getMonth() + 1
  const dayOfYear = getDayOfYear(date)

  // Very conservative - most years have limited or no openings
  if (month >= 7 && month <= 8 && dayOfYear >= 196 && dayOfYear <= 244) {
    return {
      isOpen: true, // Uncertain - assume possible opening
      status: 'unknown',
      message: 'Sockeye season possible - check DFO announcements for current openings'
    }
  }

  return {
    isOpen: false,
    status: 'closed',
    message: 'Sockeye fishery typically closed. Check DFO for any special openings.'
  }
}

// ==================== RUN TIMING ====================

/**
 * Calculate run timing score for Sockeye
 * Based on proximity to major run peaks
 * Returns highest score from any applicable run
 */
export function calculateRunTimingScore(
  date: Date,
  targetRiver?: string
): { score: number; description: string; matchedRun?: string } {
  const dayOfYear = getDayOfYear(date)

  let bestScore = 0
  let bestDescription = 'off_season'
  let matchedRun: string | undefined

  // Check each major run
  for (const run of MAJOR_SOCKEYE_RUNS) {
    // Skip if targeting specific river and this isn't it
    if (targetRiver && !run.riverName.toLowerCase().includes(targetRiver.toLowerCase())) {
      continue
    }

    const { peakStartDay, peakEndDay } = run
    const earlyWindow = peakStartDay - 14  // 2 weeks before peak
    const lateWindow = peakEndDay + 14     // 2 weeks after peak

    let score = 0
    let description = ''

    if (dayOfYear >= peakStartDay && dayOfYear <= peakEndDay) {
      // Peak run
      score = 1.0
      description = 'peak_run'
    } else if (dayOfYear >= earlyWindow && dayOfYear < peakStartDay) {
      // Early run - building
      const progress = (dayOfYear - earlyWindow) / (peakStartDay - earlyWindow)
      score = 0.5 + (0.5 * progress)
      description = 'early_run'
    } else if (dayOfYear > peakEndDay && dayOfYear <= lateWindow) {
      // Late run - declining
      const progress = (dayOfYear - peakEndDay) / (lateWindow - peakEndDay)
      score = 1.0 - (0.5 * progress)
      description = 'late_run'
    } else if (dayOfYear >= earlyWindow - 14 && dayOfYear < earlyWindow) {
      // Very early scouts
      score = 0.3
      description = 'early_scouts'
    }

    if (score > bestScore) {
      bestScore = score
      bestDescription = description
      matchedRun = run.riverName
    }
  }

  return {
    score: Math.max(bestScore, 0.1),
    description: bestDescription,
    matchedRun
  }
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

// ==================== TIDAL PHASE ====================

/**
 * Calculate tidal phase score for Sockeye
 * FLOOD TIDE PREFERRED - pushes migrating fish toward river mouths
 * Ebb tide moves fish away from interception zones
 */
export function calculateSockeyeTidalPhaseScore(
  tideData?: CHSWaterData
): { score: number; description: string; phase: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_tide_data', phase: 'unknown' }
  }

  const isRising = tideData.isRising
  const currentSpeed = Math.abs(tideData.currentSpeed || 0)
  const phase = isRising ? 'flood' : 'ebb'

  if (isRising) {
    // Flood tide - fish moving toward river
    if (currentSpeed >= 0.5 && currentSpeed <= 2.0) {
      return { score: 1.0, description: 'optimal_flood', phase }
    } else if (currentSpeed < 0.5) {
      return { score: 0.7, description: 'early_flood', phase }
    } else if (currentSpeed > 2.0 && currentSpeed <= 3.0) {
      return { score: 0.8, description: 'strong_flood', phase }
    } else {
      return { score: 0.5, description: 'extreme_flood', phase }
    }
  } else {
    // Ebb tide - fish moving away from interception points
    if (currentSpeed <= 0.3) {
      return { score: 0.6, description: 'slack_before_flood', phase }
    } else if (currentSpeed <= 1.5) {
      return { score: 0.4, description: 'ebb_tide', phase }
    } else {
      return { score: 0.2, description: 'strong_ebb', phase }
    }
  }
}

// ==================== TIDAL RANGE ====================

/**
 * Calculate tidal range score for Sockeye
 * Large exchanges can move large schools of migrating fish
 */
export function calculateSockeyeTidalRangeScore(
  tideData?: CHSWaterData
): { score: number; description: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_data' }
  }

  const tidalRange = Math.abs(tideData.tidalRange || 0)

  if (tidalRange >= 3.0 && tidalRange <= 4.5) {
    return { score: 1.0, description: 'optimal_exchange' }
  } else if (tidalRange >= 2.5 && tidalRange < 3.0) {
    return { score: 0.9, description: 'strong_exchange' }
  } else if (tidalRange > 4.5) {
    return { score: 0.8, description: 'large_exchange' }
  } else if (tidalRange >= 2.0) {
    return { score: 0.7, description: 'moderate_exchange' }
  } else {
    return { score: 0.5, description: 'minimal_exchange' }
  }
}

// ==================== LIGHT / TIME ====================

/**
 * Calculate light/time score for Sockeye interception
 * Dawn and dusk are prime interception windows
 */
export function calculateSockeyeLightScore(
  timestamp: number,
  sunrise: number,
  sunset: number
): { score: number; condition: string } {
  const currentTime = timestamp
  const minutesFromSunrise = (currentTime - sunrise) / 60
  const minutesToSunset = (sunset - currentTime) / 60

  // Dawn - prime interception
  if (minutesFromSunrise >= 0 && minutesFromSunrise <= 120) {
    return { score: 1.0, condition: 'dawn_prime' }
  }

  // Dusk - good interception
  if (minutesToSunset >= 0 && minutesToSunset <= 120) {
    return { score: 0.9, condition: 'dusk_good' }
  }

  // Pre-dawn
  if (minutesFromSunrise >= -60 && minutesFromSunrise < 0) {
    return { score: 0.8, condition: 'pre_dawn' }
  }

  // Mid-morning
  if (minutesFromSunrise > 120 && minutesFromSunrise <= 240) {
    return { score: 0.6, condition: 'mid_morning' }
  }

  // Late afternoon
  if (minutesToSunset > 120 && minutesToSunset <= 240) {
    return { score: 0.55, condition: 'late_afternoon' }
  }

  // Midday - fish deeper, harder to intercept
  if (minutesFromSunrise > 240 && minutesToSunset > 240) {
    return { score: 0.3, condition: 'midday_deep' }
  }

  return { score: 0.4, condition: 'night' }
}

// ==================== RIVER CONDITIONS ====================

/**
 * Calculate river conditions score for Sockeye
 * High temps or extreme discharge can block migration
 * This factor represents conditions AT the river mouth
 */
export function calculateRiverConditionsScore(
  riverDischarge?: number, // m³/s
  riverTemp?: number       // °C
): { score: number; description: string } {
  // If no river data available
  if (riverDischarge === undefined && riverTemp === undefined) {
    return { score: 0.5, description: 'no_river_data' }
  }

  let tempScore = 0.7  // Default
  let dischargeScore = 0.7

  // Temperature factor
  if (riverTemp !== undefined) {
    if (riverTemp >= 12 && riverTemp <= 18) {
      tempScore = 1.0  // Optimal migration temp
    } else if (riverTemp >= 18 && riverTemp < 20) {
      tempScore = 0.6  // Getting warm
    } else if (riverTemp >= 20 && riverTemp < 22) {
      tempScore = 0.3  // Thermal barrier forming
    } else if (riverTemp >= 22) {
      tempScore = 0.1  // Migration blocked
    } else if (riverTemp < 12) {
      tempScore = 0.7  // Cool but passable
    }
  }

  // Discharge factor (very river-specific, using general guidelines)
  if (riverDischarge !== undefined) {
    // These thresholds vary significantly by river
    if (riverDischarge >= 2000 && riverDischarge <= 6000) {
      dischargeScore = 1.0  // Moderate flow - good migration
    } else if (riverDischarge >= 1000 && riverDischarge < 2000) {
      dischargeScore = 0.8  // Low but passable
    } else if (riverDischarge > 6000 && riverDischarge <= 10000) {
      dischargeScore = 0.7  // High flow
    } else if (riverDischarge > 10000) {
      dischargeScore = 0.4  // Flood conditions - difficult migration
    } else {
      dischargeScore = 0.5  // Very low - unusual
    }
  }

  const score = (tempScore + dischargeScore) / 2

  let description: string
  if (score >= 0.8) {
    description = 'favorable_migration'
  } else if (score >= 0.6) {
    description = 'moderate_conditions'
  } else if (score >= 0.4) {
    description = 'challenging_conditions'
  } else {
    description = 'migration_barriers'
  }

  return { score, description }
}

// ==================== MAIN ALGORITHM ====================

export interface SockeyeAlgorithmContext extends AlgorithmContext {
  fisheryOpen?: boolean
  targetRiver?: string
  riverTemp?: number       // Critical for thermal blockade
  // V2 Interception Model enhancements
  sunElevation?: number    // For depth corridor calculation
  cloudCover?: number      // For depth corridor
  precipitation24h?: number // For salinity plume distance
  fishingReportText?: string // For bio-intel detection
}

/**
 * Calculate Sockeye Salmon fishing score v2
 *
 * V2 Interception Model Philosophy:
 * - Not "are they biting?" but "are they here and can we intercept?"
 * - Thermal blockades cause stacking = excellent fishing
 * - Ebb tide = fish hold against current = easier to intercept
 * - Bio-intel overrides calendar timing
 */
export function calculateSockeyeSalmonScoreV2(
  weather: OpenMeteo15MinData,
  context: SockeyeAlgorithmContext,
  tideData?: CHSWaterData
): SockeyeScoreResult {
  const factors: SockeyeScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const strategyAdvice: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp * 1000)

  // ==================== GATEKEEPER: FISHERY STATUS ====================

  const fisheryCheck = checkSockeyeFisheryStatus(date, context.fisheryOpen)

  if (!fisheryCheck.isOpen && fisheryCheck.status === 'closed') {
    return {
      total: 0,
      factors: {},
      isSafe: true,
      safetyWarnings: [fisheryCheck.message],
      isInSeason: false,
      fisheryStatus: 'closed',
      algorithmVersion: 'sockeye-v2.0',
      strategyAdvice: ['Check DFO for emergency openings or test fishery announcements']
    }
  }

  // Add advisory if status unknown
  if (fisheryCheck.status === 'unknown') {
    safetyWarnings.push(fisheryCheck.message)
  }

  // ==================== BIO-INTEL (35%) ====================
  // Are the fish actually here? (Overrides calendar timing)

  const bioIntel = detectSockeyeBioIntel(context.fishingReportText || '')

  factors['bioIntel'] = {
    value: bioIntel.keywords.length > 0 ? bioIntel.keywords.join(', ') : 'no reports',
    weight: WEIGHTS.bioIntel,
    score: bioIntel.detected ? 1.0 : 0.5,
    description: bioIntel.confidence
  }

  if (bioIntel.confidence === 'massive_run') {
    strategyAdvice.push('🚨 COMMERCIAL OPENING or MASSIVE RUN confirmed - get on the water NOW!')
  } else if (bioIntel.confidence === 'confirmed_schools') {
    strategyAdvice.push('Schools confirmed - fish are present')
  }

  // ==================== THERMAL BLOCKADE (25%) ====================
  // Hot rivers cause stacking in saltwater

  const riverTemp = context.riverTemp ?? 15 // Default moderate

  const thermalBlockade = calculateThermalBlockade(riverTemp)

  factors['thermalBlockade'] = {
    value: `River ${riverTemp.toFixed(1)}°C`,
    weight: WEIGHTS.thermalBlockade,
    score: thermalBlockade.score,
    description: thermalBlockade.riverStatus
  }

  strategyAdvice.push(thermalBlockade.recommendation)

  // ==================== TIDAL TREADMILL (20%) ====================
  // Ebb = fish hold against current = easier interception

  const currentSpeed = Math.abs(tideData?.currentSpeed || 0)
  const isEbbTide = tideData?.isRising === false

  const tidalTreadmill = calculateTidalTreadmill(isEbbTide, currentSpeed)

  factors['tidalTreadmill'] = {
    value: `${isEbbTide ? 'Ebb' : 'Flood'} ${currentSpeed.toFixed(1)} kts`,
    weight: WEIGHTS.tidalTreadmill,
    score: tidalTreadmill.score,
    description: tidalTreadmill.interceptionQuality
  }

  strategyAdvice.push(tidalTreadmill.recommendation)

  // ==================== RUN TIMING (15%) ====================
  // Calendar-based (reduced weight - bio-intel overrides)

  const { score: runScore, description: runDesc, matchedRun } = calculateRunTimingScore(
    date,
    context.targetRiver
  )

  factors['runTiming'] = {
    value: getDayOfYear(date),
    weight: WEIGHTS.runTiming,
    score: runScore,
    description: runDesc + (matchedRun ? ` (${matchedRun})` : '')
  }

  // ==================== CORRIDOR PHYSICS (5%) ====================
  // Determines depth advice, minimal score impact

  const sunElevation = context.sunElevation ?? 30
  const cloudCover = context.cloudCover ?? weather.cloudCover ?? 50

  const depthCorridor = calculateSockeyeDepthCorridor(sunElevation, cloudCover)

  const lightScore = sunElevation < 10 || cloudCover > 80 ? 1.0 : sunElevation > 40 && cloudCover < 30 ? 0.7 : 0.85

  factors['corridorLight'] = {
    value: `Sun ${Math.round(sunElevation)}°, ${cloudCover}% cloud`,
    weight: WEIGHTS.corridorLight,
    score: lightScore,
    description: depthCorridor.depthRationale
  }

  strategyAdvice.push(`Target Depth: ${depthCorridor.targetDepth} (${depthCorridor.depthRationale})`)
  strategyAdvice.push(depthCorridor.leaderAdvice)

  // Salinity plume advice
  const precipitation24h = context.precipitation24h ?? (weather.precipitation * 24)
  if (precipitation24h > 20) {
    strategyAdvice.push('Heavy river outflow - target outer plume edges (further offshore)')
  }

  // ==================== SEA STATE SAFETY ====================

  const windKnots = weather.windSpeed * 0.539957
  const waveHeight = Math.min((weather.windSpeed / 3.6) * 0.1, 5.0)

  if (windKnots > 25 || waveHeight > 2.0) {
    isSafe = false
    safetyWarnings.push(
      windKnots > 25
        ? `Unsafe: Wind ${Math.round(windKnots)} knots`
        : `Unsafe: Wave height ${waveHeight.toFixed(1)}m`
    )
  }

  // ==================== CALCULATE TOTAL ====================

  let total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // ==================== APPLY BIO-INTEL MULTIPLIER ====================

  if (bioIntel.multiplier > 1.0) {
    total = total * bioIntel.multiplier
    strategyAdvice.push(`Run confirmed bonus: ${((bioIntel.multiplier - 1) * 100).toFixed(0)}%`)
  }

  // ==================== SAFETY CAPPING ====================

  if (!isSafe) {
    total = Math.min(total, 3.0)
    strategyAdvice.unshift('⚠️ Conditions unsafe - score capped')
  }

  // Off-season penalty
  if (runScore < 0.3) {
    total = Math.min(total, 2.0)
  }

  // Clamp to 0-10 range
  total = Math.min(Math.max(total, 0), 10)

  // Determine if in season
  const isInSeason = runScore >= 0.3 && fisheryCheck.status !== 'closed'

  return {
    total: Math.round(total * 100) / 100,
    factors,
    isSafe,
    safetyWarnings,
    isInSeason,
    fisheryStatus: fisheryCheck.status,
    algorithmVersion: 'sockeye-v2.0',
    strategyAdvice,
    depthCorridor,
    debug: {
      thermalBlockade,
      tidalTreadmill,
      bioIntel,
      runTiming: matchedRun
    }
  }
}

export default calculateSockeyeSalmonScoreV2
