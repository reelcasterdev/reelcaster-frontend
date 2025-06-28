'use client'

import { useState } from 'react'
import { fetchOpenMeteoWeather, ProcessedOpenMeteoData } from '../utils/openMeteoApi'
import {
  generateOpenMeteoDailyForecasts,
  OpenMeteoDailyForecast,
  generateDailyForecasts,
  DailyForecastData,
} from '../utils/fishingCalculations'
import { fetchWeatherData } from '../utils/weatherApi'
import { getScoreColor, getScoreLabel, formatDate, formatTime } from '../utils/formatters'

type ApiProvider = 'openmeteo' | 'openweather'

interface WeatherComparisonProps {
  coordinates: { lat: number; lon: number }
  location: string
}

export default function WeatherComparison({ coordinates, location }: WeatherComparisonProps) {
  const [selectedApi, setSelectedApi] = useState<ApiProvider>('openmeteo')
  const [openMeteoData, setOpenMeteoData] = useState<ProcessedOpenMeteoData | null>(null)
  const [openMeteoForecasts, setOpenMeteoForecasts] = useState<OpenMeteoDailyForecast[]>([])
  const [openWeatherForecasts, setOpenWeatherForecasts] = useState<DailyForecastData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [forecastDays, setForecastDays] = useState(14)

  const fetchWeatherForecast = async () => {
    setLoading(true)
    setError(null)
    setSelectedDay(0)

    try {
      if (selectedApi === 'openmeteo') {
        const result = await fetchOpenMeteoWeather(coordinates, forecastDays)

        if (!result.success) {
          setError(result.error || 'Failed to fetch Open-Meteo data')
          return
        }

        console.log('Open-Meteo data received:', result.data)
        setOpenMeteoData(result.data!)

        // Generate daily forecasts with 15-minute data
        const dailyForecasts = generateOpenMeteoDailyForecasts(result.data!)
        console.log('Generated Open-Meteo daily forecasts:', dailyForecasts)
        setOpenMeteoForecasts(dailyForecasts)
        setOpenWeatherForecasts([]) // Clear other API data
      } else {
        const result = await fetchWeatherData(coordinates)

        if (!result.success) {
          setError(result.error || 'Failed to fetch OpenWeatherMap data')
          return
        }

        console.log('OpenWeatherMap data received:', result.data)

        // Generate daily forecasts with hourly data
        const dailyForecasts = generateDailyForecasts(result.data!)
        console.log('Generated OpenWeatherMap daily forecasts:', dailyForecasts)
        setOpenWeatherForecasts(dailyForecasts)
        setOpenMeteoForecasts([]) // Clear other API data
        setOpenMeteoData(null)
      }
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

  const currentForecasts = selectedApi === 'openmeteo' ? openMeteoForecasts : openWeatherForecasts
  const maxDays = selectedApi === 'openmeteo' ? 14 : 2
  const dataResolution = selectedApi === 'openmeteo' ? '15-minute' : 'hourly'

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-6">
      {/* Header with API Selection */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Weather API Comparison</h2>
            <p className="text-gray-300">
              Compare {dataResolution} weather data for {location} • Up to {maxDays} days
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* API Selection */}
            <div className="flex bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setSelectedApi('openmeteo')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  selectedApi === 'openmeteo'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Open-Meteo (14 days)
              </button>
              <button
                onClick={() => setSelectedApi('openweather')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  selectedApi === 'openweather'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                OpenWeather (2 days)
              </button>
            </div>

            {/* Forecast Days Selection for Open-Meteo */}
            {selectedApi === 'openmeteo' && (
              <select
                value={forecastDays}
                onChange={e => setForecastDays(Number(e.target.value))}
                className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
              </select>
            )}

            {/* Fetch Button */}
            <button
              onClick={fetchWeatherForecast}
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                loading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : selectedApi === 'openmeteo'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Loading...
                </div>
              ) : (
                `Fetch ${selectedApi === 'openmeteo' ? '15-Min' : 'Hourly'} Data`
              )}
            </button>
          </div>
        </div>

        {/* API Info Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedApi === 'openmeteo' ? 'bg-green-900/30 border-green-500' : 'bg-gray-800/30 border-gray-600'
            }`}
          >
            <h3 className="font-semibold text-white mb-2">🌍 Open-Meteo API</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Free weather API</li>
              <li>• 15-minute resolution</li>
              <li>• Up to 14 days forecast</li>
              <li>• No API key required</li>
            </ul>
          </div>
          <div
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedApi === 'openweather' ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800/30 border-gray-600'
            }`}
          >
            <h3 className="font-semibold text-white mb-2">☁️ OpenWeatherMap API</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Premium weather service</li>
              <li>• Hourly resolution</li>
              <li>• 2 days forecast</li>
              <li>• Requires API key</li>
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
      {((selectedApi === 'openmeteo' && openMeteoData) ||
        (selectedApi === 'openweather' && openWeatherForecasts.length > 0)) && (
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Data Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {selectedApi === 'openmeteo' && openMeteoData && (
              <>
                <div>
                  <p className="text-gray-400">15-Min Points</p>
                  <p className="text-white font-bold">{openMeteoData.minutely15.length}</p>
                </div>
                <div>
                  <p className="text-gray-400">Time Range</p>
                  <p className="text-white font-bold">
                    {Math.round((openMeteoData.minutely15.length * 15) / 60)} hours
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Elevation</p>
                  <p className="text-white font-bold">{openMeteoData.location.elevation}m</p>
                </div>
                <div>
                  <p className="text-gray-400">Timezone</p>
                  <p className="text-white font-bold">{openMeteoData.location.timezone}</p>
                </div>
              </>
            )}
            {selectedApi === 'openweather' && openWeatherForecasts.length > 0 && (
              <>
                <div>
                  <p className="text-gray-400">Forecast Days</p>
                  <p className="text-white font-bold">{openWeatherForecasts.length}</p>
                </div>
                <div>
                  <p className="text-gray-400">Resolution</p>
                  <p className="text-white font-bold">Hourly</p>
                </div>
                <div>
                  <p className="text-gray-400">2-Hour Blocks</p>
                  <p className="text-white font-bold">
                    {openWeatherForecasts.reduce((sum, day) => sum + day.twoHourForecasts.length, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">API Provider</p>
                  <p className="text-white font-bold">OpenWeather</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Day Tabs */}
      {currentForecasts.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {currentForecasts.map((forecast, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(index)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  selectedDay === index
                    ? selectedApi === 'openmeteo'
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {forecast.dayName}
                <div className="text-xs opacity-75">{formatDate(forecast.date).split(',')[1]?.trim()}</div>
              </button>
            ))}
          </div>

          {currentForecasts[selectedDay] && (
            <div className="space-y-6">
              {/* Open-Meteo 30-Minute Forecasts */}
              {selectedApi === 'openmeteo' && 'thirtyMinForecasts' in currentForecasts[selectedDay] && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">
                    30-Minute Fishing Forecasts (
                    {(currentForecasts[selectedDay] as OpenMeteoDailyForecast).thirtyMinForecasts.length} periods)
                  </h4>
                  <div className="grid gap-3">
                    {(currentForecasts[selectedDay] as OpenMeteoDailyForecast).thirtyMinForecasts
                      .slice(0, 12)
                      .map((forecast, index) => (
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
              )}

              {/* OpenWeather 2-Hour Forecasts */}
              {selectedApi === 'openweather' && 'twoHourForecasts' in currentForecasts[selectedDay] && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">
                    2-Hour Fishing Forecasts (
                    {(currentForecasts[selectedDay] as DailyForecastData).twoHourForecasts.length} periods)
                  </h4>
                  <div className="grid gap-3">
                    {(currentForecasts[selectedDay] as DailyForecastData).twoHourForecasts.map((forecast, index) => (
                      <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-white font-semibold">
                              {formatTime(forecast.startTime)} - {formatTime(forecast.endTime)}
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
                            <span>{Math.round(forecast.windSpeed * 3.6)} km/h</span>
                            <span>{Math.round(forecast.pop * 100)}% rain</span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-400 capitalize">{forecast.conditions}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 15-Minute Detailed View for Open-Meteo */}
              {selectedApi === 'openmeteo' && 'minutelyScores' in currentForecasts[selectedDay] && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">15-Minute Details (First 16 periods)</h4>
                  <div className="grid gap-2">
                    {(currentForecasts[selectedDay] as OpenMeteoDailyForecast).minutelyScores
                      .slice(0, 16)
                      .map((minute, index) => (
                        <div key={index} className="bg-gray-800/30 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-white font-medium w-16">{formatMinuteTime(minute.timestamp)}</div>
                            <div className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(minute.score)}`}>
                              {minute.score.toFixed(1)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-300">
                            <span>{Math.round(minute.temp)}°C</span>
                            <span>{Math.round(minute.windSpeed)}km/h</span>
                            <span>{minute.precipitation.toFixed(1)}mm</span>
                            <span className="capitalize text-xs">{minute.conditions}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {currentForecasts.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <p>
            Click &ldquo;Fetch {selectedApi === 'openmeteo' ? '15-Min' : 'Hourly'} Data&rdquo; to see weather forecasts
          </p>
          <p className="text-sm mt-2">
            {selectedApi === 'openmeteo'
              ? 'Free API with 15-minute resolution data up to 14 days'
              : 'Premium API with hourly resolution data for 2 days'}
          </p>
        </div>
      )}
    </div>
  )
}
