// Species-specific fishing score algorithms
// Each species has its own unique algorithm with different weight distributions

import { OpenMeteo15MinData } from './openMeteoApi'
import { CHSWaterData } from './chsTideApi'
import { getMoonPhase, getMoonIllumination, isOddYear } from './astronomicalCalculations'

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

// Helper function to calculate slack tide score
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
  debug?: string
}

// ==================== CHINOOK SALMON ====================
export function calculateChinookSalmonScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const date = new Date(weather.timestamp)
  const hour = date.getHours()

  // 1. OPTIMAL LIGHT/TIME (20% weight)
  let lightScore = 0.5
  if (hour >= 4 && hour <= 7) lightScore = 1.0  // Dawn
  else if (hour >= 18 && hour <= 21) lightScore = 0.9  // Dusk
  else if (hour >= 8 && hour <= 10) lightScore = 0.7  // Morning
  else if (hour >= 16 && hour <= 17) lightScore = 0.7  // Late afternoon
  else if (hour >= 11 && hour <= 15) lightScore = 0.4  // Midday
  else lightScore = 0.2  // Night

  factors['lightTime'] = { value: hour, weight: 0.20, score: lightScore }

  // 2. TIDAL RANGE (15% weight)
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 2.5) tidalScore = 1.0  // Strong tidal movement
    else if (tidalRange >= 1.5) tidalScore = 0.8
    else if (tidalRange >= 0.8) tidalScore = 0.6
    else tidalScore = 0.4
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.15, score: tidalScore }

  // 3. CURRENT FLOW (15% weight)
  let currentScore = 0.5
  if (tideData) {
    const current = Math.abs(tideData.currentSpeed || 0)
    if (current >= 0.5 && current <= 2.0) currentScore = 1.0  // Optimal
    else if (current >= 0.3 && current <= 2.5) currentScore = 0.7
    else if (current < 0.3) currentScore = 0.4  // Too slow
    else currentScore = 0.3  // Too fast
  }
  factors['currentFlow'] = { value: tideData?.currentSpeed || 0, weight: 0.15, score: currentScore }

  // 4. DATES/SEASONALITY (15% weight)
  const seasonalScore = getSeasonalWeight(date, [5, 6, 7, 8, 9])  // May-September peak
  factors['seasonality'] = { value: date.getMonth() + 1, weight: 0.15, score: seasonalScore }

  // 5. BAROMETRIC PRESSURE (10% weight)
  let pressureScore = 0.5
  const pressure = weather.pressure || 1013
  if (pressure >= 1009 && pressure <= 1013) pressureScore = 1.0  // Stable/falling
  else if (pressure >= 1006 && pressure <= 1016) pressureScore = 0.7
  else if (pressure < 1006) pressureScore = 0.9  // Low pressure
  else pressureScore = 0.4  // High pressure

  factors['pressure'] = { value: pressure, weight: 0.10, score: pressureScore }

  // 6. MOONPHASE (5% weight)
  const moonPhase = getMoonPhase(date)
  const moonScore = moonPhase <= 0.25 || moonPhase >= 0.75 ? 0.8 : 0.5  // Better near new moon
  factors['moonPhase'] = { value: moonPhase, weight: 0.05, score: moonScore }

  // 7. WATER TEMPERATURE (10% weight)
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  if (waterTemp >= 7 && waterTemp <= 13) waterTempScore = 1.0
  else if (waterTemp >= 5 && waterTemp <= 15) waterTempScore = 0.7
  else waterTempScore = 0.3
  factors['waterTemp'] = { value: waterTemp, weight: 0.10, score: waterTempScore }

  // 8. WIND (5% weight)
  let windScore = 1.0
  const windSpeed = weather.windSpeed || 0
  if (windSpeed <= 10) windScore = 1.0
  else if (windSpeed <= 20) windScore = 0.7
  else if (windSpeed <= 30) windScore = 0.4
  else windScore = 0.1
  factors['wind'] = { value: windSpeed, weight: 0.05, score: windScore }

  // 9. PRECIPITATION (5% weight)
  let precipScore = 1.0
  const precipitation = weather.precipitation || 0
  if (precipitation === 0) precipScore = 1.0
  else if (precipitation <= 2) precipScore = 0.8
  else if (precipitation <= 5) precipScore = 0.5
  else precipScore = 0.3
  factors['precipitation'] = { value: precipitation, weight: 0.05, score: precipScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  return { total, factors }
}

// ==================== PINK SALMON ====================
export function calculatePinkSalmonScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const date = new Date(weather.timestamp)
  const hour = date.getHours()

  // 1. DATES/SEASONALITY (30% weight) - Critical for Pink Salmon
  let seasonalScore = 0.2
  const month = date.getMonth() + 1
  const isOdd = isOddYear(date)

  // Pink salmon run in odd years primarily
  if (!isOdd) {
    seasonalScore = 0.1  // Very poor in even years
  } else {
    if (month === 8 || month === 9) seasonalScore = 1.0  // Peak: August-September
    else if (month === 7 || month === 10) seasonalScore = 0.7
    else if (month === 6) seasonalScore = 0.4
    else seasonalScore = 0.1
  }
  factors['seasonality'] = { value: isOdd ? 1 : 0, weight: 0.30, score: seasonalScore }

  // 2. CURRENT FLOW (15% weight)
  let currentScore = 0.5
  if (tideData) {
    const current = Math.abs(tideData.currentSpeed || 0)
    if (current >= 0.4 && current <= 1.8) currentScore = 1.0
    else if (current >= 0.2 && current <= 2.2) currentScore = 0.7
    else currentScore = 0.4
  }
  factors['currentFlow'] = { value: tideData?.currentSpeed || 0, weight: 0.15, score: currentScore }

  // 3. LIGHT/TIME (15% weight)
  let lightScore = 0.5
  if (hour >= 5 && hour <= 8) lightScore = 1.0  // Dawn
  else if (hour >= 17 && hour <= 20) lightScore = 0.9  // Dusk
  else if (hour >= 9 && hour <= 16) lightScore = 0.6  // Day
  else lightScore = 0.3  // Night
  factors['lightTime'] = { value: hour, weight: 0.15, score: lightScore }

  // 4. TIDAL RANGE (10% weight)
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 1.5) tidalScore = 0.9
    else if (tidalRange >= 0.8) tidalScore = 0.7
    else tidalScore = 0.5
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.10, score: tidalScore }

  // 5. BAROMETRIC PRESSURE (10% weight)
  let pressureScore = 0.5
  const pressure = weather.pressure || 1013
  if (pressure >= 1008 && pressure <= 1014) pressureScore = 1.0
  else if (pressure >= 1005 && pressure <= 1017) pressureScore = 0.7
  else pressureScore = 0.4
  factors['pressure'] = { value: pressure, weight: 0.10, score: pressureScore }

  // 6. WATER TEMPERATURE (10% weight)
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  if (waterTemp >= 8 && waterTemp <= 14) waterTempScore = 1.0
  else if (waterTemp >= 6 && waterTemp <= 16) waterTempScore = 0.7
  else waterTempScore = 0.3
  factors['waterTemp'] = { value: waterTemp, weight: 0.10, score: waterTempScore }

  // 7. WIND (5% weight)
  let windScore = 1.0
  const windSpeed = weather.windSpeed || 0
  if (windSpeed <= 15) windScore = 1.0
  else if (windSpeed <= 25) windScore = 0.7
  else windScore = 0.3
  factors['wind'] = { value: windSpeed, weight: 0.05, score: windScore }

  // 8. MOONPHASE (5% weight)
  const moonPhase = getMoonPhase(date)
  const moonScore = 0.5 + (Math.sin(moonPhase * 2 * Math.PI) * 0.3)  // Slight variation
  factors['moonPhase'] = { value: moonPhase, weight: 0.05, score: moonScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  return { total, factors }
}

// ==================== HALIBUT ====================
export function calculateHalibutScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const date = new Date(weather.timestamp)
  const hour = date.getHours()

  // 1. TIDAL RANGE (25% weight) - INVERTED LOGIC for Halibut
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    // Halibut prefer NEAP tides (smaller range)
    if (tidalRange <= 1.0) tidalScore = 1.0  // Minimal tidal movement
    else if (tidalRange <= 1.5) tidalScore = 0.8
    else if (tidalRange <= 2.0) tidalScore = 0.5
    else tidalScore = 0.3  // Poor during spring tides
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.25, score: tidalScore }

  // 2. CURRENT FLOW (25% weight) - Very important
  let currentScore = 0.5
  if (tideData) {
    const current = Math.abs(tideData.currentSpeed || 0)
    if (current >= 0.5 && current <= 1.5) currentScore = 1.0  // Moderate current
    else if (current >= 0.3 && current <= 2.0) currentScore = 0.7
    else if (current < 0.3) currentScore = 0.5  // Too slow
    else currentScore = 0.2  // Too fast
  }
  factors['currentFlow'] = { value: tideData?.currentSpeed || 0, weight: 0.25, score: currentScore }

  // 3. DATES/SEASONALITY (15% weight)
  const seasonalScore = getSeasonalWeight(date, [5, 6, 7, 8])  // May-August peak
  factors['seasonality'] = { value: date.getMonth() + 1, weight: 0.15, score: seasonalScore }

  // 4. MOONPHASE (10% weight)
  const moonPhase = getMoonPhase(date)
  // Halibut prefer quarter moons (neap tides)
  let moonScore = 0.5
  if ((moonPhase >= 0.20 && moonPhase <= 0.30) || (moonPhase >= 0.70 && moonPhase <= 0.80)) {
    moonScore = 1.0  // Quarter moons
  } else if (moonPhase <= 0.1 || moonPhase >= 0.9 || (moonPhase >= 0.45 && moonPhase <= 0.55)) {
    moonScore = 0.3  // New/full moon (spring tides)
  }
  factors['moonPhase'] = { value: moonPhase, weight: 0.10, score: moonScore }

  // 5. BAROMETRIC PRESSURE (10% weight)
  let pressureScore = 0.5
  const pressure = weather.pressure || 1013
  if (pressure >= 1010 && pressure <= 1015) pressureScore = 1.0  // Stable
  else if (pressure >= 1008 && pressure <= 1018) pressureScore = 0.7
  else pressureScore = 0.4
  factors['pressure'] = { value: pressure, weight: 0.10, score: pressureScore }

  // 6. WATER TEMPERATURE (10% weight)
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  if (waterTemp >= 6 && waterTemp <= 12) waterTempScore = 1.0
  else if (waterTemp >= 4 && waterTemp <= 14) waterTempScore = 0.7
  else waterTempScore = 0.3
  factors['waterTemp'] = { value: waterTemp, weight: 0.10, score: waterTempScore }

  // 7. LIGHT/TIME (5% weight) - Less important for bottom fish
  let lightScore = 0.7  // Relatively consistent throughout day
  if (hour >= 6 && hour <= 9) lightScore = 0.9
  else if (hour >= 16 && hour <= 19) lightScore = 0.8
  factors['lightTime'] = { value: hour, weight: 0.05, score: lightScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  return { total, factors }
}

// ==================== LINGCOD ====================
export function calculateLingcodScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const date = new Date(weather.timestamp)
  const hour = date.getHours()

  // 1. CURRENT FLOW - SLACK TIDE FOCUS (30% weight)
  const slackScore = getSlackTideScore(tideData)
  factors['slackTide'] = { value: tideData?.currentSpeed || 0, weight: 0.30, score: slackScore }

  // 2. TIDAL RANGE (20% weight)
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 2.0) tidalScore = 1.0
    else if (tidalRange >= 1.2) tidalScore = 0.8
    else if (tidalRange >= 0.6) tidalScore = 0.6
    else tidalScore = 0.4
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.20, score: tidalScore }

  // 3. BAROMETRIC PRESSURE (15% weight)
  let pressureScore = 0.5
  const pressure = weather.pressure || 1013
  if (pressure >= 1008 && pressure <= 1013) pressureScore = 1.0
  else if (pressure >= 1005 && pressure <= 1016) pressureScore = 0.7
  else pressureScore = 0.4
  factors['pressure'] = { value: pressure, weight: 0.15, score: pressureScore }

  // 4. WAVE HEIGHT (10% weight)
  const windSpeed = weather.windSpeed || 0
  const waveHeight = estimateWaveHeight(windSpeed)
  let waveScore = 1.0
  if (waveHeight <= 0.5) waveScore = 1.0
  else if (waveHeight <= 1.0) waveScore = 0.8
  else if (waveHeight <= 1.5) waveScore = 0.5
  else waveScore = 0.2
  factors['waveHeight'] = { value: waveHeight, weight: 0.10, score: waveScore }

  // 5. WATER TEMPERATURE (10% weight)
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  if (waterTemp >= 8 && waterTemp <= 14) waterTempScore = 1.0
  else if (waterTemp >= 6 && waterTemp <= 16) waterTempScore = 0.7
  else waterTempScore = 0.4
  factors['waterTemp'] = { value: waterTemp, weight: 0.10, score: waterTempScore }

  // 6. DATES/SEASONALITY (10% weight)
  const seasonalScore = getSeasonalWeight(date, [4, 5, 6, 7, 8, 9])  // April-September
  factors['seasonality'] = { value: date.getMonth() + 1, weight: 0.10, score: seasonalScore }

  // 7. LIGHT/TIME (5% weight)
  let lightScore = 0.6
  if (hour >= 6 && hour <= 10) lightScore = 0.8
  else if (hour >= 15 && hour <= 19) lightScore = 0.7
  factors['lightTime'] = { value: hour, weight: 0.05, score: lightScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  return { total, factors }
}

// ==================== COHO SALMON ====================
export function calculateCohoSalmonScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const date = new Date(weather.timestamp)
  const hour = date.getHours()

  // 1. DATES/SEASONALITY (25% weight)
  const seasonalScore = getSeasonalWeight(date, [7, 8, 9, 10])  // July-October peak
  factors['seasonality'] = { value: date.getMonth() + 1, weight: 0.25, score: seasonalScore }

  // 2. LIGHT/TIME (20% weight) - Visual hunters
  let lightScore = 0.5
  if (hour >= 5 && hour <= 8) lightScore = 1.0  // Dawn
  else if (hour >= 17 && hour <= 20) lightScore = 0.95  // Dusk
  else if (hour >= 9 && hour <= 11) lightScore = 0.7  // Morning
  else if (hour >= 14 && hour <= 16) lightScore = 0.6  // Afternoon
  else if (hour >= 12 && hour <= 13) lightScore = 0.4  // Midday
  else lightScore = 0.2  // Night
  factors['lightTime'] = { value: hour, weight: 0.20, score: lightScore }

  // 3. CURRENT FLOW (20% weight)
  let currentScore = 0.5
  if (tideData) {
    const current = Math.abs(tideData.currentSpeed || 0)
    if (current >= 0.4 && current <= 1.8) currentScore = 1.0
    else if (current >= 0.2 && current <= 2.2) currentScore = 0.7
    else if (current < 0.2) currentScore = 0.4
    else currentScore = 0.3
  }
  factors['currentFlow'] = { value: tideData?.currentSpeed || 0, weight: 0.20, score: currentScore }

  // 4. TIDAL RANGE (15% weight)
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 1.8) tidalScore = 0.9
    else if (tidalRange >= 1.0) tidalScore = 0.7
    else tidalScore = 0.5
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.15, score: tidalScore }

  // 5. BAROMETRIC PRESSURE (10% weight)
  let pressureScore = 0.5
  const pressure = weather.pressure || 1013
  if (pressure >= 1009 && pressure <= 1014) pressureScore = 1.0
  else if (pressure >= 1006 && pressure <= 1017) pressureScore = 0.7
  else pressureScore = 0.4
  factors['pressure'] = { value: pressure, weight: 0.10, score: pressureScore }

  // 6. WATER TEMPERATURE (10% weight)
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  if (waterTemp >= 9 && waterTemp <= 15) waterTempScore = 1.0
  else if (waterTemp >= 7 && waterTemp <= 17) waterTempScore = 0.7
  else waterTempScore = 0.3
  factors['waterTemp'] = { value: waterTemp, weight: 0.10, score: waterTempScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  return { total, factors }
}

// ==================== ROCKFISH ====================
export function calculateRockfishScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const date = new Date(weather.timestamp)
  const hour = date.getHours()

  // 1. CURRENT FLOW - SLACK TIDE CRITICAL (35% weight)
  const slackScore = getSlackTideScore(tideData)
  factors['slackTide'] = { value: tideData?.currentSpeed || 0, weight: 0.35, score: slackScore }

  // 2. WIND (20% weight)
  let windScore = 1.0
  const windSpeed = weather.windSpeed || 0
  if (windSpeed <= 10) windScore = 1.0
  else if (windSpeed <= 20) windScore = 0.7
  else if (windSpeed <= 30) windScore = 0.3
  else windScore = 0.1
  factors['wind'] = { value: windSpeed, weight: 0.20, score: windScore }

  // 3. WAVE HEIGHT (20% weight)
  const waveHeight = estimateWaveHeight(windSpeed)
  let waveScore = 1.0
  if (waveHeight <= 0.5) waveScore = 1.0
  else if (waveHeight <= 1.0) waveScore = 0.7
  else if (waveHeight <= 1.5) waveScore = 0.4
  else waveScore = 0.1
  factors['waveHeight'] = { value: waveHeight, weight: 0.20, score: waveScore }

  // 4. BAROMETRIC PRESSURE (10% weight)
  let pressureScore = 0.5
  const pressure = weather.pressure || 1013
  if (pressure >= 1010 && pressure <= 1015) pressureScore = 1.0
  else if (pressure >= 1008 && pressure <= 1018) pressureScore = 0.7
  else pressureScore = 0.4
  factors['pressure'] = { value: pressure, weight: 0.10, score: pressureScore }

  // 5. WATER TEMPERATURE (10% weight)
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  if (waterTemp >= 8 && waterTemp <= 14) waterTempScore = 1.0
  else if (waterTemp >= 6 && waterTemp <= 16) waterTempScore = 0.7
  else waterTempScore = 0.4
  factors['waterTemp'] = { value: waterTemp, weight: 0.10, score: waterTempScore }

  // 6. LIGHT/TIME (5% weight) - Bottom dwellers, less light-dependent
  let lightScore = 0.7  // Relatively consistent
  if (hour >= 7 && hour <= 10) lightScore = 0.8
  else if (hour >= 15 && hour <= 18) lightScore = 0.75
  factors['lightTime'] = { value: hour, weight: 0.05, score: lightScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  return { total, factors }
}

// ==================== CRAB ====================
export function calculateCrabScore(
  weather: OpenMeteo15MinData,
  tideData?: CHSWaterData
): SpeciesScoreResult {
  const factors: SpeciesScoreResult['factors'] = {}
  const date = new Date(weather.timestamp)
  const hour = date.getHours()

  // 1. CURRENT FLOW (25% weight) - Slack tide important
  const slackScore = getSlackTideScore(tideData)
  factors['slackTide'] = { value: tideData?.currentSpeed || 0, weight: 0.25, score: slackScore }

  // 2. TIDAL RANGE (20% weight)
  let tidalScore = 0.5
  if (tideData) {
    const tidalRange = Math.abs(tideData.tidalRange || 0)
    if (tidalRange >= 1.5) tidalScore = 0.9
    else if (tidalRange >= 1.0) tidalScore = 0.7
    else tidalScore = 0.5
  }
  factors['tidalRange'] = { value: tideData?.tidalRange || 0, weight: 0.20, score: tidalScore }

  // 3. MOONPHASE (15% weight) - Important for crab
  const moonPhase = getMoonPhase(date)
  const moonIllum = getMoonIllumination(moonPhase)
  const moonScore = moonIllum / 100  // More active during brighter moons
  factors['moonPhase'] = { value: moonPhase, weight: 0.15, score: moonScore }

  // 4. DATES/SEASONALITY (15% weight)
  const seasonalScore = getSeasonalWeight(date, [6, 7, 8, 9])  // June-September
  factors['seasonality'] = { value: date.getMonth() + 1, weight: 0.15, score: seasonalScore }

  // 5. WATER TEMPERATURE (10% weight)
  let waterTempScore = 0.5
  const waterTemp = tideData?.waterTemperature || weather.temp || 10
  if (waterTemp >= 10 && waterTemp <= 16) waterTempScore = 1.0
  else if (waterTemp >= 8 && waterTemp <= 18) waterTempScore = 0.7
  else waterTempScore = 0.4
  factors['waterTemp'] = { value: waterTemp, weight: 0.10, score: waterTempScore }

  // 6. BAROMETRIC PRESSURE (10% weight)
  let pressureScore = 0.5
  const pressure = weather.pressure || 1013
  if (pressure >= 1010 && pressure <= 1015) pressureScore = 1.0
  else if (pressure >= 1008 && pressure <= 1018) pressureScore = 0.7
  else pressureScore = 0.4
  factors['pressure'] = { value: pressure, weight: 0.10, score: pressureScore }

  // 7. LIGHT/TIME (5% weight)
  const lightScore = 0.7  // Crab are relatively consistent
  factors['lightTime'] = { value: hour, weight: 0.05, score: lightScore }

  // Calculate total score
  const total = Object.values(factors).reduce((sum, factor) =>
    sum + (factor.score * factor.weight), 0) * 10

  return { total, factors }
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
  tideData?: CHSWaterData
): SpeciesScoreResult | null {
  if (!species) return null

  // Normalize species name to match our function names
  const normalizedSpecies = species.toLowerCase().replace(/\s+/g, '-')

  switch (normalizedSpecies) {
    case 'chinook-salmon':
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
      return calculateLingcodScore(weather, tideData)
    case 'rockfish':
      return calculateRockfishScore(weather, tideData)
    case 'crab':
      return calculateCrabScore(weather, tideData)
    default:
      return null
  }
}