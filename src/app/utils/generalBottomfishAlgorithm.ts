// General Bottomfish Algorithm V1.5
// "Bottom-Bouncer" Predictive Model
//
// Target Species: Lingcod, Halibut, Rockfish (when no specific species selected)
// Philosophy: "Access is Everything" - If you can't hold position over structure, you can't fish
// Logic Type: Deterministic Physics Engine (Zero User Input)
//
// Core Principle:
// Biology is secondary to drift physics. The primary constraint is whether the angler
// can maintain vertical contact with bottom structure.

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { reverseSigmoid } from './physicsHelpers'

// ==================== CONFIGURATION CONSTANTS ====================

export const GENERAL_BOTTOMFISH_CONFIG = {
  // MATH CONSTANTS
  TIDE_SIGMOID_K: 4.0,          // Curve steepness for tide scoring
  TIDE_MIDPOINT: 1.0,           // Knots - where score = 50
  WIND_SIGMOID_K: 0.5,          // Curve steepness for wind scoring
  WIND_MIDPOINT: 10.0,          // Knots - where score = 50

  // SWELL MODIFIERS
  SWELL_MODIFIERS: {
    LONG: 0.6,    // Period >= 12s (gentle rollers)
    STD: 1.0,     // Period 8-12s (standard)
    SHORT: 1.5    // Period < 8s (steep chop)
  },

  // SAFETY THRESHOLDS
  UNFISHABLE_WIND: 15.0,        // Knots
  UNFISHABLE_SWELL: 1.0,        // Meters (effective swell)
  RUNAWAY_ALIGNMENT_DEG: 45,    // Degrees - wind/current aligned
  RUNAWAY_WIND_MIN: 8.0,        // Knots
  RUNAWAY_CURRENT_MIN: 0.8,     // Knots
  OPPOSING_MIN_DEG: 135,        // Degrees - wind against tide
  OPPOSING_MAX_DEG: 225,        // Degrees

  // SAFETY CAPS
  UNFISHABLE_CAP: 40,           // Max score when unfishable
  RUNAWAY_CAP: 55,              // Max score for runaway drift
  NIGHT_CAP: 20,                // Max score at night (navigation hazard)

  // COMBO MULTIPLIERS
  ARMCHAIR_CURRENT_MAX: 0.5,    // Knots
  ARMCHAIR_WIND_MAX: 5.0,       // Knots
  ARMCHAIR_MULTIPLIER: 1.25,
  WIND_AGAINST_TIDE_MULTIPLIER: 0.50,
  WIND_AGAINST_TIDE_WIND_MIN: 10.0,
  WIND_AGAINST_TIDE_CURRENT_MIN: 0.6,
  PRESSURE_DROP_MULTIPLIER: 1.10,
  PRESSURE_DROP_THRESHOLD: -1.0 // hPa
}

// ==================== INTERFACES ====================

export interface GeneralBottomfishResult {
  total: number // 0-10 scale
  physicsCore: {
    baseScore: number
    factors: {
      tideSpeed: { score: number; weight: number; value: number }
      windSpeed: { score: number; weight: number; value: number }
      effectiveSwell: { score: number; weight: number; value: number }
      pressure: { score: number; weight: number; value: string }
      solunar: { score: number; weight: number; value: string }
    }
  }
  safetyCaps: {
    unfishableDrift?: { triggered: boolean; cap: number }
    runawayDrift?: { triggered: boolean; cap: number }
    nightCap?: { triggered: boolean; cap: number }
    appliedCap?: number
  }
  comboMultipliers: {
    armchairRide?: { applied: boolean; multiplier: number }
    windAgainstTide?: { applied: boolean; multiplier: number }
    pressureDrop?: { applied: boolean; multiplier: number }
    totalMultiplier: number
  }
  isSafe: boolean
  safetyWarnings: string[]
  strategyAdvice: string[]
  debug: {
    baseBeforeCaps: number
    afterCaps: number
    afterMultipliers: number
    final: number
  }
}

// ==================== LAYER 1: PHYSICS CORE ====================

/**
 * Calculate Tide Speed Score (45% weight)
 * Inverted sigmoid - lower current = better score
 * "The Anchor" - primary constraint on bottom contact
 */
function calculateTideSpeedScore(currentSpeed: number): number {
  // Use inverted sigmoid: score = 100 / (1 + exp(k * (speed - midpoint)))
  // k=4.0, midpoint=1.0
  const score = reverseSigmoid(
    currentSpeed,
    GENERAL_BOTTOMFISH_CONFIG.TIDE_MIDPOINT,
    GENERAL_BOTTOMFISH_CONFIG.TIDE_SIGMOID_K
  )

  return score / 10 // Normalize to 0-10
}

/**
 * Calculate Wind Speed Score (35% weight)
 * Inverted sigmoid - lower wind = better score
 * "The Scope" - determines boat drift speed
 */
function calculateWindSpeedScore(windSpeed: number): number {
  const windKnots = windSpeed * 0.539957 // km/h to knots

  // Use inverted sigmoid: score = 100 / (1 + exp(k * (speed - midpoint)))
  // k=0.5, midpoint=10.0
  const score = reverseSigmoid(
    windKnots,
    GENERAL_BOTTOMFISH_CONFIG.WIND_MIDPOINT,
    GENERAL_BOTTOMFISH_CONFIG.WIND_SIGMOID_K
  )

  return score / 10 // Normalize to 0-10
}

/**
 * Calculate Effective Swell Score (10% weight)
 * Adjust swell height based on period to detect "chop" vs "heave"
 * "The Platform" - jigging stability
 */
function calculateEffectiveSwellScore(
  swellHeight: number,
  swellPeriod: number
): { score: number; effectiveSwell: number; modifier: number } {
  // Default period to 8s if not provided
  const period = swellPeriod || 8

  // Determine period modifier
  let modifier: number
  if (period >= 12) {
    modifier = GENERAL_BOTTOMFISH_CONFIG.SWELL_MODIFIERS.LONG // 0.6 - Gentle rollers
  } else if (period >= 8) {
    modifier = GENERAL_BOTTOMFISH_CONFIG.SWELL_MODIFIERS.STD // 1.0 - Standard
  } else {
    modifier = GENERAL_BOTTOMFISH_CONFIG.SWELL_MODIFIERS.SHORT // 1.5 - Steep chop
  }

  // Calculate effective swell
  const effectiveSwell = swellHeight * modifier

  // Score calculation: score = max(0, 100 - (effectiveSwell * 100))
  // Normalize to 0-10
  const score = Math.max(0, 10 - (effectiveSwell * 10))

  return { score, effectiveSwell, modifier }
}

/**
 * Calculate Barometric Pressure Score (5% weight)
 * "The Trigger" - feeding behavior trigger
 */
function calculatePressureScore(
  pressureChange3hr: number
): { score: number; description: string } {
  let score: number
  let description: string

  if (pressureChange3hr < -1.0) {
    // Falling pressure
    score = 10.0
    description = 'falling'
  } else if (pressureChange3hr < 0) {
    // Mild fall
    score = 8.0
    description = 'mild_fall'
  } else if (Math.abs(pressureChange3hr) < 0.5) {
    // Stable
    score = 5.0
    description = 'stable'
  } else {
    // Rising
    score = 3.0
    description = 'rising'
  }

  return { score, description }
}

/**
 * Calculate Solunar Score (5% weight)
 */
function calculateSolunarScore(
  timestamp: number
): { score: number; period: string } {
  // Simplified solunar based on time of day
  const date = new Date(timestamp * 1000)
  const hour = date.getHours()

  // Major periods: dawn/dusk, noon/midnight
  const isMajor = (hour >= 5 && hour <= 7) ||
                  (hour >= 17 && hour <= 19) ||
                  (hour >= 11 && hour <= 13) ||
                  (hour >= 23 || hour <= 1)

  // Minor periods: mid-morning, mid-afternoon
  const isMinor = (hour >= 9 && hour <= 11) ||
                  (hour >= 15 && hour <= 17)

  if (isMajor) {
    return { score: 9.0, period: 'major' }
  } else if (isMinor) {
    return { score: 7.0, period: 'minor' }
  } else {
    return { score: 5.0, period: 'none' }
  }
}

// ==================== LAYER 2: SAFETY CAPS ====================

/**
 * Check for Unfishable Drift conditions
 * Trigger: Wind > 15 kts OR Effective Swell > 1.0m
 * Cap: Max score 40
 */
function checkUnfishableDrift(
  windSpeed: number,
  effectiveSwell: number
): { triggered: boolean; reason?: string } {
  const windKnots = windSpeed * 0.539957

  if (windKnots > GENERAL_BOTTOMFISH_CONFIG.UNFISHABLE_WIND) {
    return {
      triggered: true,
      reason: `Wind ${windKnots.toFixed(0)} kts exceeds ${GENERAL_BOTTOMFISH_CONFIG.UNFISHABLE_WIND} kts limit`
    }
  }

  if (effectiveSwell > GENERAL_BOTTOMFISH_CONFIG.UNFISHABLE_SWELL) {
    return {
      triggered: true,
      reason: `Effective swell ${effectiveSwell.toFixed(1)}m exceeds ${GENERAL_BOTTOMFISH_CONFIG.UNFISHABLE_SWELL}m limit`
    }
  }

  return { triggered: false }
}

/**
 * Check for Runaway Drift (Conveyor Belt Effect)
 * Trigger: Wind & Current aligned (<45° diff) AND Wind >8kts AND Current >0.8kts
 * Cap: Max score 55
 */
function checkRunawayDrift(
  windSpeed: number,
  windDirection: number,
  currentSpeed: number,
  currentDirection: number
): { triggered: boolean; reason?: string; angleDiff?: number } {
  const windKnots = windSpeed * 0.539957

  // Calculate angle difference
  let angleDiff = Math.abs(windDirection - currentDirection)
  if (angleDiff > 180) angleDiff = 360 - angleDiff

  const isAligned = angleDiff < GENERAL_BOTTOMFISH_CONFIG.RUNAWAY_ALIGNMENT_DEG
  const strongWind = windKnots > GENERAL_BOTTOMFISH_CONFIG.RUNAWAY_WIND_MIN
  const strongCurrent = currentSpeed > GENERAL_BOTTOMFISH_CONFIG.RUNAWAY_CURRENT_MIN

  if (isAligned && strongWind && strongCurrent) {
    return {
      triggered: true,
      reason: `Wind (${windKnots.toFixed(0)} kts) & Current (${currentSpeed.toFixed(1)} kts) aligned at ${angleDiff}° - Conveyor Belt Effect`,
      angleDiff
    }
  }

  return { triggered: false, angleDiff }
}

/**
 * Check for Night Cap
 * Trigger: Time between sunset and sunrise
 * Cap: Max score 20 (visual navigation safety hazard)
 */
function checkNightCap(
  timestamp: number,
  sunrise: number,
  sunset: number
): { triggered: boolean; reason?: string } {
  const isNight = timestamp < sunrise || timestamp > sunset

  if (isNight) {
    return {
      triggered: true,
      reason: 'Night fishing - visual navigation hazard'
    }
  }

  return { triggered: false }
}

// ==================== LAYER 3: COMBO MULTIPLIERS ====================

/**
 * Check for Armchair Ride conditions
 * Condition: Current < 0.5 kts AND Wind < 5 kts
 * Effect: ×1.25 multiplier
 * Rationale: Perfect vertical control, high catch efficiency
 */
function checkArmchairRide(
  currentSpeed: number,
  windSpeed: number
): { applies: boolean } {
  const windKnots = windSpeed * 0.539957

  const calm = currentSpeed < GENERAL_BOTTOMFISH_CONFIG.ARMCHAIR_CURRENT_MAX &&
               windKnots < GENERAL_BOTTOMFISH_CONFIG.ARMCHAIR_WIND_MAX

  return { applies: calm }
}

/**
 * Check for Wind-Against-Tide penalty
 * Condition: Wind/Current opposing (135-225°) AND Wind >10kts AND Current >0.6kts
 * Effect: ×0.50 multiplier
 * Rationale: Dangerous steep waves ("Stand up chop")
 */
function checkWindAgainstTide(
  windSpeed: number,
  windDirection: number,
  currentSpeed: number,
  currentDirection: number
): { applies: boolean; angleDiff?: number } {
  const windKnots = windSpeed * 0.539957

  // Calculate angle difference
  let angleDiff = Math.abs(windDirection - currentDirection)
  if (angleDiff > 180) angleDiff = 360 - angleDiff

  const isOpposing = angleDiff >= GENERAL_BOTTOMFISH_CONFIG.OPPOSING_MIN_DEG &&
                     angleDiff <= GENERAL_BOTTOMFISH_CONFIG.OPPOSING_MAX_DEG

  const strongWind = windKnots > GENERAL_BOTTOMFISH_CONFIG.WIND_AGAINST_TIDE_WIND_MIN
  const strongCurrent = currentSpeed > GENERAL_BOTTOMFISH_CONFIG.WIND_AGAINST_TIDE_CURRENT_MIN

  const applies = isOpposing && strongWind && strongCurrent

  return { applies, angleDiff }
}

/**
 * Check for Pressure Drop bonus
 * Condition: Barometer falling AND Swell < 1.0m
 * Effect: ×1.10 multiplier
 * Rationale: Biological feeding trigger activated
 */
function checkPressureDrop(
  pressureChange3hr: number,
  effectiveSwell: number
): { applies: boolean } {
  const falling = pressureChange3hr < GENERAL_BOTTOMFISH_CONFIG.PRESSURE_DROP_THRESHOLD
  const calmSeas = effectiveSwell < 1.0

  return { applies: falling && calmSeas }
}

// ==================== MAIN ALGORITHM ====================

/**
 * Calculate General Bottomfish Score
 * For use when no specific species is selected
 */
export function calculateGeneralBottomfishScore(
  weather: OpenMeteo15MinData,
  sunrise: number,
  sunset: number,
  tideData?: CHSWaterData,
  pressureHistory?: number[]
): GeneralBottomfishResult {
  const strategyAdvice: string[] = []
  const safetyWarnings: string[] = []
  let isSafe = true

  // Extract values
  const currentSpeed = Math.abs(tideData?.currentSpeed || 0)
  const currentDirection = tideData?.currentDirection || 0
  const windSpeed = weather.windSpeed
  const windDirection = weather.windDirection
  const swellHeight = weather.swellHeight || 0
  const swellPeriod = weather.swellPeriod || 8

  // Calculate 3-hour pressure change
  let pressureChange3hr = 0
  if (pressureHistory && pressureHistory.length >= 12) {
    const pressure3hrAgo = pressureHistory[pressureHistory.length - 12]
    pressureChange3hr = weather.pressure - pressure3hrAgo
  }

  // ==================== LAYER 1: PHYSICS CORE ====================

  // A. Tide Speed (45%)
  const tideScore = calculateTideSpeedScore(currentSpeed)

  // B. Wind Speed (35%)
  const windScore = calculateWindSpeedScore(windSpeed)

  // C. Effective Swell (10%)
  const swellResult = calculateEffectiveSwellScore(swellHeight, swellPeriod)

  // D. Barometric Pressure (5%)
  const pressureResult = calculatePressureScore(pressureChange3hr)

  // E. Solunar (5%)
  const solunarResult = calculateSolunarScore(weather.timestamp)

  // Calculate base score (weighted average)
  const baseScore = (
    tideScore * 0.45 +
    windScore * 0.35 +
    swellResult.score * 0.10 +
    pressureResult.score * 0.05 +
    solunarResult.score * 0.05
  )

  let finalScore = baseScore

  // ==================== LAYER 2: SAFETY CAPS ====================

  const safetyCaps: GeneralBottomfishResult['safetyCaps'] = {}

  // Check Unfishable Drift
  const unfishable = checkUnfishableDrift(windSpeed, swellResult.effectiveSwell)
  if (unfishable.triggered) {
    safetyCaps.unfishableDrift = { triggered: true, cap: GENERAL_BOTTOMFISH_CONFIG.UNFISHABLE_CAP / 10 }
    finalScore = Math.min(finalScore, GENERAL_BOTTOMFISH_CONFIG.UNFISHABLE_CAP / 10)
    safetyWarnings.push(`⚠️ UNFISHABLE: ${unfishable.reason}`)
    strategyAdvice.push('🚫 Physically impossible to jig vertically in these conditions')
    isSafe = false
  }

  // Check Runaway Drift
  const runaway = checkRunawayDrift(windSpeed, windDirection, currentSpeed, currentDirection)
  if (runaway.triggered) {
    safetyCaps.runawayDrift = { triggered: true, cap: GENERAL_BOTTOMFISH_CONFIG.RUNAWAY_CAP / 10 }
    finalScore = Math.min(finalScore, GENERAL_BOTTOMFISH_CONFIG.RUNAWAY_CAP / 10)
    safetyWarnings.push(`⚠️ RUNAWAY DRIFT: ${runaway.reason}`)
    strategyAdvice.push('⚓ Boat moves too fast to maintain bottom contact')
    isSafe = false
  }

  // Check Night Cap
  const nightCheck = checkNightCap(weather.timestamp, sunrise, sunset)
  if (nightCheck.triggered) {
    safetyCaps.nightCap = { triggered: true, cap: GENERAL_BOTTOMFISH_CONFIG.NIGHT_CAP / 10 }
    finalScore = Math.min(finalScore, GENERAL_BOTTOMFISH_CONFIG.NIGHT_CAP / 10)
    safetyWarnings.push(`🌙 NIGHT FISHING: ${nightCheck.reason}`)
    strategyAdvice.push('💡 Consider waiting for daylight for safer navigation')
  }

  // Track which cap was applied
  if (unfishable.triggered || runaway.triggered || nightCheck.triggered) {
    safetyCaps.appliedCap = finalScore
  }

  // ==================== LAYER 3: COMBO MULTIPLIERS ====================

  const comboMultipliers: GeneralBottomfishResult['comboMultipliers'] = {
    totalMultiplier: 1.0
  }

  // A. Armchair Ride
  const armchair = checkArmchairRide(currentSpeed, windSpeed)
  if (armchair.applies) {
    comboMultipliers.armchairRide = {
      applied: true,
      multiplier: GENERAL_BOTTOMFISH_CONFIG.ARMCHAIR_MULTIPLIER
    }
    comboMultipliers.totalMultiplier *= GENERAL_BOTTOMFISH_CONFIG.ARMCHAIR_MULTIPLIER
    strategyAdvice.push('✨ ARMCHAIR RIDE: Perfect vertical control (+25%)')
  }

  // B. Wind-Against-Tide
  const windAgainst = checkWindAgainstTide(windSpeed, windDirection, currentSpeed, currentDirection)
  if (windAgainst.applies) {
    comboMultipliers.windAgainstTide = {
      applied: true,
      multiplier: GENERAL_BOTTOMFISH_CONFIG.WIND_AGAINST_TIDE_MULTIPLIER
    }
    comboMultipliers.totalMultiplier *= GENERAL_BOTTOMFISH_CONFIG.WIND_AGAINST_TIDE_MULTIPLIER
    safetyWarnings.push(`⚠️ WIND AGAINST TIDE: Steep waves at ${windAgainst.angleDiff}° (-50%)`)
    strategyAdvice.push('🌊 Dangerous "stand up chop" - consider postponing')
    isSafe = false
  }

  // C. Pressure Drop
  const pressureDrop = checkPressureDrop(pressureChange3hr, swellResult.effectiveSwell)
  if (pressureDrop.applies) {
    comboMultipliers.pressureDrop = {
      applied: true,
      multiplier: GENERAL_BOTTOMFISH_CONFIG.PRESSURE_DROP_MULTIPLIER
    }
    comboMultipliers.totalMultiplier *= GENERAL_BOTTOMFISH_CONFIG.PRESSURE_DROP_MULTIPLIER
    strategyAdvice.push('📉 PRESSURE DROP: Feeding trigger activated (+10%)')
  }

  // Apply multipliers
  const scoreAfterCaps = finalScore
  finalScore = finalScore * comboMultipliers.totalMultiplier

  // Final clamp
  finalScore = Math.max(0, Math.min(10, finalScore))

  // ==================== STRATEGY ADVICE ====================

  // Tide advice
  if (currentSpeed < 0.5) {
    strategyAdvice.unshift('⚓ SLACK TIDE: Excellent bottom access')
  } else if (currentSpeed > 1.5) {
    strategyAdvice.unshift('🌊 STRONG CURRENT: Difficult to maintain vertical presentation')
  }

  // Swell advice
  if (swellResult.effectiveSwell > 0.8) {
    strategyAdvice.push('🌊 ROUGH SEAS: Jigging control compromised')
  } else if (swellResult.effectiveSwell < 0.3) {
    strategyAdvice.push('🎣 CALM SEAS: Ideal jigging platform')
  }

  // ==================== RETURN RESULT ====================

  return {
    total: Math.round(finalScore * 10) / 10,
    physicsCore: {
      baseScore: Math.round(baseScore * 10) / 10,
      factors: {
        tideSpeed: { score: tideScore, weight: 0.45, value: currentSpeed },
        windSpeed: { score: windScore, weight: 0.35, value: windSpeed * 0.539957 },
        effectiveSwell: { score: swellResult.score, weight: 0.10, value: swellResult.effectiveSwell },
        pressure: { score: pressureResult.score, weight: 0.05, value: pressureResult.description },
        solunar: { score: solunarResult.score, weight: 0.05, value: solunarResult.period }
      }
    },
    safetyCaps,
    comboMultipliers,
    isSafe,
    safetyWarnings,
    strategyAdvice,
    debug: {
      baseBeforeCaps: Math.round(baseScore * 10) / 10,
      afterCaps: Math.round(scoreAfterCaps * 10) / 10,
      afterMultipliers: Math.round(finalScore * 10) / 10,
      final: Math.round(finalScore * 10) / 10
    }
  }
}

export default calculateGeneralBottomfishScore
