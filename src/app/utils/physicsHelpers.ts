// physicsHelpers.ts
// Physics-based environmental calculations for fishing algorithms
//
// These helpers transform raw weather data into meaningful fishing insights:
// - Wind-vs-Tide vector interaction ("washing machine" effect)
// - Swell Period comfort scoring (period-to-height ratio)
// - Freshet/Snowmelt detection (river blowout conditions)
// - Sun Elevation light penetration (fish depth prediction)
// - Bait Presence bio-availability scoring

// ==================== WIND-TIDE INTERACTION ====================

export interface WindTideResult {
  score: number // 0-1 (0 = dangerous, 1 = ideal)
  isOpposing: boolean
  severity: 'calm' | 'moderate' | 'rough' | 'dangerous'
  warning?: string
}

/**
 * Calculate Wind-Tide Interaction Score
 *
 * When wind opposes current, it creates steep, choppy waves ("washing machine" effect).
 * This is dangerous for small craft and makes fishing difficult.
 *
 * @param windDir - Direction wind is coming FROM (0-360 degrees)
 * @param windSpeed - Wind speed in knots
 * @param currentDir - Direction water is flowing TOWARDS (0-360 degrees)
 * @param currentSpeed - Current speed in knots
 */
export function calculateWindTideInteraction(
  windDir: number,
  windSpeed: number,
  currentDir: number,
  currentSpeed: number
): WindTideResult {
  // Handle 360° wrap-around for direction difference
  let diff = Math.abs(windDir - currentDir)
  if (diff > 180) diff = 360 - diff

  // Opposing = 180° ± 45° (wind and current in opposite directions)
  const isOpposing = diff > 135

  // Calculate combined energy (wind + current interaction)
  const combinedEnergy = windSpeed * 0.7 + currentSpeed * 0.3

  // Default result
  let score = 1.0
  let severity: 'calm' | 'moderate' | 'rough' | 'dangerous' = 'calm'
  let warning: string | undefined

  if (isOpposing) {
    // Opposing wind and tide creates dangerous chop
    if (windSpeed > 20 || combinedEnergy > 25) {
      score = 0.2
      severity = 'dangerous'
      warning = 'DANGEROUS: Wind opposing tide creates steep, breaking waves. Small craft advisory.'
    } else if (windSpeed > 15 || combinedEnergy > 18) {
      score = 0.4
      severity = 'rough'
      warning = 'CAUTION: Wind opposing tide. Expect steep chop and uncomfortable conditions.'
    } else if (windSpeed > 10 || combinedEnergy > 12) {
      score = 0.6
      severity = 'moderate'
      warning = 'Wind opposing tide. Some chop expected.'
    } else {
      score = 0.8
      severity = 'moderate'
    }
  } else {
    // Wind WITH tide = bonus (smoother conditions)
    if (diff < 45 && windSpeed < 20) {
      score = 1.0 // Ideal - wind and tide aligned
      severity = 'calm'
    } else if (windSpeed > 25) {
      score = 0.5
      severity = 'rough'
      warning = 'Strong winds despite favorable tide alignment.'
    } else if (windSpeed > 15) {
      score = 0.7
      severity = 'moderate'
    } else {
      score = 0.9
      severity = 'calm'
    }
  }

  return { score, isOpposing, severity, warning }
}

// ==================== SWELL QUALITY ====================

export interface SwellQualityResult {
  score: number // 0-1
  ratio: number // period/height ratio
  comfort: 'flat' | 'comfortable' | 'moderate' | 'uncomfortable' | 'dangerous'
  warning?: string
}

/**
 * Calculate Swell Quality Score
 *
 * The period-to-height ratio determines comfort:
 * - High ratio (long period, low height) = comfortable, rolling swell
 * - Low ratio (short period, tall waves) = dangerous, breaking chop
 *
 * @param height - Swell height in meters
 * @param period - Swell period in seconds
 */
export function calculateSwellQuality(
  height: number,
  period: number
): SwellQualityResult {
  // Handle edge cases
  if (height <= 0.3) {
    return { score: 1.0, ratio: Infinity, comfort: 'flat' }
  }

  const ratio = period / height

  let score: number
  let comfort: 'flat' | 'comfortable' | 'moderate' | 'uncomfortable' | 'dangerous'
  let warning: string | undefined

  // Ratio thresholds based on fisherman experience
  if (ratio >= 8.0) {
    score = 1.0
    comfort = 'comfortable'
  } else if (ratio >= 5.0) {
    score = 0.85
    comfort = 'comfortable'
  } else if (ratio >= 4.0) {
    score = 0.7
    comfort = 'moderate'
  } else if (ratio >= 3.5) {
    score = 0.5
    comfort = 'uncomfortable'
    warning = 'Short period swell. Expect choppy conditions.'
  } else if (ratio >= 3.0) {
    score = 0.3
    comfort = 'uncomfortable'
    warning = 'Very short period swell. Uncomfortable and potentially dangerous.'
  } else {
    score = 0.1
    comfort = 'dangerous'
    warning = 'DANGEROUS: Steep breaking waves. Not recommended for small craft.'
  }

  // Additional check: absolute height danger threshold
  if (height > 3.0) {
    score = Math.min(score, 0.3)
    comfort = 'dangerous'
    warning = `DANGEROUS: Swell height ${height.toFixed(1)}m exceeds safe threshold.`
  } else if (height > 2.0 && ratio < 5.0) {
    score = Math.min(score, 0.4)
    if (comfort !== 'dangerous') comfort = 'uncomfortable'
    warning = warning || 'Large swell with short period. Exercise caution.'
  }

  return { score, ratio, comfort, warning }
}

// ==================== FRESHET/SNOWMELT DETECTION ====================

export interface FreshetResult {
  isBlownOut: boolean
  cause?: 'heavy_rain' | 'snowmelt' | 'both'
  severity: 'clear' | 'stained' | 'muddy' | 'blown_out'
  turbidityScore: number // 0-1 (1 = clear, 0 = blown out)
  warning?: string
}

/**
 * Calculate Freshet Status
 *
 * Detects river blowout conditions from:
 * - Heavy rain (>25mm in 24h)
 * - Snowmelt (warm temps in spring/early summer)
 *
 * @param precipitation24h - Total precipitation in last 24 hours (mm)
 * @param maxTemp24h - Maximum temperature in last 24 hours (Celsius)
 * @param month - Current month (0-11)
 */
export function calculateFreshetStatus(
  precipitation24h: number,
  maxTemp24h: number,
  month: number
): FreshetResult {
  let isBlownOut = false
  let cause: 'heavy_rain' | 'snowmelt' | 'both' | undefined
  let severity: 'clear' | 'stained' | 'muddy' | 'blown_out' = 'clear'
  let turbidityScore = 1.0
  let warning: string | undefined

  // Heavy rain blowout
  const isHeavyRain = precipitation24h > 40
  const isModerateRain = precipitation24h > 25

  // Freshet season (April-July) with warm temps
  const isFreshetSeason = month >= 3 && month <= 6 // April-July (0-indexed)
  const isWarmEnoughForSnowmelt = maxTemp24h > 20
  const isHotSnowmelt = maxTemp24h > 28

  // Check for snowmelt freshet
  const hasSnowmelt = isFreshetSeason && isHotSnowmelt

  if (isHeavyRain && hasSnowmelt) {
    isBlownOut = true
    cause = 'both'
    severity = 'blown_out'
    turbidityScore = 0.0
    warning = 'BLOWN OUT: Heavy rain + snowmelt. Rivers unfishable. Try offshore or wait 2-3 days.'
  } else if (isHeavyRain) {
    isBlownOut = true
    cause = 'heavy_rain'
    severity = 'blown_out'
    turbidityScore = 0.1
    warning = 'BLOWN OUT: Heavy rain. River mouths and estuaries muddy. Wait 24-48 hours.'
  } else if (hasSnowmelt) {
    isBlownOut = true
    cause = 'snowmelt'
    severity = 'blown_out'
    turbidityScore = 0.15
    warning = 'FRESHET: Hot weather causing snowmelt runoff. Rivers glacial and turbid.'
  } else if (isModerateRain) {
    severity = 'muddy'
    turbidityScore = 0.4
    warning = 'Moderate rain may cause stained water near river mouths.'
  } else if (precipitation24h > 15) {
    severity = 'stained'
    turbidityScore = 0.7
    warning = 'Light rain may stain water slightly.'
  } else if (isFreshetSeason && isWarmEnoughForSnowmelt) {
    severity = 'stained'
    turbidityScore = 0.6
    warning = 'Warm temps during freshet season. Some glacial runoff possible.'
  }

  return { isBlownOut, cause, severity, turbidityScore, warning }
}

// ==================== LIGHT PENETRATION / SUN ELEVATION ====================

export interface LightPenetrationResult {
  score: number // 0-1
  sunAngle: number
  effectiveDepth: 'surface' | 'shallow' | 'mid' | 'deep' | 'very_deep'
  recommendation?: string
}

/**
 * Calculate Light Penetration Score based on Sun Elevation
 *
 * High sun angle = deep light penetration = fish go deep
 * Low sun angle = shallow light penetration = fish come up
 *
 * Critical for visual feeders like Coho salmon.
 *
 * @param sunElevation - Sun angle above horizon (0-90 degrees)
 * @param cloudCover - Cloud cover percentage (0-100)
 */
export function calculateLightPenetration(
  sunElevation: number,
  cloudCover: number = 50
): LightPenetrationResult {
  // Cloud cover reduces effective sun penetration
  const effectiveSunAngle = sunElevation * (1 - cloudCover * 0.005) // 50% clouds = 25% reduction

  let score: number
  let effectiveDepth: 'surface' | 'shallow' | 'mid' | 'deep' | 'very_deep'
  let recommendation: string | undefined

  if (effectiveSunAngle < 10) {
    // Dawn/dusk - fish near surface
    score = 1.0
    effectiveDepth = 'surface'
    recommendation = 'Low light. Fish shallow (0-30ft). Surface action likely.'
  } else if (effectiveSunAngle < 25) {
    // Morning/evening - fish in upper water column
    score = 0.9
    effectiveDepth = 'shallow'
    recommendation = 'Moderate light. Fish 20-50ft.'
  } else if (effectiveSunAngle < 40) {
    // Mid-morning/afternoon
    score = 0.7
    effectiveDepth = 'mid'
    recommendation = 'Bright conditions. Fish 40-80ft.'
  } else if (effectiveSunAngle < 55) {
    // Late morning
    score = 0.5
    effectiveDepth = 'deep'
    recommendation = 'High sun. Fish 60-100ft. Use downriggers.'
  } else {
    // Midday - maximum penetration
    score = 0.3
    effectiveDepth = 'very_deep'
    recommendation = 'Peak sun. Fish deep (80-120ft) or wait for evening.'
  }

  // Cloud cover bonus
  if (cloudCover > 70 && effectiveSunAngle > 25) {
    score = Math.min(score + 0.2, 1.0)
    recommendation = 'Overcast conditions improve shallow fishing despite high sun.'
  }

  return { score, sunAngle: sunElevation, effectiveDepth, recommendation }
}

// ==================== BAIT PRESENCE ====================

export interface BaitPresenceResult {
  score: number // 0-1
  presence: 'none' | 'low' | 'moderate' | 'high' | 'massive'
  isOverride: boolean // If massive, triggers minimum score guarantee
  recommendation?: string
}

/**
 * Calculate Bait Presence Score
 *
 * Bait presence is the strongest predictor of predator activity.
 * "Massive" bait presence overrides poor weather conditions.
 *
 * @param baitPresence - Bait presence level from fishing reports
 * @param keywords - Keywords found in reports (herring, krill, baitfish, etc.)
 */
export function calculateBaitPresenceScore(
  baitPresence: 'none' | 'low' | 'moderate' | 'high' | 'massive',
  keywords: string[] = []
): BaitPresenceResult {
  let score: number
  let isOverride = false
  let recommendation: string | undefined

  switch (baitPresence) {
    case 'massive':
      score = 1.0
      isOverride = true
      recommendation = 'MASSIVE BAIT: Predators stacked. Fish regardless of other conditions.'
      break
    case 'high':
      score = 0.9
      recommendation = 'Strong bait presence. Excellent fishing likely.'
      break
    case 'moderate':
      score = 0.7
      recommendation = 'Moderate bait in area. Good chances.'
      break
    case 'low':
      score = 0.4
      recommendation = 'Limited bait. May need to search for fish.'
      break
    case 'none':
    default:
      score = 0.3
      recommendation = 'No bait reported. Use attractants and cover more water.'
      break
  }

  // Bonus for specific high-value keywords
  const highValueKeywords = ['herring balls', 'bait balls', 'krill boils', 'needle fish']
  const hasHighValue = keywords.some(k =>
    highValueKeywords.some(hv => k.toLowerCase().includes(hv))
  )
  if (hasHighValue && score < 0.9) {
    score = Math.min(score + 0.15, 1.0)
  }

  return { score, presence: baitPresence, isOverride, recommendation }
}

/**
 * Parse bait presence from fishing report text
 *
 * Extracts bio-intel signals from natural language reports.
 */
export function parseBaitPresenceFromText(
  reportText: string
): { presence: 'none' | 'low' | 'moderate' | 'high' | 'massive'; keywords: string[] } {
  const text = reportText.toLowerCase()
  const keywords: string[] = []

  // Keywords indicating bait presence
  const baitKeywords = [
    'herring', 'herring balls', 'bait balls', 'baitfish', 'needle fish', 'needlefish',
    'krill', 'krill boils', 'euphausiids', 'anchovies', 'sardines', 'pilchards',
    'sandlance', 'sand lance', 'candlefish', 'eulachon', 'smelt',
    'bait', 'feed', 'feeding', 'schools', 'schooling', 'marks', 'marking'
  ]

  // Extract found keywords
  for (const keyword of baitKeywords) {
    if (text.includes(keyword)) {
      keywords.push(keyword)
    }
  }

  // Determine presence level based on keyword density and modifiers
  let presence: 'none' | 'low' | 'moderate' | 'high' | 'massive' = 'none'

  const massiveIndicators = ['massive', 'huge', 'incredible', 'everywhere', 'thick', 'packed']
  const highIndicators = ['lots', 'plenty', 'good', 'strong', 'abundant']
  const moderateIndicators = ['some', 'moderate', 'decent', 'present']
  const lowIndicators = ['scattered', 'sparse', 'few', 'limited', 'occasional']

  const hasMassive = massiveIndicators.some(i => text.includes(i))
  const hasHigh = highIndicators.some(i => text.includes(i))
  const hasModerate = moderateIndicators.some(i => text.includes(i))
  const hasLow = lowIndicators.some(i => text.includes(i))

  if (keywords.length > 0) {
    if (hasMassive) presence = 'massive'
    else if (hasHigh || keywords.length >= 3) presence = 'high'
    else if (hasModerate || keywords.length >= 2) presence = 'moderate'
    else if (hasLow) presence = 'low'
    else presence = 'moderate' // Default if keywords found but no modifiers
  }

  return { presence, keywords }
}

// ==================== TROLLABILITY / BLOWBACK ====================

export interface TrollabilityResult {
  score: number // 0-1 (0 = untrollable blowback, 1 = perfect control)
  blowbackLevel: 'none' | 'light' | 'moderate' | 'heavy' | 'untrollable'
  depthPenalty: number // Percentage depth loss due to blowback
  warning?: string
  recommendation?: string
}

/**
 * Calculate Trollability Score (Blowback Factor)
 *
 * During large tidal exchanges, strong current blows gear up and away from the bottom.
 * Chinook are deep trollers - if you can't get to 100+ feet, you can't reach the fish.
 *
 * Penalty applies during large exchanges (>3.5m range) unless within 90 minutes of slack.
 *
 * @param tidalRange - Difference between high and low tide in meters
 * @param minutesToSlack - Minutes until next slack tide
 * @param currentSpeed - Current speed in knots (optional, for finer calculation)
 */
export function calculateTrollabilityScore(
  tidalRange: number,
  minutesToSlack: number,
  currentSpeed?: number
): TrollabilityResult {
  // Default optimal conditions
  let score = 1.0
  let blowbackLevel: 'none' | 'light' | 'moderate' | 'heavy' | 'untrollable' = 'none'
  let depthPenalty = 0
  let warning: string | undefined
  let recommendation: string | undefined

  // Large exchange threshold
  const isLargeExchange = tidalRange > 3.5

  // Within slack window = no penalty
  const isNearSlack = minutesToSlack <= 90

  if (isLargeExchange && !isNearSlack) {
    // Calculate severity based on how far from slack
    const hoursFromSlack = minutesToSlack / 60

    if (hoursFromSlack > 4 || (currentSpeed && currentSpeed > 3.5)) {
      // Peak exchange - untrollable
      score = 0.2
      blowbackLevel = 'untrollable'
      depthPenalty = 70
      warning = 'BLOWBACK: Peak tidal exchange. Cannot maintain depth. Wait for slack.'
      recommendation = 'Wait 2-3 hours until slack tide window.'
    } else if (hoursFromSlack > 3 || (currentSpeed && currentSpeed > 2.5)) {
      // Heavy blowback
      score = 0.35
      blowbackLevel = 'heavy'
      depthPenalty = 50
      warning = 'Heavy blowback conditions. Difficult to reach depth.'
      recommendation = 'Add weight or wait for current to ease.'
    } else if (hoursFromSlack > 2 || (currentSpeed && currentSpeed > 1.5)) {
      // Moderate blowback
      score = 0.55
      blowbackLevel = 'moderate'
      depthPenalty = 30
      warning = 'Moderate blowback. May struggle to reach target depth.'
      recommendation = 'Use heavier gear or shorten lines.'
    } else {
      // Light blowback
      score = 0.75
      blowbackLevel = 'light'
      depthPenalty = 15
      recommendation = 'Some blowback - adjust gear accordingly.'
    }
  } else if (isLargeExchange && isNearSlack) {
    // Large exchange but near slack - prime time!
    score = 1.0
    blowbackLevel = 'none'
    depthPenalty = 0
    recommendation = 'Slack window during large exchange - PRIME TIME for deep trolling!'
  } else if (tidalRange > 2.5 && !isNearSlack && minutesToSlack > 150) {
    // Moderate exchange, far from slack
    score = 0.8
    blowbackLevel = 'light'
    depthPenalty = 10
  }

  return { score, blowbackLevel, depthPenalty, warning, recommendation }
}

// ==================== PREDATOR SUPPRESSION (ORCA DETECTION) ====================

export interface PredatorPresenceResult {
  detected: boolean
  keywords: string[]
  suppression: number // Multiplier (0.5 = 50% reduction, 1.0 = no effect)
  warning?: string
}

/**
 * Detect Predator Presence (Orca) from fishing reports
 *
 * When Orca are present, salmon go into hiding mode.
 * Applies 0.5x multiplier to final score.
 *
 * @param reportText - Fishing report text to analyze
 */
export function detectPredatorPresence(
  reportText: string
): PredatorPresenceResult {
  const text = reportText.toLowerCase()
  const keywords: string[] = []

  // Orca/predator keywords
  const predatorKeywords = [
    'orca',
    'orcas',
    'killer whale',
    'killer whales',
    'blackfish',
    'shut down',
    'shutdown',
    'locked up',
    'no bites',
    'went quiet',
    'whales pushed through',
    'whales came through',
    'pods',
    't18', 't19', 't46', 't65', 't60', // Known transient pods
    'biggs',
    'transient'
  ]

  // Extract found keywords
  for (const keyword of predatorKeywords) {
    if (text.includes(keyword)) {
      keywords.push(keyword)
    }
  }

  // Determine if predator presence is significant
  const detected = keywords.length > 0

  // Orca-specific keywords get stronger suppression
  const hasOrcaKeyword = keywords.some(k =>
    ['orca', 'orcas', 'killer whale', 'killer whales', 'blackfish', 'biggs', 'transient'].includes(k)
  )

  // Shutdown keywords suggest active suppression
  const hasShutdownKeyword = keywords.some(k =>
    ['shut down', 'shutdown', 'locked up', 'no bites', 'went quiet'].includes(k)
  )

  let suppression = 1.0
  let warning: string | undefined

  if (hasOrcaKeyword && hasShutdownKeyword) {
    suppression = 0.4
    warning = 'ORCA ALERT: Killer whales reported causing shutdown. Expect very slow fishing.'
  } else if (hasOrcaKeyword) {
    suppression = 0.5
    warning = 'ORCA ALERT: Killer whales reported in area. Salmon may be suppressed.'
  } else if (hasShutdownKeyword) {
    suppression = 0.6
    warning = 'Fishing reportedly shut down. May be predator-related.'
  } else if (detected) {
    suppression = 0.7
    warning = 'Possible predator activity mentioned in reports.'
  }

  return { detected, keywords, suppression, warning }
}

// ==================== CHINOOK DEPTH ADVICE ====================

export interface ChinookDepthAdvice {
  recommendedDepth: string // e.g., "80-120ft"
  depthFeet: { min: number; max: number }
  isDeepBite: boolean
  advice: string
}

/**
 * Get Chinook Depth Advice based on sun elevation
 *
 * Instead of penalizing high sun, we provide depth guidance.
 * Chinook are deep dwellers - high sun means fish deep, not "don't fish".
 *
 * @param sunElevation - Sun angle above horizon (0-90 degrees)
 * @param cloudCover - Cloud cover percentage (0-100)
 */
export function getChinookDepthAdvice(
  sunElevation: number,
  cloudCover: number = 50
): ChinookDepthAdvice {
  // Cloud cover effectively reduces light penetration
  const effectiveSunAngle = sunElevation * (1 - cloudCover * 0.005)

  let recommendedDepth: string
  let depthFeet: { min: number; max: number }
  let isDeepBite = false
  let advice: string

  if (effectiveSunAngle < 10) {
    // Dawn/dusk - fish anywhere in water column
    recommendedDepth = '40-80ft'
    depthFeet = { min: 40, max: 80 }
    advice = 'Low light conditions. Fish may be higher in the water column.'
  } else if (effectiveSunAngle < 25) {
    // Morning/evening golden hours
    recommendedDepth = '60-100ft'
    depthFeet = { min: 60, max: 100 }
    advice = 'Good light conditions for mid-depth trolling.'
  } else if (effectiveSunAngle < 40) {
    // Mid-morning/afternoon
    recommendedDepth = '80-120ft'
    depthFeet = { min: 80, max: 120 }
    advice = 'Bright conditions. Target deeper structure and thermoclines.'
  } else if (effectiveSunAngle < 55) {
    // Late morning - deep bite zone
    recommendedDepth = '100-150ft'
    depthFeet = { min: 100, max: 150 }
    isDeepBite = true
    advice = 'DEEP BITE ALERT: High sun pushing fish deep. Use downriggers at 100-150ft.'
  } else {
    // Midday - maximum depth
    recommendedDepth = '120-180ft'
    depthFeet = { min: 120, max: 180 }
    isDeepBite = true
    advice = 'DEEP BITE ALERT: Peak sun. Fish are at maximum depth. Target 120-180ft with downriggers.'
  }

  // Cloud cover adjustment
  if (cloudCover > 70 && effectiveSunAngle > 25) {
    // Overcast reduces depth requirement
    depthFeet = { min: depthFeet.min - 20, max: depthFeet.max - 20 }
    recommendedDepth = `${depthFeet.min}-${depthFeet.max}ft`
    isDeepBite = false
    advice = 'Overcast conditions. Fish may be shallower than typical for this time.'
  }

  return { recommendedDepth, depthFeet, isDeepBite, advice }
}

// ==================== CHINOOK RUN TYPE / SEASONAL MODE ====================

export type ChinookMode = 'feeder' | 'spawner'

export interface ChinookSeasonalMode {
  mode: ChinookMode
  monthRange: string
  behavior: string
  weightEmphasis: {
    tidal: 'high' | 'normal'
    bait: 'high' | 'normal'
    light: 'high' | 'normal'
  }
}

/**
 * Determine Chinook seasonal mode
 *
 * Feeder mode (Dec-May): Fish are actively feeding, bait-driven
 * Spawner mode (Jun-Sep): Fish are migrating, tide-driven
 *
 * @param month - Current month (0-11)
 */
export function getChinookSeasonalMode(month: number): ChinookSeasonalMode {
  // Feeder season: December through May (0-indexed: 11, 0, 1, 2, 3, 4)
  const isFeederSeason = month >= 11 || month <= 4

  if (isFeederSeason) {
    return {
      mode: 'feeder',
      monthRange: 'Dec-May',
      behavior: 'Resident fish actively feeding. Follow the bait.',
      weightEmphasis: {
        tidal: 'normal',
        bait: 'high',
        light: 'high'
      }
    }
  } else {
    // Spawner season: June through September (0-indexed: 5, 6, 7, 8)
    // October/November (9, 10) is transition - treat as late spawner
    return {
      mode: 'spawner',
      monthRange: 'Jun-Sep',
      behavior: 'Migrating fish staging for spawning runs. Work tide changes.',
      weightEmphasis: {
        tidal: 'high',
        bait: 'normal',
        light: 'normal'
      }
    }
  }
}

// ==================== LINGCOD-SPECIFIC HELPERS ====================

// -------------------- TIDAL SHOULDER (FEEDING VS FISHING) --------------------

export interface TidalShoulderResult {
  feedingScore: number     // 0-1 (how aggressive fish are feeding)
  fishabilityScore: number // 0-1 (how easy to fish)
  combinedScore: number    // Weighted combination
  phase: 'dead_slack' | 'shoulder' | 'moderate_flow' | 'ripping'
  recommendation?: string
}

/**
 * Calculate Tidal Shoulder Score for Lingcod
 *
 * Key insight: Lingcod feed most aggressively 1 hour before/after slack (the "shoulders"),
 * when current pushes bait past their ambush rocks but isn't too fast to swim in.
 *
 * - Dead Slack (0 kts): High fishability, medium feeding
 * - Shoulders (0.5-1.5 kts): Medium fishability (need heavy weights), HIGH feeding
 * - Ripping (>2 kts): Can't hold bottom, fish aren't feeding anyway
 *
 * @param currentSpeed - Current speed in knots
 */
export function calculateTidalShoulderScore(
  currentSpeed: number
): TidalShoulderResult {
  let feedingScore: number
  let fishabilityScore: number
  let phase: 'dead_slack' | 'shoulder' | 'moderate_flow' | 'ripping'
  let recommendation: string | undefined

  if (currentSpeed < 0.3) {
    // Dead Slack - easy to fish, but less scent dispersion
    feedingScore = 0.7
    fishabilityScore = 1.0
    phase = 'dead_slack'
    recommendation = 'Dead slack - easy jigging but less aggressive feeding. Work the structure edges.'
  } else if (currentSpeed >= 0.3 && currentSpeed < 0.5) {
    // Transition into shoulder
    feedingScore = 0.85
    fishabilityScore = 0.9
    phase = 'shoulder'
    recommendation = 'Current building - feeding activity increasing. Position upstream of structure.'
  } else if (currentSpeed >= 0.5 && currentSpeed <= 1.5) {
    // THE SHOULDER - Prime feeding window
    feedingScore = 1.0
    fishabilityScore = 0.7
    phase = 'shoulder'
    recommendation = 'PRIME TIME: Tidal shoulder - peak feeding aggression! Use heavier jigs (6-8oz).'
  } else if (currentSpeed > 1.5 && currentSpeed <= 2.0) {
    // Moderate flow - still fishable but challenging
    feedingScore = 0.6
    fishabilityScore = 0.4
    phase = 'moderate_flow'
    recommendation = 'Strong current - use heavy gear or wait for it to ease.'
  } else {
    // Ripping current - can't hold bottom
    feedingScore = 0.2
    fishabilityScore = 0.1
    phase = 'ripping'
    recommendation = 'Current too strong to hold bottom. Wait for slack window.'
  }

  // Combined score weights feeding higher for Lingcod (they're ambush predators)
  const combinedScore = feedingScore * 0.6 + fishabilityScore * 0.4

  return { feedingScore, fishabilityScore, combinedScore, phase, recommendation }
}

// -------------------- JIGGING CONDITIONS (SWELL QUALITY) --------------------

export interface JiggingConditionsResult {
  score: number // 0-1
  ratio: number // period/height ratio (the "Puke Ratio")
  comfort: 'perfect' | 'good' | 'difficult' | 'unfishable'
  warning?: string
}

/**
 * Calculate Jigging Conditions Score (The "Puke Ratio")
 *
 * Lingcod live on the bottom. If the boat is heaving 6ft up/down every 4 seconds
 * (short period), your jig yanks away from the fish and you get seasick.
 *
 * Ratio = Swell Period (s) / Swell Height (m)
 * - Ratio < 4.0: Unfishable violent chop (0.2 penalty)
 * - Ratio 4.0-6.0: Difficult, jig jumping around (0.5)
 * - Ratio 6.0-8.0: Manageable (0.75)
 * - Ratio > 8.0: Gentle roll, perfect for jigging (1.0)
 *
 * @param swellHeight - Swell height in meters
 * @param swellPeriod - Swell period in seconds
 */
export function calculateJiggingConditions(
  swellHeight: number,
  swellPeriod: number
): JiggingConditionsResult {
  // Flat calm is perfect
  if (swellHeight < 0.5) {
    return { score: 1.0, ratio: Infinity, comfort: 'perfect' }
  }

  // The "Puke Ratio"
  const ratio = swellPeriod / swellHeight

  let score: number
  let comfort: 'perfect' | 'good' | 'difficult' | 'unfishable'
  let warning: string | undefined

  if (ratio < 4.0) {
    // Unfishable violent chop
    score = 0.2
    comfort = 'unfishable'
    warning = 'UNFISHABLE: Short steep chop - jig control impossible, high seasickness risk.'
  } else if (ratio < 6.0) {
    // Difficult - jig jumping around
    score = 0.5
    comfort = 'difficult'
    warning = 'Difficult jigging conditions - short period swell causing jig bounce.'
  } else if (ratio < 8.0) {
    // Manageable
    score = 0.75
    comfort = 'good'
  } else {
    // Long gentle swell - perfect for jigging
    score = 1.0
    comfort = 'perfect'
  }

  // Additional penalty for absolute height regardless of period
  if (swellHeight > 2.0) {
    score = Math.min(score, 0.3)
    comfort = 'unfishable'
    warning = `UNFISHABLE: Swell height ${swellHeight.toFixed(1)}m too large for structure fishing.`
  }

  return { score, ratio, comfort, warning }
}

// -------------------- ROCKFISH INDICATOR (BIO-INTEL) --------------------

export interface RockfishIndicatorResult {
  detected: boolean
  keywords: string[]
  multiplier: number // 1.0 = no effect, 1.2 = boost for prey presence
  recommendation?: string
}

/**
 * Detect Rockfish/Prey Presence for Lingcod
 *
 * Lingcod eat Rockfish. If fishing reports mention "limiting on Rockfish"
 * or "lots of small Rockfish", that's a massive positive signal for Lingcod.
 *
 * @param reportText - Fishing report text to analyze
 */
export function detectRockfishIndicator(
  reportText: string
): RockfishIndicatorResult {
  const text = reportText.toLowerCase()
  const keywords: string[] = []

  // Rockfish and prey keywords
  const preyKeywords = [
    'rockfish', 'rock fish', 'sebastes',
    'yelloweye', 'quillback', 'copper rockfish', 'china rockfish',
    'snapper', 'red snapper', // Common misnomer for rockfish
    'greenling', 'kelp greenling',
    'perch', 'pile perch', 'striped perch',
    'herring', 'herring balls',
    'limiting on rockfish', 'lots of rockfish', 'rockfish bycatch',
    'small rockfish', 'juvenile rockfish'
  ]

  // Extract found keywords
  for (const keyword of preyKeywords) {
    if (text.includes(keyword)) {
      keywords.push(keyword)
    }
  }

  const detected = keywords.length > 0

  // Stronger signal for multiple mentions or specific phrases
  const hasStrongSignal = keywords.some(k =>
    ['limiting on rockfish', 'lots of rockfish', 'herring balls'].some(s => k.includes(s))
  )

  let multiplier = 1.0
  let recommendation: string | undefined

  if (hasStrongSignal || keywords.length >= 3) {
    multiplier = 1.25
    recommendation = 'STRONG PREY SIGNAL: Rockfish/baitfish reported - Lingcod will be stacked!'
  } else if (keywords.length >= 2) {
    multiplier = 1.15
    recommendation = 'Good prey presence - Lingcod likely hunting in area.'
  } else if (detected) {
    multiplier = 1.1
    recommendation = 'Some prey activity - worth fishing for Lingcod.'
  }

  return { detected, keywords, multiplier, recommendation }
}

// -------------------- SEASONAL DEPTH STRATEGY --------------------

export interface LingcodSeasonalStrategy {
  mode: 'shallow_aggressive' | 'standard' | 'deep_females' | 'closed'
  depthRange: string // Human-readable range like "40-80ft"
  multiplier: number
  advice: string
}

/**
 * Get Lingcod Seasonal Depth Strategy
 *
 * - Early Season (May/June): Post-spawn males shallow (40-80ft), hyper-aggressive
 * - Mid Season (July): Transition period
 * - Late Season (Aug-Sept): Big females move deep (150ft+)
 *
 * @param month - Current month (1-12, January = 1)
 */
export function getLingcodSeasonalStrategy(month: number): LingcodSeasonalStrategy {
  // Note: month is 1-12 (January = 1)

  // May-June: Post-spawn males shallow, aggressive
  if (month === 5 || month === 6) {
    return {
      mode: 'shallow_aggressive',
      depthRange: '40-80ft',
      multiplier: 1.15,
      advice: 'SHALLOW BITE: Target 40-80ft. Males guarding structure are hyper-aggressive. Use large swimbaits.'
    }
  }

  // July: Transition
  if (month === 7) {
    return {
      mode: 'standard',
      depthRange: '60-120ft',
      multiplier: 1.0,
      advice: 'Standard depths 60-120ft. Fish transitioning - try multiple depth zones.'
    }
  }

  // August-September: Big females move deep
  if (month === 8 || month === 9) {
    return {
      mode: 'deep_females',
      depthRange: '120-200ft',
      multiplier: 1.1,
      advice: 'DEEP BITE: Target 120-200ft pinnacles. Big females have moved offshore. Use heavy jigs (8-12oz).'
    }
  }

  // October: Pre-spawn feeding, fish moving shallower
  if (month === 10) {
    return {
      mode: 'standard',
      depthRange: '80-150ft',
      multiplier: 1.1,
      advice: 'Pre-spawn feeding frenzy. Fish 80-150ft. Aggressive strikes expected.'
    }
  }

  // November-December / April: Late season or early opener
  if (month === 11 || month === 12 || month === 4) {
    return {
      mode: 'standard',
      depthRange: '80-140ft',
      multiplier: 1.0,
      advice: 'Standard depth range 80-140ft. Work structure edges.'
    }
  }

  // Closed season (Jan-Mar)
  return {
    mode: 'closed',
    depthRange: 'N/A',
    multiplier: 0.0,
    advice: 'SEASON CLOSED: Lingcod retention prohibited to protect spawning males.'
  }
}

// ==================== ROCKFISH PHYSICS HELPERS ====================

// -------------------- RESULTANT DRIFT (SPOT LOCK) --------------------

export interface ResultantDriftResult {
  score: number // 0-1 (0 = impossible to hold, 1 = perfect spot lock)
  driftSpeed: number // Resultant drift in knots
  canHoldPosition: boolean
  recommendation: string
}

/**
 * Calculate Resultant Drift Score for Rockfish
 *
 * Combines wind and current vectors to determine if you can hold position
 * over structure. If resultant drift > ~1.5 kts, spot lock is impossible.
 *
 * Vector addition: Wind pushes boat, current pulls boat
 * - Same direction: additive (worst case)
 * - Opposing: subtractive (can cancel out)
 * - Perpendicular: Pythagorean
 *
 * @param windSpeed - Wind speed in knots
 * @param windDirection - Direction wind is coming FROM (0-360°)
 * @param currentSpeed - Current speed in knots
 * @param currentDirection - Direction water is flowing TOWARDS (0-360°)
 */
export function calculateResultantDrift(
  windSpeed: number,
  windDirection: number,
  currentSpeed: number,
  currentDirection: number
): ResultantDriftResult {
  // Wind effect on boat drift (roughly 3-5% of wind speed for small craft)
  const windDriftFactor = 0.04
  const windDrift = windSpeed * windDriftFactor

  // Convert directions to radians
  // Wind pushes boat in direction wind is going TO (opposite of FROM)
  const windToDir = (windDirection + 180) % 360
  const windRad = (windToDir * Math.PI) / 180
  const currentRad = (currentDirection * Math.PI) / 180

  // Vector components
  const windX = windDrift * Math.sin(windRad)
  const windY = windDrift * Math.cos(windRad)
  const currentX = currentSpeed * Math.sin(currentRad)
  const currentY = currentSpeed * Math.cos(currentRad)

  // Resultant vector
  const resultantX = windX + currentX
  const resultantY = windY + currentY
  const driftSpeed = Math.sqrt(resultantX * resultantX + resultantY * resultantY)

  // Scoring based on drift speed
  // 0-0.3 kts: Perfect spot lock (1.0)
  // 0.3-0.8 kts: Good, minor corrections needed (0.8-0.9)
  // 0.8-1.2 kts: Challenging, constant corrections (0.5-0.7)
  // 1.2-1.5 kts: Difficult, struggling to hold (0.2-0.4)
  // >1.5 kts: Impossible to hold position (0.0-0.1)

  let score: number
  let recommendation: string
  let canHoldPosition = true

  if (driftSpeed <= 0.3) {
    score = 1.0
    recommendation = 'Perfect spot lock conditions - anchor or drift very slowly over structure'
  } else if (driftSpeed <= 0.8) {
    score = 0.9 - ((driftSpeed - 0.3) / 0.5) * 0.1
    recommendation = 'Good positioning - minor motor corrections needed'
  } else if (driftSpeed <= 1.2) {
    score = 0.7 - ((driftSpeed - 0.8) / 0.4) * 0.2
    recommendation = 'Challenging - constant corrections required, consider controlled drift'
  } else if (driftSpeed <= 1.5) {
    score = 0.4 - ((driftSpeed - 1.2) / 0.3) * 0.3
    recommendation = 'Difficult - struggling to hold, drift fishing may be better option'
  } else {
    score = Math.max(0.1 - ((driftSpeed - 1.5) / 1.0) * 0.1, 0)
    recommendation = 'Cannot hold position - too much drift for structure fishing'
    canHoldPosition = false
  }

  return {
    score: Math.max(score, 0),
    driftSpeed: Math.round(driftSpeed * 100) / 100,
    canHoldPosition,
    recommendation
  }
}

// -------------------- SWELL HEAVE (JIG CONTROL) --------------------

export interface SwellHeaveResult {
  score: number // 0-1
  heaveRate: number // Vertical movement rate (m/s approx)
  comfort: 'stable' | 'manageable' | 'uncomfortable' | 'unfishable'
  warning?: string
}

/**
 * Calculate Swell Heave Score for Rockfish (Vertical Jig Control)
 *
 * Different from Lingcod's "Puke Ratio" - focuses on vertical stability
 * rather than jigging presentation. Rockfish jigging needs steady boat.
 *
 * Heave rate ≈ (2π × height) / period = vertical velocity
 *
 * @param swellHeight - Swell height in meters
 * @param swellPeriod - Swell period in seconds
 */
export function calculateSwellHeave(
  swellHeight: number,
  swellPeriod: number
): SwellHeaveResult {
  // Flat calm is perfect
  if (swellHeight < 0.3) {
    return {
      score: 1.0,
      heaveRate: 0,
      comfort: 'stable'
    }
  }

  // Calculate heave rate (vertical velocity in m/s)
  // Using simplified sinusoidal motion: v_max = (2π × amplitude) / period
  // amplitude = height / 2
  const heaveRate = (Math.PI * swellHeight) / swellPeriod

  let score: number
  let comfort: 'stable' | 'manageable' | 'uncomfortable' | 'unfishable'
  let warning: string | undefined

  // Heave rate thresholds:
  // < 0.3 m/s: Stable (score 0.9-1.0)
  // 0.3-0.5 m/s: Manageable (score 0.6-0.8)
  // 0.5-0.8 m/s: Uncomfortable (score 0.3-0.5)
  // > 0.8 m/s: Unfishable (score 0-0.2)

  if (heaveRate < 0.3) {
    score = 1.0 - (heaveRate / 0.3) * 0.1
    comfort = 'stable'
  } else if (heaveRate < 0.5) {
    score = 0.8 - ((heaveRate - 0.3) / 0.2) * 0.2
    comfort = 'manageable'
  } else if (heaveRate < 0.8) {
    score = 0.5 - ((heaveRate - 0.5) / 0.3) * 0.2
    comfort = 'uncomfortable'
    warning = 'Swell causing significant boat heave - jig control compromised'
  } else {
    score = Math.max(0.2 - ((heaveRate - 0.8) / 0.5) * 0.2, 0)
    comfort = 'unfishable'
    warning = `Severe heave (${heaveRate.toFixed(2)} m/s) - vertical fishing not recommended`
  }

  // Additional penalty for absolute height regardless of period
  if (swellHeight > 2.0) {
    score = Math.min(score, 0.2)
    comfort = 'unfishable'
    warning = `Swell height ${swellHeight.toFixed(1)}m too large for structure fishing`
  }

  return {
    score: Math.max(score, 0),
    heaveRate: Math.round(heaveRate * 100) / 100,
    comfort,
    warning
  }
}

// -------------------- BAROMETRIC STABILITY --------------------

export interface BarometricStabilityResult {
  score: number // 0-1
  trend: 'rising' | 'stable' | 'falling' | 'crashing'
  changeRate: number // hPa per hour
  warning?: string
}

/**
 * Calculate Barometric Stability Score for Rockfish
 *
 * Rockfish have swim bladders that are sensitive to pressure changes.
 * Rapid pressure drops cause discomfort and fish stop feeding.
 *
 * @param currentPressure - Current barometric pressure in hPa
 * @param pressureHistory - Array of recent pressure readings (oldest to newest)
 * @param hoursOfHistory - How many hours the history spans (default 3)
 */
export function calculateBarometricStability(
  currentPressure: number,
  pressureHistory?: number[],
  hoursOfHistory: number = 3
): BarometricStabilityResult {
  // No history = assume stable
  if (!pressureHistory || pressureHistory.length < 2) {
    return {
      score: 0.7,
      trend: 'stable',
      changeRate: 0
    }
  }

  // Calculate change rate (hPa per hour)
  const oldestPressure = pressureHistory[0]
  const pressureChange = currentPressure - oldestPressure
  const changeRate = pressureChange / hoursOfHistory

  let score: number
  let trend: 'rising' | 'stable' | 'falling' | 'crashing'
  let warning: string | undefined

  // Pressure change thresholds (hPa/hour):
  // Stable: -0.5 to +0.5 (score 0.9-1.0)
  // Gentle rise: +0.5 to +1.5 (score 0.7-0.8) - fish may feed less
  // Gentle fall: -0.5 to -1.5 (score 0.5-0.7) - fish often feed before storms
  // Rapid rise: > +1.5 (score 0.4-0.6) - fish adjusting
  // Rapid fall: -1.5 to -3.0 (score 0.2-0.4) - fish feeling pressure
  // Crashing: < -3.0 (score 0-0.2) - fish shut down

  if (changeRate >= -0.5 && changeRate <= 0.5) {
    score = 0.95
    trend = 'stable'
  } else if (changeRate > 0.5 && changeRate <= 1.5) {
    score = 0.75 - ((changeRate - 0.5) / 1.0) * 0.1
    trend = 'rising'
  } else if (changeRate > 1.5) {
    score = 0.5 - ((changeRate - 1.5) / 2.0) * 0.2
    trend = 'rising'
    warning = 'Rapidly rising pressure - rockfish may be less active'
  } else if (changeRate >= -1.5 && changeRate < -0.5) {
    // Gentle fall - can actually trigger feeding (pre-storm bite)
    score = 0.7 - ((Math.abs(changeRate) - 0.5) / 1.0) * 0.2
    trend = 'falling'
  } else if (changeRate >= -3.0 && changeRate < -1.5) {
    score = 0.4 - ((Math.abs(changeRate) - 1.5) / 1.5) * 0.2
    trend = 'falling'
    warning = 'Falling pressure - rockfish bladders stressed, bite slowing'
  } else {
    // Crashing < -3.0 hPa/hour
    score = Math.max(0.2 - ((Math.abs(changeRate) - 3.0) / 2.0) * 0.2, 0)
    trend = 'crashing'
    warning = 'Pressure crashing - rockfish shut down due to bladder stress'
  }

  return {
    score: Math.max(score, 0),
    trend,
    changeRate: Math.round(changeRate * 100) / 100,
    warning
  }
}

// -------------------- LIGHT/CLOUD COVER FOR ROCKFISH --------------------

export interface RockfishLightResult {
  score: number // 0-1
  condition: 'overcast_ideal' | 'partly_cloudy' | 'bright' | 'low_light'
  recommendation?: string
}

/**
 * Calculate Light/Cloud Cover Score for Rockfish
 *
 * Overcast days trigger suspended feeding behavior in rockfish.
 * They come off structure and feed more actively in diffuse light.
 *
 * @param cloudCover - Cloud cover percentage (0-100)
 * @param hour - Hour of day (0-23)
 */
export function calculateRockfishLightConditions(
  cloudCover: number,
  hour: number
): RockfishLightResult {
  // Night/twilight hours (before 6am or after 8pm)
  if (hour < 6 || hour > 20) {
    return {
      score: 0.5,
      condition: 'low_light',
      recommendation: 'Low light - rockfish less active, stick to shallower structure'
    }
  }

  // Overcast is ideal (>70% cloud cover)
  if (cloudCover >= 70) {
    return {
      score: 1.0,
      condition: 'overcast_ideal',
      recommendation: 'Overcast conditions - rockfish may suspend and feed actively'
    }
  }

  // Partly cloudy (40-70%)
  if (cloudCover >= 40) {
    return {
      score: 0.8,
      condition: 'partly_cloudy',
      recommendation: 'Good light conditions - fish may be slightly off structure'
    }
  }

  // Bright/clear (<40% cloud cover)
  return {
    score: 0.6,
    condition: 'bright',
    recommendation: 'Bright conditions - rockfish tight to structure, fish the shadows'
  }
}

// -------------------- ROCKFISH REGULATORY GATEKEEPER --------------------

export interface RockfishRegulationResult {
  isOpen: boolean
  closedSpecies: string[]
  warnings: string[]
}

/**
 * Check Rockfish Regulations by Month
 *
 * Many rockfish species have seasonal closures.
 * This is a simplified check - actual regulations vary by area.
 *
 * @param month - Month (1-12)
 */
export function checkRockfishRegulations(month: number): RockfishRegulationResult {
  const closedSpecies: string[] = []
  const warnings: string[] = []

  // Yelloweye Rockfish - closed in many areas year-round or spring
  if (month >= 1 && month <= 12) {
    warnings.push('Yelloweye Rockfish: Check area-specific closures - zero retention in many areas')
  }

  // Quillback Rockfish - spring closures common (Feb-May in some areas)
  if (month >= 2 && month <= 5) {
    closedSpecies.push('Quillback Rockfish')
    warnings.push('Quillback Rockfish: Closed Feb-May in many areas')
  }

  // Bocaccio - often closed or restricted
  warnings.push('Bocaccio: Zero retention in most BC waters')

  // General RCA reminder
  warnings.push('Check Rockfish Conservation Areas (RCAs) - all rockfish retention prohibited in RCAs')

  return {
    isOpen: closedSpecies.length === 0,
    closedSpecies,
    warnings
  }
}

// ==================== CRAB PHYSICS HELPERS ====================

// -------------------- SCENT HYDRAULICS (PLUME SCORE) --------------------

export interface ScentHydraulicsResult {
  score: number // 0-1
  averageCurrentSpeed: number // Average current in knots over soak
  maxCurrentSpeed: number // Peak current during soak
  trapRollRisk: boolean // True if current > 3.0 kts
  recommendation: string
}

/**
 * Calculate Scent Hydraulics Score for Crab Trapping
 *
 * Steady current creates a "scent tunnel" downstream, drawing crabs from
 * hundreds of yards away. Too fast = diluted scent + trap rolling risk.
 * Too slow = scent pools around trap with no attraction radius.
 *
 * Optimal: 0.8-1.5 knots for maximum scent dispersal
 *
 * @param currentSpeeds - Array of current speeds (knots) over soak duration
 */
export function calculateScentHydraulics(
  currentSpeeds: number[]
): ScentHydraulicsResult {
  if (currentSpeeds.length === 0) {
    return {
      score: 0.5,
      averageCurrentSpeed: 0,
      maxCurrentSpeed: 0,
      trapRollRisk: false,
      recommendation: 'No current data available'
    }
  }

  let totalScore = 0
  let maxCurrent = 0
  let sumCurrent = 0

  for (const speed of currentSpeeds) {
    sumCurrent += speed
    if (speed > maxCurrent) maxCurrent = speed

    // Ideal scent transport is 0.8 - 1.5 kts
    if (speed >= 0.8 && speed <= 1.5) {
      totalScore += 1.0 // Perfect transport
    } else if (speed >= 0.5 && speed < 0.8) {
      totalScore += 0.7 // A bit slow, smaller radius
    } else if (speed > 1.5 && speed <= 2.5) {
      totalScore += 0.5 // Fast, diluted scent
    } else if (speed >= 0.2 && speed < 0.5) {
      totalScore += 0.4 // Very slow, pooling
    } else {
      totalScore += 0.1 // Dead slack or ripping (bad)
    }
  }

  const averageCurrentSpeed = sumCurrent / currentSpeeds.length
  let averageScore = totalScore / currentSpeeds.length

  // Trap roll risk: If current ever exceeds 3.0kts, high risk of equipment loss
  const trapRollRisk = maxCurrent > 3.0
  if (trapRollRisk) {
    averageScore = averageScore * 0.4 // Severe "Trap Walk" penalty
  }

  // Generate recommendation
  let recommendation: string
  if (trapRollRisk) {
    recommendation = `⚠️ TRAP ROLL RISK: Current peaks at ${maxCurrent.toFixed(1)} kts - consider shorter soak or different location`
  } else if (averageCurrentSpeed >= 0.8 && averageCurrentSpeed <= 1.5) {
    recommendation = 'Optimal scent dispersal - excellent crab recruitment area'
  } else if (averageCurrentSpeed < 0.5) {
    recommendation = 'Low current - scent pooling limits attraction radius, consider ebb/flood timing'
  } else if (averageCurrentSpeed > 2.0) {
    recommendation = 'Fast current - diluted scent and crabs struggle to walk up-current'
  } else {
    recommendation = 'Moderate scent dispersal conditions'
  }

  return {
    score: Math.max(averageScore, 0),
    averageCurrentSpeed: Math.round(averageCurrentSpeed * 100) / 100,
    maxCurrentSpeed: Math.round(maxCurrent * 100) / 100,
    trapRollRisk,
    recommendation
  }
}

// -------------------- MOLT/MEAT QUALITY INDEX --------------------

export interface MoltQualityResult {
  score: number // 0-1
  quality: 'excellent_hard_shell' | 'good' | 'fair' | 'poor_soft_shell'
  advice: string
}

/**
 * Calculate Molt/Meat Quality Index for Crab
 *
 * Water temperature indicates molting cycle and meat quality.
 * Cold water = hard shell, full meat. Warm water = soft shells, molting season.
 *
 * @param waterTemp - Water temperature in Celsius
 */
export function calculateMoltQualityIndex(
  waterTemp: number
): MoltQualityResult {
  let score: number
  let quality: 'excellent_hard_shell' | 'good' | 'fair' | 'poor_soft_shell'
  let advice: string

  if (waterTemp < 10) {
    // Winter - hard shell, full meat
    score = 1.0
    quality = 'excellent_hard_shell'
    advice = 'Cold water - hard shells with maximum meat fill. Peak quality!'
  } else if (waterTemp >= 10 && waterTemp < 13) {
    // Spring/Fall transition
    score = 0.8
    quality = 'good'
    advice = 'Moderate temps - good meat fill, mostly hard shells'
  } else if (waterTemp >= 13 && waterTemp < 15) {
    // Early summer - some molting
    score = 0.5
    quality = 'fair'
    advice = 'Warming water - increasing soft shell risk, check traps more frequently'
  } else {
    // Summer - high molting risk
    score = 0.3
    quality = 'poor_soft_shell'
    advice = 'High water temps - expect soft shells and molters. Handle with care, poor keeper ratio.'
  }

  return { score, quality, advice }
}

// -------------------- NOCTURNAL FLOOD BONUS --------------------

export interface NocturnalFloodResult {
  multiplier: number // 1.0 baseline, up to 1.3x
  nightPercentage: number // % of soak during night
  isFloodTide: boolean
  advice: string
}

/**
 * Calculate Nocturnal Flood Bonus for Crab
 *
 * Dungeness crabs are nocturnal foragers that ride the incoming (flood) tide
 * into estuaries/bays to feed. Darkness makes them bold.
 *
 * Golden Window: Flood Tide + Darkness
 *
 * @param soakStartTime - Unix timestamp of deployment
 * @param soakDurationHours - Hours of soak time
 * @param sunset - Unix timestamp of sunset
 * @param sunrise - Unix timestamp of sunrise (next day)
 * @param isFloodTide - True if predominant tide during soak is flood
 */
export function calculateNocturnalFloodBonus(
  soakStartTime: number,
  soakDurationHours: number,
  sunset: number,
  sunrise: number,
  isFloodTide: boolean
): NocturnalFloodResult {
  const soakEndTime = soakStartTime + (soakDurationHours * 3600)

  // Calculate how much of the soak is during night
  let nightSeconds = 0
  const totalSoakSeconds = soakDurationHours * 3600

  // Simple calculation: if soak overlaps with night period
  const nightStart = sunset
  const nightEnd = sunrise

  // Overlap calculation
  const overlapStart = Math.max(soakStartTime, nightStart)
  const overlapEnd = Math.min(soakEndTime, nightEnd)

  if (overlapEnd > overlapStart) {
    nightSeconds = overlapEnd - overlapStart
  }

  const nightPercentage = (nightSeconds / totalSoakSeconds) * 100

  // Calculate multiplier
  let multiplier = 1.0
  let advice = ''

  if (isFloodTide && nightPercentage > 50) {
    // Golden window: Flood + Night
    multiplier = 1.3
    advice = '🌙 GOLDEN WINDOW: Flood tide + darkness = crabs actively feeding and moving into shallows!'
  } else if (isFloodTide && nightPercentage > 25) {
    multiplier = 1.15
    advice = 'Good timing: Flood tide with partial night overlap'
  } else if (!isFloodTide && nightPercentage > 50) {
    multiplier = 1.1
    advice = 'Night feeding active, but ebb tide - crabs moving out'
  } else if (isFloodTide && nightPercentage <= 25) {
    multiplier = 1.05
    advice = 'Flood tide beneficial, but daytime - reduced activity'
  } else {
    multiplier = 0.9
    advice = 'Ebb tide + daytime = lowest crab activity period'
  }

  return {
    multiplier,
    nightPercentage: Math.round(nightPercentage),
    isFloodTide,
    advice
  }
}

// -------------------- RETRIEVAL SAFETY CHECK --------------------

export interface RetrievalSafetyResult {
  score: number // 0-1
  isSafe: boolean
  windSpeedKnots: number
  currentSpeed: number
  isSlackTide: boolean // Bonus if retrieval at slack
  warnings: string[]
  recommendations: string[]
}

/**
 * Calculate Retrieval Safety for Crab Trap Hauling
 *
 * Pulling a 20lb pot + 30lbs of crab/mud in rough conditions is dangerous.
 * Ideal retrieval: Slack tide (no prop tangle) + calm winds.
 *
 * @param windSpeed - Wind speed in km/h at retrieval time
 * @param currentSpeed - Current speed in knots at retrieval time
 * @param waveHeight - Wave height in meters
 */
export function calculateRetrievalSafety(
  windSpeed: number,
  currentSpeed: number,
  waveHeight: number
): RetrievalSafetyResult {
  const windKnots = windSpeed * 0.539957
  const warnings: string[] = []
  const recommendations: string[] = []
  let isSafe = true
  let score = 1.0

  // Check slack tide (ideal for retrieval)
  const isSlackTide = currentSpeed < 0.5

  // Wind safety thresholds
  if (windKnots > 25) {
    isSafe = false
    score = 0.0
    warnings.push(`DANGEROUS: ${Math.round(windKnots)} kts wind - do not retrieve traps`)
    recommendations.push('Wait for weather window or risk equipment loss')
  } else if (windKnots > 20) {
    isSafe = false
    score = 0.2
    warnings.push(`Unsafe wind ${Math.round(windKnots)} kts - difficult haul`)
    recommendations.push('Consider waiting for better conditions')
  } else if (windKnots > 15) {
    score = 0.5
    warnings.push(`Challenging conditions: ${Math.round(windKnots)} kts wind`)
    recommendations.push('Use caution when hauling - secure footing essential')
  } else if (windKnots > 10) {
    score = 0.7
    recommendations.push('Moderate wind - manageable but use caution')
  }

  // Wave safety
  if (waveHeight > 2.0) {
    isSafe = false
    score = Math.min(score, 0.1)
    warnings.push(`DANGEROUS: ${waveHeight.toFixed(1)}m waves - hauling pots extremely hazardous`)
  } else if (waveHeight > 1.5) {
    score = Math.min(score, 0.4)
    warnings.push(`Rough seas: ${waveHeight.toFixed(1)}m waves - difficult haul`)
  }

  // Current bonus/penalty
  if (isSlackTide) {
    recommendations.push('✓ Slack tide - ideal for retrieval (no prop tangle risk)')
  } else if (currentSpeed > 2.0) {
    score = score * 0.7
    warnings.push(`Strong current ${currentSpeed.toFixed(1)} kts - pot will spin during haul`)
    recommendations.push('Retrieve at slack tide if possible to avoid tangle')
  } else if (currentSpeed > 1.5) {
    score = score * 0.85
    recommendations.push('Moderate current - control pot carefully during haul')
  }

  return {
    score: Math.max(score, 0),
    isSafe,
    windSpeedKnots: Math.round(windKnots * 10) / 10,
    currentSpeed,
    isSlackTide,
    warnings,
    recommendations
  }
}

// ==================== PINK SALMON PHYSICS HELPERS ====================

// -------------------- SURFACE TEXTURE (SALMON CHOP) --------------------

export interface SurfaceTextureResult {
  score: number // 0-1
  texture: 'glass_calm' | 'pink_ripple' | 'choppy' | 'rough'
  recommendation: string
}

/**
 * Calculate Surface Texture Score for Pink Salmon
 *
 * Pinks are neurotic surface feeders. Glass calm = skittish and line-shy.
 * The "Pink Ripple" (4-12 kts) breaks light refraction, hides leader, fish feel safe.
 *
 * @param windSpeed - Wind speed in knots
 */
export function calculateSurfaceTexture(
  windSpeed: number
): SurfaceTextureResult {
  let score: number
  let texture: 'glass_calm' | 'pink_ripple' | 'choppy' | 'rough'
  let recommendation: string

  if (windSpeed < 3) {
    score = 0.5
    texture = 'glass_calm'
    recommendation = 'Glass calm - Pinks are line-shy and skittish, switch to lighter leaders'
  } else if (windSpeed >= 4 && windSpeed <= 12) {
    score = 1.0
    texture = 'pink_ripple'
    recommendation = '🎯 Perfect salmon chop - surface disturbance hides leader, fish feel safe'
  } else if (windSpeed > 12 && windSpeed <= 18) {
    score = 0.8
    texture = 'choppy'
    recommendation = 'Choppy but fishable - schools may go slightly deeper for stability'
  } else {
    score = 0.4
    texture = 'rough'
    recommendation = 'Too rough - schools dispersing deep, surface fishing difficult'
  }

  return { score, texture, recommendation }
}

// -------------------- ESTUARY FLUSH (RIP LINE DYNAMICS) --------------------

export interface EstuaryFlushResult {
  score: number // 0-1
  ripStrength: 'weak' | 'moderate' | 'strong' | 'massive'
  tideDrop: number // Meters
  recommendation: string
}

/**
 * Calculate Estuary Flush Score for Pink Salmon
 *
 * Pinks hunt the transition zone where brown river water pushes against
 * green ocean water (the "rip line"). Stronger ebb = harder current seam.
 *
 * @param tidalRange - Magnitude of tide drop (meters)
 * @param isEbbTide - True if currently ebbing
 */
export function calculateEstuaryFlush(
  tidalRange: number,
  isEbbTide: boolean
): EstuaryFlushResult {
  let score: number
  let ripStrength: 'weak' | 'moderate' | 'strong' | 'massive'
  let recommendation: string

  // Flood tide gets base score (fish running up-river, not stacking)
  if (!isEbbTide) {
    return {
      score: 0.4,
      ripStrength: 'weak',
      tideDrop: 0,
      recommendation: 'Flood tide - Pinks running up-river, harder to catch in salt'
    }
  }

  // Ebb tide - score based on drop magnitude
  if (tidalRange > 3.0) {
    score = 1.0
    ripStrength = 'massive'
    recommendation = '🌊 MASSIVE EBB: Hard rip lines trapping krill - fish the seams!'
  } else if (tidalRange > 2.0) {
    score = 0.85
    ripStrength = 'strong'
    recommendation = 'Strong ebb - defined rip lines, target color/temp breaks'
  } else if (tidalRange > 1.0) {
    score = 0.65
    ripStrength = 'moderate'
    recommendation = 'Moderate ebb - some rip line formation'
  } else {
    score = 0.5
    ripStrength = 'weak'
    recommendation = 'Weak ebb - minimal rip line definition'
  }

  return {
    score,
    ripStrength,
    tideDrop: Math.round(tidalRange * 100) / 100,
    recommendation
  }
}

// -------------------- SCHOOLING INTEL (BIO-INTEL OVERRIDE) --------------------

export interface SchoolingIntelResult {
  detected: boolean
  keywords: string[]
  multiplier: number // 1.0 = no intel, 1.25 = run confirmed, 0.7 = ghost town
  confidence: 'strong_run' | 'some_activity' | 'no_intel' | 'slow'
}

/**
 * Detect Pink Salmon Schooling Intel from Fishing Reports
 *
 * Pink runs are binary: "In" (millions) or "Out" (zero).
 * If reports mention active schools, boost score regardless of weather.
 * If reports say slow/quiet, penalize even perfect conditions.
 *
 * @param reportText - Fishing report text to analyze
 */
export function detectPinkSchoolingIntel(
  reportText: string
): SchoolingIntelResult {
  const text = reportText.toLowerCase()
  const keywords: string[] = []

  // Positive keywords (run is in)
  const positiveKeywords = [
    'pink', 'pinks', 'humpy', 'humpies', 'humpback salmon',
    'school', 'schools', 'schooling',
    'millions', 'thick', 'stacked', 'loaded',
    'non-stop', 'nonstop', 'limiting', 'limiting on pinks',
    'jumping', 'rolling', 'splashing'
  ]

  // Negative keywords (slow fishing)
  const negativeKeywords = [
    'slow', 'quiet', 'ghost town', 'no fish', 'dead',
    'few pinks', 'scattered'
  ]

  // Check positive keywords
  for (const keyword of positiveKeywords) {
    if (text.includes(keyword)) {
      keywords.push(keyword)
    }
  }

  // Check negative keywords
  let hasNegativeSignal = false
  for (const keyword of negativeKeywords) {
    if (text.includes(keyword)) {
      hasNegativeSignal = true
      break
    }
  }

  // Determine confidence and multiplier
  let multiplier = 1.0
  let confidence: 'strong_run' | 'some_activity' | 'no_intel' | 'slow'
  const detected = keywords.length > 0

  if (hasNegativeSignal) {
    multiplier = 0.7
    confidence = 'slow'
  } else if (keywords.length >= 3 || keywords.some(k => ['millions', 'thick', 'limiting', 'nonstop'].includes(k))) {
    multiplier = 1.25
    confidence = 'strong_run'
  } else if (detected) {
    multiplier = 1.1
    confidence = 'some_activity'
  } else {
    multiplier = 1.0
    confidence = 'no_intel'
  }

  return {
    detected,
    keywords,
    multiplier,
    confidence
  }
}

// ==================== CHUM SALMON PHYSICS HELPERS ====================

// -------------------- STORM TRIGGER (HYDROLOGICAL TRIGGER) --------------------

export interface StormTriggerResult {
  score: number // 0-1
  isActive: boolean
  stormStrength: 'none' | 'light' | 'moderate' | 'strong'
  recommendation: string
}

/**
 * Calculate Storm Trigger Score for Chum Salmon
 *
 * INVERTED LOGIC: Chums are "storm biters" - they feed aggressively when
 * other salmon shut down. Falling pressure + rain = GOOD.
 *
 * The "Dog Days" phenomenon: Oct-Nov cold rainy conditions trigger feeding.
 *
 * @param pressureTrend - Rising, steady, or falling
 * @param precipitation - Current precipitation (mm/hr or mm/day)
 */
export function calculateStormTrigger(
  pressureTrend: 'rising' | 'stable' | 'falling' | 'crashing',
  precipitation: number
): StormTriggerResult {
  let score: number
  let isActive = false
  let stormStrength: 'none' | 'light' | 'moderate' | 'strong'
  let recommendation: string

  // Perfect storm: Falling pressure + moderate rain
  if ((pressureTrend === 'falling' || pressureTrend === 'crashing') && precipitation >= 5 && precipitation <= 20) {
    score = 1.0
    isActive = true
    stormStrength = 'strong'
    recommendation = '🌧️ STORM BITER ACTIVE: Falling pressure + rain = Chum feeding frenzy!'
  }
  // Moderate storm: Falling pressure OR rain (not both)
  else if (pressureTrend === 'falling' && precipitation > 0 && precipitation < 5) {
    score = 0.9
    isActive = true
    stormStrength = 'moderate'
    recommendation = 'Good conditions: Light rain + falling pressure triggers Chum aggression'
  }
  // Rain without pressure change
  else if (precipitation >= 5 && precipitation <= 20) {
    score = 0.8
    isActive = true
    stormStrength = 'moderate'
    recommendation = 'Rain alone - Chums still active while other salmon slow down'
  }
  // Falling pressure without rain
  else if (pressureTrend === 'falling' || pressureTrend === 'crashing') {
    score = 0.75
    isActive = true
    stormStrength = 'light'
    recommendation = 'Falling pressure - Chums feeding ahead of weather change'
  }
  // Stable/rising pressure, dry
  else if (pressureTrend === 'rising' && precipitation < 1) {
    score = 0.5
    stormStrength = 'none'
    recommendation = 'Fair conditions - Chums present but not as aggressive'
  }
  // Heavy rain (too much)
  else if (precipitation > 25) {
    score = 0.3
    stormStrength = 'light'
    recommendation = 'Very heavy rain - even Chums slow down in extreme conditions'
  }
  else {
    score = 0.6
    stormStrength = 'light'
    recommendation = 'Moderate conditions for Chum fishing'
  }

  return {
    score,
    isActive,
    stormStrength,
    recommendation
  }
}

// -------------------- STAGING SEAMS (SOFT WATER) --------------------

export interface StagingSeamsResult {
  score: number // 0-1
  currentType: 'dead_slack' | 'soft_water' | 'moderate' | 'fast_water'
  recommendation: string
}

/**
 * Calculate Staging Seams Score for Chum Salmon
 *
 * Chums stage (mill around) at river mouths in "soft water" (0.5-1.5 kts).
 * Not feeding in rip lines like Pinks - they're waiting to enter rivers.
 *
 * @param currentSpeed - Current speed in knots
 */
export function calculateStagingSeams(
  currentSpeed: number
): StagingSeamsResult {
  let score: number
  let currentType: 'dead_slack' | 'soft_water' | 'moderate' | 'fast_water'
  let recommendation: string

  if (currentSpeed < 0.3) {
    score = 0.5
    currentType = 'dead_slack'
    recommendation = 'Dead slack - Chums present but inactive, wait for current to build'
  } else if (currentSpeed >= 0.5 && currentSpeed <= 1.5) {
    score = 1.0
    currentType = 'soft_water'
    recommendation = '🎯 SOFT WATER: Perfect staging zone - Chums holding and feeding'
  } else if (currentSpeed > 1.5 && currentSpeed <= 2.5) {
    score = 0.7
    currentType = 'moderate'
    recommendation = 'Moderate current - fishable but not ideal staging conditions'
  } else {
    score = 0.3
    currentType = 'fast_water'
    recommendation = 'Fast water - Chums pushed out of staging zones or deep'
  }

  return {
    score,
    currentType,
    recommendation
  }
}

// -------------------- THERMAL GATE --------------------

export interface ThermalGateResult {
  score: number // 0-1
  isCold: boolean // True if in cold-water activation zone
  recommendation: string
}

/**
 * Calculate Thermal Gate Score for Chum Salmon
 *
 * Cold water triggers aggressive feeding. Warm water shuts them down.
 * Threshold: < 12°C = active, > 14°C = penalty
 *
 * @param waterTemp - Water temperature in Celsius
 */
export function calculateThermalGate(
  waterTemp: number
): ThermalGateResult {
  let score: number
  let isCold: boolean
  let recommendation: string

  if (waterTemp < 10) {
    score = 1.0
    isCold = true
    recommendation = '❄️ COLD WATER ACTIVATION: Chums in aggressive feeding mode'
  } else if (waterTemp >= 10 && waterTemp <= 12) {
    score = 0.9
    isCold = true
    recommendation = 'Optimal cold water - Chums actively feeding'
  } else if (waterTemp > 12 && waterTemp <= 14) {
    score = 0.6
    isCold = false
    recommendation = 'Warming water - Chum activity decreasing'
  } else {
    score = 0.3
    isCold = false
    recommendation = 'Too warm - Chums lethargic or moved to deeper/cooler water'
  }

  return {
    score,
    isCold,
    recommendation
  }
}

// ==================== SOCKEYE SALMON PHYSICS HELPERS ====================

// -------------------- THERMAL BLOCKADE (STACKING) --------------------

export interface ThermalBlockadeResult {
  score: number // 0-1
  isStacking: boolean // True if fish blocked and holding in saltwater
  riverStatus: 'blocked' | 'holding' | 'passable' | 'highway'
  recommendation: string
}

/**
 * Calculate Thermal Blockade Score for Sockeye
 *
 * Hot rivers block migration. Fish stack in saltwater = excellent fishing.
 * Cold rivers = fish shoot through = poor saltwater fishing.
 *
 * @param riverTemp - River temperature in Celsius (from nearby gauge)
 */
export function calculateThermalBlockade(
  riverTemp: number
): ThermalBlockadeResult {
  let score: number
  let isStacking: boolean
  let riverStatus: 'blocked' | 'holding' | 'passable' | 'highway'
  let recommendation: string

  // Hot river = thermal barrier
  if (riverTemp >= 19.0) {
    score = 1.0
    isStacking = true
    riverStatus = 'blocked'
    recommendation = '🔥 THERMAL BLOCKADE: River too hot - massive Sockeye stacking in saltwater!'
  } else if (riverTemp >= 17.0 && riverTemp < 19.0) {
    score = 0.85
    isStacking = true
    riverStatus = 'holding'
    recommendation = 'Warm river - Sockeye hesitating at river mouth, good saltwater fishing'
  } else if (riverTemp >= 15.0 && riverTemp < 17.0) {
    score = 0.6
    isStacking = false
    riverStatus = 'passable'
    recommendation = 'Moderate temps - fish moving through, some holding'
  } else {
    score = 0.3
    isStacking = false
    riverStatus = 'highway'
    recommendation = 'Cold river - fish shooting straight through to spawn, minimal saltwater holding'
  }

  return {
    score,
    isStacking,
    riverStatus,
    recommendation
  }
}

// -------------------- TIDAL TREADMILL (INTERCEPTION WINDOW) --------------------

export interface TidalTreadmillResult {
  score: number // 0-1
  interceptionQuality: 'excellent' | 'good' | 'fair' | 'poor'
  groundSpeed: 'holding' | 'slow' | 'moderate' | 'fast'
  recommendation: string
}

/**
 * Calculate Tidal Treadmill Score for Sockeye
 *
 * Ebb tide = fish swim against current to hold position = easier to intercept
 * Flood tide = fish ride current at high speed = harder to intercept
 *
 * @param isEbbTide - True if currently ebbing
 * @param currentSpeed - Current speed in knots
 */
export function calculateTidalTreadmill(
  isEbbTide: boolean,
  currentSpeed: number
): TidalTreadmillResult {
  let score: number
  let interceptionQuality: 'excellent' | 'good' | 'fair' | 'poor'
  let groundSpeed: 'holding' | 'slow' | 'moderate' | 'fast'
  let recommendation: string

  if (isEbbTide) {
    // Ebb = fish fighting current to hold position
    if (currentSpeed > 1.5) {
      score = 1.0
      interceptionQuality = 'excellent'
      groundSpeed = 'holding'
      recommendation = '🎯 EBB TREADMILL: Fish holding against current - near-zero ground speed, perfect flossing!'
    } else if (currentSpeed > 0.8) {
      score = 0.85
      interceptionQuality = 'good'
      groundSpeed = 'slow'
      recommendation = 'Good ebb - fish moving slowly, manageable interception'
    } else {
      score = 0.6
      interceptionQuality = 'fair'
      groundSpeed = 'slow'
      recommendation = 'Light ebb - some resistance but fish still mobile'
    }
  } else {
    // Flood = fish riding current at high speed
    if (currentSpeed > 2.0) {
      score = 0.3
      interceptionQuality = 'poor'
      groundSpeed = 'fast'
      recommendation = 'Strong flood - fish running at 6-8 kts, very difficult interception'
    } else if (currentSpeed > 1.0) {
      score = 0.5
      interceptionQuality = 'fair'
      groundSpeed = 'moderate'
      recommendation = 'Moderate flood - fish moving with tide, challenging interception'
    } else {
      score = 0.7
      interceptionQuality = 'good'
      groundSpeed = 'slow'
      recommendation = 'Light flood - fish assisted but still slow, workable'
    }
  }

  return {
    score,
    interceptionQuality,
    groundSpeed,
    recommendation
  }
}

// -------------------- CORRIDOR DEPTH ADVICE --------------------

export interface CorridorDepthResult {
  targetDepth: string // e.g., "40-60ft"
  depthRationale: string
  leaderAdvice: string
}

/**
 * Calculate Sockeye Depth Corridor Advice
 *
 * Sockeye run in a "tube" depth. If you're above/below it, you catch nothing.
 * Tube depth is dictated by light intensity.
 *
 * @param sunElevation - Sun angle in degrees (0-90)
 * @param cloudCover - Cloud cover percentage (0-100)
 */
export function calculateSockeyeDepthCorridor(
  sunElevation: number,
  cloudCover: number
): CorridorDepthResult {
  let targetDepth: string
  let depthRationale: string

  // Low light conditions = shallow tube
  if (sunElevation < 10 || cloudCover > 80) {
    targetDepth = '25-45ft'
    depthRationale = 'Low light - fish comfortable shallow'
  }
  // Moderate conditions
  else if (sunElevation < 30 || cloudCover > 50) {
    targetDepth = '40-60ft'
    depthRationale = 'Moderate light - mid-depth corridor'
  }
  // Bright sun, high angle
  else if (sunElevation > 40 && cloudCover < 30) {
    targetDepth = '65-90ft'
    depthRationale = 'High sun - fish pushed deep for light avoidance'
  }
  // Default
  else {
    targetDepth = '50-70ft'
    depthRationale = 'Standard corridor depth'
  }

  const leaderAdvice = 'Use short leaders (18-24") and slow troll (1.5-2.5 kts) for flossing'

  return {
    targetDepth,
    depthRationale,
    leaderAdvice
  }
}

// -------------------- SOCKEYE BIO-INTEL (RUN STRENGTH) --------------------

export interface SockeyeBioIntelResult {
  detected: boolean
  keywords: string[]
  multiplier: number // 1.0 = no intel, 1.5 = massive run confirmed
  confidence: 'massive_run' | 'confirmed_schools' | 'some_activity' | 'no_intel'
}

/**
 * Detect Sockeye Run Strength from Fishing Reports
 *
 * Unlike feeding fish, Sockeye presence is binary: run is in or it's not.
 * Commercial openings = ultimate bio-intel signal.
 *
 * @param reportText - Fishing report text to analyze
 */
export function detectSockeyeBioIntel(
  reportText: string
): SockeyeBioIntelResult {
  const text = reportText.toLowerCase()
  const keywords: string[] = []

  // High-value keywords (commercial/DFO activity)
  const commercialKeywords = [
    'commercial opening', 'test set', 'seine fleet',
    'dfo opening', 'commission', 'escapement goal'
  ]

  // School presence keywords
  const schoolKeywords = [
    'sockeye', 'sox', 'red salmon', 'reds',
    'school', 'schools', 'jumper', 'jumpers',
    'millions', 'massive run', 'strong run',
    'stacking', 'holding'
  ]

  // Check commercial activity (strongest signal)
  let hasCommercialSignal = false
  for (const keyword of commercialKeywords) {
    if (text.includes(keyword)) {
      keywords.push(keyword)
      hasCommercialSignal = true
    }
  }

  // Check school presence
  for (const keyword of schoolKeywords) {
    if (text.includes(keyword)) {
      keywords.push(keyword)
    }
  }

  // Determine multiplier and confidence
  let multiplier = 1.0
  let confidence: 'massive_run' | 'confirmed_schools' | 'some_activity' | 'no_intel'
  const detected = keywords.length > 0

  if (hasCommercialSignal) {
    multiplier = 1.5
    confidence = 'massive_run'
  } else if (keywords.length >= 3 || keywords.some(k => ['millions', 'massive run', 'stacking'].includes(k))) {
    multiplier = 1.3
    confidence = 'confirmed_schools'
  } else if (detected) {
    multiplier = 1.15
    confidence = 'some_activity'
  } else {
    multiplier = 1.0
    confidence = 'no_intel'
  }

  return {
    detected,
    keywords,
    multiplier,
    confidence
  }
}

// ==================== SPOT PRAWN PHYSICS HELPERS ====================

// -------------------- CATENARY DRAG (ROPE BLOWBACK) --------------------

export interface CatenaryDragResult {
  score: number // 0-1
  maxSafeCurrent: number // Maximum safe current for this depth
  lineAngleRisk: 'safe' | 'moderate' | 'severe' | 'impossible'
  recommendation: string
}

/**
 * Calculate Catenary Drag Score for Spot Prawn
 *
 * At extreme depths (200-400ft), even small currents create massive rope blowback.
 * Max safe current scales inversely with depth.
 *
 * Formula: MaxSafeCurrent = 1.1 - (depth/100 × 0.15)
 * - 100ft: 0.95 kts
 * - 200ft: 0.80 kts
 * - 300ft: 0.65 kts (typical)
 * - 400ft: 0.50 kts
 *
 * @param currentSpeed - Current speed in knots
 * @param targetDepthFt - Fishing depth in feet (default 300)
 */
export function calculateCatenaryDrag(
  currentSpeed: number,
  targetDepthFt: number = 300
): CatenaryDragResult {
  // Calculate max safe current for this depth
  const depthFactor = Math.floor(targetDepthFt / 100)
  const maxSafeCurrent = 1.1 - (depthFactor * 0.15)

  let score: number
  let lineAngleRisk: 'safe' | 'moderate' | 'severe' | 'impossible'
  let recommendation: string

  if (currentSpeed <= 0.2) {
    score = 1.0
    lineAngleRisk = 'safe'
    recommendation = `Perfect slack - traps vertical at ${targetDepthFt}ft`
  } else if (currentSpeed <= maxSafeCurrent) {
    score = 0.8
    lineAngleRisk = 'safe'
    recommendation = `Manageable current for ${targetDepthFt}ft - minimal blowback`
  } else if (currentSpeed <= maxSafeCurrent + 0.15) {
    score = 0.5
    lineAngleRisk = 'moderate'
    recommendation = `Moderate blowback at ${targetDepthFt}ft - use extra weight (15lb+)`
  } else if (currentSpeed <= maxSafeCurrent + 0.3) {
    score = 0.2
    lineAngleRisk = 'severe'
    recommendation = `Severe blowback - rope angle >30°, traps "walking", high tangle risk`
  } else {
    score = 0.05
    lineAngleRisk = 'impossible'
    recommendation = `IMPOSSIBLE: Current ${currentSpeed.toFixed(1)} kts too strong for ${targetDepthFt}ft - gear loss risk`
  }

  return {
    score,
    maxSafeCurrent: Math.round(maxSafeCurrent * 100) / 100,
    lineAngleRisk,
    recommendation
  }
}

// -------------------- SLACK WINDOW DURATION --------------------

export interface SlackWindowResult {
  score: number // 0-1
  windowDuration: 'long' | 'moderate' | 'short' | 'very_short'
  estimatedMinutes: number
  multiplier: number // 1.2x for neap, 0.8x for spring
  recommendation: string
}

/**
 * Calculate Slack Window Duration Score for Spot Prawn
 *
 * Small tidal exchange (neap) = long slack window (60+ min) = relaxed retrieval
 * Large exchange (spring) = short slack window (<20 min) = rush job
 *
 * Retrieving 4 traps from 400ft takes ~20 minutes - need adequate window.
 *
 * @param tidalRange - Daily tidal exchange in meters
 */
export function calculateSlackWindowDuration(
  tidalRange: number
): SlackWindowResult {
  let score: number
  let windowDuration: 'long' | 'moderate' | 'short' | 'very_short'
  let estimatedMinutes: number
  let multiplier: number
  let recommendation: string

  // Neap tides (small exchange < 2.5m)
  if (tidalRange < 2.0) {
    score = 1.0
    windowDuration = 'long'
    estimatedMinutes = 70
    multiplier = 1.2
    recommendation = '🌙 NEAP TIDE: Long slack window (60+ min) - relaxed retrieval, perfect for 4+ traps'
  } else if (tidalRange < 2.5) {
    score = 0.85
    windowDuration = 'moderate'
    estimatedMinutes = 45
    multiplier = 1.1
    recommendation = 'Moderate slack window (45 min) - manageable for 3-4 traps'
  } else if (tidalRange < 3.5) {
    score = 0.6
    windowDuration = 'short'
    estimatedMinutes = 30
    multiplier = 1.0
    recommendation = 'Short slack window (30 min) - tight timing, 2-3 traps max'
  } else if (tidalRange < 4.5) {
    score = 0.4
    windowDuration = 'very_short'
    estimatedMinutes = 20
    multiplier = 0.8
    recommendation = 'Very short slack window (<20 min) - spring tide rush, risky for deep work'
  } else {
    score = 0.2
    windowDuration = 'very_short'
    estimatedMinutes = 15
    multiplier = 0.7
    recommendation = 'Extreme spring tide - window too short for safe 400ft retrieval'
  }

  return {
    score,
    windowDuration,
    estimatedMinutes,
    multiplier,
    recommendation
  }
}

// -------------------- PRAWN DARKNESS (MOON INVERTED) --------------------

export interface PrawnDarknessResult {
  score: number // 0-1
  moonCondition: 'new_moon_ideal' | 'dark' | 'moderate' | 'bright'
  isNight: boolean
  recommendation: string
}

/**
 * Calculate Darkness Score for Spot Prawn
 *
 * INVERTED: Prawns are prey - they hide on bright nights.
 * New moon + night = peak trap activity
 * Full moon = prawns forage visually, less trap-dependent
 *
 * @param moonIllumination - Moon illumination percentage (0-100)
 * @param isNight - True if nighttime
 */
export function calculatePrawnDarkness(
  moonIllumination: number,
  isNight: boolean
): PrawnDarknessResult {
  let score: number
  let moonCondition: 'new_moon_ideal' | 'dark' | 'moderate' | 'bright'
  let recommendation: string

  // Night + new moon = perfect
  if (isNight && moonIllumination < 25) {
    score = 1.0
    moonCondition = 'new_moon_ideal'
    recommendation = '🌑 NEW MOON + NIGHT: Peak prawn activity - traps will be loaded!'
  }
  // Night + moderate moon
  else if (isNight && moonIllumination < 60) {
    score = 0.85
    moonCondition = 'dark'
    recommendation = 'Dark night - good prawn trap activity'
  }
  // Day or bright moon
  else if (moonIllumination >= 75) {
    score = 0.5
    moonCondition = 'bright'
    recommendation = 'Full moon - prawns foraging visually, less trap-dependent'
  }
  // Dawn/dusk or moderate moon
  else {
    score = 0.7
    moonCondition = 'moderate'
    recommendation = 'Moderate light conditions'
  }

  return {
    score,
    moonCondition,
    isNight,
    recommendation
  }
}
