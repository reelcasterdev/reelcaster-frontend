// Open-Meteo API Integration for 15-minute forecasts
// Documentation: https://open-meteo.com/en/docs

export interface OpenMeteoResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  elevation: number
  minutely_15_units: {
    time: string
    temperature_2m: string
    relative_humidity_2m: string
    dew_point_2m: string
    apparent_temperature: string
    precipitation: string
    precipitation_probability: string
    weather_code: string
    surface_pressure: string
    cloud_cover: string
    wind_speed_10m: string
    wind_direction_10m: string
    wind_gusts_10m: string
    visibility: string
    sunshine_duration: string
    lightning_potential: string
    cape: string
  }
  minutely_15: {
    time: string[]
    temperature_2m: number[]
    relative_humidity_2m: number[]
    dew_point_2m: number[]
    apparent_temperature: number[]
    precipitation: number[]
    precipitation_probability: number[]
    weather_code: number[]
    surface_pressure: number[]
    cloud_cover: number[]
    wind_speed_10m: number[]
    wind_direction_10m: number[]
    wind_gusts_10m: number[]
    visibility: number[]
    sunshine_duration: number[]
    lightning_potential: number[]
    cape: number[]
  }
  daily_units: {
    time: string
    sunrise: string
    sunset: string
    temperature_2m_max: string
    temperature_2m_min: string
  }
  daily: {
    time: string[]
    sunrise: string[]
    sunset: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

export interface OpenMeteo15MinData {
  time: string
  timestamp: number
  temp: number
  humidity: number
  dewPoint: number
  apparentTemp: number
  precipitation: number
  precipitationProbability: number
  weatherCode: number
  pressure: number
  cloudCover: number
  windSpeed: number
  windDirection: number
  windGusts: number
  visibility: number
  sunshineDuration: number
  lightningPotential: number
  cape: number
  // Marine data (from Open Meteo Marine API)
  swellHeight?: number           // meters
  swellPeriod?: number           // seconds
  seaSurfaceTemp?: number        // celsius
  waveHeight?: number            // meters
  wavePeriod?: number            // seconds
  oceanCurrentSpeed?: number     // km/h
  oceanCurrentDirection?: number // degrees
}

export interface OpenMeteoDailyData {
  date: string
  timestamp: number
  sunrise: string
  sunset: string
  maxTemp: number
  minTemp: number
}

export interface ProcessedOpenMeteoData {
  minutely15: OpenMeteo15MinData[]
  daily: OpenMeteoDailyData[]
  location: {
    latitude: number
    longitude: number
    elevation: number
    timezone: string
  }
}

// ==================== MARINE API INTERFACES ====================

export interface OpenMeteoMarineResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  hourly_units: {
    time: string
    wave_height: string
    wave_period: string
    wave_direction: string
    wind_wave_height: string
    wind_wave_period: string
    swell_wave_height: string
    swell_wave_period: string
    ocean_current_velocity: string
    ocean_current_direction: string
    sea_surface_temperature: string
  }
  hourly: {
    time: string[]
    wave_height: number[]
    wave_period: number[]
    wave_direction: number[]
    wind_wave_height: number[]
    wind_wave_period: number[]
    swell_wave_height: number[]
    swell_wave_period: number[]
    ocean_current_velocity: number[]
    ocean_current_direction: number[]
    sea_surface_temperature: number[]
  }
}

export interface OpenMeteoMarineData {
  time: string
  timestamp: number
  seaSurfaceTemp: number        // °C
  waveHeight: number            // meters
  wavePeriod: number            // seconds
  waveDirection: number         // degrees
  windWaveHeight: number        // meters (wind-generated)
  windWavePeriod: number        // seconds
  swellHeight: number           // meters (swell component)
  swellPeriod: number           // seconds
  oceanCurrentSpeed: number     // km/h
  oceanCurrentDirection: number // degrees
}

export interface ProcessedMarineData {
  hourly: OpenMeteoMarineData[]
  location: {
    latitude: number
    longitude: number
    timezone: string
  }
}

// Weather code mappings for Open-Meteo
// Reference: https://open-meteo.com/en/docs
export const getWeatherDescription = (code: number): { description: string; icon: string } => {
  const weatherCodes: { [key: number]: { description: string; icon: string } } = {
    0: { description: 'clear sky', icon: '01d' },
    1: { description: 'mainly clear', icon: '02d' },
    2: { description: 'partly cloudy', icon: '03d' },
    3: { description: 'overcast', icon: '04d' },
    45: { description: 'fog', icon: '50d' },
    48: { description: 'depositing rime fog', icon: '50d' },
    51: { description: 'light drizzle', icon: '09d' },
    53: { description: 'moderate drizzle', icon: '09d' },
    55: { description: 'dense drizzle', icon: '09d' },
    56: { description: 'light freezing drizzle', icon: '09d' },
    57: { description: 'dense freezing drizzle', icon: '09d' },
    61: { description: 'slight rain', icon: '10d' },
    63: { description: 'moderate rain', icon: '10d' },
    65: { description: 'heavy rain', icon: '10d' },
    66: { description: 'light freezing rain', icon: '13d' },
    67: { description: 'heavy freezing rain', icon: '13d' },
    71: { description: 'slight snow fall', icon: '13d' },
    73: { description: 'moderate snow fall', icon: '13d' },
    75: { description: 'heavy snow fall', icon: '13d' },
    77: { description: 'snow grains', icon: '13d' },
    80: { description: 'slight rain showers', icon: '09d' },
    81: { description: 'moderate rain showers', icon: '09d' },
    82: { description: 'violent rain showers', icon: '09d' },
    85: { description: 'slight snow showers', icon: '13d' },
    86: { description: 'heavy snow showers', icon: '13d' },
    95: { description: 'thunderstorm', icon: '11d' },
    96: { description: 'thunderstorm with slight hail', icon: '11d' },
    99: { description: 'thunderstorm with heavy hail', icon: '11d' },
  }

  return weatherCodes[code] || { description: 'unknown', icon: '01d' }
}

export const fetchOpenMeteoWeather = async (
  coordinates: { lat: number; lon: number },
  forecast_days: number = 14,
): Promise<{ success: boolean; data?: ProcessedOpenMeteoData; error?: string }> => {
  try {
    // Build Open-Meteo API URL
    const params = new URLSearchParams({
      latitude: coordinates.lat.toString(),
      longitude: coordinates.lon.toString(),
      minutely_15: [
        'temperature_2m',
        'relative_humidity_2m',
        'dew_point_2m',
        'apparent_temperature',
        'precipitation',
        'precipitation_probability',
        'weather_code',
        'surface_pressure',
        'cloud_cover',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'visibility',
        'sunshine_duration',
        'lightning_potential',
        'cape',
      ].join(','),
      daily: ['sunrise', 'sunset', 'temperature_2m_max', 'temperature_2m_min'].join(','),
      forecast_days: forecast_days.toString(),
      timezone: 'auto',
    })

    const url = `https://api.open-meteo.com/v1/forecast?${params}`
    console.log('Open-Meteo API URL:', url)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} - ${response.statusText}`)
    }

    const rawData: OpenMeteoResponse = await response.json()
    console.log('Open-Meteo raw response:', rawData)

    // Process the data into a more usable format
    const processedData: ProcessedOpenMeteoData = {
      minutely15: rawData.minutely_15.time.map((time, index) => ({
        time,
        timestamp: new Date(time).getTime() / 1000, // Convert to Unix timestamp
        temp: rawData.minutely_15.temperature_2m[index],
        humidity: rawData.minutely_15.relative_humidity_2m[index],
        dewPoint: rawData.minutely_15.dew_point_2m[index],
        apparentTemp: rawData.minutely_15.apparent_temperature[index],
        precipitation: rawData.minutely_15.precipitation[index],
        precipitationProbability: rawData.minutely_15.precipitation_probability[index],
        weatherCode: rawData.minutely_15.weather_code[index],
        pressure: rawData.minutely_15.surface_pressure[index],
        cloudCover: rawData.minutely_15.cloud_cover[index],
        windSpeed: rawData.minutely_15.wind_speed_10m[index],
        windDirection: rawData.minutely_15.wind_direction_10m[index],
        windGusts: rawData.minutely_15.wind_gusts_10m[index],
        visibility: rawData.minutely_15.visibility[index],
        sunshineDuration: rawData.minutely_15.sunshine_duration[index],
        lightningPotential: rawData.minutely_15.lightning_potential[index],
        cape: rawData.minutely_15.cape[index],
      })),
      daily: rawData.daily.time.map((date, index) => ({
        date,
        timestamp: new Date(date).getTime() / 1000,
        sunrise: rawData.daily.sunrise[index],
        sunset: rawData.daily.sunset[index],
        maxTemp: rawData.daily.temperature_2m_max[index],
        minTemp: rawData.daily.temperature_2m_min[index],
      })),
      location: {
        latitude: rawData.latitude,
        longitude: rawData.longitude,
        elevation: rawData.elevation,
        timezone: rawData.timezone,
      },
    }

    console.log('Processed Open-Meteo data:', {
      minutely15Count: processedData.minutely15.length,
      dailyCount: processedData.daily.length,
      firstMinutely: processedData.minutely15[0],
      lastMinutely: processedData.minutely15[processedData.minutely15.length - 1],
    })

    return { success: true, data: processedData }
  } catch (err) {
    console.error('Open-Meteo API error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch Open-Meteo weather data',
    }
  }
}

export const fetchOpenMeteoHistoricalWeather = async (
  coordinates: { lat: number; lon: number },
  startDate: string, // Format: YYYY-MM-DD
  endDate: string, // Format: YYYY-MM-DD
): Promise<{ success: boolean; data?: ProcessedOpenMeteoData; error?: string }> => {
  try {
    // Build Open-Meteo Historical API URL
    const params = new URLSearchParams({
      latitude: coordinates.lat.toString(),
      longitude: coordinates.lon.toString(),
      start_date: startDate,
      end_date: endDate,
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'dew_point_2m',
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'surface_pressure',
        'cloud_cover',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'visibility',
        'sunshine_duration',
      ].join(','),
      daily: ['sunrise', 'sunset', 'temperature_2m_max', 'temperature_2m_min'].join(','),
      timezone: 'auto',
    })

    const url = `https://archive-api.open-meteo.com/v1/archive?${params}`
    console.log('Open-Meteo Historical API URL:', url)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Open-Meteo Historical API error: ${response.status} - ${response.statusText}`)
    }

    const rawData: any = await response.json()
    console.log('Open-Meteo historical raw response:', rawData)

    // Convert hourly data to 15-minute intervals (simulate by replicating hourly data)
    const minutely15Data: OpenMeteo15MinData[] = []

    if (rawData.hourly && rawData.hourly.time) {
      rawData.hourly.time.forEach((time: string, index: number) => {
        const baseTimestamp = new Date(time).getTime() / 1000

        // Create 4 x 15-minute entries for each hour (simulated)
        for (let i = 0; i < 4; i++) {
          const timestamp = baseTimestamp + i * 15 * 60 // Add 15 minute intervals
          const timeStr = new Date(timestamp * 1000).toISOString()

          const precip = rawData.hourly.precipitation[index] || 0
          minutely15Data.push({
            time: timeStr,
            timestamp: timestamp,
            temp: rawData.hourly.temperature_2m[index] || 0,
            humidity: rawData.hourly.relative_humidity_2m[index] || 0,
            dewPoint: rawData.hourly.dew_point_2m[index] || 0,
            apparentTemp: rawData.hourly.apparent_temperature[index] || 0,
            precipitation: precip,
            precipitationProbability: precip > 0 ? 100 : 0, // Historical data - estimate from precipitation
            weatherCode: rawData.hourly.weather_code[index] || 0,
            pressure: rawData.hourly.surface_pressure[index] || 1013,
            cloudCover: rawData.hourly.cloud_cover[index] || 0,
            windSpeed: rawData.hourly.wind_speed_10m[index] || 0,
            windDirection: rawData.hourly.wind_direction_10m[index] || 0,
            windGusts: rawData.hourly.wind_gusts_10m[index] || 0,
            visibility: rawData.hourly.visibility[index] || 10000,
            sunshineDuration: rawData.hourly.sunshine_duration[index] || 0,
            lightningPotential: 0, // Not available in historical data
            cape: 0, // Not available in historical data
          })
        }
      })
    }

    // Process the data into the same format as forecast data
    const processedData: ProcessedOpenMeteoData = {
      minutely15: minutely15Data,
      daily:
        rawData.daily?.time?.map((date: string, index: number) => ({
          date,
          timestamp: new Date(date).getTime() / 1000,
          sunrise: rawData.daily.sunrise[index],
          sunset: rawData.daily.sunset[index],
          maxTemp: rawData.daily.temperature_2m_max[index],
          minTemp: rawData.daily.temperature_2m_min[index],
        })) || [],
      location: {
        latitude: rawData.latitude || coordinates.lat,
        longitude: rawData.longitude || coordinates.lon,
        elevation: rawData.elevation || 0,
        timezone: rawData.timezone || 'UTC',
      },
    }

    console.log('Processed Open-Meteo historical data:', {
      minutely15Count: processedData.minutely15.length,
      dailyCount: processedData.daily.length,
      firstMinutely: processedData.minutely15[0],
      lastMinutely: processedData.minutely15[processedData.minutely15.length - 1],
    })

    return { success: true, data: processedData }
  } catch (err) {
    console.error('Open-Meteo Historical API error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch Open-Meteo historical weather data',
    }
  }
}

// ==================== MARINE API ====================

/**
 * Fetch Marine Weather Data from Open-Meteo Marine API
 * Provides sea surface temperature, wave data, and ocean currents
 *
 * @param coordinates - Latitude and longitude
 * @param forecast_days - Number of forecast days (default 7)
 * @returns Processed marine data with hourly resolution
 */
export const fetchOpenMeteoMarine = async (
  coordinates: { lat: number; lon: number },
  forecast_days: number = 7
): Promise<{ success: boolean; data?: ProcessedMarineData; error?: string }> => {
  try {
    // Build Marine API URL
    const params = new URLSearchParams({
      latitude: coordinates.lat.toString(),
      longitude: coordinates.lon.toString(),
      hourly: [
        'wave_height',
        'wave_period',
        'wave_direction',
        'wind_wave_height',
        'wind_wave_period',
        'swell_wave_height',
        'swell_wave_period',
        'ocean_current_velocity',
        'ocean_current_direction',
        'sea_surface_temperature'
      ].join(','),
      forecast_days: forecast_days.toString(),
      timezone: 'auto'
    })

    const url = `https://marine-api.open-meteo.com/v1/marine?${params}`
    console.log('Open-Meteo Marine API URL:', url)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Marine API error: ${response.status} - ${response.statusText}`)
    }

    const rawData: OpenMeteoMarineResponse = await response.json()
    console.log('Open-Meteo Marine raw response:', {
      latitude: rawData.latitude,
      longitude: rawData.longitude,
      hourlyCount: rawData.hourly.time.length,
      firstTime: rawData.hourly.time[0],
      lastTime: rawData.hourly.time[rawData.hourly.time.length - 1]
    })

    // Process marine data
    const processedData: ProcessedMarineData = {
      hourly: rawData.hourly.time.map((time, index) => ({
        time,
        timestamp: new Date(time).getTime() / 1000,
        seaSurfaceTemp: rawData.hourly.sea_surface_temperature[index] ?? 10,
        waveHeight: rawData.hourly.wave_height[index] ?? 0,
        wavePeriod: rawData.hourly.wave_period[index] ?? 0,
        waveDirection: rawData.hourly.wave_direction[index] ?? 0,
        windWaveHeight: rawData.hourly.wind_wave_height[index] ?? 0,
        windWavePeriod: rawData.hourly.wind_wave_period[index] ?? 0,
        swellHeight: rawData.hourly.swell_wave_height[index] ?? 0,
        swellPeriod: rawData.hourly.swell_wave_period[index] ?? 0,
        oceanCurrentSpeed: rawData.hourly.ocean_current_velocity[index] ?? 0,
        oceanCurrentDirection: rawData.hourly.ocean_current_direction[index] ?? 0
      })),
      location: {
        latitude: rawData.latitude,
        longitude: rawData.longitude,
        timezone: rawData.timezone
      }
    }

    console.log('Processed Marine data:', {
      hourlyCount: processedData.hourly.length,
      firstEntry: processedData.hourly[0],
      sampleSST: processedData.hourly[0]?.seaSurfaceTemp
    })

    return { success: true, data: processedData }
  } catch (err) {
    console.error('Open-Meteo Marine API error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch Marine weather data'
    }
  }
}

/**
 * Merge marine data into weather data
 * Marine data is hourly, weather data is 15-min
 * We interpolate marine data to match weather timestamps
 */
export function mergeMarineData(
  weatherData: OpenMeteo15MinData[],
  marineData: OpenMeteoMarineData[]
): OpenMeteo15MinData[] {
  if (!marineData || marineData.length === 0) {
    return weatherData
  }

  return weatherData.map(weather => {
    // Find closest marine data point (within 1 hour)
    const closestMarine = marineData.reduce((closest, marine) => {
      const timeDiff = Math.abs(marine.timestamp - weather.timestamp)
      const closestDiff = Math.abs(closest.timestamp - weather.timestamp)
      return timeDiff < closestDiff ? marine : closest
    }, marineData[0])

    // Only merge if within 1 hour (3600 seconds)
    const timeDiff = Math.abs(closestMarine.timestamp - weather.timestamp)
    if (timeDiff > 3600) {
      return weather // Too far apart, don't merge
    }

    // Merge marine data into weather
    return {
      ...weather,
      seaSurfaceTemp: closestMarine.seaSurfaceTemp,
      waveHeight: closestMarine.waveHeight,
      wavePeriod: closestMarine.wavePeriod,
      swellHeight: closestMarine.swellHeight,
      swellPeriod: closestMarine.swellPeriod,
      oceanCurrentSpeed: closestMarine.oceanCurrentSpeed,
      oceanCurrentDirection: closestMarine.oceanCurrentDirection
    }
  })
}
