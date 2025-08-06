import { OpenMeteoDailyForecast } from './fishingCalculations'

export interface DailyReportDay {
  date: number
  dayName: string
  overallScore: number
  bestPeriods: {
    startTime: number
    endTime: number
    score: number
    conditions: string
    windSpeed: number
    temperature: number
  }[]
  sunrise: number
  sunset: number
}

export interface DailyReportData {
  location: string
  coordinates: { lat: number; lon: number }
  generatedAt: number
  bestDays: DailyReportDay[]
}

/**
 * Generates report data for the best 3 fishing days in the next 7 days
 * Uses the same algorithm as the frontend UI
 */
export function generateDailyReport(
  forecasts: OpenMeteoDailyForecast[],
  location: string,
  coordinates: { lat: number; lon: number }
): DailyReportData {
  // Take only the next 7 days
  const next7Days = forecasts.slice(0, 7)
  
  // Calculate daily scores and prepare day data
  const daysWithScores = next7Days.map(forecast => {
    // Calculate overall day score (best 2-hour period score)
    const bestScore = forecast.twoHourForecasts.length > 0 
      ? Math.max(...forecast.twoHourForecasts.map(f => f.score.total)) 
      : 0
    
    // Get the top 3 2-hour periods for this day
    const sortedPeriods = [...forecast.twoHourForecasts]
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 3)
    
    return {
      date: forecast.date,
      dayName: forecast.dayName,
      overallScore: bestScore,
      bestPeriods: sortedPeriods.map(period => ({
        startTime: period.startTime,
        endTime: period.endTime,
        score: period.score.total,
        conditions: period.conditions,
        windSpeed: period.windSpeed,
        temperature: period.avgTemp
      })),
      sunrise: forecast.sunrise,
      sunset: forecast.sunset
    }
  })
  
  // Sort by overall score and take the best 3 days
  const best3Days = daysWithScores
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 3)
    // Re-sort by date (chronological order)
    .sort((a, b) => a.date - b.date)
  
  return {
    location,
    coordinates,
    generatedAt: Date.now() / 1000,
    bestDays: best3Days
  }
}

/**
 * Formats time for display in reports
 */
export function formatReportTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Formats date for display in reports
 */
export function formatReportDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Gets fishing quality label based on score
 */
export function getQualityLabel(score: number): string {
  if (score >= 8) return 'Excellent'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'Fair'
  return 'Poor'
}

/**
 * Gets emoji for fishing conditions
 */
export function getConditionEmoji(score: number): string {
  if (score >= 8) return '🎣'
  if (score >= 6) return '🐟'
  if (score >= 4) return '⛅'
  return '🌊'
}