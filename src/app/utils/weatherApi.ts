import { WeatherData } from './fishingCalculations'

const API_KEY = '1565c47832c3e676cffcf69c11d578bb'

export const fetchWeatherData = async (coordinates: {
  lat: number
  lon: number
}): Promise<{ success: boolean; data?: WeatherData; error?: string }> => {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${coordinates.lat}&lon=${coordinates.lon}&exclude=minutely&units=metric&appid=${API_KEY}`,
    )

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`)
    }

    const data = await response.json()

    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch weather data',
    }
  }
}
