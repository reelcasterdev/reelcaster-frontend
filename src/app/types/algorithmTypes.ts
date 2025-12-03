// src/app/types/algorithmTypes.ts
// Extended Algorithm Context Types for V2 Improvements

/**
 * Enhanced fishing report data with bio-intelligence signals
 */
export interface FishingReportIntel {
  text: string
  sentiment: number // -1 to 1
  recentCatchCount: number
  // Bio-Intel derived from parsing "herring balls", "krill", "baitfish schools", etc.
  baitPresence: 'none' | 'low' | 'moderate' | 'high' | 'massive'
  keywordsFound: string[]
}

/**
 * Result from physics/environmental calculations
 */
export interface EnvironmentalAssessment {
  // Sea State
  windTideInteraction: {
    score: number // 0-1 (0 = dangerous washing machine, 1 = safe)
    isOpposing: boolean
    severity: 'calm' | 'moderate' | 'rough' | 'dangerous'
    warning?: string
  }

  swellQuality: {
    score: number // 0-1
    ratio: number // period/height ratio
    comfort: 'flat' | 'comfortable' | 'moderate' | 'uncomfortable' | 'dangerous'
    warning?: string
  }

  // Biological
  freshetStatus: {
    isBlownOut: boolean
    cause?: 'heavy_rain' | 'snowmelt' | 'both'
    warning?: string
  }

  baitAvailability: {
    score: number // 0-1
    presence: 'none' | 'low' | 'moderate' | 'high' | 'massive'
    isOverride: boolean // If massive, triggers minimum score guarantee
  }

  // Light Penetration
  lightPenetration: {
    score: number // 0-1
    sunAngle: number
    effectiveDepth: 'surface' | 'shallow' | 'mid' | 'deep' | 'very_deep'
    recommendation?: string
  }
}
