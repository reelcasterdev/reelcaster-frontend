'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchOpenMeteoWeather, ProcessedOpenMeteoData } from '../utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts, OpenMeteoDailyForecast } from '../utils/fishingCalculations'
import { getScoreColor, getScoreLabel, formatDate } from '../utils/formatters'

// Component to handle search params (needs to be wrapped in Suspense)
function ForecastContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get parameters from URL
  const location = searchParams.get('location') || 'Unknown Location'
  const hotspot = searchParams.get('hotspot') || 'Unknown Hotspot'
  const species = searchParams.get('species') || null
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lon = parseFloat(searchParams.get('lon') || '0')

  const [openMeteoData, setOpenMeteoData] = useState<ProcessedOpenMeteoData | null>(null)
  const [forecasts, setForecasts] = useState<OpenMeteoDailyForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [forecastDays, setForecastDays] = useState(14)

  // Validate coordinates
  const hasValidCoordinates = lat !== 0 && lon !== 0

  useEffect(() => {
    if (hasValidCoordinates) {
      fetchForecastData()
    } else {
      setError('Invalid coordinates provided')
      setLoading(false)
    }
  }, [lat, lon, forecastDays])

  const fetchForecastData = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchOpenMeteoWeather({ lat, lon }, forecastDays)

      if (!result.success) {
        setError(result.error || 'Failed to fetch weather data')
        return
      }

      console.log('Open-Meteo data received:', result.data)
      setOpenMeteoData(result.data!)

      // Generate daily forecasts
      const dailyForecasts = generateOpenMeteoDailyForecasts(result.data!)
      console.log('Generated forecasts:', dailyForecasts)
      setForecasts(dailyForecasts)
    } catch (err) {
      console.error('Error fetching forecast data:', err)
      setError('Failed to fetch weather data')
    } finally {
      setLoading(false)
    }
  }

  const formatMinuteTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const goBack = () => {
    router.back()
  }

  if (!hasValidCoordinates) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Location</h1>
          <p className="text-red-400 mb-4">Please provide valid coordinates in the URL</p>
          <button
            onClick={goBack}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 via-green-300 to-green-500 bg-clip-text text-transparent mb-2">
                14-Day Fishing Forecast
              </h1>
              <p className="text-gray-300 text-xl">
                {hotspot}, {location}
                {species && <span className="text-gray-400"> • Target: {species}</span>}
              </p>
              <p className="text-green-400 text-sm mt-1">
                Powered by Open-Meteo API • 15-minute resolution • Free service
              </p>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={forecastDays}
                onChange={e => setForecastDays(Number(e.target.value))}
                disabled={loading}
                className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2"
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
              </select>

              <button
                onClick={fetchForecastData}
                disabled={loading}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  loading
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </div>
                ) : (
                  'Refresh Forecast'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-white mb-2">Fetching Weather Data</h3>
              <p className="text-gray-300">Getting {forecastDays}-day forecast with 15-minute resolution...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-900/50 border border-red-700 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-red-300 font-semibold">Error</h3>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Data Summary */}
        {openMeteoData && !loading && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">📊 Forecast Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400">Data Points</p>
                <p className="text-white font-bold text-lg">{openMeteoData.minutely15.length}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400">Time Range</p>
                <p className="text-white font-bold text-lg">
                  {Math.round((openMeteoData.minutely15.length * 15) / 60)}h
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400">Forecast Days</p>
                <p className="text-white font-bold text-lg">{forecasts.length}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400">Resolution</p>
                <p className="text-white font-bold text-lg">15min</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400">Elevation</p>
                <p className="text-white font-bold text-lg">{openMeteoData.location.elevation}m</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400">Timezone</p>
                <p className="text-white font-bold text-lg">{openMeteoData.location.timezone.split('/')[1]}</p>
              </div>
            </div>
          </div>
        )}

        {/* Forecast Content */}
        {forecasts.length > 0 && !loading && (
          <div className="space-y-6">
            {/* Day Selection Tabs */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">📅 Select Day</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {forecasts.map((forecast, index) => {
                  const date = new Date(forecast.date * 1000)
                  const isToday = index === 0
                  const dayLabel = isToday ? 'Today' : forecast.dayName

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDay(index)}
                      className={`p-3 rounded-lg font-semibold transition-all text-center ${
                        selectedDay === index
                          ? 'bg-green-600 text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="text-sm">{dayLabel}</div>
                      <div className="text-xs opacity-75">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Day Forecast */}
            {forecasts[selectedDay] && (
              <div className="space-y-6">
                {/* Day Overview */}
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white">
                      {forecasts[selectedDay].dayName} - {formatDate(forecasts[selectedDay].date)}
                    </h3>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">
                        {forecasts[selectedDay].thirtyMinForecasts.length} forecast periods
                      </p>
                      <p className="text-gray-400 text-sm">
                        {forecasts[selectedDay].minutelyScores.length} data points
                      </p>
                    </div>
                  </div>
                </div>

                {/* 30-Minute Forecasts */}
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                  <h4 className="text-xl font-semibold text-white mb-4">🎣 30-Minute Fishing Forecasts</h4>
                  <div className="grid gap-3">
                    {forecasts[selectedDay].thirtyMinForecasts.map((forecast, index) => (
                      <div key={index} className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-white font-semibold">
                              {formatMinuteTime(forecast.startTime)} - {formatMinuteTime(forecast.endTime)}
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                                  forecast.score.total,
                                )}`}
                              >
                                {forecast.score.total}/10
                              </div>
                              <span className="text-gray-300 text-sm">{getScoreLabel(forecast.score.total)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-300">
                            <span title="Temperature">{Math.round(forecast.avgTemp)}°C</span>
                            <span title="Wind Speed">{Math.round(forecast.windSpeed)} km/h</span>
                            <span title="Precipitation">{forecast.precipitation.toFixed(1)}mm</span>
                            <span title="Pressure">{Math.round(forecast.pressure)}hPa</span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-400 capitalize">{forecast.conditions}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 15-Minute Details */}
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                  <h4 className="text-xl font-semibold text-white mb-4">⏱️ 15-Minute Details (First 24 periods)</h4>
                  <div className="grid gap-2">
                    {forecasts[selectedDay].minutelyScores.slice(0, 24).map((minute, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/30 rounded-lg p-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-white font-medium w-16">{formatMinuteTime(minute.timestamp)}</div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(minute.score)}`}>
                            {minute.score.toFixed(1)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                          <span title="Temperature">{Math.round(minute.temp)}°C</span>
                          <span title="Wind Speed">{Math.round(minute.windSpeed)}km/h</span>
                          <span title="Precipitation">{minute.precipitation.toFixed(1)}mm</span>
                          <span className="capitalize text-xs" title="Conditions">
                            {minute.conditions}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {forecasts.length === 0 && !loading && !error && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Forecast Data</h3>
              <p className="text-gray-400">Click &ldquo;Refresh Forecast&rdquo; to load weather data</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center py-8 border-t border-gray-700">
          <p className="text-gray-500 text-sm">
            Powered by Open-Meteo API • Free weather service • 15-minute resolution
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Coordinates: {lat.toFixed(4)}, {lon.toFixed(4)}
          </p>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense wrapper
export default function ForecastPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading forecast page...</p>
          </div>
        </div>
      }
    >
      <ForecastContent />
    </Suspense>
  )
}
