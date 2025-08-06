import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Import the same interfaces from frontend
interface OpenMeteo15MinData {
  time: string
  timestamp: number
  temp: number
  humidity: number
  dewPoint: number
  apparentTemp: number
  precipitation: number
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
}

interface ProcessedOpenMeteoData {
  minutely15: OpenMeteo15MinData[]
  daily: any[]
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lat, lon, species } = await req.json()

    if (!lat || !lon) {
      throw new Error('Latitude and longitude are required')
    }

    // Fetch weather data from Open-Meteo
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&minutely_15=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,weather_code,pressure_msl,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,sunshine_duration,lightning_potential,cape&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&timezone=auto`

    const weatherResponse = await fetch(openMeteoUrl)
    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data')
    }

    const weatherData = await weatherResponse.json()

    // Process the data similar to frontend
    const processedData = processOpenMeteoData(weatherData)
    
    // Generate forecasts using the same algorithm
    const forecasts = generateOpenMeteoDailyForecasts(processedData, null, species)

    return new Response(
      JSON.stringify({ 
        forecasts,
        location: { lat, lon },
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Process Open-Meteo data (simplified version of frontend processing)
function processOpenMeteoData(data: any): ProcessedOpenMeteoData {
  const minutely15: OpenMeteo15MinData[] = []
  
  if (data.minutely_15?.time) {
    for (let i = 0; i < data.minutely_15.time.length; i++) {
      minutely15.push({
        time: data.minutely_15.time[i],
        timestamp: new Date(data.minutely_15.time[i]).getTime() / 1000,
        temp: data.minutely_15.temperature_2m[i],
        humidity: data.minutely_15.relative_humidity_2m[i],
        dewPoint: data.minutely_15.dew_point_2m[i],
        apparentTemp: data.minutely_15.apparent_temperature[i],
        precipitation: data.minutely_15.precipitation[i],
        weatherCode: data.minutely_15.weather_code[i],
        pressure: data.minutely_15.pressure_msl[i],
        cloudCover: data.minutely_15.cloud_cover[i],
        windSpeed: data.minutely_15.wind_speed_10m[i],
        windDirection: data.minutely_15.wind_direction_10m[i],
        windGusts: data.minutely_15.wind_gusts_10m[i],
        visibility: data.minutely_15.visibility[i],
        sunshineDuration: data.minutely_15.sunshine_duration[i] || 0,
        lightningPotential: data.minutely_15.lightning_potential[i] || 0,
        cape: data.minutely_15.cape[i] || 0,
      })
    }
  }

  const daily = []
  if (data.daily?.time) {
    for (let i = 0; i < data.daily.time.length; i++) {
      daily.push({
        date: data.daily.time[i],
        timestamp: new Date(data.daily.time[i]).getTime() / 1000,
        sunrise: data.daily.sunrise[i],
        sunset: data.daily.sunset[i],
        weatherCode: data.daily.weather_code[i],
        tempMax: data.daily.temperature_2m_max[i],
        tempMin: data.daily.temperature_2m_min[i],
      })
    }
  }

  return { minutely15, daily }
}

// Simplified version of the fishing score calculation
function calculateOpenMeteoFishingScore(
  minuteData: OpenMeteo15MinData,
  sunrise: number,
  sunset: number
): { total: number } {
  // Simplified scoring based on key factors
  let score = 5.0 // Base score
  
  // Temperature score (optimal: 10-16°C)
  const tempScore = minuteData.temp >= 10 && minuteData.temp <= 16 ? 2 : 
                    minuteData.temp >= 8 && minuteData.temp <= 18 ? 1 : 0
  
  // Wind score (lower is better)
  const windScore = minuteData.windSpeed < 10 ? 2 : 
                    minuteData.windSpeed < 20 ? 1 : 0
  
  // Pressure score (stable pressure is better)
  const pressureScore = minuteData.pressure >= 1010 && minuteData.pressure <= 1020 ? 1 : 0
  
  // Time of day bonus (dawn/dusk)
  const timeBonus = isNearSunEvent(minuteData.timestamp, sunrise, sunset) ? 1 : 0
  
  score = Math.min(10, score + tempScore + windScore + pressureScore + timeBonus)
  
  return { total: score }
}

function isNearSunEvent(timestamp: number, sunrise: number, sunset: number): boolean {
  const hourInSeconds = 3600
  return Math.abs(timestamp - sunrise) <= 2 * hourInSeconds || 
         Math.abs(timestamp - sunset) <= 2 * hourInSeconds
}

// Generate daily forecasts (simplified version)
function generateOpenMeteoDailyForecasts(
  data: ProcessedOpenMeteoData,
  tideData: any,
  species: string | null
): any[] {
  const dailyForecasts = []
  
  // Group minutely data by day
  const minutelyByDay: { [key: string]: OpenMeteo15MinData[] } = {}
  
  data.minutely15.forEach(minuteData => {
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
    const dayData = data.daily[dayIndex]
    
    if (!dayData || !dayMinutely || dayMinutely.length === 0) return
    
    const sunriseTimestamp = new Date(dayData.sunrise).getTime() / 1000
    const sunsetTimestamp = new Date(dayData.sunset).getTime() / 1000
    
    // Generate 15-minute scores
    const minutelyScores = dayMinutely.map(minuteData => ({
      time: minuteData.time,
      timestamp: minuteData.timestamp,
      score: calculateOpenMeteoFishingScore(minuteData, sunriseTimestamp, sunsetTimestamp).total,
      temp: minuteData.temp,
      conditions: getWeatherDescription(minuteData.weatherCode),
      windSpeed: minuteData.windSpeed,
      precipitation: minuteData.precipitation,
    }))
    
    // Generate 2-hour forecasts
    const twoHourForecasts = []
    for (let i = 0; i < dayMinutely.length; i += 8) {
      const segments = dayMinutely.slice(i, i + 8)
      
      if (segments.length >= 4) {
        const firstSegment = segments[0]
        const lastSegment = segments[segments.length - 1]
        
        // Calculate averages
        const avgTemp = segments.reduce((sum, seg) => sum + seg.temp, 0) / segments.length
        const avgScore = segments.reduce((sum, seg) => 
          calculateOpenMeteoFishingScore(seg, sunriseTimestamp, sunsetTimestamp).total, 0
        ) / segments.length
        
        twoHourForecasts.push({
          startTime: firstSegment.timestamp,
          endTime: lastSegment.timestamp + 900,
          score: { total: avgScore },
          avgTemp: avgTemp,
          conditions: getWeatherDescription(firstSegment.weatherCode),
          windSpeed: segments.reduce((sum, seg) => sum + seg.windSpeed, 0) / segments.length,
          precipitation: Math.max(...segments.map(seg => seg.precipitation)),
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

function getWeatherDescription(code: number): string {
  const weatherCodes: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    95: 'Thunderstorm',
  }
  
  return weatherCodes[code] || 'Unknown'
}