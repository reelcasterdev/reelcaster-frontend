// Astronomical calculations for fishing algorithms
// Moon phases, illumination, and year calculations

/**
 * Calculate moon phase for a given date
 * @param date - The date to calculate moon phase for
 * @returns Phase value between 0 and 1 (0 = new moon, 0.5 = full moon)
 */
export function getMoonPhase(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  // Convert date to Julian Day Number
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3

  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045

  // Calculate days since new moon (Jan 6, 2000)
  const daysSinceNew = jdn - 2451550.1
  const lunarCycle = 29.53059  // Average lunar cycle in days

  // Calculate phase (0 to 1)
  let phase = (daysSinceNew % lunarCycle) / lunarCycle
  if (phase < 0) phase += 1

  return phase
}

/**
 * Convert moon phase to illumination percentage
 * @param phase - Moon phase between 0 and 1
 * @returns Illumination percentage (0-100)
 */
export function getMoonIllumination(phase: number): number {
  // Use cosine function to approximate illumination
  // 0 and 1 = new moon (0% illumination)
  // 0.5 = full moon (100% illumination)
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2 * 100
  return Math.round(illumination)
}

/**
 * Get descriptive moon phase name
 * @param phase - Moon phase between 0 and 1
 * @returns Phase name
 */
export function getMoonPhaseName(phase: number): string {
  if (phase < 0.0625 || phase >= 0.9375) return 'New Moon'
  if (phase < 0.1875) return 'Waxing Crescent'
  if (phase < 0.3125) return 'First Quarter'
  if (phase < 0.4375) return 'Waxing Gibbous'
  if (phase < 0.5625) return 'Full Moon'
  if (phase < 0.6875) return 'Waning Gibbous'
  if (phase < 0.8125) return 'Last Quarter'
  return 'Waning Crescent'
}

/**
 * Check if current year is odd (important for Pink Salmon)
 * @param date - The date to check
 * @returns True if odd year
 */
export function isOddYear(date: Date): boolean {
  return date.getFullYear() % 2 === 1
}

/**
 * Get season for a given date
 * @param date - The date to check
 * @returns Season name
 */
export function getSeason(date: Date): 'spring' | 'summer' | 'fall' | 'winter' {
  const month = date.getMonth() + 1
  const day = date.getDate()

  // Using meteorological seasons for simplicity
  if (month === 3 || month === 4 || month === 5) return 'spring'
  if (month === 6 || month === 7 || month === 8) return 'summer'
  if (month === 9 || month === 10 || month === 11) return 'fall'

  // Handle edge cases around season transitions
  if (month === 12 && day >= 21) return 'winter'
  if (month === 3 && day < 21) return 'winter'
  if (month === 6 && day < 21) return 'spring'
  if (month === 9 && day < 21) return 'summer'
  if (month === 12 && day < 21) return 'fall'

  return 'winter'
}

/**
 * Calculate if tide is near slack (minimal current)
 * @param currentSpeed - Current speed in knots
 * @returns Score from 0 to 1 (1 = perfect slack tide)
 */
export function getSlackTideScore(currentSpeed: number): number {
  const absSpeed = Math.abs(currentSpeed)

  if (absSpeed <= 0.1) return 1.0  // Perfect slack
  if (absSpeed <= 0.2) return 0.9
  if (absSpeed <= 0.3) return 0.7
  if (absSpeed <= 0.5) return 0.5
  if (absSpeed <= 0.8) return 0.3
  if (absSpeed <= 1.0) return 0.2

  return 0.1  // Strong current
}

/**
 * Determine if tide is spring or neap
 * Spring tides occur near new and full moon (larger tidal range)
 * Neap tides occur near quarter moons (smaller tidal range)
 * @param moonPhase - Moon phase between 0 and 1
 * @returns 'spring' | 'neap' | 'normal'
 */
export function getTideType(moonPhase: number): 'spring' | 'neap' | 'normal' {
  // Spring tides: within 2 days of new/full moon
  if (moonPhase <= 0.07 || moonPhase >= 0.93) return 'spring'  // New moon
  if (moonPhase >= 0.43 && moonPhase <= 0.57) return 'spring'  // Full moon

  // Neap tides: within 2 days of quarter moons
  if (moonPhase >= 0.18 && moonPhase <= 0.32) return 'neap'  // First quarter
  if (moonPhase >= 0.68 && moonPhase <= 0.82) return 'neap'  // Last quarter

  return 'normal'
}

/**
 * Calculate solar position for light conditions
 * @param date - Date and time
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @returns Solar altitude in degrees (negative = below horizon)
 */
export function getSolarAltitude(date: Date, latitude: number, longitude: number): number {
  const julianDay = getJulianDay(date)
  const julianCentury = (julianDay - 2451545) / 36525

  // Solar calculations (simplified)
  const meanAnomaly = 357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury)
  const equationOfCenter = Math.sin(toRadians(meanAnomaly)) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury))
  const trueLongitude = (280.46646 + julianCentury * (36000.76983 + julianCentury * 0.0003032) + equationOfCenter) % 360

  // Declination
  const declination = Math.asin(Math.sin(toRadians(23.45)) * Math.sin(toRadians(trueLongitude)))

  // Hour angle
  const hourAngle = toRadians((date.getHours() + date.getMinutes() / 60 - 12) * 15 + longitude)

  // Altitude
  const altitude = Math.asin(
    Math.sin(declination) * Math.sin(toRadians(latitude)) +
    Math.cos(declination) * Math.cos(toRadians(latitude)) * Math.cos(hourAngle)
  )

  return toDegrees(altitude)
}

// Helper functions
function getJulianDay(date: Date): number {
  const a = Math.floor((14 - (date.getMonth() + 1)) / 12)
  const y = date.getFullYear() + 4800 - a
  const m = (date.getMonth() + 1) + 12 * a - 3

  return date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045 +
    (date.getHours() - 12) / 24
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180
}

function toDegrees(radians: number): number {
  return radians * 180 / Math.PI
}

/**
 * Determine light condition based on solar altitude
 * @param solarAltitude - Solar altitude in degrees
 * @returns Light condition description
 */
export function getLightCondition(solarAltitude: number): string {
  if (solarAltitude >= 6) return 'daylight'
  if (solarAltitude >= 0) return 'golden hour'
  if (solarAltitude >= -6) return 'civil twilight'
  if (solarAltitude >= -12) return 'nautical twilight'
  if (solarAltitude >= -18) return 'astronomical twilight'
  return 'night'
}