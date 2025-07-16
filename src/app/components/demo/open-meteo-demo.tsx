'use client'

import { useState } from 'react'
import { fetchOpenMeteoWeather, ProcessedOpenMeteoData } from '../../utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts, OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { getScoreColor, getScoreLabel, formatDate } from '../../utils/formatters'
import ShadcnMinutelyBarChart from '../charts/shadcn-minutely-bar-chart'

interface WeatherComparisonProps {
  coordinates: { lat: number; lon: number }
  location: string
}

export default function WeatherComparison({ coordinates, location }: WeatherComparisonProps) {
  const [openMeteoData, setOpenMeteoData] = useState<ProcessedOpenMeteoData | null>(null)
  const [openMeteoForecasts, setOpenMeteoForecasts] = useState<OpenMeteoDailyForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [forecastDays, setForecastDays] = useState(14)

  const fetchWeatherForecast = async () => {
    setLoading(true)
    setError(null)
    setSelectedDay(0)

    try {
      const result = await fetchOpenMeteoWeather(coordinates, forecastDays)

      if (!result.success) {
        setError(result.error || 'Failed to fetch Open-Meteo data')
        return
      }

      console.log('Open-Meteo data received:', result.data)
      setOpenMeteoData(result.data!)

      // Generate daily forecasts with enhanced 15-minute data
      const dailyForecasts = generateOpenMeteoDailyForecasts(result.data!, null, null)
      console.log('Generated Open-Meteo daily forecasts:', dailyForecasts)
      setOpenMeteoForecasts(dailyForecasts)
    } catch (err) {
      console.error('Error fetching weather data:', err)
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

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Enhanced 15-Minute Weather Data</h2>
            <p className="text-gray-300">
              High-resolution 15-minute weather data for {location} • Up to 14 days with 11-factor algorithm
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Forecast Days Selection */}
            <select
              value={forecastDays}
              onChange={e => setForecastDays(Number(e.target.value))}
              className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
            </select>

            {/* Fetch Button */}
            <button
              onClick={fetchWeatherForecast}
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                loading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Loading...
                </div>
              ) : (
                'Fetch Enhanced Data'
              )}
            </button>
          </div>
        </div>

        {/* Enhanced API Info */}
        <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-2">🌍 Enhanced Open-Meteo Integration</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="text-sm text-green-300 space-y-1">
              <li>• Free weather API service</li>
              <li>• 15-minute resolution data</li>
              <li>• Up to 14 days forecast</li>
              <li>• No API key required</li>
            </ul>
            <ul className="text-sm text-green-300 space-y-1">
              <li>• 11-factor scoring algorithm</li>
              <li>• Enhanced safety monitoring</li>
              <li>• 2-hour prediction blocks</li>
              <li>• Real-time visibility & lightning</li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Data Summary */}
      {openMeteoData && (
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Data Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">15-Min Points</p>
              <p className="text-white font-bold">{openMeteoData.minutely15.length}</p>
            </div>
            <div>
              <p className="text-gray-400">Time Range</p>
              <p className="text-white font-bold">{Math.round((openMeteoData.minutely15.length * 15) / 60)} hours</p>
            </div>
            <div>
              <p className="text-gray-400">Elevation</p>
              <p className="text-white font-bold">{openMeteoData.location.elevation}m</p>
            </div>
            <div>
              <p className="text-gray-400">Timezone</p>
              <p className="text-white font-bold">{openMeteoData.location.timezone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Day Tabs */}
      {openMeteoForecasts.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {openMeteoForecasts.map((forecast, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(index)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  selectedDay === index ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {forecast.dayName}
                <div className="text-xs opacity-75">{formatDate(forecast.date).split(',')[1]?.trim()}</div>
              </button>
            ))}
          </div>

          {openMeteoForecasts[selectedDay] && (
            <div className="space-y-6">
              {/* Enhanced 2-Hour Forecasts */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">
                  Enhanced 2-Hour Fishing Forecasts ({openMeteoForecasts[selectedDay].twoHourForecasts.length} periods)
                </h4>
                <div className="grid gap-3">
                  {openMeteoForecasts[selectedDay].twoHourForecasts.slice(0, 12).map((forecast, index) => (
                    <div key={index} className="bg-gray-800/50 rounded-lg p-4">
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
                          <span>{Math.round(forecast.avgTemp)}°C</span>
                          <span>{Math.round(forecast.windSpeed)} km/h</span>
                          <span>{forecast.precipitation.toFixed(1)}mm</span>
                          <span>{Math.round(forecast.pressure)}hPa</span>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-400 capitalize">{forecast.conditions}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 15-Minute Bar Chart */}
              {'minutelyScores' in openMeteoForecasts[selectedDay] && (
                <ShadcnMinutelyBarChart
                  minutelyScores={(openMeteoForecasts[selectedDay] as OpenMeteoDailyForecast).minutelyScores}
                  twoHourForecasts={(openMeteoForecasts[selectedDay] as OpenMeteoDailyForecast).twoHourForecasts}
                  sunrise={(openMeteoForecasts[selectedDay] as OpenMeteoDailyForecast).sunrise}
                  sunset={(openMeteoForecasts[selectedDay] as OpenMeteoDailyForecast).sunset}
                  dayName={(openMeteoForecasts[selectedDay] as OpenMeteoDailyForecast).dayName}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {openMeteoForecasts.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <p>Click &ldquo;Fetch Enhanced Data&rdquo; to see weather forecasts</p>
          <p className="text-sm mt-2">Free API with 15-minute resolution data up to 14 days</p>
        </div>
      )}
    </div>
  )
}
