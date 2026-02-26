/**
 * Interpolation Utilities
 *
 * Converts hourly Stormglass data to 15-minute aligned values
 * for merging with Open Meteo 15-min weather data.
 */

/**
 * Linear interpolation between hourly data points.
 * Each input value represents one hour; output has `targetCount` evenly-spaced values
 * spanning the same total duration.
 */
export function linearInterpolate(hourlyValues: number[], targetCount: number): number[] {
  if (hourlyValues.length < 2) return hourlyValues
  const result: number[] = []
  const step = (hourlyValues.length - 1) / (targetCount - 1)

  for (let i = 0; i < targetCount; i++) {
    const pos = i * step
    const lo = Math.floor(pos)
    const hi = Math.min(lo + 1, hourlyValues.length - 1)
    const frac = pos - lo
    result.push(hourlyValues[lo] + frac * (hourlyValues[hi] - hourlyValues[lo]))
  }
  return result
}

/**
 * Angular interpolation for direction values (0-360°).
 * Handles 360° wrap-around correctly (e.g. 350° → 10° interpolates through 0°).
 */
export function angularInterpolate(hourlyDegrees: number[], targetCount: number): number[] {
  if (hourlyDegrees.length < 2) return hourlyDegrees
  const result: number[] = []
  const step = (hourlyDegrees.length - 1) / (targetCount - 1)

  for (let i = 0; i < targetCount; i++) {
    const pos = i * step
    const lo = Math.floor(pos)
    const hi = Math.min(lo + 1, hourlyDegrees.length - 1)
    const frac = pos - lo

    const a = hourlyDegrees[lo]
    const b = hourlyDegrees[hi]

    // Shortest angular path
    let diff = b - a
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360

    let val = a + frac * diff
    if (val < 0) val += 360
    if (val >= 360) val -= 360

    result.push(val)
  }
  return result
}

/**
 * Stormglass hourly record with numeric fields extracted.
 */
export interface InterpolatedRecord {
  timestamp: number // unix seconds
  [key: string]: number
}

/**
 * Interpolate an array of Stormglass hourly data objects to 15-minute intervals.
 *
 * Each input object should have a `time` (ISO string) and numeric fields.
 * Direction fields (wind, current, wave, swell) use angular interpolation.
 */
export function interpolateHourlyTo15Min(
  sgHours: { time: string; [key: string]: any }[],
  /** Field names that contain angular (0-360°) values */
  angularFields: string[] = ['windDirection', 'currentDirection', 'waveDirection'],
): InterpolatedRecord[] {
  if (sgHours.length < 2) return []

  // Extract timestamps and numeric field names
  const timestamps = sgHours.map(h => new Date(h.time).getTime() / 1000)
  const fieldNames = Object.keys(sgHours[0]).filter(k => k !== 'time' && typeof sgHours[0][k] === 'number')

  // For each hour pair, produce 4 × 15-min values (excluding the last hour's trailing edge
  // since the next pair starts there)
  const totalSlots = (sgHours.length - 1) * 4 + 1
  const result: InterpolatedRecord[] = []

  for (let slot = 0; slot < totalSlots; slot++) {
    const hourIdx = Math.min(Math.floor(slot / 4), sgHours.length - 2)
    const frac = (slot / 4) - hourIdx
    const ts = timestamps[hourIdx] + frac * (timestamps[hourIdx + 1] - timestamps[hourIdx])

    const record: InterpolatedRecord = { timestamp: Math.round(ts) }

    for (const field of fieldNames) {
      const a = sgHours[hourIdx][field]
      const b = sgHours[Math.min(hourIdx + 1, sgHours.length - 1)][field]
      if (typeof a !== 'number' || typeof b !== 'number') continue

      if (angularFields.includes(field)) {
        let diff = b - a
        if (diff > 180) diff -= 360
        if (diff < -180) diff += 360
        let val = a + frac * diff
        if (val < 0) val += 360
        if (val >= 360) val -= 360
        record[field] = Math.round(val * 100) / 100
      } else {
        record[field] = Math.round((a + frac * (b - a)) * 100) / 100
      }
    }

    result.push(record)
  }

  return result
}
