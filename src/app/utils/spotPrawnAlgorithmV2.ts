// Spot Prawn Algorithm V2
// Optimized for extreme depth industrial logistics in BC waters
//
// V2 Bio-Mechanics Philosophy:
// - "Deep Space" mission - managing heavy gear at 200-400ft depths
// - Catenary drag: Even 0.5 kts current creates massive rope blowback
// - Slack window duration: Need 20+ min window to retrieve 4 traps safely
// - Intra-season decay: 80% of biomass caught in first 14 days
// - Moon inverted: Prawns are prey, hide on bright nights
// - DFO gatekeeper: Short 6-week season (mid-May to June)
//
// Key V2 Features:
// 1. Catenary Drag - Max safe current scales with depth (300ft = 0.65 kts)
// 2. Slack Window Duration - Neap tides (long window) heavily favored
// 3. Intra-Season Decay - Linear degradation after opening day
// 4. Moon Darkness (INVERTED) - New moon = peak activity
// 5. Retrieval Safety - Wind/wave gatekeeper for heavy trap operations

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { AlgorithmContext } from './chinookAlgorithmV2'
import { getMoonPhase, getMoonIllumination } from './astronomicalCalculations'
import {
  calculateCatenaryDrag,
  calculateSlackWindowDuration,
  calculatePrawnDarkness,
  type CatenaryDragResult,
  type SlackWindowResult,
  type PrawnDarknessResult
} from './physicsHelpers'

// ==================== INTERFACES ====================

export interface SpotPrawnScoreResult {
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
  seasonStatus: 'open' | 'closed' | 'unknown'
  algorithmVersion: string
  strategyAdvice?: string[]
  debug?: {
    catenaryDrag?: CatenaryDragResult
    slackWindow?: SlackWindowResult
    prawnDarkness?: PrawnDarknessResult
    daysIntoSeason?: number
  }
}

// ==================== WEIGHT CONFIGURATION ====================

// V2 Weights - Extreme Depth Logistics
const WEIGHTS = {
  // CATENARY PHYSICS (45%) - Rope blowback at depth
  catenaryDrag: 0.45,       // Current + depth = max safe threshold

  // SLACK WINDOW (20%) - Duration of safe retrieval window
  slackWindow: 0.20,        // Neap = long window, Spring = rush

  // INTRA-SEASON DECAY (15%) - Fishery degrades daily
  intraSeason: 0.15,        // Day 1 = 100%, Day 40 = 20%

  // DARKNESS (10%) - Moon + time (inverted)
  darkness: 0.10,           // New moon = good, Full moon = poor

  // RETRIEVAL SAFETY (10%) - Wind/wave gatekeeper
  retrievalSafety: 0.10,    // Heavy traps in rough seas = dangerous
}

// Legacy weights for reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LEGACY_WEIGHTS = {
  slackTide: 0.50,
  tidalRange: 0.10,
  timeOfDay: 0.20,
  intraSeasonPosition: 0.15,
  solunar: 0.05,
}

// ==================== SEASON GATEKEEPER ====================

/**
 * Check if spot prawn season is open
 * DFO typically opens mid-May for ~6 weeks
 * Returns gatekeeper status - if closed, entire algorithm returns 0
 */
export function checkSpotPrawnSeason(
  date: Date,
  seasonOpenDate?: Date,
  seasonCloseDate?: Date
): { isOpen: boolean; daysIntoSeason: number; status: 'open' | 'closed' | 'unknown' } {
  // If explicit season dates provided
  if (seasonOpenDate && seasonCloseDate) {
    const isOpen = date >= seasonOpenDate && date <= seasonCloseDate
    const daysIntoSeason = isOpen
      ? Math.floor((date.getTime() - seasonOpenDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0
    return {
      isOpen,
      daysIntoSeason,
      status: isOpen ? 'open' : 'closed'
    }
  }

  // Fallback: estimate based on typical May-June window
  const month = date.getMonth() + 1
  const day = date.getDate()

  // Typical window: May 15 - June 30 (varies annually)
  if (month === 5 && day >= 15) {
    const daysIntoSeason = day - 15
    return { isOpen: true, daysIntoSeason, status: 'open' }
  } else if (month === 6) {
    const daysIntoSeason = 16 + day  // May 15-31 = 16 days, then June
    return { isOpen: true, daysIntoSeason, status: 'open' }
  }

  return { isOpen: false, daysIntoSeason: 0, status: 'closed' }
}

// ==================== SAFETY GATEKEEPER ====================

/**
 * Check safety conditions for spot prawn fishing
 * Must be safe BEFORE calculating score
 */
export function checkSpotPrawnSafety(
  windSpeed: number // km/h
): { isSafe: boolean; warning?: string } {
  const windKnots = windSpeed * 0.539957
  const waveHeight = Math.min((windSpeed / 3.6) * 0.1, 5.0)

  if (windKnots > 20) {
    return {
      isSafe: false,
      warning: `Unsafe: Wind ${Math.round(windKnots)} knots - too dangerous for deep water prawn fishing`
    }
  }

  if (waveHeight > 1.5) {
    return {
      isSafe: false,
      warning: `Unsafe: Wave height ${waveHeight.toFixed(1)}m - too rough for trap operations`
    }
  }

  return { isSafe: true }
}

// ==================== SLACK TIDE ====================

/**
 * Calculate slack tide score for Spot Prawn
 * CRITICAL: Deep water trap fishing requires minimal current
 * Even more current-sensitive than rockfish
 */
export function calculateSpotPrawnSlackScore(
  tideData?: CHSWaterData
): { score: number; description: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_tide_data' }
  }

  const currentSpeed = Math.abs(tideData.currentSpeed || 0)

  // Very strict slack requirements
  if (currentSpeed <= 0.2) {
    return { score: 1.0, description: 'perfect_slack' }
  } else if (currentSpeed <= 0.4) {
    return { score: 0.9, description: 'near_slack' }
  } else if (currentSpeed <= 0.6) {
    return { score: 0.7, description: 'light_flow' }
  } else if (currentSpeed <= 1.0) {
    return { score: 0.4, description: 'moderate_flow' }
  } else {
    return { score: 0.1, description: 'too_much_current' }
  }
}

// ==================== TIDAL RANGE ====================

/**
 * Calculate tidal range score for Spot Prawn
 * Neap tides = longer slack windows for deep trap work
 */
export function calculateSpotPrawnTidalRangeScore(
  tideData?: CHSWaterData
): { score: number; description: string } {
  if (!tideData) {
    return { score: 0.5, description: 'no_data' }
  }

  const tidalRange = Math.abs(tideData.tidalRange || 0)

  // Inverted: smaller range preferred
  if (tidalRange <= 1.0) {
    return { score: 1.0, description: 'neap_ideal' }
  } else if (tidalRange <= 1.5) {
    return { score: 0.85, description: 'small_range' }
  } else if (tidalRange <= 2.0) {
    return { score: 0.7, description: 'moderate_range' }
  } else if (tidalRange <= 2.5) {
    return { score: 0.5, description: 'large_range' }
  } else {
    return { score: 0.3, description: 'spring_tide' }
  }
}

// ==================== TIME OF DAY ====================

/**
 * Calculate time of day score for Spot Prawn
 * Spot prawns are crepuscular/nocturnal
 * Dawn = best, Dusk = good, Night = good, Day = poor
 */
export function calculateSpotPrawnTimeScore(
  timestamp: number,
  sunrise: number,
  sunset: number
): { score: number; condition: string } {
  const currentTime = timestamp
  const minutesFromSunrise = (currentTime - sunrise) / 60
  const minutesToSunset = (sunset - currentTime) / 60

  // Dawn (60 min before to 60 min after sunrise) - BEST
  if (minutesFromSunrise >= -60 && minutesFromSunrise <= 60) {
    return { score: 1.0, condition: 'dawn_peak' }
  }

  // Dusk (60 min before to 60 min after sunset) - Good
  if (minutesToSunset >= -60 && minutesToSunset <= 60) {
    return { score: 0.85, condition: 'dusk_good' }
  }

  // Night - Good activity
  if (minutesFromSunrise < -60 || minutesToSunset < -60) {
    return { score: 0.7, condition: 'night_active' }
  }

  // Early morning (post-dawn)
  if (minutesFromSunrise > 60 && minutesFromSunrise <= 150) {
    return { score: 0.6, condition: 'early_morning' }
  }

  // Late afternoon (pre-dusk)
  if (minutesToSunset > 60 && minutesToSunset <= 150) {
    return { score: 0.55, condition: 'late_afternoon' }
  }

  // Midday - prawns hiding
  return { score: 0.4, condition: 'midday_slow' }
}

// ==================== INTRA-SEASON POSITION ====================

/**
 * Calculate intra-season position score
 * First week of season = highest catch rates (1.0)
 * Linear decay to 0.6 by end of season (~6 weeks)
 */
export function calculateIntraSeasonScore(
  daysIntoSeason: number,
  totalSeasonDays: number = 45 // ~6 weeks typical
): { score: number; description: string } {
  if (daysIntoSeason <= 0) {
    return { score: 0.0, description: 'pre_season' }
  }

  // First week (0-7 days) = peak
  if (daysIntoSeason <= 7) {
    return { score: 1.0, description: 'opening_week_peak' }
  }

  // Linear decay from 1.0 to 0.6 over remaining season
  const progress = Math.min((daysIntoSeason - 7) / (totalSeasonDays - 7), 1)
  const score = 1.0 - (0.4 * progress)

  let description: string
  if (daysIntoSeason <= 14) {
    description = 'early_season'
  } else if (daysIntoSeason <= 30) {
    description = 'mid_season'
  } else {
    description = 'late_season'
  }

  return { score: Math.max(score, 0.6), description }
}

// ==================== SOLUNAR ====================

/**
 * Calculate solunar score for Spot Prawn
 * Minor factor - some evidence of lunar influence on deep invertebrates
 */
export function calculateSpotPrawnSolunarScore(
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

export interface SpotPrawnAlgorithmContext extends AlgorithmContext {
  seasonOpenDate?: Date
  seasonCloseDate?: Date
  // V2 Extreme Depth enhancements
  targetDepthFt?: number    // Fishing depth (default 300ft)
  sunElevation?: number     // For time-of-day calculation
  cloudCover?: number       // For darkness calculation
}

/**
 * Calculate Spot Prawn fishing score v2
 *
 * V2 Extreme Depth Philosophy:
 * - Industrial logistics - managing heavy gear at 200-400ft
 * - Catenary drag physics - current tolerance scales with depth
 * - Slack window duration critical - need 20+ min for safe retrieval
 * - Intra-season decay - fishery degrades daily
 */
export function calculateSpotPrawnScoreV2(
  weather: OpenMeteo15MinData,
  context: SpotPrawnAlgorithmContext,
  tideData?: CHSWaterData
): SpotPrawnScoreResult {
  const factors: SpotPrawnScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  const strategyAdvice: string[] = []

  const date = new Date(weather.timestamp * 1000)
  const targetDepthFt = context.targetDepthFt ?? 300

  // ==================== GATEKEEPER: SEASON CHECK ====================

  const { isOpen, daysIntoSeason, status } = checkSpotPrawnSeason(
    date,
    context.seasonOpenDate,
    context.seasonCloseDate
  )

  if (!isOpen) {
    return {
      total: 0,
      factors: {},
      isSafe: true,
      safetyWarnings: status === 'closed'
        ? ['Spot prawn season is closed. Check DFO for current season dates.']
        : ['Cannot determine spot prawn season status. Check DFO announcements.'],
      isInSeason: false,
      seasonStatus: status,
      algorithmVersion: 'spotprawn-v2.0',
      debug: { daysIntoSeason: 0 }
    }
  }

  // ==================== GATEKEEPER: SAFETY CHECK ====================

  const safetyCheck = checkSpotPrawnSafety(weather.windSpeed)
  if (!safetyCheck.isSafe) {
    return {
      total: 0,
      factors: {},
      isSafe: false,
      safetyWarnings: [safetyCheck.warning || 'Conditions unsafe for spot prawn fishing'],
      isInSeason: true,
      seasonStatus: 'open',
      algorithmVersion: 'spotprawn-v2.0',
      strategyAdvice: ['Wait for calm weather window - heavy traps in rough seas are extremely dangerous'],
      debug: { daysIntoSeason }
    }
  }

  // ==================== CATENARY DRAG (45%) ====================
  // Rope blowback at extreme depth

  const currentSpeed = Math.abs(tideData?.currentSpeed || 0)
  const catenaryDrag = calculateCatenaryDrag(currentSpeed, targetDepthFt)

  factors['catenaryDrag'] = {
    value: `${currentSpeed.toFixed(2)} kts @ ${targetDepthFt}ft`,
    weight: WEIGHTS.catenaryDrag,
    score: catenaryDrag.score,
    description: catenaryDrag.lineAngleRisk
  }

  strategyAdvice.push(catenaryDrag.recommendation)

  if (catenaryDrag.lineAngleRisk === 'impossible' || catenaryDrag.lineAngleRisk === 'severe') {
    safetyWarnings.push('Current too strong for safe retrieval - high gear loss risk')
  }

  // ==================== SLACK WINDOW DURATION (20%) ====================
  // Neap tides = long window

  const tidalRange = Math.abs(tideData?.tidalRange || 0)
  const slackWindow = calculateSlackWindowDuration(tidalRange)

  factors['slackWindow'] = {
    value: `${tidalRange.toFixed(1)}m exchange`,
    weight: WEIGHTS.slackWindow,
    score: slackWindow.score,
    description: `${slackWindow.windowDuration} (${slackWindow.estimatedMinutes}min)`
  }

  strategyAdvice.push(slackWindow.recommendation)

  // ==================== INTRA-SEASON DECAY (15%) ====================
  // Fishery degrades linearly: Day 1 = 100%, Day 40 = 20%

  const seasonDecay = Math.max(0.2, 1.0 - (daysIntoSeason * 0.02))

  factors['intraSeason'] = {
    value: `Day ${daysIntoSeason}`,
    weight: WEIGHTS.intraSeason,
    score: seasonDecay,
    description: daysIntoSeason <= 7 ? 'opening_week_peak' : daysIntoSeason <= 20 ? 'mid_season' : 'late_season'
  }

  if (daysIntoSeason <= 7) {
    strategyAdvice.push('🎣 Opening week - peak prawn density!')
  } else if (daysIntoSeason > 30) {
    strategyAdvice.push('Late season - prawn density declining, focus on untouched areas')
  }

  // ==================== DARKNESS (10%) ====================
  // Moon inverted: Dark = good

  const moonPhase = getMoonPhase(date)
  const moonIllum = getMoonIllumination(moonPhase)
  const isNight = weather.timestamp < context.sunrise || weather.timestamp > context.sunset

  const prawnDarkness = calculatePrawnDarkness(moonIllum, isNight)

  factors['darkness'] = {
    value: `${Math.round(moonIllum)}% moon, ${isNight ? 'night' : 'day'}`,
    weight: WEIGHTS.darkness,
    score: prawnDarkness.score,
    description: prawnDarkness.moonCondition
  }

  strategyAdvice.push(prawnDarkness.recommendation)

  // ==================== RETRIEVAL SAFETY (10%) ====================
  // Wind/wave safety for heavy trap operations

  const windKnots = weather.windSpeed * 0.539957
  const retrievalSafetyScore = windKnots < 10 ? 1.0 : windKnots < 15 ? 0.7 : windKnots < 20 ? 0.4 : 0.0

  factors['retrievalSafety'] = {
    value: `${Math.round(windKnots)} kts`,
    weight: WEIGHTS.retrievalSafety,
    score: retrievalSafetyScore,
    description: windKnots < 10 ? 'calm' : windKnots < 15 ? 'moderate' : 'rough'
  }

  // ==================== CALCULATE BASE TOTAL ====================

  let total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // ==================== APPLY NEAP TIDE MULTIPLIER ====================

  if (slackWindow.multiplier !== 1.0) {
    total = total * slackWindow.multiplier
    if (slackWindow.multiplier > 1.0) {
      strategyAdvice.push(`Neap tide bonus: ${((slackWindow.multiplier - 1) * 100).toFixed(0)}% - extra time for deep work`)
    } else {
      strategyAdvice.push(`Spring tide penalty: ${((1 - slackWindow.multiplier) * 100).toFixed(0)}% - short window stress`)
    }
  }

  // ==================== STRATEGY ADVICE ====================

  strategyAdvice.push(`Deploy heavy weights (15lb+) for ${targetDepthFt}ft depth`)
  strategyAdvice.push(`Haul window: ${slackWindow.estimatedMinutes} min - plan trap count accordingly`)

  // Clamp to 0-10 range
  total = Math.min(Math.max(total, 0), 10)

  return {
    total: Math.round(total * 100) / 100,
    factors,
    isSafe: true,
    safetyWarnings,
    isInSeason: true,
    seasonStatus: 'open',
    algorithmVersion: 'spotprawn-v2.0',
    strategyAdvice,
    debug: {
      catenaryDrag,
      slackWindow,
      prawnDarkness,
      daysIntoSeason
    }
  }
}

export default calculateSpotPrawnScoreV2
