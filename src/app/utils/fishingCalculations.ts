// Open-Meteo integration imports
import { ProcessedOpenMeteoData, OpenMeteo15MinData, getWeatherDescription } from './openMeteoApi'

export interface FishingScore {
  total: number
  breakdown: {
    pressure: number
    wind: number
    temperature: number
    precipitation: number
    cloudCover: number
    timeOfDay: number
    visibility: number
    sunshine: number
    lightning: number
    atmospheric: number
    comfort: number
  }
}

export interface MinutelyForecast {
  startTime: number
  endTime: number
  score: FishingScore
  avgTemp: number
  conditions: string
  icon: string
  windSpeed: number
  precipitation: number
  pressure: number
}

export interface OpenMeteoDailyForecast {
  date: number
  dayName: string
  sunrise: number
  sunset: number
  minutelyScores: Array<{
    time: string
    timestamp: number
    score: number
    temp: number
    conditions: string
    icon: string
    windSpeed: number
    precipitation: number
  }>
  twoHourForecasts: MinutelyForecast[]
}

export const calculateOpenMeteoFishingScore = (
  minuteData: OpenMeteo15MinData,
  sunrise: number,
  sunset: number,
): FishingScore => {
  // Enhanced algorithm with 11 factors - adjusted weights for more comprehensive scoring

  // Core Weather Factors (65% total)
  const pressureScore = calculatePressureScore(minuteData.pressure) // 20%
  const windSpeedMs = minuteData.windSpeed / 3.6 // Convert km/h to m/s
  const windGustsMs = minuteData.windGusts / 3.6 // Convert km/h to m/s
  const windScore = calculateEnhancedWindScore(windSpeedMs, windGustsMs, minuteData.windDirection) // 15%
  const temperatureScore = calculateTemperatureScore(minuteData.temp) // 15%
  const precipitationScore = calculatePrecipitationScoreFromMM(minuteData.precipitation) // 15%

  // Environmental Factors (25% total)
  const cloudScore = calculateCloudScore(minuteData.cloudCover) // 8%
  const visibilityScore = calculateVisibilityScore(minuteData.visibility) // 7%
  const sunshineScore = calculateSunshineScore(minuteData.sunshineDuration) // 5%
  const atmosphericScore = calculateAtmosphericStabilityScore(minuteData.cape) // 5%

  // Safety & Comfort Factors (10% total)
  const lightningScore = calculateLightningScore(minuteData.lightningPotential) // 5%
  const comfortScore = calculateComfortScore(
    minuteData.temp,
    minuteData.apparentTemp,
    minuteData.humidity,
    minuteData.dewPoint,
  ) // 5%

  // Timing Factor (10% total)
  const timeScore = calculateTimeScore(minuteData.timestamp, sunrise, sunset) // 10%

  const breakdown = {
    pressure: Math.round(pressureScore * 100) / 100,
    wind: Math.round(windScore * 100) / 100,
    temperature: Math.round(temperatureScore * 100) / 100,
    precipitation: Math.round(precipitationScore * 100) / 100,
    cloudCover: Math.round(cloudScore * 100) / 100,
    timeOfDay: Math.round(timeScore * 100) / 100,
    visibility: Math.round(visibilityScore * 100) / 100,
    sunshine: Math.round(sunshineScore * 100) / 100,
    lightning: Math.round(lightningScore * 100) / 100,
    atmospheric: Math.round(atmosphericScore * 100) / 100,
    comfort: Math.round(comfortScore * 100) / 100,
  }

  // Weights now sum to exactly 1.0 (100%) to prevent scores > 10
  const totalScore =
    pressureScore * 0.18 + // Barometric pressure
    windScore * 0.16 + // Enhanced wind (speed + gusts + direction)
    temperatureScore * 0.14 + // Temperature
    precipitationScore * 0.14 + // Precipitation
    cloudScore * 0.08 + // Cloud cover
    visibilityScore * 0.07 + // Visibility
    sunshineScore * 0.05 + // Sunshine duration
    atmosphericScore * 0.05 + // Atmospheric stability (CAPE)
    lightningScore * 0.05 + // Lightning safety
    comfortScore * 0.04 + // Angler comfort
    timeScore * 0.04 // Time of day
  // Total = 1.00 (100%)

  return {
    total: Math.min(Math.max(Math.round(totalScore * 100) / 100, 0), 10), // Clamp between 0-10
    breakdown,
  }
}

// Core scoring functions
export const calculatePressureScore = (pressure: number): number => {
  // Optimal pressure: 1015-1020 hPa, with smooth falloff
  const optimal = 1017.5
  const deviation = Math.abs(pressure - optimal)

  if (deviation <= 2.5) return 10 // Within 2.5 hPa of optimal
  if (deviation <= 5) return 10 - (deviation - 2.5) * 1.6 // 8.0-10.0
  if (deviation <= 10) return 8 - (deviation - 5) * 1.2 // 2.0-8.0
  if (deviation <= 20) return 2 - (deviation - 10) * 0.1 // 1.0-2.0
  return 1
}

export const calculateTemperatureScore = (temp: number): number => {
  // Optimal temperature: 10-14°C, with smooth falloff
  if (temp >= 10 && temp <= 14) return 10
  if (temp >= 6 && temp < 10) return 6 + (temp - 6) // 6.0-10.0
  if (temp > 14 && temp <= 18) return 10 - (temp - 14) // 6.0-10.0
  if (temp >= 2 && temp < 6) return 2 + (temp - 2) // 2.0-6.0
  if (temp > 18 && temp <= 22) return 6 - (temp - 18) * 1.25 // 1.0-6.0
  if (temp >= -2 && temp < 2) return 1 + (temp + 2) * 0.25 // 1.0-2.0
  if (temp > 22 && temp <= 30) return Math.max(1, 1 - (temp - 22) * 0.1) // 0.2-1.0
  return 0.2 // Extreme temperatures
}

export const calculateCloudScore = (cloudCover: number): number => {
  // Optimal cloud cover: 30-60% (some clouds for shade)
  if (cloudCover >= 30 && cloudCover <= 60) return 10
  if (cloudCover >= 15 && cloudCover < 30) return 6 + (cloudCover - 15) * 0.27 // 6.0-10.0
  if (cloudCover > 60 && cloudCover <= 75) return 10 - (cloudCover - 60) * 0.2 // 7.0-10.0
  if (cloudCover >= 5 && cloudCover < 15) return 3 + (cloudCover - 5) * 0.3 // 3.0-6.0
  if (cloudCover > 75 && cloudCover <= 90) return 7 - (cloudCover - 75) * 0.27 // 3.0-7.0
  if (cloudCover < 5) return 2 + cloudCover * 0.2 // 2.0-3.0
  return 3 - (cloudCover - 90) * 0.2 // 1.0-3.0 for >90%
}

export const calculateTimeScore = (timestamp: number, sunrise: number, sunset: number): number => {
  const date = new Date(timestamp * 1000)
  const hour = date.getHours() + date.getMinutes() / 60 // More precise timing
  const sunriseHour = new Date(sunrise * 1000).getHours() + new Date(sunrise * 1000).getMinutes() / 60
  const sunsetHour = new Date(sunset * 1000).getHours() + new Date(sunset * 1000).getMinutes() / 60

  // Calculate time difference from sunrise and sunset
  const sunriseDiff = Math.abs(hour - sunriseHour)
  const sunsetDiff = Math.abs(hour - sunsetHour)

  // Dawn period (peak: 30 min before to 1 hour after sunrise)
  if (sunriseDiff <= 1.5) {
    if (sunriseDiff <= 0.5) return 10 // Peak dawn
    return 10 - (sunriseDiff - 0.5) * 2 // 8.0-10.0
  }

  // Dusk period (peak: 1 hour before to 30 min after sunset)
  if (sunsetDiff <= 1.5) {
    if (sunsetDiff <= 0.5) return 10 // Peak dusk
    return 10 - (sunsetDiff - 0.5) * 2 // 8.0-10.0
  }

  // Early morning secondary peak
  if (hour >= 6 && hour <= 9) return 5 + (9 - Math.abs(hour - 7.5)) * 0.8 // 5.8-6.6

  // Evening secondary peak
  if (hour >= 17 && hour <= 20) return 5 + (3 - Math.abs(hour - 18.5)) * 0.8 // 5.6-6.6

  // Mid-day (moderate)
  if (hour >= 10 && hour <= 16) return 3 + Math.cos(((hour - 13) * Math.PI) / 6) // 3.0-4.0

  // Night and very early morning (poor)
  if (hour >= 22 || hour <= 5) return 1 + Math.sin((hour * Math.PI) / 12) * 0.5 // 0.5-1.5

  return 2.5 // Transition times
}

export const calculatePrecipitationScoreFromMM = (precipitationMM: number): number => {
  // More continuous precipitation scoring
  if (precipitationMM <= 0.1) return 10 // Essentially no rain
  if (precipitationMM <= 0.5) return 10 - (precipitationMM - 0.1) * 5 // 8.0-10.0
  if (precipitationMM <= 1.0) return 8 - (precipitationMM - 0.5) * 2 // 7.0-8.0
  if (precipitationMM <= 2.5) return 7 - (precipitationMM - 1.0) * 1.33 // 5.0-7.0
  if (precipitationMM <= 5.0) return 5 - (precipitationMM - 2.5) * 1.2 // 2.0-5.0
  if (precipitationMM <= 10.0) return 2 - (precipitationMM - 5.0) * 0.2 // 1.0-2.0
  return Math.max(0.2, 1 - (precipitationMM - 10) * 0.05) // 0.2-1.0
}

// Enhanced scoring functions for Open-Meteo parameters
export const calculateVisibilityScore = (visibility: number): number => {
  // Visibility in meters - crucial for fishing success and safety
  if (visibility >= 10000) return 10 // Excellent visibility (10km+)
  if (visibility >= 5000) return 9 // Very good visibility
  if (visibility >= 2000) return 7 // Good visibility
  if (visibility >= 1000) return 5 // Moderate visibility
  if (visibility >= 500) return 3 // Poor visibility
  return 1 // Very poor visibility
}

export const calculateSunshineScore = (sunshineDuration: number): number => {
  // Sunshine duration in seconds for 15-minute period (900 seconds max)
  const sunshinePercent = (sunshineDuration / 900) * 100

  if (sunshinePercent >= 75) return 10 // Mostly sunny
  if (sunshinePercent >= 50) return 9 // Partly sunny
  if (sunshinePercent >= 25) return 7 // Some sun
  if (sunshinePercent >= 10) return 6 // Little sun
  return 5 // Overcast/cloudy
}

export const calculateLightningScore = (lightningPotential: number): number => {
  // Lightning potential in J/kg - safety critical factor
  if (lightningPotential <= 100) return 10 // Very low risk
  if (lightningPotential <= 500) return 8 // Low risk
  if (lightningPotential <= 1000) return 6 // Moderate risk
  if (lightningPotential <= 2000) return 3 // High risk - caution
  return 1 // Very high risk - dangerous
}

export const calculateAtmosphericStabilityScore = (cape: number): number => {
  // CAPE (Convective Available Potential Energy) in J/kg
  // Lower CAPE = more stable conditions = better fishing
  if (cape <= 500) return 10 // Very stable
  if (cape <= 1000) return 8 // Stable
  if (cape <= 2000) return 6 // Moderately stable
  if (cape <= 3000) return 4 // Unstable
  return 2 // Very unstable
}

export const calculateComfortScore = (
  temp: number,
  apparentTemp: number,
  humidity: number,
  dewPoint: number,
): number => {
  // Comfort index based on multiple factors
  let score = 10

  // Temperature comfort (apparent temperature is more accurate)
  const tempDiff = Math.abs(apparentTemp - 12) // 12°C is comfortable for BC fishing
  if (tempDiff <= 4) score = 10
  else if (tempDiff <= 8) score = 8
  else if (tempDiff <= 12) score = 6
  else if (tempDiff <= 16) score = 4
  else score = 2

  // Humidity comfort (60-70% is ideal)
  if (humidity >= 40 && humidity <= 80) score *= 1.0
  else if (humidity >= 30 && humidity <= 90) score *= 0.9
  else score *= 0.7

  // Dew point comfort (below 15°C is comfortable)
  if (dewPoint <= 10) score *= 1.0
  else if (dewPoint <= 15) score *= 0.9
  else if (dewPoint <= 20) score *= 0.8
  else score *= 0.6

  return Math.min(Math.round(score), 10)
}

export const calculateEnhancedWindScore = (windSpeed: number, windGusts: number, windDirection: number): number => {
  // Base wind speed scoring (m/s) - more continuous scoring
  const effectiveWind = Math.max(windSpeed, windGusts * 0.7) // Weight gusts at 70%

  let score: number
  if (effectiveWind <= 1) score = 10 // Very light winds
  else if (effectiveWind <= 3) score = 10 - (effectiveWind - 1) * 0.5 // 9.0-10.0
  else if (effectiveWind <= 6) score = 9 - (effectiveWind - 3) * 0.67 // 7.0-9.0
  else if (effectiveWind <= 10) score = 7 - (effectiveWind - 6) * 0.5 // 5.0-7.0
  else if (effectiveWind <= 15) score = 5 - (effectiveWind - 10) * 0.4 // 3.0-5.0
  else if (effectiveWind <= 20) score = 3 - (effectiveWind - 15) * 0.3 // 1.5-3.0
  else score = Math.max(0.5, 1.5 - (effectiveWind - 20) * 0.1) // 0.5-1.5

  // Gust penalty - more nuanced
  const gustFactor = windGusts / Math.max(windSpeed, 0.1)
  if (gustFactor > 3) score *= 0.7 // Very gusty
  else if (gustFactor > 2) score *= 0.8 // High gust ratio
  else if (gustFactor > 1.5) score *= 0.9 // Moderate gusts

  // Wind direction bonus (but keep within bounds)
  let directionBonus = 1.0
  if (windDirection >= 45 && windDirection <= 135) directionBonus = 1.05 // Small easterly bonus
  else if (windDirection >= 270 || windDirection <= 45) directionBonus = 0.95 // Slight westerly penalty

  return Math.min(score * directionBonus, 10)
}

export const generateOpenMeteoDailyForecasts = (openMeteoData: ProcessedOpenMeteoData): OpenMeteoDailyForecast[] => {
  const dailyForecasts: OpenMeteoDailyForecast[] = []

  console.log('generateOpenMeteoDailyForecasts - Input data:', {
    minutely15Count: openMeteoData.minutely15.length,
    dailyCount: openMeteoData.daily.length,
    firstMinutely: openMeteoData.minutely15[0]?.time,
    lastMinutely: openMeteoData.minutely15[openMeteoData.minutely15.length - 1]?.time,
  })

  const minutelyByDay: { [key: string]: OpenMeteo15MinData[] } = {}

  openMeteoData.minutely15.forEach(minuteData => {
    const date = new Date(minuteData.timestamp * 1000)
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

    if (!minutelyByDay[dayKey]) {
      minutelyByDay[dayKey] = []
    }
    minutelyByDay[dayKey].push(minuteData)
  })

  const dayKeys = Object.keys(minutelyByDay).sort()

  const maxDays = Math.min(dayKeys.length - 1, 14)
  dayKeys.slice(1, maxDays + 1).forEach((dayKey, index) => {
    const dayIndex = index + 1
    const dayMinutely = minutelyByDay[dayKey]
    const dayData = openMeteoData.daily[dayIndex]

    if (!dayData || !dayMinutely || dayMinutely.length === 0) {
      console.log(`Skipping Open-Meteo day ${dayIndex} - missing data`)
      return
    }

    const sunriseTimestamp = new Date(dayData.sunrise).getTime() / 1000
    const sunsetTimestamp = new Date(dayData.sunset).getTime() / 1000

    console.log(`Processing Open-Meteo day ${dayIndex}:`, {
      dayKey,
      date: dayData.date,
      minutelyCount: dayMinutely.length,
      sunrise: dayData.sunrise,
      sunset: dayData.sunset,
    })

    // Generate 15-minute scores
    const minutelyScores = dayMinutely.map(minuteData => {
      const weather = getWeatherDescription(minuteData.weatherCode)
      return {
        time: minuteData.time,
        timestamp: minuteData.timestamp,
        score: calculateOpenMeteoFishingScore(minuteData, sunriseTimestamp, sunsetTimestamp).total,
        temp: minuteData.temp,
        conditions: weather.description,
        icon: weather.icon,
        windSpeed: minuteData.windSpeed,
        precipitation: minuteData.precipitation,
      }
    })

    // Generate 2-hour forecasts (average every 8 x 15-minute periods)
    const twoHourForecasts: MinutelyForecast[] = []
    for (let i = 0; i < dayMinutely.length; i += 8) {
      // Get 8 consecutive 15-minute periods (2 hours total)
      const segments = dayMinutely.slice(i, i + 8)

      if (segments.length >= 4) {
        // Need at least 4 segments (1 hour) to create a forecast
        const firstSegment = segments[0]
        const lastSegment = segments[segments.length - 1]

        // Calculate averages across all segments
        const avgTemp = segments.reduce((sum, seg) => sum + seg.temp, 0) / segments.length
        const avgHumidity = segments.reduce((sum, seg) => sum + seg.humidity, 0) / segments.length
        const maxPrecipitation = Math.max(...segments.map(seg => seg.precipitation))
        const avgPressure = segments.reduce((sum, seg) => sum + seg.pressure, 0) / segments.length
        const avgCloudCover = segments.reduce((sum, seg) => sum + seg.cloudCover, 0) / segments.length
        const avgWindSpeed = segments.reduce((sum, seg) => sum + seg.windSpeed, 0) / segments.length
        const maxWindGusts = Math.max(...segments.map(seg => seg.windGusts))

        // Use the most common weather code or the first one
        const weatherCode = firstSegment.weatherCode
        const windDirection = firstSegment.windDirection

        // Create averaged data for scoring
        const avgData: OpenMeteo15MinData = {
          time: firstSegment.time,
          timestamp: firstSegment.timestamp,
          temp: avgTemp,
          humidity: avgHumidity,
          dewPoint: segments.reduce((sum, seg) => sum + seg.dewPoint, 0) / segments.length,
          apparentTemp: segments.reduce((sum, seg) => sum + seg.apparentTemp, 0) / segments.length,
          precipitation: maxPrecipitation,
          weatherCode: weatherCode,
          pressure: avgPressure,
          cloudCover: avgCloudCover,
          windSpeed: avgWindSpeed,
          windDirection: windDirection,
          windGusts: maxWindGusts,
          visibility: segments.reduce((sum, seg) => sum + seg.visibility, 0) / segments.length,
          sunshineDuration: segments.reduce((sum, seg) => sum + seg.sunshineDuration, 0),
          lightningPotential: Math.max(...segments.map(seg => seg.lightningPotential)),
          cape: segments.reduce((sum, seg) => sum + seg.cape, 0) / segments.length,
        }

        const score = calculateOpenMeteoFishingScore(avgData, sunriseTimestamp, sunsetTimestamp)
        const weather = getWeatherDescription(avgData.weatherCode)

        twoHourForecasts.push({
          startTime: firstSegment.timestamp,
          endTime: lastSegment.timestamp + 900, // Add 15 minutes to last segment
          score,
          avgTemp: avgData.temp,
          conditions: weather.description,
          icon: weather.icon,
          windSpeed: avgData.windSpeed,
          precipitation: avgData.precipitation,
          pressure: avgData.pressure,
        })
      }
    }

    dailyForecasts.push({
      date: dayData.timestamp,
      dayName: new Date(dayData.timestamp * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
      sunrise: sunriseTimestamp,
      sunset: sunsetTimestamp,
      minutelyScores,
      twoHourForecasts,
    })
  })

  return dailyForecasts
}
