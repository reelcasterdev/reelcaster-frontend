// Species-specific fishing score algorithms
// Each species has its own unique algorithm with different weight distributions

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { getMoonPhase, getMoonIllumination, isOddYear } from './astronomicalCalculations'
import {
  calculateChinookSalmonScoreV2,
  AlgorithmContext,
  FishingReportData
} from './chinookAlgorithmV2'

// Extended context for V2 algorithms
export interface ExtendedAlgorithmContext {
  sunrise?: number
  sunset?: number
  latitude?: number
  longitude?: number
  locationName?: string
  pressureHistory?: number[]
  fishingReports?: FishingReportData
}

// Flag to enable V2 algorithm (can be toggled for A/B testing)
export const USE_CHINOOK_V2 = true

// Helper function to calculate seasonal weight
function getSeasonalWeight(date: Date, peakMonths: number[]): number {
  const month = date.getMonth() + 1
  if (peakMonths.includes(month)) return 1.0

  // Calculate distance from nearest peak month
  const distances = peakMonths.map(peak => {
    const diff = Math.abs(month - peak)
    return Math.min(diff, 12 - diff) // Handle wrap-around
  })
  const minDistance = Math.min(...distances)

  // Weight falls off with distance from peak
  return Math.max(0.3, 1.0 - (minDistance * 0.15))
}

// Helper function to calculate slack tide score (currently unused but kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getSlackTideScore(tideData?: CHSWaterData): number {
  if (!tideData) return 0.5

  const currentSpeed = Math.abs(tideData.currentSpeed || 0)

  // Perfect score at slack tide (0 knots)
  if (currentSpeed <= 0.1) return 1.0
  if (currentSpeed <= 0.3) return 0.8
  if (currentSpeed <= 0.5) return 0.6
  if (currentSpeed <= 1.0) return 0.4
  return 0.2
}

// Helper function to calculate wave height from wind
function estimateWaveHeight(windSpeed: number): number {
  // Simplified wave height estimation (meters)
  // Based on wind speed in km/h
  const windSpeedMs = windSpeed / 3.6
  return Math.min(windSpeedMs * 0.1, 5.0)
}

interface SpeciesScoreResult {
  total: number
  factors: {
    [key: string]: {
      value: number
      weight: number
      score: number
    }
  }
  isSafe?: boolean
  safetyWarnings?: string[]
  debug?: string
}

// ==================== CHINOOK SALMON ====================
export function calculateChinookSalmonScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp)
  const hour = date.getHours()

  // 1. OPTIMAL LIGHT/TIME (20% weight)
  // Refined with civil twilight considerations
  let lightScore = 0.5
  if (hour >= 4 && hour <= 7) lightScore = 1.0  // Dawn - magic hours
  else if (hour >= 18 && hour <= 21) lightScore = 1.0  // Dusk - magic hours
  else if (hour >= 8 && hour <= 10) lightScore = 0.7  // Morning
  else if (hour >= 16 && hour <= 17) lightScore = 0.7  // Late afternoon
  else if (hour >= 11 && hour <= 15) lightScore = 0.4  // Midday
  else {
    lightScore = 0.0  // Night - outside civil twilight
    safetyWarnings.push('Night fishing outside civil twilight - requires proper equipment')
  }

  factors['lightTime'] = { value: hour, weight: 0.20, score: lightScore }

  // 2. TIDAL RANGE (15% weight)
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 2.5) tidalScore = 1.0  // Strong tidal movement
    else if (tidalRange >= 1.5) tidalScore = 0.8
    else if (tidalRange >= 0.8) tidalScore = 0.6
    else tidalScore = 0.4

    // Safety warning for extreme ranges
    if (tidalRange > 4.0) {
      safetyWarnings.push('Extreme tidal range - significant current risks')
    }
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.15, score: tidalScore }

  // 3. CURRENT FLOW (15% weight)
  // Updated optimal range with safety cut-off
  let currentScore = 0.5
  const current = Math.abs(tideData?.currentSpeed || 0)

  if (current > 4.0) {
    // SAFETY CUT-OFF: >4 knots
    currentScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Current speed >4 knots - significant boat control risk')
  } else if (current >= 0.5 && current <= 2.0) {
    currentScore = 1.0  // Optimal
  } else if (current >= 0.3 && current <= 3.0) {
    currentScore = 0.7
  } else if (current < 0.3) {
    currentScore = 0.5  // Slack/too slow
  } else {
    currentScore = 0.3  // Fast but manageable
  }

  factors['currentFlow'] = { value: current, weight: 0.15, score: currentScore }

  // 4. DATES/SEASONALITY (15% weight)
  // Updated to include winter feeder season (Feb-April) and peak summer (June-July)
  const month = date.getMonth() + 1
  let seasonalScore = 0.3 // Base score

  if (month === 6 || month === 7) {
    seasonalScore = 1.0  // Peak migratory season
  } else if (month >= 2 && month <= 4) {
    seasonalScore = 1.0  // Winter feeder season
  } else if (month === 5 || month === 8 || month === 9) {
    seasonalScore = 0.8  // Shoulder seasons
  } else if (month === 10 || month === 1) {
    seasonalScore = 0.5  // Off-shoulder
  }

  factors['seasonality'] = { value: month, weight: 0.15, score: seasonalScore }

  // 5. BAROMETRIC PRESSURE (10% weight)
  // Falling or stable low pressure preferred
  const pressure = weather.pressure || 1013
  let pressureScore = 0.5

  if (pressure < 1010) {
    pressureScore = 1.0  // Low pressure - aggressive feeding
  } else if (pressure >= 1010 && pressure <= 1013) {
    pressureScore = 0.8  // Stable/falling
  } else if (pressure >= 1014 && pressure <= 1020) {
    pressureScore = 0.5  // Stable high
  } else {
    pressureScore = 0.0  // Rapidly rising
  }

  factors['pressure'] = { value: pressure, weight: 0.10, score: pressureScore }

  // 6. MOONPHASE (5% weight)
  const moonPhase = getMoonPhase(date)
  const moonScore = moonPhase <= 0.15 || moonPhase >= 0.85 ? 1.0 : 0.5  // Better near new/full moon
  factors['moonPhase'] = { value: moonPhase, weight: 0.05, score: moonScore }

  // 7. TEMPERATURE (5% weight - reduced from 10%)
  // Combined air/water temp with safety thresholds
  let tempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  const airTemp = weather.temp || 10

  // SAFETY CUT-OFF: Cold temperatures
  if (airTemp < 5 || waterTemp < 8) {
    tempScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Air temp <5°C or water temp <8°C - hypothermia risk')
  } else if (waterTemp >= 10 && waterTemp <= 15) {
    tempScore = 1.0  // Optimal
  } else if (waterTemp >= 8 && waterTemp <= 17) {
    tempScore = 0.7
  } else {
    tempScore = 0.3
  }

  factors['temperature'] = { value: waterTemp, weight: 0.05, score: tempScore }

  // 8. WIND (5% weight)
  // Moderate "salmon chop" preferred with safety cut-off
  const windSpeed = weather.windSpeed || 0
  const windKnots = windSpeed * 0.539957  // Convert km/h to knots
  let windScore = 1.0

  // SAFETY CUT-OFF: >20 knots
  if (windKnots > 20) {
    windScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wind speed >20 knots')
  } else if (windKnots >= 5 && windKnots <= 15) {
    windScore = 1.0  // Optimal "salmon chop"
  } else if (windKnots < 5) {
    windScore = 0.7  // Calm
  } else {
    windScore = 0.5  // Moderate but manageable
  }

  factors['wind'] = { value: windSpeed, weight: 0.05, score: windScore }

  // 9. WAVE HEIGHT (5% weight - NEW)
  const waveHeight = estimateWaveHeight(windSpeed)
  let waveScore = 1.0

  // SAFETY CUT-OFF: >2m waves
  if (waveHeight > 2.0) {
    waveScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wave height >2m')
  } else if (waveHeight < 1.0) {
    waveScore = 1.0  // Low waves
  } else if (waveHeight <= 1.5) {
    waveScore = 0.6
  } else {
    waveScore = 0.3
  }

  factors['waveHeight'] = { value: waveHeight, weight: 0.05, score: waveScore }

  // 10. PRECIPITATION (5% weight)
  // Light rain/overcast preferred, heavy rain penalized
  const precipitation = weather.precipitation || 0
  let precipScore = 1.0

  // Check for thunderstorms (using high precipitation as proxy)
  if (precipitation > 20) {
    precipScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Heavy precipitation/potential thunderstorm')
  } else if (precipitation > 0 && precipitation <= 5) {
    precipScore = 1.0  // Light rain - ideal low-light conditions
  } else if (precipitation === 0) {
    precipScore = 0.9  // Clear/overcast
  } else if (precipitation <= 10) {
    precipScore = 0.5  // Moderate rain
  } else {
    precipScore = 0.2  // Heavy rain
  }

  factors['precipitation'] = { value: precipitation, weight: 0.05, score: precipScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // Safety warnings are informational - don't cap the score
  // Users can see actual fishing conditions AND make their own safety decisions

  return { total, factors, isSafe, safetyWarnings }
}

// ==================== PINK SALMON ====================
export function calculatePinkSalmonScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp)
  const hour = date.getHours()
  const month = date.getMonth() + 1
  const day = date.getDate()

  // 1. DATES/SEASONALITY (30% weight) - Critical for Pink Salmon
  // Stricter scoring: 0 for even years and outside peak window
  let seasonalScore = 0.0
  const isOdd = isOddYear(date)

  if (!isOdd) {
    seasonalScore = 0.0  // 0 for even years
  } else {
    // Odd years only - late July to early September
    if (month === 8 || (month === 9 && day <= 15)) {
      seasonalScore = 1.0  // Peak: August to mid-September
    } else if ((month === 7 && day >= 20) || (month === 9 && day > 15 && day <= 30)) {
      seasonalScore = 0.8  // Late July, late September
    } else {
      seasonalScore = 0.0  // 0 outside window
    }
  }
  factors['seasonality'] = { value: isOdd ? 1 : 0, weight: 0.30, score: seasonalScore }

  // 2. OPTIMAL LIGHT/TIME (15% weight)
  // Emphasize overcast and low-light, penalize bright sunny midday
  let lightScore = 0.5
  if (hour >= 5 && hour <= 8) {
    lightScore = 1.0  // Dawn - low light
  } else if (hour >= 18 && hour <= 21) {
    lightScore = 1.0  // Dusk - low light
  } else if (hour >= 9 && hour <= 11 || hour >= 16 && hour <= 17) {
    lightScore = 0.7  // Morning/late afternoon
  } else if (hour >= 12 && hour <= 15) {
    lightScore = 0.3  // Bright sunny midday - penalized
  } else {
    lightScore = 0.2  // Night
  }
  factors['lightTime'] = { value: hour, weight: 0.15, score: lightScore }

  // 3. CURRENT FLOW (15% weight)
  // Updated range: 1-2.5 knots optimal, with >4 knot safety cut-off
  let currentScore = 0.5
  const current = Math.abs(tideData?.currentSpeed || 0)

  if (current > 4.0) {
    // SAFETY CUT-OFF: >4 knots
    currentScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Current speed >4 knots')
  } else if (current >= 1.0 && current <= 2.5) {
    currentScore = 1.0  // Optimal - moderate flows concentrate bait
  } else if (current >= 0.5 && current <= 3.0) {
    currentScore = 0.7
  } else if (current < 0.5) {
    currentScore = 0.4  // Dead slack - scored lower than Chinook
  } else {
    currentScore = 0.3  // Fast but manageable
  }

  factors['currentFlow'] = { value: current, weight: 0.15, score: currentScore }

  // 4. TIDAL RANGE (10% weight)
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 1.2 && tidalRange <= 2.5) {
      tidalScore = 1.0  // Moderate exchange optimal
    } else if (tidalRange >= 0.8 && tidalRange < 1.2) {
      tidalScore = 0.7
    } else if (tidalRange > 2.5 && tidalRange <= 3.5) {
      tidalScore = 0.6  // Strong exchange may disperse schools
    } else {
      tidalScore = 0.4  // Very weak or extremely strong
    }
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.10, score: tidalScore }

  // 5. PRECIPITATION (10% weight - NEW)
  // Light rain/drizzle ideal for low-light and surface disturbance
  const precipitation = weather.precipitation || 0
  let precipScore = 1.0

  // SAFETY CUT-OFF: Thunderstorms
  if (precipitation > 20) {
    precipScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Heavy precipitation/potential thunderstorm')
  } else if (precipitation > 0 && precipitation <= 5) {
    precipScore = 1.0  // Light rain/drizzle - ideal conditions
  } else if (precipitation === 0) {
    precipScore = 0.8  // Overcast/clear
  } else if (precipitation <= 10) {
    precipScore = 0.5  // Moderate rain
  } else {
    precipScore = 0.3  // Heavy rain
  }

  factors['precipitation'] = { value: precipitation, weight: 0.10, score: precipScore }

  // 6. WATER TEMPERATURE (10% weight)
  // Updated range: 11-16°C for active, migrating pinks
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10

  if (waterTemp >= 11 && waterTemp <= 16) {
    waterTempScore = 1.0  // Optimal for active migration
  } else if (waterTemp >= 9 && waterTemp <= 18) {
    waterTempScore = 0.7
  } else {
    waterTempScore = 0.3  // Too cold or too warm - lethargic
  }

  factors['waterTemp'] = { value: waterTemp, weight: 0.10, score: waterTempScore }

  // 7. WIND (5% weight)
  // Light to moderate breeze for "salmon chop" with safety cut-off
  const windSpeed = weather.windSpeed || 0
  const windKnots = windSpeed * 0.539957  // Convert km/h to knots
  let windScore = 1.0

  // SAFETY CUT-OFF: >20 knots
  if (windKnots > 20) {
    windScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wind speed >20 knots')
  } else if (windKnots >= 5 && windKnots <= 15) {
    windScore = 1.0  // Ideal "salmon chop"
  } else if (windKnots < 5) {
    windScore = 0.7  // Calm
  } else {
    windScore = 0.5  // Moderate but manageable
  }

  factors['wind'] = { value: windSpeed, weight: 0.05, score: windScore }

  // 8. WAVE HEIGHT (5% weight - NEW)
  // Low waves for spotting surface activity (jumpers)
  const waveHeight = estimateWaveHeight(windSpeed)
  let waveScore = 1.0

  // SAFETY CUT-OFF: >2m
  if (waveHeight > 2.0) {
    waveScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wave height >2m')
  } else if (waveHeight < 1.0) {
    waveScore = 1.0  // Calm seas - easy to spot jumpers
  } else if (waveHeight <= 1.5) {
    waveScore = 0.6
  } else {
    waveScore = 0.3
  }

  factors['waveHeight'] = { value: waveHeight, weight: 0.05, score: waveScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // Safety warnings are informational - don't cap the score
  // Users can see actual fishing conditions AND make their own safety decisions

  return { total, factors, isSafe, safetyWarnings }
}

// ==================== HALIBUT ====================
export function calculateHalibutScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp)
  const hour = date.getHours()
  const month = date.getMonth() + 1

  // 1. TIDAL RANGE (25% weight) - INVERTED LOGIC for Halibut
  // Small range (neap tide) = maximum points, large range = short difficult windows
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange <= 1.0) {
      tidalScore = 1.0  // Minimal tidal movement - long fishable window
    } else if (tidalRange <= 1.5) {
      tidalScore = 0.8
    } else if (tidalRange <= 2.0) {
      tidalScore = 0.5
    } else if (tidalRange <= 2.5) {
      tidalScore = 0.3
    } else {
      tidalScore = 0.1  // Large spring tides - very short, difficult windows
    }
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.25, score: tidalScore }

  // 2. CURRENT FLOW (25% weight) - Slow, steady current ideal
  // Dead slack and very strong currents both get low scores
  let currentScore = 0.5
  const current = Math.abs(tideData?.currentSpeed || 0)

  if (current >= 0.5 && current <= 2.0) {
    currentScore = 1.0  // Ideal - perfect for dispersing bait scent
  } else if (current >= 0.3 && current < 0.5) {
    currentScore = 0.6  // Slow but manageable
  } else if (current > 2.0 && current <= 2.5) {
    currentScore = 0.4  // Strong but fishable
  } else if (current < 0.3) {
    currentScore = 0.3  // Dead slack - no scent trail
  } else {
    currentScore = 0.1  // >2.5 knots - impossible to hold bottom
  }

  factors['currentFlow'] = { value: current, weight: 0.25, score: currentScore }

  // 3. DATES/SEASONALITY (15% weight)
  // 0 outside legal season, peaks May-July
  let seasonalScore = 0.0

  // Halibut season typically closed Dec-Feb (adjust based on actual regulations)
  if (month >= 12 || month <= 2) {
    seasonalScore = 0.0  // Closed season
  } else if (month >= 5 && month <= 7) {
    seasonalScore = 1.0  // Peak: May-July on shallow feeding banks
  } else if (month === 4 || month === 8) {
    seasonalScore = 0.8  // Shoulder months
  } else if (month === 3 || month === 9) {
    seasonalScore = 0.6  // Early/late season
  } else {
    seasonalScore = 0.4  // Oct-Nov - still open but less concentrated
  }

  factors['seasonality'] = { value: month, weight: 0.15, score: seasonalScore }

  // 4. MOONPHASE (10% weight)
  // Direct proxy for tidal range - quarter moons = neap tides = max points
  const moonPhase = getMoonPhase(date)
  let moonScore = 0.5

  if ((moonPhase >= 0.20 && moonPhase <= 0.30) || (moonPhase >= 0.70 && moonPhase <= 0.80)) {
    moonScore = 1.0  // Quarter moons - produce neap tides
  } else if ((moonPhase >= 0.15 && moonPhase < 0.20) || (moonPhase > 0.30 && moonPhase <= 0.35) ||
             (moonPhase >= 0.65 && moonPhase < 0.70) || (moonPhase > 0.80 && moonPhase <= 0.85)) {
    moonScore = 0.7  // Near quarter moons
  } else if (moonPhase <= 0.1 || moonPhase >= 0.9 || (moonPhase >= 0.45 && moonPhase <= 0.55)) {
    moonScore = 0.1  // New/full moon - large unfishable tides
  } else {
    moonScore = 0.5  // Other phases
  }

  factors['moonPhase'] = { value: moonPhase, weight: 0.10, score: moonScore }

  // 5. WIND (10% weight - NEW)
  // Critical for safety and controlled drift
  const windSpeed = weather.windSpeed || 0
  const windKnots = windSpeed * 0.539957  // Convert km/h to knots
  let windScore = 1.0

  // SAFETY CUT-OFF: >20 knots
  if (windKnots > 20) {
    windScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wind speed >20 knots - difficult boat control during drift')
  } else if (windKnots < 10) {
    windScore = 1.0  // Calm - perfect for slow, controlled drift
  } else if (windKnots <= 15) {
    windScore = 0.7  // Moderate but manageable
  } else {
    windScore = 0.4  // Getting difficult
  }

  factors['wind'] = { value: windSpeed, weight: 0.10, score: windScore }

  // 6. WAVE HEIGHT (10% weight - NEW)
  // Critical for safety and comfort during long drifts
  const waveHeight = estimateWaveHeight(windSpeed)
  let waveScore = 1.0

  // SAFETY CUT-OFF: >1.5m (stricter than other species)
  if (waveHeight > 1.5) {
    waveScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wave height >1.5m - unsafe for halibut drifting')
  } else if (waveHeight < 1.0) {
    waveScore = 1.0  // Low waves - ideal for long drifts
  } else {
    waveScore = 0.5  // 1-1.5m - uncomfortable but fishable
  }

  factors['waveHeight'] = { value: waveHeight, weight: 0.10, score: waveScore }

  // 7. LIGHT/TIME (5% weight) - Very low importance
  // Halibut feed at all depths and times - consistent score
  const lightScore = 0.8  // Consistent throughout day
  factors['lightTime'] = { value: hour, weight: 0.05, score: lightScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // Safety warnings are informational - don't cap the score
  // Users can see actual fishing conditions AND make their own safety decisions

  return { total, factors, isSafe, safetyWarnings }
}

// ==================== LINGCOD ====================
export function calculateLingcodScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp)
  const hour = date.getHours()
  const month = date.getMonth() + 1

  // 1. CURRENT FLOW - SLACK TIDE FOCUS (30% weight)
  // Maximized during 90-minute window around tide change
  const current = Math.abs(tideData?.currentSpeed || 0)
  let slackScore = 0.5

  // Strong currents >3 knots score near 0
  if (current > 3.0) {
    slackScore = 0.1  // Near 0 - too strong
  } else if (current <= 0.1) {
    slackScore = 1.0  // Perfect slack
  } else if (current <= 0.3) {
    slackScore = 0.9  // Excellent
  } else if (current <= 0.5) {
    slackScore = 0.7  // Good slack window
  } else if (current <= 1.0) {
    slackScore = 0.5  // Moderate
  } else if (current <= 2.0) {
    slackScore = 0.3  // Getting strong
  } else {
    slackScore = 0.2  // Strong but manageable
  }

  factors['slackTide'] = { value: current, weight: 0.30, score: slackScore }

  // 2. TIDAL RANGE (20% weight)
  // Large range favored - creates stronger currents that concentrate baitfish
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 2.5) {
      tidalScore = 1.0  // Large range - strong feeding periods
    } else if (tidalRange >= 2.0) {
      tidalScore = 0.9
    } else if (tidalRange >= 1.5) {
      tidalScore = 0.7
    } else if (tidalRange >= 1.0) {
      tidalScore = 0.5
    } else {
      tidalScore = 0.3  // Small range - less defined feeding
    }
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.20, score: tidalScore }

  // 3. DATES/SEASONALITY (15% weight - increased from 10%)
  // Regulatory check - 0 outside legal season
  let seasonalScore = 0.0

  // Lingcod season typically closed mid-October to April (mid-fall to early spring)
  if (month >= 11 || month <= 3) {
    seasonalScore = 0.0  // Closed season
  } else if (month >= 4 && month <= 10) {
    seasonalScore = 1.0  // Open season - consistent throughout
  }

  factors['seasonality'] = { value: month, weight: 0.15, score: seasonalScore }

  // 4. WAVE HEIGHT (10% weight)
  // Critical for staying precisely over structure
  const windSpeed = weather.windSpeed || 0
  const waveHeight = estimateWaveHeight(windSpeed)
  let waveScore = 1.0

  // SAFETY CUT-OFF: >2m
  if (waveHeight > 2.0) {
    waveScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wave height >2m - difficult to maintain position over structure')
  } else if (waveHeight < 1.0) {
    waveScore = 1.0  // Low waves - critical for boat control
  } else if (waveHeight <= 1.5) {
    waveScore = 0.6  // Moderate
  } else {
    waveScore = 0.3  // Getting difficult
  }

  factors['waveHeight'] = { value: waveHeight, weight: 0.10, score: waveScore }

  // 5. WIND (10% weight - NEW)
  // Critical for boat control and staying on productive spots
  const windKnots = windSpeed * 0.539957  // Convert km/h to knots
  let windScore = 1.0

  // SAFETY CUT-OFF: >20 knots
  if (windKnots > 20) {
    windScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wind speed >20 knots - difficult drift control')
  } else if (windKnots < 10) {
    windScore = 1.0  // Low wind - perfect control
  } else if (windKnots <= 15) {
    windScore = 0.7  // Moderate but manageable
  } else {
    windScore = 0.4  // Getting difficult
  }

  factors['wind'] = { value: windSpeed, weight: 0.10, score: windScore }

  // 6. PRECIPITATION (5% weight - NEW)
  // Overcast/drizzle improves bite for shallower structures (<100ft)
  const precipitation = weather.precipitation || 0
  let precipScore = 1.0

  if (precipitation > 0 && precipitation <= 5) {
    precipScore = 1.0  // Light rain/drizzle/overcast - ideal
  } else if (precipitation === 0) {
    precipScore = 0.8  // Clear/overcast
  } else if (precipitation <= 10) {
    precipScore = 0.6  // Moderate rain
  } else {
    precipScore = 0.4  // Heavy rain
  }

  factors['precipitation'] = { value: precipitation, weight: 0.05, score: precipScore }

  // 7. OPTIMAL LIGHT/TIME (5% weight)
  // Low importance - lingcod feed based on opportunity
  // Highest when tide change coincides with dawn/dusk
  let lightScore = 0.6  // Base score

  if ((hour >= 5 && hour <= 8) || (hour >= 18 && hour <= 21)) {
    lightScore = 0.9  // Dawn/dusk - bonus if coincides with tide change
  } else if ((hour >= 9 && hour <= 11) || (hour >= 16 && hour <= 17)) {
    lightScore = 0.7
  }

  factors['lightTime'] = { value: hour, weight: 0.05, score: lightScore }

  // 8. WATER TEMPERATURE (5% weight - reduced from 10%)
  // Low importance for day-to-day planning
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10

  if (waterTemp >= 8 && waterTemp <= 12) {
    waterTempScore = 1.0  // Optimal for metabolism
  } else if (waterTemp >= 6 && waterTemp <= 14) {
    waterTempScore = 0.7
  } else {
    waterTempScore = 0.4
  }

  factors['waterTemp'] = { value: waterTemp, weight: 0.05, score: waterTempScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // Safety warnings are informational - don't cap the score
  // Users can see actual fishing conditions AND make their own safety decisions

  return { total, factors, isSafe, safetyWarnings }
}

// ==================== COHO SALMON ====================
export function calculateCohoSalmonScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp)
  const hour = date.getHours()
  const month = date.getMonth() + 1

  // 1. DATES/SEASONALITY (25% weight)
  // Ramps up in August, maximized in September, declines in October
  let seasonalScore = 0.3 // Base score

  if (month === 9) {
    seasonalScore = 1.0  // Peak: September
  } else if (month === 8) {
    seasonalScore = 0.9  // Ramping up: August
  } else if (month === 10) {
    seasonalScore = 0.7  // Declining: October
  } else if (month === 7 || month === 11) {
    seasonalScore = 0.5  // Shoulder months
  } else {
    seasonalScore = 0.2  // Off-season
  }

  factors['seasonality'] = { value: month, weight: 0.25, score: seasonalScore }

  // 2. OPTIMAL LIGHT/TIME (20% weight) - Visual hunters
  // Overcast gets high base, low-light magic hours = full, bright midday heavily penalized
  let lightScore = 0.5

  if (hour >= 5 && hour <= 8) {
    lightScore = 1.0  // Dawn - magic hours
  } else if (hour >= 18 && hour <= 21) {
    lightScore = 1.0  // Dusk - magic hours
  } else if (hour >= 9 && hour <= 11 || hour >= 16 && hour <= 17) {
    lightScore = 0.7  // Morning/late afternoon
  } else if (hour >= 12 && hour <= 15) {
    lightScore = 0.2  // Bright sunny midday - heavily penalized
  } else {
    lightScore = 0.3  // Night
  }

  factors['lightTime'] = { value: hour, weight: 0.20, score: lightScore }

  // 3. CURRENT FLOW (20% weight)
  // Active currents key - 1.5-3 knots optimal, creates tide lines, >4 knots penalized
  let currentScore = 0.5
  const current = Math.abs(tideData?.currentSpeed || 0)

  if (current >= 1.5 && current <= 3.0) {
    currentScore = 1.0  // Optimal - visible tide lines, concentrates bait
  } else if (current >= 1.0 && current < 1.5) {
    currentScore = 0.8  // Good
  } else if (current > 3.0 && current <= 4.0) {
    currentScore = 0.5  // Strong but fishable
  } else if (current >= 0.5 && current < 1.0) {
    currentScore = 0.6  // Moderate
  } else if (current < 0.5) {
    currentScore = 0.3  // Dead slack - less productive
  } else {
    currentScore = 0.2  // >4 knots - penalized
  }

  factors['currentFlow'] = { value: current, weight: 0.20, score: currentScore }

  // 4. TIDAL RANGE (10% weight - reduced from 15%)
  // Large range favored for strong currents and bait-rich rips
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 2.5) {
      tidalScore = 1.0  // Large range - strong currents
    } else if (tidalRange >= 2.0) {
      tidalScore = 0.9
    } else if (tidalRange >= 1.5) {
      tidalScore = 0.7
    } else if (tidalRange >= 1.0) {
      tidalScore = 0.5
    } else {
      tidalScore = 0.3  // Small exchange - scored lower
    }
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.10, score: tidalScore }

  // 5. PRECIPITATION (10% weight - NEW)
  // Light rain/drizzle strong positive - enhances low-light, disturbs surface
  const precipitation = weather.precipitation || 0
  let precipScore = 1.0

  if (precipitation > 0 && precipitation <= 5) {
    precipScore = 1.0  // Light rain/drizzle - ideal conditions
  } else if (precipitation === 0) {
    precipScore = 0.7  // Clear/overcast - still good
  } else if (precipitation <= 10) {
    precipScore = 0.5  // Moderate rain
  } else if (precipitation <= 20) {
    precipScore = 0.3  // Heavy rain
  } else {
    precipScore = 0.1  // Very heavy rain
  }

  factors['precipitation'] = { value: precipitation, weight: 0.10, score: precipScore }

  // 6. WIND (5% weight - NEW)
  // Moderate "salmon chop" (5-15 knots) ideal, glassy calm makes fish spooky
  const windSpeed = weather.windSpeed || 0
  const windKnots = windSpeed * 0.539957  // Convert km/h to knots
  let windScore = 0.7  // Base for calm

  // SAFETY CUT-OFF: >20 knots
  if (windKnots > 20) {
    windScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wind speed >20 knots')
  } else if (windKnots >= 5 && windKnots <= 15) {
    windScore = 1.0  // Ideal "salmon chop"
  } else if (windKnots < 5) {
    windScore = 0.6  // Glassy calm - can make Coho spooky
  } else {
    windScore = 0.4  // Strong but manageable
  }

  factors['wind'] = { value: windSpeed, weight: 0.05, score: windScore }

  // 7. WAVE HEIGHT (5% weight - NEW)
  // Safety metric - low to moderate manageable
  const waveHeight = estimateWaveHeight(windSpeed)
  let waveScore = 1.0

  // SAFETY CUT-OFF: >2m
  if (waveHeight > 2.0) {
    waveScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wave height >2m')
  } else if (waveHeight <= 1.5) {
    waveScore = 1.0  // Low to moderate - manageable
  } else {
    waveScore = 0.5  // Getting challenging
  }

  factors['waveHeight'] = { value: waveHeight, weight: 0.05, score: waveScore }

  // 8. WATER TEMPERATURE (5% weight - reduced from 10%)
  // Secondary factor - optimal 11-15°C
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10

  if (waterTemp >= 11 && waterTemp <= 15) {
    waterTempScore = 1.0  // Optimal for active migration
  } else if (waterTemp >= 9 && waterTemp <= 17) {
    waterTempScore = 0.7
  } else {
    waterTempScore = 0.3
  }

  factors['waterTemp'] = { value: waterTemp, weight: 0.05, score: waterTempScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // Safety warnings are informational - don't cap the score
  // Users can see actual fishing conditions AND make their own safety decisions

  return { total, factors, isSafe, safetyWarnings }
}

// ==================== ROCKFISH ====================
export function calculateRockfishScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp)
  const month = date.getMonth() + 1

  // 1. CURRENT FLOW - SLACK TIDE CRITICAL (35% weight)
  // Only time you can fish vertically without excessive snagging
  // >1.5 knots rapidly degrades score
  const current = Math.abs(tideData?.currentSpeed || 0)
  let slackScore = 0.5

  if (current <= 0.1) {
    slackScore = 1.0  // Perfect slack
  } else if (current <= 0.3) {
    slackScore = 0.95  // Near slack
  } else if (current <= 0.5) {
    slackScore = 0.85  // Good window
  } else if (current <= 1.0) {
    slackScore = 0.6  // Moderate
  } else if (current <= 1.5) {
    slackScore = 0.3  // Getting difficult
  } else {
    slackScore = 0.1  // >1.5 knots - rapidly degraded, excessive snagging
  }

  factors['slackTide'] = { value: current, weight: 0.35, score: slackScore }

  // 2. WIND (20% weight)
  // Essential for boat control and "spot lock"
  const windSpeed = weather.windSpeed || 0
  const windKnots = windSpeed * 0.539957  // Convert km/h to knots
  let windScore = 1.0

  // SAFETY CUT-OFF: >20 knots
  if (windKnots > 20) {
    windScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wind speed >20 knots - cannot maintain position over structure')
  } else if (windKnots < 10) {
    windScore = 1.0  // Calm - ideal for spot lock
  } else if (windKnots <= 15) {
    windScore = 0.7  // Moderate
  } else {
    windScore = 0.4  // Difficult to maintain position
  }

  factors['wind'] = { value: windSpeed, weight: 0.20, score: windScore }

  // 3. WAVE HEIGHT (20% weight)
  // Fishability and safety - need to stay over target
  const waveHeight = estimateWaveHeight(windSpeed)
  let waveScore = 1.0

  // SAFETY CUT-OFF: >1.5m (stricter than other species)
  if (waveHeight > 1.5) {
    waveScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wave height >1.5m - cannot stay over target structure')
  } else if (waveHeight < 1.0) {
    waveScore = 1.0  // Calm seas - ideal
  } else {
    waveScore = 0.5  // 1-1.5m - challenging
  }

  factors['waveHeight'] = { value: waveHeight, weight: 0.20, score: waveScore }

  // 4. TIDAL RANGE (10% weight - NEW)
  // INVERTED LOGIC: Small range (neap tide) = longer slack window
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange <= 1.0) {
      tidalScore = 1.0  // Neap tide - longer slack window
    } else if (tidalRange <= 1.5) {
      tidalScore = 0.8
    } else if (tidalRange <= 2.0) {
      tidalScore = 0.6
    } else if (tidalRange <= 2.5) {
      tidalScore = 0.4
    } else {
      tidalScore = 0.2  // Large range - short slack window
    }
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.10, score: tidalScore }

  // 5. DATES/SEASONALITY (10% weight - NEW)
  // Check closures, favor May-September (good weather for offshore)
  let seasonalScore = 0.5

  // Many rockfish closures, especially spring closures for certain species (e.g., Quillback)
  if (month >= 3 && month <= 5) {
    seasonalScore = 0.3  // Spring closures common
  } else if (month >= 5 && month <= 9) {
    seasonalScore = 1.0  // May-September - good weather, offshore feasible
  } else if (month >= 10 && month <= 11) {
    seasonalScore = 0.6  // Fall - declining
  } else {
    seasonalScore = 0.4  // Winter - difficult offshore conditions
  }

  factors['seasonality'] = { value: month, weight: 0.10, score: seasonalScore }

  // 6. OTHER FACTORS (5% weight - NEW)
  // Minimal influence - light, precipitation, temp combined
  // Small bonus for overcast conditions
  let otherScore = 0.7  // Base score

  // Overcast bonus
  const cloudCover = weather.cloudCover || 50
  if (cloudCover >= 50) {
    otherScore = 0.8  // Slight bonus for overcast
  }

  // Temp/precip have minimal impact for deep dwellers
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  if (waterTemp >= 8 && waterTemp <= 14) {
    otherScore += 0.1  // Slight bonus
  }

  otherScore = Math.min(otherScore, 1.0)
  factors['otherFactors'] = { value: cloudCover, weight: 0.05, score: otherScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // Safety warnings are informational - don't cap the score
  // Users can see actual fishing conditions AND make their own safety decisions

  return { total, factors, isSafe, safetyWarnings }
}

// ==================== CRAB ====================
export function calculateCrabScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp)
  const month = date.getMonth() + 1

  // 1. TIDAL FLOW / SOAK TIME (30% weight - increased from 25%)
  // Maximize when traps soak through slack tide
  // Both dead calm AND ripping tides scored lower - moderate current needed for scent
  const current = Math.abs(tideData?.currentSpeed || 0)
  let soakScore = 0.5

  if (current >= 0.3 && current <= 0.8) {
    soakScore = 1.0  // Optimal - moderate current disperses scent during soak
  } else if (current >= 0.1 && current < 0.3) {
    soakScore = 0.7  // Light current - some scent dispersal
  } else if (current > 0.8 && current <= 1.5) {
    soakScore = 0.8  // Good current for scent
  } else if (current < 0.1) {
    soakScore = 0.4  // Dead calm - poor scent dispersal
  } else {
    soakScore = 0.3  // Ripping tide - poor for trap soaking
  }

  factors['soakTime'] = { value: current, weight: 0.30, score: soakScore }

  // 2. DATES/SEASONALITY (25% weight - increased from 15%)
  // Molt cycle crucial - late Aug-Oct = hard-shelled, June-July = molting (low quality)
  let seasonalScore = 0.5

  if (month === 8 || month === 9 || month === 10) {
    seasonalScore = 1.0  // Late Aug-Oct: hard-shelled, full of meat
  } else if (month === 11) {
    seasonalScore = 0.8  // November: still good
  } else if (month === 6 || month === 7) {
    seasonalScore = 0.3  // June-July: peak molting season - low quality
  } else if (month === 5 || month === 12) {
    seasonalScore = 0.6  // Shoulder months
  } else {
    seasonalScore = 0.5  // Winter: moderate
  }

  factors['seasonality'] = { value: month, weight: 0.25, score: seasonalScore }

  // 3. MOONPHASE (15% weight)
  // INVERTED: New moon (dark nights) = full points, full moon = low
  // Crabs less reliant on bait scent when they can forage visually in moonlight
  const moonPhase = getMoonPhase(date)
  const moonIllum = getMoonIllumination(moonPhase)
  const moonScore = 1.0 - (moonIllum / 100)  // Inverted: darker = better

  factors['moonPhase'] = { value: moonPhase, weight: 0.15, score: moonScore }

  // 4. WIND (10% weight - NEW)
  // Safety and practicality for setting/pulling traps
  const windSpeed = weather.windSpeed || 0
  const windKnots = windSpeed * 0.539957  // Convert km/h to knots
  let windScore = 1.0

  if (windKnots < 15) {
    windScore = 1.0  // Calm - easy and safe
  } else if (windKnots <= 20) {
    windScore = 0.6  // Moderate - manageable
  } else {
    windScore = 0.2  // Difficult but not flagged as unsafe (crabbing more tolerant)
  }

  factors['wind'] = { value: windSpeed, weight: 0.10, score: windScore }

  // 5. WAVE HEIGHT (10% weight - NEW)
  // Safety for pulling heavy traps over gunwale
  const waveHeight = estimateWaveHeight(windSpeed)
  let waveScore = 1.0

  // SAFETY CUT-OFF: >1.5m
  if (waveHeight > 1.5) {
    waveScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wave height >1.5m - hazardous to pull traps over gunwale')
  } else if (waveHeight < 1.0) {
    waveScore = 1.0  // Low waves - ideal
  } else {
    waveScore = 0.5  // 1-1.5m - challenging but manageable
  }

  factors['waveHeight'] = { value: waveHeight, weight: 0.10, score: waveScore }

  // 6. TIDAL RANGE (10% weight - reduced from 20%)
  // Moderate range best - very large OR very small scored lower
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 1.5 && tidalRange <= 2.5) {
      tidalScore = 1.0  // Moderate range - ideal
    } else if (tidalRange >= 1.0 && tidalRange < 1.5) {
      tidalScore = 0.8  // Moderate-low
    } else if (tidalRange > 2.5 && tidalRange <= 3.5) {
      tidalScore = 0.7  // Large range - strong currents
    } else if (tidalRange < 1.0) {
      tidalScore = 0.5  // Very small - poor scent dispersal
    } else {
      tidalScore = 0.3  // Very large - excessively strong currents
    }
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.10, score: tidalScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // Safety warnings are informational - don't cap the score
  // Users can see actual fishing conditions AND make their own safety decisions

  return { total, factors, isSafe, safetyWarnings }
}

// ==================== SPOT PRAWN ====================
export function calculateSpotPrawnScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const safetyWarnings: string[] = []
  let isSafe = true

  const date = new Date(weather.timestamp)
  const month = date.getMonth() + 1

  // 1. DATES/SEASONALITY (50% weight - ABSOLUTE FACTOR)
  // If outside legal season (May-June), score is 0 - overrides all others
  let seasonalScore = 0.0

  if (month === 5 || month === 6) {
    seasonalScore = 1.0  // Legal season - May-June only
  } else {
    seasonalScore = 0.0  // Outside season - absolute 0
  }

  factors['seasonality'] = { value: month, weight: 0.50, score: seasonalScore }

  // 2. CURRENT/TIDAL FLOW (20% weight)
  // Slack tide ONLY effective window - extreme depths (200-400ft)
  // 60-90 minute window around tide change
  const current = Math.abs(tideData?.currentSpeed || 0)
  let slackScore = 0.5

  if (current <= 0.1) {
    slackScore = 1.0  // Perfect slack - only window for extreme depth
  } else if (current <= 0.2) {
    slackScore = 0.9  // Near slack - manageable
  } else if (current <= 0.3) {
    slackScore = 0.6  // Getting difficult at depth
  } else if (current <= 0.5) {
    slackScore = 0.3  // Very difficult with long rope
  } else {
    slackScore = 0.1  // Essentially impossible at 200-400ft depth
  }

  factors['slackTide'] = { value: current, weight: 0.20, score: slackScore }

  // 3. TIDAL RANGE (10% weight)
  // Small range (neap tide) strongly favored - longer manageable current periods
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange <= 1.0) {
      tidalScore = 1.0  // Neap tide - long slack window, ideal
    } else if (tidalRange <= 1.5) {
      tidalScore = 0.8
    } else if (tidalRange <= 2.0) {
      tidalScore = 0.6
    } else if (tidalRange <= 2.5) {
      tidalScore = 0.4
    } else {
      tidalScore = 0.2  // Large range - very short window
    }
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.10, score: tidalScore }

  // 4. WIND (10% weight)
  // Essential for safety - handling hundreds of feet of rope
  const windSpeed = weather.windSpeed || 0
  const windKnots = windSpeed * 0.539957  // Convert km/h to knots
  let windScore = 1.0

  // SAFETY CUT-OFF: >15 knots (stricter than most species)
  if (windKnots > 15) {
    windScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wind speed >15 knots - dangerous with long rope at extreme depth')
  } else if (windKnots < 10) {
    windScore = 1.0  // Calm - essential
  } else {
    windScore = 0.5  // 10-15 knots - challenging
  }

  factors['wind'] = { value: windSpeed, weight: 0.10, score: windScore }

  // 5. WAVE HEIGHT (10% weight)
  // Calm seas essential - deep water, long ropes, heavy traps extremely hazardous
  const waveHeight = estimateWaveHeight(windSpeed)
  let waveScore = 1.0

  // SAFETY CUT-OFF: >1.5m
  if (waveHeight > 1.5) {
    waveScore = 0.0
    isSafe = false
    safetyWarnings.push('Unsafe: Wave height >1.5m - extremely hazardous with deep gear')
  } else if (waveHeight < 1.0) {
    waveScore = 1.0  // Calm seas - essential
  } else {
    waveScore = 0.4  // 1-1.5m - very challenging
  }

  factors['waveHeight'] = { value: waveHeight, weight: 0.10, score: waveScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  // Safety warnings and seasonal info are informational - don't cap the score
  // Note: Out of season status is tracked separately for UI display

  return { total, factors, isSafe, safetyWarnings }
}

// ==================== SOCKEYE SALMON ====================
export function calculateSockeyeSalmonScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const date = new Date(weather.timestamp)
  const hour = date.getHours()

  // 1. DATES/SEASONALITY (30% weight) - Critical timing
  const seasonalScore = getSeasonalWeight(date, [6, 7, 8])  // June-August peak
  factors['seasonality'] = { value: date.getMonth() + 1, weight: 0.30, score: seasonalScore }

  // 2. CURRENT FLOW (20% weight)
  let currentScore = 0.5
  if (tideData) {
    const current = Math.abs(tideData.currentSpeed || 0)
    if (current >= 0.5 && current <= 2.0) currentScore = 1.0
    else if (current >= 0.3 && current <= 2.5) currentScore = 0.7
    else currentScore = 0.4
  }
  factors['currentFlow'] = { value: tideData?.currentSpeed || 0, weight: 0.20, score: currentScore }

  // 3. TIDAL RANGE (15% weight)
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 2.0) tidalScore = 1.0
    else if (tidalRange >= 1.2) tidalScore = 0.8
    else tidalScore = 0.5
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.15, score: tidalScore }

  // 4. LIGHT/TIME (15% weight)
  let lightScore = 0.5
  if (hour >= 4 && hour <= 7) lightScore = 0.9
  else if (hour >= 18 && hour <= 21) lightScore = 0.85
  else if (hour >= 8 && hour <= 17) lightScore = 0.6
  else lightScore = 0.3
  factors['lightTime'] = { value: hour, weight: 0.15, score: lightScore }

  // 5. WATER TEMPERATURE (10% weight)
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  if (waterTemp >= 8 && waterTemp <= 14) waterTempScore = 1.0
  else if (waterTemp >= 6 && waterTemp <= 16) waterTempScore = 0.7
  else waterTempScore = 0.3
  factors['waterTemp'] = { value: waterTemp, weight: 0.10, score: waterTempScore }

  // 6. BAROMETRIC PRESSURE (10% weight)
  let pressureScore = 0.5
  const pressure = weather.pressure || 1013
  if (pressure >= 1009 && pressure <= 1014) pressureScore = 1.0
  else if (pressure >= 1006 && pressure <= 1017) pressureScore = 0.7
  else pressureScore = 0.4
  factors['pressure'] = { value: pressure, weight: 0.10, score: pressureScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  return { total, factors }
}

// ==================== CHUM SALMON ====================
export function calculateChumSalmonScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const date = new Date(weather.timestamp)
  const hour = date.getHours()

  // 1. DATES/SEASONALITY (25% weight)
  const seasonalScore = getSeasonalWeight(date, [9, 10, 11])  // September-November peak
  factors['seasonality'] = { value: date.getMonth() + 1, weight: 0.25, score: seasonalScore }

  // 2. CURRENT FLOW (20% weight)
  let currentScore = 0.5
  if (tideData) {
    const current = Math.abs(tideData.currentSpeed || 0)
    if (current >= 0.3 && current <= 1.5) currentScore = 1.0
    else if (current >= 0.2 && current <= 2.0) currentScore = 0.7
    else currentScore = 0.4
  }
  factors['currentFlow'] = { value: tideData?.currentSpeed || 0, weight: 0.20, score: currentScore }

  // 3. TIDAL RANGE (20% weight)
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 1.8) tidalScore = 1.0
    else if (tidalRange >= 1.0) tidalScore = 0.7
    else tidalScore = 0.5
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.20, score: tidalScore }

  // 4. LIGHT/TIME (10% weight)
  let lightScore = 0.5
  if (hour >= 5 && hour <= 8) lightScore = 0.8
  else if (hour >= 16 && hour <= 19) lightScore = 0.75
  else if (hour >= 9 && hour <= 15) lightScore = 0.6
  else lightScore = 0.4
  factors['lightTime'] = { value: hour, weight: 0.10, score: lightScore }

  // 5. WATER TEMPERATURE (10% weight)
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  if (waterTemp >= 7 && waterTemp <= 13) waterTempScore = 1.0
  else if (waterTemp >= 5 && waterTemp <= 15) waterTempScore = 0.7
  else waterTempScore = 0.3
  factors['waterTemp'] = { value: waterTemp, weight: 0.10, score: waterTempScore }

  // 6. BAROMETRIC PRESSURE (10% weight)
  let pressureScore = 0.5
  const pressure = weather.pressure || 1013
  if (pressure >= 1009 && pressure <= 1014) pressureScore = 1.0
  else if (pressure >= 1006 && pressure <= 1017) pressureScore = 0.7
  else pressureScore = 0.4
  factors['pressure'] = { value: pressure, weight: 0.10, score: pressureScore }

  // 7. PRECIPITATION TOLERANCE (5% weight) - Chum are tolerant
  const precipScore = 0.8  // Generally unaffected
  factors['precipitation'] = { value: weather.precipitation || 0, weight: 0.05, score: precipScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  return { total, factors }
}

// ==================== MAIN ROUTING FUNCTION ====================
export function calculateSpeciesSpecificScore(
  species: string | null | undefined,
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData,
  extendedContext?: ExtendedAlgorithmContext
): SpeciesScoreResult | null {
  if (!species) return null

  // Normalize species name to match our function names
  const normalizedSpecies = species.toLowerCase().replace(/\s+/g, '-')

  console.log('[Species Algorithm] Called with:', { species, normalizedSpecies, hasTideData: !!tideData, hasExtendedContext: !!extendedContext })

  switch (normalizedSpecies) {
    case 'chinook-salmon':
      // Use V2 algorithm if enabled and we have required context
      if (USE_CHINOOK_V2 && extendedContext?.sunrise && extendedContext?.sunset) {
        const v2Context: AlgorithmContext = {
          sunrise: extendedContext.sunrise,
          sunset: extendedContext.sunset,
          latitude: extendedContext.latitude ?? 48.4284,  // Default to Victoria
          longitude: extendedContext.longitude ?? -123.3656,
          locationName: extendedContext.locationName,
          pressureHistory: extendedContext.pressureHistory,
          fishingReports: extendedContext.fishingReports
        }

        const v2Result = calculateChinookSalmonScoreV2(weather, v2Context, tideData, extendedContext.fishingReports)

        console.log('[Chinook V2 Algorithm] Result:', {
          total: v2Result.total,
          isSafe: v2Result.isSafe,
          isInSeason: v2Result.isInSeason,
          factors: Object.entries(v2Result.factors).map(([key, val]) => ({
            factor: key,
            weight: val.weight,
            score: val.score,
            description: val.description,
            contribution: (val.score * val.weight * 10).toFixed(2)
          }))
        })

        // Convert V2 result to standard SpeciesScoreResult format
        return {
          total: v2Result.total,
          factors: v2Result.factors,
          isSafe: v2Result.isSafe,
          safetyWarnings: v2Result.safetyWarnings
        }
      }
      // Fall back to V1 if V2 context not available
      return calculateChinookSalmonScore(weather, tideData)
    case 'pink-salmon':
      return calculatePinkSalmonScore(weather, tideData)
    case 'coho-salmon':
      return calculateCohoSalmonScore(weather, tideData)
    case 'sockeye-salmon':
      return calculateSockeyeSalmonScore(weather, tideData)
    case 'chum-salmon':
      return calculateChumSalmonScore(weather, tideData)
    case 'halibut':
      return calculateHalibutScore(weather, tideData)
    case 'lingcod':
      const result = calculateLingcodScore(weather, tideData)
      console.log('[Lingcod Algorithm] Result:', {
        total: result.total,
        isSafe: result.isSafe,
        factors: Object.entries(result.factors).map(([key, val]) => ({
          factor: key,
          value: val.value,
          weight: val.weight,
          score: val.score,
          contribution: (val.score * val.weight * 10).toFixed(2)
        }))
      })
      return result
    case 'rockfish':
      return calculateRockfishScore(weather, tideData)
    case 'crab':
      return calculateCrabScore(weather, tideData)
    case 'spot-prawn':
    case 'spotprawn':
    case 'spot-prawns':
    case 'spotprawns':
      return calculateSpotPrawnScore(weather, tideData)
    default:
      console.log('[Species Algorithm] No match found for:', normalizedSpecies)
      return null
  }
}