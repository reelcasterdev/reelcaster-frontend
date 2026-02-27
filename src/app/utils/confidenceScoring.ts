/**
 * Confidence Scoring Module
 *
 * Computes data confidence based on data-source proximity and availability.
 * Low confidence pulls fishing scores toward neutral (5.0).
 */

export interface DataConfidence {
  overall: number           // 0-1 weighted average
  weather: number           // 0-1
  marine: number            // 0-1
  tide: number              // 0-1
  tideStationDistanceKm: number | null
  tideStationName: string | null
}

/**
 * Tide confidence by station distance.
 */
export function tidConfidenceByDistance(distanceKm: number | null | undefined, source?: 'iwls' | 'stormglass' | null): number {
  if (source === 'stormglass') return 0.30
  if (distanceKm == null) return 0.0

  if (distanceKm <= 5)  return 0.95
  if (distanceKm <= 10) return 0.85
  if (distanceKm <= 15) return 0.70
  if (distanceKm <= 20) return 0.50
  return 0.30
}

/**
 * Build a DataConfidence object from data-source metadata.
 */
export function computeConfidence(metadata: {
  weather: string | null
  marine: string | null
  tide: string | null
  tideStationDistanceKm?: number | null
  tideStationName?: string | null
  stormglassAvailable?: boolean
}): DataConfidence {
  // Weather: Open Meteo alone = 0.80, with Stormglass cross-validation = 0.90
  const weatherConfidence = metadata.stormglassAvailable ? 0.90 : 0.80
  const marineConfidence = metadata.marine ? 0.80 : 0.0

  const tideConfidence = metadata.tide
    ? tidConfidenceByDistance(metadata.tideStationDistanceKm, metadata.tide as 'iwls' | 'stormglass')
    : 0.0

  // Weighted average (weather is most important)
  const overall =
    weatherConfidence * 0.40 +
    marineConfidence * 0.20 +
    tideConfidence * 0.40

  return {
    overall: Math.round(overall * 100) / 100,
    weather: weatherConfidence,
    marine: marineConfidence,
    tide: tideConfidence,
    tideStationDistanceKm: metadata.tideStationDistanceKm ?? null,
    tideStationName: metadata.tideStationName ?? null,
  }
}

/**
 * Apply confidence regression to a raw fishing score.
 * Low confidence pulls the score toward neutral (5.0).
 *
 * adjustedScore = neutral + (rawScore - neutral) * confidence
 */
export function applyConfidenceToScore(rawScore: number, confidence: number, neutral = 5.0): number {
  const adjusted = neutral + (rawScore - neutral) * confidence
  return Math.min(Math.max(Math.round(adjusted * 100) / 100, 0), 10)
}
