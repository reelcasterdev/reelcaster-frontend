// Multiple fishing data sources integration utility

export interface FishingDataSource {
  name: string
  type: 'citizen_science' | 'government' | 'commercial' | 'social_platform'
  coverage: string
  reliability: 'high' | 'medium' | 'low'
  dataTypes: string[]
  apiEndpoint?: string
  updateFrequency: string
}

export interface FishingObservation {
  id: string
  source: string
  date: string
  location: {
    lat: number
    lon: number
    name: string
  }
  species: {
    scientific_name: string
    common_name: string
    confidence: number
  }
  catch_details: {
    method?: string
    bait?: string
    weather_conditions?: string
    water_conditions?: string
  }
  quality_score: number
  verification_status: 'verified' | 'unverified' | 'expert_reviewed'
}

export const FISHING_DATA_SOURCES: FishingDataSource[] = [
  {
    name: 'iNaturalist',
    type: 'citizen_science',
    coverage: 'Global (BC coastal areas)',
    reliability: 'high',
    dataTypes: ['species_observations', 'photos', 'expert_verification'],
    apiEndpoint: 'https://api.inaturalist.org/v1/observations',
    updateFrequency: 'real-time',
  },
  {
    name: 'FishBrain',
    type: 'social_platform',
    coverage: 'Global (12M+ users)',
    reliability: 'medium',
    dataTypes: ['catch_logs', 'fishing_conditions', 'gear_data', 'social_verification'],
    apiEndpoint: 'contact for developer access',
    updateFrequency: 'real-time',
  },
  {
    name: 'DFO (Fisheries and Oceans Canada)',
    type: 'government',
    coverage: 'All Canadian waters',
    reliability: 'high',
    dataTypes: ['commercial_landings', 'species_stocks', 'fishing_pressure', 'regulations'],
    apiEndpoint: 'https://open.canada.ca/data/api/3/action/',
    updateFrequency: 'monthly/quarterly',
  },
  {
    name: 'PacFIN',
    type: 'commercial',
    coverage: 'US West Coast (WA, OR, CA)',
    reliability: 'high',
    dataTypes: ['commercial_catch', 'revenue_data', 'vessel_activity'],
    apiEndpoint: 'https://pacfin.psmfc.org/',
    updateFrequency: 'monthly',
  },
  {
    name: 'FishAngler',
    type: 'social_platform',
    coverage: 'North America',
    reliability: 'medium',
    dataTypes: ['detailed_logs', 'weather_correlation', 'gear_effectiveness'],
    updateFrequency: 'real-time',
  },
]

// Utility functions for data source management
export const getDataSourcesByType = (type: FishingDataSource['type']) => {
  return FISHING_DATA_SOURCES.filter(source => source.type === type)
}

export const getHighReliabilitySources = () => {
  return FISHING_DATA_SOURCES.filter(source => source.reliability === 'high')
}

export const getRealtimeSources = () => {
  return FISHING_DATA_SOURCES.filter(source => source.updateFrequency === 'real-time')
}

// Example API integration helpers
export const fetchFromMultipleSources = async (
  location: { lat: number; lon: number },
  dateRange: { start: string; end: string },
  enabledSources: string[] = ['iNaturalist', 'FishBrain'],
): Promise<FishingObservation[]> => {
  const allObservations: FishingObservation[] = []

  for (const sourceName of enabledSources) {
    const source = FISHING_DATA_SOURCES.find(s => s.name === sourceName)
    if (!source) continue

    try {
      switch (sourceName) {
        case 'iNaturalist':
          // Your existing iNaturalist integration
          break
        case 'FishBrain':
          // New FishBrain integration
          // const fishBrainData = await fetchFishBrainData(location, dateRange)
          break
        case 'DFO':
          // Government data integration
          // const dfoData = await fetchDFOData(location, dateRange)
          break
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${sourceName}:`, error)
    }
  }

  return allObservations
}

// Data quality assessment
export const assessDataQuality = (
  observations: FishingObservation[],
): {
  overall_quality: number
  source_breakdown: Record<string, number>
  verification_stats: Record<string, number>
} => {
  if (observations.length === 0) {
    return {
      overall_quality: 0,
      source_breakdown: {},
      verification_stats: {},
    }
  }

  const sourceBreakdown: Record<string, number> = {}
  const verificationStats: Record<string, number> = {}
  let totalQuality = 0

  observations.forEach(obs => {
    sourceBreakdown[obs.source] = (sourceBreakdown[obs.source] || 0) + 1
    verificationStats[obs.verification_status] = (verificationStats[obs.verification_status] || 0) + 1
    totalQuality += obs.quality_score
  })

  return {
    overall_quality: totalQuality / observations.length,
    source_breakdown: sourceBreakdown,
    verification_stats: verificationStats,
  }
}

// Correlation analysis between sources
export const analyzeCrossSourceCorrelation = (
  algorithmPredictions: number[],
  sourcePredictions: Record<string, number[]>,
): Record<string, { correlation: number; reliability: string }> => {
  const results: Record<string, { correlation: number; reliability: string }> = {}

  Object.entries(sourcePredictions).forEach(([source, predictions]) => {
    if (predictions.length === algorithmPredictions.length) {
      const correlation = calculateCorrelation(algorithmPredictions, predictions)
      const reliability = correlation > 0.7 ? 'high' : correlation > 0.4 ? 'medium' : 'low'
      results[source] = { correlation, reliability }
    }
  })

  return results
}

// Simple correlation calculation
const calculateCorrelation = (x: number[], y: number[]): number => {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}
