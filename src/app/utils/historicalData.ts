import historicalData from '../../lib/historical.json'

export interface HistoricalFishingData {
  [date: string]: {
    [location: string]: {
      [species: string]: number
    }
  }
}

export interface LocationHistoricalScore {
  location: string
  species: string
  score: number
  date: string
}

export const getHistoricalData = (): HistoricalFishingData => {
  return historicalData as HistoricalFishingData
}

export const getHistoricalScoresForLocation = (location: string): LocationHistoricalScore[] => {
  const data = getHistoricalData()
  const scores: LocationHistoricalScore[] = []

  Object.entries(data).forEach(([date, locations]) => {
    // Find matching location (case-insensitive partial match)
    const matchingLocationKey = Object.keys(locations).find(
      loc => loc.toLowerCase().includes(location.toLowerCase()) || location.toLowerCase().includes(loc.toLowerCase()),
    )

    if (matchingLocationKey && locations[matchingLocationKey]) {
      Object.entries(locations[matchingLocationKey]).forEach(([species, score]) => {
        scores.push({
          location: matchingLocationKey,
          species,
          score,
          date,
        })
      })
    }
  })

  return scores.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export const getHistoricalScoresForLocationAndSpecies = (
  location: string,
  species: string,
): LocationHistoricalScore[] => {
  const scores = getHistoricalScoresForLocation(location)
  return scores.filter(
    score =>
      score.species.toLowerCase().includes(species.toLowerCase()) ||
      species.toLowerCase().includes(score.species.toLowerCase()),
  )
}

export const getAverageHistoricalScore = (location: string, species?: string): number => {
  const scores = species
    ? getHistoricalScoresForLocationAndSpecies(location, species)
    : getHistoricalScoresForLocation(location)

  if (scores.length === 0) return 0

  const sum = scores.reduce((total, score) => total + score.score, 0)
  return Math.round((sum / scores.length) * 100) / 100
}

export const getHistoricalTrends = (
  location: string,
  species?: string,
): {
  recent: number
  overall: number
  trend: 'improving' | 'declining' | 'stable'
} => {
  const scores = species
    ? getHistoricalScoresForLocationAndSpecies(location, species)
    : getHistoricalScoresForLocation(location)

  if (scores.length === 0) {
    return { recent: 0, overall: 0, trend: 'stable' }
  }

  // Sort by date (most recent first)
  const sortedScores = scores.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Get recent scores (last 3 entries)
  const recentScores = sortedScores.slice(0, 3)
  const recent = recentScores.reduce((sum, score) => sum + score.score, 0) / recentScores.length

  // Get overall average
  const overall = scores.reduce((sum, score) => sum + score.score, 0) / scores.length

  // Determine trend
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (recent > overall + 0.5) trend = 'improving'
  else if (recent < overall - 0.5) trend = 'declining'

  return {
    recent: Math.round(recent * 100) / 100,
    overall: Math.round(overall * 100) / 100,
    trend,
  }
}

export const getAvailableLocations = (): string[] => {
  const data = getHistoricalData()
  const locations = new Set<string>()

  Object.values(data).forEach(dateData => {
    Object.keys(dateData).forEach(location => {
      locations.add(location)
    })
  })

  return Array.from(locations).sort()
}

export const getAvailableSpecies = (): string[] => {
  const data = getHistoricalData()
  const species = new Set<string>()

  Object.values(data).forEach(dateData => {
    Object.values(dateData).forEach(locationData => {
      Object.keys(locationData).forEach(speciesName => {
        species.add(speciesName)
      })
    })
  })

  return Array.from(species).sort()
}
