'use client'

import { useState, useEffect } from 'react'

interface WeatherData {
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

interface ForecastProps {
  location: string
  hotspot: string
  species?: string
  coordinates: { lat: number; lon: number }
  onBack: () => void
}

interface FishingScore {
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

interface LoadingStep {
  id: string
  title: string
  description: string
  status: 'waiting' | 'loading' | 'completed' | 'error'
  duration?: number
}

export default function FishingForecast({ location, hotspot, species, coordinates, onBack }: ForecastProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fishingScore, setFishingScore] = useState<FishingScore | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [showResults, setShowResults] = useState(false)

  const API_KEY = '1565c47832c3e676cffcf69c11d578bb'

  const loadingSteps: LoadingStep[] = [
    {
      id: 'location',
      title: 'Analyzing Location',
      description: `Getting coordinates for ${hotspot}, ${location}`,
      status: 'waiting',
      duration: 800,
    },
    {
      id: 'weather',
      title: 'Fetching Weather Data',
      description: 'Connecting to OpenWeatherMap API...',
      status: 'waiting',
      duration: 1500,
    },
    {
      id: 'marine',
      title: 'Processing Marine Conditions',
      description: 'Analyzing wind, pressure, and tide data',
      status: 'waiting',
      duration: 1200,
    },
    {
      id: 'algorithm',
      title: 'Running Fishing Algorithm',
      description: 'Calculating optimal fishing conditions',
      status: 'waiting',
      duration: 1000,
    },
    {
      id: 'score',
      title: 'Generating Score',
      description: 'Finalizing your fishing forecast',
      status: 'waiting',
      duration: 800,
    },
  ]

  const [steps, setSteps] = useState<LoadingStep[]>(loadingSteps)

  useEffect(() => {
    startProgressiveLoading()
  }, [coordinates])

  const startProgressiveLoading = async () => {
    setLoading(true)
    setError(null)
    setCurrentStep(0)
    setShowResults(false)

    // Step 1: Analyzing Location
    await executeStep(0)

    // Step 2: Fetching Weather Data
    await executeStep(1)
    const weatherResult = await fetchWeatherData()

    console.log({ weatherResult })

    if (!weatherResult.success) {
      setError(weatherResult.error || 'Failed to fetch weather data')
      updateStepStatus(1, 'error')
      setLoading(false)
      return
    }

    // Step 3: Processing Marine Conditions
    await executeStep(2)

    // Step 4: Running Algorithm
    await executeStep(3)
    if (weatherResult.data?.daily && weatherResult.data.daily.length > 1) {
      const tomorrowData = weatherResult.data.daily[1]
      const score = calculateFishingScore(tomorrowData)
      setFishingScore(score)
    }

    // Step 5: Generating Score
    await executeStep(4)

    // Show results
    setLoading(false)
    await new Promise(resolve => setTimeout(resolve, 500))
    setShowResults(true)
  }

  const executeStep = async (stepIndex: number) => {
    setCurrentStep(stepIndex)
    updateStepStatus(stepIndex, 'loading')

    const step = steps[stepIndex]
    await new Promise(resolve => setTimeout(resolve, step.duration || 1000))

    updateStepStatus(stepIndex, 'completed')
  }

  const updateStepStatus = (stepIndex: number, status: LoadingStep['status']) => {
    setSteps(prev => prev.map((step, index) => (index === stepIndex ? { ...step, status } : step)))
  }

  const fetchWeatherData = async (): Promise<{ success: boolean; data?: WeatherData; error?: string }> => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${coordinates.lat}&lon=${coordinates.lon}&exclude=minutely,hourly,alerts&units=metric&appid=${API_KEY}`,
      )

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`)
      }

      const data = await response.json()
      setWeatherData(data)

      return { success: true, data }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch weather data',
      }
    }
  }

  const calculateFishingScore = (tomorrowWeather: WeatherData['daily'][0]): FishingScore => {
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

  const calculatePressureScore = (pressure: number): number => {
    // Convert hPa to score (optimal: 1013-1023 hPa)
    if (pressure >= 1013 && pressure <= 1023) return 10
    if (pressure >= 1008 && pressure <= 1028) return 8
    if (pressure >= 1003 && pressure <= 1033) return 6
    if (pressure >= 998 && pressure <= 1038) return 4
    return 2
  }

  const calculateWindScore = (windSpeed: number, windDirection: number): number => {
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

  const calculateTemperatureScore = (maxTemp: number, minTemp: number): number => {
    const avgTemp = (maxTemp + minTemp) / 2

    // Optimal temperature range for BC fishing (5-20°C)
    if (avgTemp >= 8 && avgTemp <= 16) return 10
    if (avgTemp >= 5 && avgTemp <= 20) return 8
    if (avgTemp >= 2 && avgTemp <= 25) return 6
    if (avgTemp >= 0 && avgTemp <= 30) return 4
    return 2
  }

  const calculatePrecipitationScore = (pop: number): number => {
    // Probability of precipitation (0-1)
    const popPercent = pop * 100

    if (popPercent <= 10) return 10 // Clear
    if (popPercent <= 25) return 8 // Light chance
    if (popPercent <= 50) return 6 // Moderate chance
    if (popPercent <= 75) return 4 // High chance
    return 2 // Very high chance
  }

  const calculateCloudScore = (cloudCover: number): number => {
    // Cloud cover percentage
    if (cloudCover <= 25) return 8 // Clear to partly cloudy is good
    if (cloudCover <= 50) return 10 // Partly cloudy is ideal
    if (cloudCover <= 75) return 7 // Mostly cloudy
    return 5 // Overcast
  }

  const calculateTimeScore = (sunrise: number, sunset: number): number => {
    // This is a base score for having good dawn/dusk times
    // In a real implementation, you'd calculate based on current time
    const daylightHours = (sunset - sunrise) / 3600

    if (daylightHours >= 8 && daylightHours <= 16) return 10
    if (daylightHours >= 6 && daylightHours <= 18) return 8
    return 6
  }

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-yellow-400'
    if (score >= 4) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 8.5) return 'Excellent'
    if (score >= 7) return 'Very Good'
    if (score >= 5.5) return 'Good'
    if (score >= 4) return 'Fair'
    if (score >= 2.5) return 'Poor'
    return 'Very Poor'
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Progressive Loading UI
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Location Selection
            </button>

            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-gray-300 to-gray-400 bg-clip-text text-transparent mb-2">
              Generating Fishing Forecast
            </h1>
            <p className="text-gray-300 text-xl">
              {hotspot}, {location}
              {species && <span className="text-gray-400"> • Target: {species}</span>}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4">
                  {/* Step Icon */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      step.status === 'completed'
                        ? 'bg-green-500 border-green-500'
                        : step.status === 'loading'
                        ? 'bg-blue-500 border-blue-500 animate-pulse'
                        : step.status === 'error'
                        ? 'bg-red-500 border-red-500'
                        : 'bg-gray-700 border-gray-600'
                    }`}
                  >
                    {step.status === 'completed' ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : step.status === 'loading' ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : step.status === 'error' ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <span className="text-gray-400 font-bold">{index + 1}</span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-semibold transition-colors ${
                        step.status === 'completed'
                          ? 'text-green-400'
                          : step.status === 'loading'
                          ? 'text-blue-400'
                          : step.status === 'error'
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-gray-300 text-sm">{step.description}</p>
                  </div>

                  {/* Progress Animation */}
                  {step.status === 'loading' && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Overall Progress Bar */}
            <div className="mt-8">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Progress</span>
                <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-400 text-xl mb-4">Error: {error}</p>
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Results Display (existing code continues...)
  const tomorrowWeather = weatherData?.daily[1]

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Location Selection
          </button>

          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-gray-300 to-gray-400 bg-clip-text text-transparent mb-2">
            Fishing Forecast
          </h1>
          <p className="text-gray-300 text-xl">
            {hotspot}, {location}
            {species && <span className="text-gray-400"> • Target: {species}</span>}
          </p>
        </div>

        {/* Score Reveal Animation */}
        {fishingScore && showResults && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-600 p-8 text-center animate-fadeIn">
              <h2 className="text-3xl font-bold text-white mb-4">Tomorrow&apos;s Fishing Score</h2>
              <div className={`text-8xl font-bold mb-4 animate-bounce ${getScoreColor(fishingScore.total)}`}>
                {fishingScore.total}
              </div>
              <div className="text-gray-400 text-xl mb-2">out of 10.00</div>
              <div className={`text-2xl font-semibold ${getScoreColor(fishingScore.total)}`}>
                {getScoreLabel(fishingScore.total)}
              </div>
            </div>
          </div>
        )}

        {tomorrowWeather && showResults && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Score Breakdown */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Score Breakdown</h2>

                {fishingScore && (
                  <div className="space-y-4">
                    {Object.entries(fishingScore.breakdown).map(([factor, score], index) => (
                      <div
                        key={factor}
                        className="flex justify-between items-center animate-slideInLeft"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <span className="text-gray-300 capitalize">{factor.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className={`font-semibold ${getScoreColor(score)}`}>{score}/10</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Weather Details */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Weather Forecast - {formatDate(tomorrowWeather.dt)}
                </h2>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Current Conditions */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Conditions</h3>

                    <div className="flex items-center gap-4">
                      <img
                        src={`https://openweathermap.org/img/wn/${tomorrowWeather.weather[0].icon}@2x.png`}
                        alt={tomorrowWeather.weather[0].description}
                        className="w-16 h-16"
                      />
                      <div>
                        <div className="text-white text-lg capitalize">{tomorrowWeather.weather[0].description}</div>
                        <div className="text-gray-400">
                          High: {Math.round(tomorrowWeather.temp.max)}°C • Low: {Math.round(tomorrowWeather.temp.min)}°C
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="text-gray-400">Pressure</div>
                        <div className="text-white font-semibold">{tomorrowWeather.pressure} hPa</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="text-gray-400">Humidity</div>
                        <div className="text-white font-semibold">{tomorrowWeather.humidity}%</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="text-gray-400">Wind</div>
                        <div className="text-white font-semibold">
                          {Math.round(tomorrowWeather.wind_speed * 3.6)} km/h
                        </div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="text-gray-400">Clouds</div>
                        <div className="text-white font-semibold">{tomorrowWeather.clouds}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Timing Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Best Fishing Times</h3>

                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 p-3 rounded-lg">
                        <div className="text-orange-300 font-semibold">Dawn (Best)</div>
                        <div className="text-white">
                          {formatTime(tomorrowWeather.sunrise - 1800)} - {formatTime(tomorrowWeather.sunrise + 3600)}
                        </div>
                        <div className="text-gray-400 text-sm">1.5 hours around sunrise</div>
                      </div>

                      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-3 rounded-lg">
                        <div className="text-purple-300 font-semibold">Dusk (Best)</div>
                        <div className="text-white">
                          {formatTime(tomorrowWeather.sunset - 3600)} - {formatTime(tomorrowWeather.sunset + 1800)}
                        </div>
                        <div className="text-gray-400 text-sm">1.5 hours around sunset</div>
                      </div>

                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="text-gray-400">Rain Chance</div>
                        <div className="text-white font-semibold">{Math.round(tomorrowWeather.pop * 100)}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="mt-6 p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg border border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-2">Fishing Recommendations</h3>
                  <div className="text-gray-300 space-y-1">
                    {fishingScore && fishingScore.total >= 7 && (
                      <p>• Excellent conditions expected! Plan for an early morning or evening trip.</p>
                    )}
                    {tomorrowWeather.wind_speed <= 5 && (
                      <p>• Light winds make this perfect for smaller boats and calm water fishing.</p>
                    )}
                    {tomorrowWeather.pop <= 0.3 && <p>• Low chance of rain - great day to be on the water.</p>}
                    {tomorrowWeather.pressure >= 1013 && (
                      <p>• High pressure system indicates stable weather and active fish.</p>
                    )}
                    {species && <p>• Check local regulations for {species} before heading out.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.6s ease-out both;
        }
      `}</style>
    </div>
  )
}
