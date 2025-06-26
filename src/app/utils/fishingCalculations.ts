export interface FishingScore {
  total: number
  breakdown: {
    pressure: number
    wind: number
    temperature: number
    precipitation: number
    cloudCover: number
    timeOfDay: number
  }
}

export interface WeatherData {
  current: {
    temp: number
    pressure: number
    humidity: number
    wind_speed: number
    wind_deg: number
    clouds: number
    weather: Array<{
      main: string
      description: string
      icon: string
    }>
  }
  hourly: Array<{
    dt: number
    temp: number
    pressure: number
    humidity: number
    wind_speed: number
    wind_deg: number
    clouds: number
    pop: number
    weather: Array<{
      main: string
      description: string
      icon: string
    }>
  }>
  daily: Array<{
    dt: number
    temp: {
      min: number
      max: number
    }
    pressure: number
    humidity: number
    wind_speed: number
    wind_deg: number
    clouds: number
    pop: number
    weather: Array<{
      main: string
      description: string
      icon: string
    }>
    sunrise: number
    sunset: number
  }>
}

export const calculateFishingScore = (tomorrowWeather: WeatherData['daily'][0]): FishingScore => {
  // Barometric Pressure Score (Weight: 25%)
  const pressureScore = calculatePressureScore(tomorrowWeather.pressure)

  // Wind Score (Weight: 20%)
  const windScore = calculateWindScore(tomorrowWeather.wind_speed, tomorrowWeather.wind_deg)

  // Temperature Score (Weight: 20%)
  const temperatureScore = calculateTemperatureScore(tomorrowWeather.temp.max, tomorrowWeather.temp.min)

  // Precipitation Score (Weight: 15%)
  const precipitationScore = calculatePrecipitationScore(tomorrowWeather.pop)

  // Cloud Cover Score (Weight: 10%)
  const cloudScore = calculateCloudScore(tomorrowWeather.clouds)

  // Time of Day Score (Weight: 10%) - Using sunrise/sunset for optimal times
  const timeScore = calculateTimeScore(tomorrowWeather.sunrise, tomorrowWeather.sunset)

  const breakdown = {
    pressure: Math.round(pressureScore * 100) / 100,
    wind: Math.round(windScore * 100) / 100,
    temperature: Math.round(temperatureScore * 100) / 100,
    precipitation: Math.round(precipitationScore * 100) / 100,
    cloudCover: Math.round(cloudScore * 100) / 100,
    timeOfDay: Math.round(timeScore * 100) / 100,
  }

  const totalScore =
    pressureScore * 0.25 +
    windScore * 0.2 +
    temperatureScore * 0.2 +
    precipitationScore * 0.15 +
    cloudScore * 0.1 +
    timeScore * 0.1

  return {
    total: Math.round(totalScore * 100) / 100,
    breakdown,
  }
}

export const calculatePressureScore = (pressure: number): number => {
  // Convert hPa to score (optimal: 1013-1023 hPa)
  if (pressure >= 1013 && pressure <= 1023) return 10
  if (pressure >= 1008 && pressure <= 1028) return 8
  if (pressure >= 1003 && pressure <= 1033) return 6
  if (pressure >= 998 && pressure <= 1038) return 4
  return 2
}

export const calculateWindScore = (windSpeed: number, windDirection: number): number => {
  let score = 10

  // Wind speed scoring (m/s)
  if (windSpeed <= 2) score = 10 // Light winds ideal
  else if (windSpeed <= 5) score = 9
  else if (windSpeed <= 8) score = 7
  else if (windSpeed <= 12) score = 5
  else if (windSpeed <= 15) score = 3
  else score = 1 // Too windy

  // Slight preference for offshore winds (simplified)
  if (windDirection >= 45 && windDirection <= 135) score *= 1.1 // Easterly winds (offshore for west coast)

  return Math.min(score, 10)
}

export const calculateTemperatureScore = (maxTemp: number, minTemp: number): number => {
  const avgTemp = (maxTemp + minTemp) / 2

  // Optimal temperature range for BC fishing (5-20°C)
  if (avgTemp >= 8 && avgTemp <= 16) return 10
  if (avgTemp >= 5 && avgTemp <= 20) return 8
  if (avgTemp >= 2 && avgTemp <= 25) return 6
  if (avgTemp >= 0 && avgTemp <= 30) return 4
  return 2
}

export const calculatePrecipitationScore = (pop: number): number => {
  // Probability of precipitation (0-1)
  const popPercent = pop * 100

  if (popPercent <= 10) return 10 // Clear
  if (popPercent <= 25) return 8 // Light chance
  if (popPercent <= 50) return 6 // Moderate chance
  if (popPercent <= 75) return 4 // High chance
  return 2 // Very high chance
}

export const calculateCloudScore = (cloudCover: number): number => {
  // Cloud cover percentage
  if (cloudCover <= 25) return 8 // Clear to partly cloudy is good
  if (cloudCover <= 50) return 10 // Partly cloudy is ideal
  if (cloudCover <= 75) return 7 // Mostly cloudy
  return 5 // Overcast
}

export const calculateTimeScore = (sunrise: number, sunset: number): number => {
  // This is a base score for having good dawn/dusk times
  // In a real implementation, you'd calculate based on current time
  const daylightHours = (sunset - sunrise) / 3600

  if (daylightHours >= 8 && daylightHours <= 16) return 10
  if (daylightHours >= 6 && daylightHours <= 18) return 8
  return 6
}

export interface HourlyForecast {
  startTime: number
  endTime: number
  score: FishingScore
  avgTemp: number
  conditions: string
  icon: string
  windSpeed: number
  pop: number
}

export const calculateHourlyTemperatureScore = (temp: number): number => {
  // Optimal temperature range for BC fishing (5-20°C)
  if (temp >= 8 && temp <= 16) return 10
  if (temp >= 5 && temp <= 20) return 8
  if (temp >= 2 && temp <= 25) return 6
  if (temp >= 0 && temp <= 30) return 4
  return 2
}

export const calculateHourlyTimeScore = (timestamp: number, sunrise: number, sunset: number): number => {
  const hour = new Date(timestamp * 1000).getHours()
  const sunriseHour = new Date(sunrise * 1000).getHours()
  const sunsetHour = new Date(sunset * 1000).getHours()

  // Dawn period (1.5 hours around sunrise)
  if (Math.abs(hour - sunriseHour) <= 1.5) return 10

  // Dusk period (1.5 hours around sunset)
  if (Math.abs(hour - sunsetHour) <= 1.5) return 10

  // Early morning (5-8 AM)
  if (hour >= 5 && hour <= 8) return 8

  // Evening (6-9 PM)
  if (hour >= 18 && hour <= 21) return 8

  // Mid-day (decent but not optimal)
  if (hour >= 10 && hour <= 16) return 6

  // Night (poor fishing times)
  if (hour >= 22 || hour <= 4) return 3

  return 5 // Default for other times
}

export const calculateHourlyFishingScore = (
  hourlyWeather: WeatherData['hourly'][0],
  sunrise: number,
  sunset: number,
): FishingScore => {
  // Barometric Pressure Score (Weight: 25%)
  const pressureScore = calculatePressureScore(hourlyWeather.pressure)

  // Wind Score (Weight: 20%)
  const windScore = calculateWindScore(hourlyWeather.wind_speed, hourlyWeather.wind_deg)

  // Temperature Score (Weight: 20%)
  const temperatureScore = calculateHourlyTemperatureScore(hourlyWeather.temp)

  // Precipitation Score (Weight: 15%)
  const precipitationScore = calculatePrecipitationScore(hourlyWeather.pop)

  // Cloud Cover Score (Weight: 10%)
  const cloudScore = calculateCloudScore(hourlyWeather.clouds)

  // Time of Day Score (Weight: 10%) - Using actual hour vs sunrise/sunset
  const timeScore = calculateHourlyTimeScore(hourlyWeather.dt, sunrise, sunset)

  const breakdown = {
    pressure: Math.round(pressureScore * 100) / 100,
    wind: Math.round(windScore * 100) / 100,
    temperature: Math.round(temperatureScore * 100) / 100,
    precipitation: Math.round(precipitationScore * 100) / 100,
    cloudCover: Math.round(cloudScore * 100) / 100,
    timeOfDay: Math.round(timeScore * 100) / 100,
  }

  const totalScore =
    pressureScore * 0.25 +
    windScore * 0.2 +
    temperatureScore * 0.2 +
    precipitationScore * 0.15 +
    cloudScore * 0.1 +
    timeScore * 0.1

  return {
    total: Math.round(totalScore * 100) / 100,
    breakdown,
  }
}

export interface DailyForecastData {
  date: number
  dayName: string
  sunrise: number
  sunset: number
  hourlyScores: Array<{
    hour: number
    timestamp: number
    score: number
    temp: number
    conditions: string
    icon: string
    windSpeed: number
    pop: number
  }>
  twoHourForecasts: HourlyForecast[]
}

export const generateDailyForecasts = (weatherData: WeatherData): DailyForecastData[] => {
  const dailyForecasts: DailyForecastData[] = []

  console.log('generateDailyForecasts - Input data:', {
    dailyLength: weatherData.daily?.length,
    hourlyLength: weatherData.hourly?.length,
    firstHourly: weatherData.hourly?.[0] ? new Date(weatherData.hourly[0].dt * 1000).toISOString() : 'none',
    lastHourly: weatherData.hourly?.[weatherData.hourly.length - 1]
      ? new Date(weatherData.hourly[weatherData.hourly.length - 1].dt * 1000).toISOString()
      : 'none',
  })

  // Group hourly data by day (using the 48-hour sliding window)
  const hourlyByDay: { [key: string]: typeof weatherData.hourly } = {}

  weatherData.hourly.forEach(hour => {
    const hourDate = new Date(hour.dt * 1000)
    const dayKey = `${hourDate.getFullYear()}-${hourDate.getMonth()}-${hourDate.getDate()}`

    if (!hourlyByDay[dayKey]) {
      hourlyByDay[dayKey] = []
    }
    hourlyByDay[dayKey].push(hour)
  })

  const dayKeys = Object.keys(hourlyByDay).sort()
  console.log(
    'Hourly data grouped by days:',
    dayKeys.map(key => ({
      day: key,
      count: hourlyByDay[key].length,
      firstHour: new Date(hourlyByDay[key][0].dt * 1000).toISOString(),
      lastHour: new Date(hourlyByDay[key][hourlyByDay[key].length - 1].dt * 1000).toISOString(),
    })),
  )

  // Process each day that has hourly data (skip today, start from tomorrow)
  dayKeys.slice(1, 3).forEach((dayKey, index) => {
    const dayIndex = index + 1
    const dayHourly = hourlyByDay[dayKey]
    const dayData = weatherData.daily[dayIndex]

    if (!dayData || !dayHourly || dayHourly.length === 0) {
      console.log(`Skipping day ${dayIndex} - missing data`)
      return
    }

    console.log(`Processing day ${dayIndex}:`, {
      dayKey,
      date: new Date(dayData.dt * 1000).toLocaleDateString(),
      hourlyCount: dayHourly.length,
      firstHour: new Date(dayHourly[0].dt * 1000).toISOString(),
      lastHour: new Date(dayHourly[dayHourly.length - 1].dt * 1000).toISOString(),
    })

    // Generate hourly scores for bar chart
    const hourlyScores = dayHourly.map(hour => ({
      hour: new Date(hour.dt * 1000).getHours(),
      timestamp: hour.dt,
      score: calculateHourlyFishingScore(hour, dayData.sunrise, dayData.sunset).total,
      temp: hour.temp,
      conditions: hour.weather[0].description,
      icon: hour.weather[0].icon,
      windSpeed: hour.wind_speed,
      pop: hour.pop,
    }))

    // Generate 2-hour forecasts
    const twoHourForecasts: HourlyForecast[] = []
    for (let i = 0; i < dayHourly.length; i += 2) {
      if (i + 1 < dayHourly.length) {
        const hour1 = dayHourly[i]
        const hour2 = dayHourly[i + 1]

        // Average the conditions for the 2-hour block
        const avgWeather = {
          dt: hour1.dt,
          temp: (hour1.temp + hour2.temp) / 2,
          pressure: (hour1.pressure + hour2.pressure) / 2,
          humidity: (hour1.humidity + hour2.humidity) / 2,
          wind_speed: (hour1.wind_speed + hour2.wind_speed) / 2,
          wind_deg: hour1.wind_deg,
          clouds: (hour1.clouds + hour2.clouds) / 2,
          pop: Math.max(hour1.pop, hour2.pop),
          weather: hour1.weather,
        }

        const score = calculateHourlyFishingScore(avgWeather, dayData.sunrise, dayData.sunset)

        twoHourForecasts.push({
          startTime: hour1.dt,
          endTime: hour2.dt + 3600,
          score,
          avgTemp: avgWeather.temp,
          conditions: avgWeather.weather[0].description,
          icon: avgWeather.weather[0].icon,
          windSpeed: avgWeather.wind_speed,
          pop: avgWeather.pop,
        })
      }
    }

    dailyForecasts.push({
      date: dayData.dt,
      dayName: new Date(dayData.dt * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
      sunrise: dayData.sunrise,
      sunset: dayData.sunset,
      hourlyScores,
      twoHourForecasts,
    })
  })

  return dailyForecasts
}

export const generate2HourForecasts = (weatherData: WeatherData): HourlyForecast[] => {
  const forecasts: HourlyForecast[] = []
  const tomorrow = weatherData.daily[1]

  // Filter hourly data for tomorrow (next 24 hours starting from tomorrow)
  const tomorrowStart = tomorrow.dt
  const tomorrowEnd = tomorrowStart + 24 * 3600

  const tomorrowHourly = weatherData.hourly.filter(hour => hour.dt >= tomorrowStart && hour.dt < tomorrowEnd)

  // Group into 2-hour blocks
  for (let i = 0; i < tomorrowHourly.length; i += 2) {
    if (i + 1 < tomorrowHourly.length) {
      const hour1 = tomorrowHourly[i]
      const hour2 = tomorrowHourly[i + 1]

      // Average the conditions for the 2-hour block
      const avgWeather = {
        dt: hour1.dt,
        temp: (hour1.temp + hour2.temp) / 2,
        pressure: (hour1.pressure + hour2.pressure) / 2,
        humidity: (hour1.humidity + hour2.humidity) / 2,
        wind_speed: (hour1.wind_speed + hour2.wind_speed) / 2,
        wind_deg: hour1.wind_deg, // Use first hour's direction
        clouds: (hour1.clouds + hour2.clouds) / 2,
        pop: Math.max(hour1.pop, hour2.pop), // Use higher precipitation chance
        weather: hour1.weather, // Use first hour's weather description
      }

      const score = calculateHourlyFishingScore(avgWeather, tomorrow.sunrise, tomorrow.sunset)

      forecasts.push({
        startTime: hour1.dt,
        endTime: hour2.dt + 3600, // Add 1 hour to get end time
        score,
        avgTemp: avgWeather.temp,
        conditions: avgWeather.weather[0].description,
        icon: avgWeather.weather[0].icon,
        windSpeed: avgWeather.wind_speed,
        pop: avgWeather.pop,
      })
    }
  }

  return forecasts
}
