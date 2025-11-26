// Dynamic recommendation generator based on current conditions
// Produces actionable advice tailored to species and conditions

import { getSpeciesExplanations, getRecommendationForScore, getScoreLabel } from './speciesExplanations'

export interface FactorScore {
  key: string
  label: string
  score: number
  maxScore: number
  value?: number | string
  contribution: number
}

export interface OverallRecommendation {
  summary: string
  bestApproach: string
  topFactors: { factor: string; score: number; insight: string }[]
  limitingFactors: { factor: string; score: number; insight: string }[]
  timingAdvice?: string
  depthAdvice?: string
  techniqueAdvice?: string
}

// Get dynamic recommendation for a single factor
export function generateFactorRecommendation(
  factorKey: string,
  score: number,
  value: number | string | undefined,
  species: string
): string {
  return getRecommendationForScore(species, factorKey, score)
}

// Generate comprehensive overall recommendations
export function generateOverallRecommendation(
  overallScore: number,
  factors: FactorScore[],
  species: string
): OverallRecommendation {
  const speciesData = getSpeciesExplanations(species)
  const displayName = speciesData.displayName

  // Sort factors by score to find best and worst
  const sortedByScore = [...factors].sort((a, b) => b.score - a.score)
  const topFactors = sortedByScore.slice(0, 3).filter((f) => f.score >= 6)
  const limitingFactors = sortedByScore
    .slice(-3)
    .reverse()
    .filter((f) => f.score < 6)

  // Generate summary based on overall score
  let summary: string
  let bestApproach: string

  if (overallScore >= 80) {
    summary = `Excellent conditions for ${displayName}! Multiple factors align for a productive day on the water. Fish should be actively feeding and accessible.`
    bestApproach = `This is a "don't miss" day. Fish confidently with proven techniques. Cover water actively and expect aggressive strikes. Consider extending your trip if possible.`
  } else if (overallScore >= 65) {
    summary = `Good conditions for ${displayName}. Most factors favor fishing success, with a few minor limitations. Expect solid action with the right approach.`
    bestApproach = `Fish your proven spots first, then explore. Standard techniques should produce. Be ready to adjust if the primary pattern isn't working.`
  } else if (overallScore >= 50) {
    summary = `Fair conditions for ${displayName}. Some factors work in your favor, but others may limit success. Patience and adaptability will be key.`
    bestApproach = `Focus on areas where favorable factors converge. Slow down your presentation and be more methodical. Quality over quantity today.`
  } else if (overallScore >= 35) {
    summary = `Challenging conditions for ${displayName}. Several factors are working against you. Success is possible but will require extra effort and the right strategy.`
    bestApproach = `Target the most protected, consistent spots. Downsize presentations and slow way down. Consider focusing on the brief windows when conditions improve.`
  } else {
    summary = `Difficult conditions for ${displayName}. Most factors are unfavorable. Consider whether this is a good day to be on the water or if another species might be more productive.`
    bestApproach = `If you go out, have realistic expectations. Focus on safety first. This might be a scouting day rather than a fishing day.`
  }

  // Generate insights for top and limiting factors
  const topInsights = topFactors.map((f) => ({
    factor: f.label,
    score: f.score,
    insight: generateFactorInsight(f.key, f.score, f.value, species, true),
  }))

  const limitingInsights = limitingFactors.map((f) => ({
    factor: f.label,
    score: f.score,
    insight: generateFactorInsight(f.key, f.score, f.value, species, false),
  }))

  // Generate specific advice based on factors
  const timingAdvice = generateTimingAdvice(factors)
  const depthAdvice = generateDepthAdvice(factors, species)
  const techniqueAdvice = generateTechniqueAdvice(factors, species, overallScore)

  return {
    summary,
    bestApproach,
    topFactors: topInsights,
    limitingFactors: limitingInsights,
    timingAdvice,
    depthAdvice,
    techniqueAdvice,
  }
}

// Generate insight text for a specific factor
function generateFactorInsight(
  factorKey: string,
  score: number,
  value: number | string | undefined,
  species: string,
  isPositive: boolean
): string {
  const scoreLabel = getScoreLabel(score)

  // Factor-specific insights
  const insights: { [key: string]: { positive: string; negative: string } } = {
    seasonality: {
      positive: 'Fish are present in good numbers',
      negative: 'Fish density may be lower than peak season',
    },
    lightTime: {
      positive: 'Prime feeding window - fish are active',
      negative: 'Fish may be less aggressive, go deeper',
    },
    pressureTrend: {
      positive: 'Weather pattern favors active feeding',
      negative: 'Pressure change may slow the bite',
    },
    solunar: {
      positive: 'Lunar alignment boosts feeding activity',
      negative: 'Between feeding windows',
    },
    catchReports: {
      positive: 'Recent catches confirm fish presence',
      negative: 'Limited recent intel - scout carefully',
    },
    tidalCurrent: {
      positive: 'Current is moving bait - fish are feeding',
      negative: 'Wait for tide change to improve flow',
    },
    seaState: {
      positive: 'Calm enough for effective fishing',
      negative: 'Rough conditions - fish deeper water',
    },
    waterTemp: {
      positive: 'Temperature in the comfort zone',
      negative: 'Fish may seek thermal refugia',
    },
    precipitation: {
      positive: 'Clear conditions for visibility',
      negative: 'Rain may reduce visibility - use brighter gear',
    },
    // Legacy factors
    pressure: {
      positive: 'Pressure is favorable',
      negative: 'Pressure outside ideal range',
    },
    tideDirection: {
      positive: 'Tide movement is favorable',
      negative: 'Tide is slowing - wait for change',
    },
    tidalRange: {
      positive: 'Good tidal exchange expected',
      negative: 'Minimal tidal movement today',
    },
    windSpeed: {
      positive: 'Wind is manageable',
      negative: 'Wind may affect fishing - seek shelter',
    },
    waveHeight: {
      positive: 'Waves are manageable',
      negative: 'Choppy conditions - fish deeper',
    },
    cloudCover: {
      positive: 'Cloud cover reduces glare',
      negative: 'Bright conditions - fish shade',
    },
    temperature: {
      positive: 'Comfortable fishing weather',
      negative: 'Dress appropriately for conditions',
    },
    visibility: {
      positive: 'Good visibility for presentations',
      negative: 'Limited visibility - use brighter lures',
    },
  }

  const factorInsight = insights[factorKey]
  if (!factorInsight) {
    return isPositive ? `${scoreLabel.label} conditions` : `Below optimal - adjust approach`
  }

  return isPositive ? factorInsight.positive : factorInsight.negative
}

// Generate timing-specific advice
function generateTimingAdvice(factors: FactorScore[]): string {
  const lightFactor = factors.find((f) => f.key === 'lightTime' || f.key === 'light')
  const solunarFactor = factors.find((f) => f.key === 'solunar')
  const tideFactor = factors.find((f) => f.key === 'tidalCurrent' || f.key === 'tideDirection')

  const adviceParts: string[] = []

  if (lightFactor) {
    if (lightFactor.score >= 8) {
      adviceParts.push("You're in the prime light window")
    } else if (lightFactor.score < 5) {
      adviceParts.push('Wait for dawn/dusk for better activity')
    }
  }

  if (solunarFactor && solunarFactor.score >= 7) {
    adviceParts.push('solunar period aligns well')
  }

  if (tideFactor) {
    if (tideFactor.score >= 7) {
      adviceParts.push('current flow is optimal')
    } else if (tideFactor.score < 4) {
      adviceParts.push('wait for tide change')
    }
  }

  if (adviceParts.length === 0) {
    return 'Standard timing - be patient and persistent.'
  }

  return adviceParts.join(', ') + '.'
}

// Generate depth-specific advice
function generateDepthAdvice(factors: FactorScore[], species: string): string {
  const tempFactor = factors.find((f) => f.key === 'waterTemp' || f.key === 'temperature')
  const lightFactor = factors.find((f) => f.key === 'lightTime' || f.key === 'light')
  const seaStateFactor = factors.find((f) => f.key === 'seaState' || f.key === 'waveHeight')

  const speciesData = getSpeciesExplanations(species)
  const isBottomFish =
    speciesData.displayName === 'Halibut' ||
    speciesData.displayName === 'Lingcod' ||
    speciesData.displayName === 'Rockfish'

  if (isBottomFish) {
    return 'Fish the bottom near structure. Use sonar to identify productive humps and ledges.'
  }

  const conditions: string[] = []

  if (tempFactor && tempFactor.score < 5) {
    conditions.push('warmer water')
  }
  if (lightFactor && lightFactor.score < 4) {
    conditions.push('less light')
  }
  if (seaStateFactor && seaStateFactor.score < 5) {
    conditions.push('calmer water')
  }

  if (conditions.length > 0) {
    return `Fish deeper to find ${conditions.join(' and ')}. Try 40-80 feet as a starting point.`
  }

  return 'Fish can be at various depths - start shallow and work deeper until you find them.'
}

// Generate technique-specific advice
function generateTechniqueAdvice(factors: FactorScore[], species: string, overallScore: number): string {
  const speciesData = getSpeciesExplanations(species)

  // Species-specific technique advice
  if (speciesData.displayName === 'Chinook Salmon') {
    if (overallScore >= 70) {
      return 'Active presentations work well - try trolling with cut-plug herring or hoochies. Vary your speed.'
    } else if (overallScore >= 50) {
      return 'Slow down your trolling speed. Consider mooching or jigging for more control.'
    } else {
      return 'Finesse is key - slow presentations, smaller baits, and patience. Mooching often outproduces trolling.'
    }
  }

  if (speciesData.displayName === 'Coho Salmon') {
    if (overallScore >= 70) {
      return 'Coho are aggressive! Try surface presentations, buzz bombs, or fast-trolled spoons.'
    } else {
      return 'Match the hatch with smaller presentations. Coho can be leader-shy in clear water.'
    }
  }

  if (speciesData.displayName === 'Halibut') {
    if (overallScore >= 60) {
      return 'Large baits work well - whole herring, octopus, or salmon bellies. Fish heavy to stay on bottom.'
    } else {
      return 'Try scent-enhanced baits and be patient. Halibut may need extra motivation today.'
    }
  }

  // Generic advice
  if (overallScore >= 70) {
    return 'Conditions favor active fishing. Experiment with different presentations to find what works.'
  } else if (overallScore >= 50) {
    return 'Standard techniques should produce. Be methodical and cover water systematically.'
  } else {
    return 'Challenging conditions call for finesse. Slow down, downsize, and focus on high-percentage spots.'
  }
}

// Get a simple one-line recommendation for tooltips
export function getQuickRecommendation(
  factorKey: string,
  score: number,
  species: string
): string {
  const recommendation = getRecommendationForScore(species, factorKey, score)
  // Return first sentence only for tooltip
  const firstSentence = recommendation.split('.')[0]
  return firstSentence + '.'
}

// Get score interpretation for display
export function getScoreInterpretation(overallScore: number, species: string): string {
  const speciesData = getSpeciesExplanations(species)
  const displayName = speciesData.displayName

  if (overallScore >= 80) return `Excellent ${displayName} conditions`
  if (overallScore >= 65) return `Good ${displayName} conditions`
  if (overallScore >= 50) return `Fair ${displayName} conditions`
  if (overallScore >= 35) return `Challenging for ${displayName}`
  return `Difficult ${displayName} conditions`
}

// Generate safety warnings based on factors
export function generateSafetyWarnings(factors: FactorScore[]): string[] {
  const warnings: string[] = []

  const seaState = factors.find((f) => f.key === 'seaState' || f.key === 'waveHeight')
  const wind = factors.find((f) => f.key === 'windSpeed')
  const precipitation = factors.find((f) => f.key === 'precipitation')

  if (seaState && seaState.score <= 2) {
    warnings.push('Rough seas - exercise caution and check marine forecast')
  }

  if (wind && typeof wind.value === 'number' && wind.value > 30) {
    warnings.push('High winds - small craft advisory conditions')
  }

  if (precipitation && precipitation.score <= 2) {
    warnings.push('Severe weather possible - monitor conditions closely')
  }

  return warnings
}
