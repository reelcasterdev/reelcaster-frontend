'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { fetchOpenMeteoWeather, ProcessedOpenMeteoData } from '../utils/openMeteoApi'
import { calculateOpenMeteoFishingScore, FishingScore } from '../utils/fishingCalculations'

const COORDINATES = {
  'Victoria, Sidney': { lat: 48.4284, lon: -123.3656 },
  'Tofino and Islands': { lat: 49.1533, lon: -125.9066 },
  'Vancouver Area': { lat: 49.2827, lon: -123.1207 },
  'Sooke, Port Renfrew': { lat: 48.3723, lon: -123.7365 },
}

interface EnhancedScoreBreakdown {
  factor: string
  description: string
  score: number
  weight: number
  contribution: number
  optimal: string
}

export default function EnhancedFishingDemo() {
  const [selectedLocation, setSelectedLocation] = useState<keyof typeof COORDINATES>('Victoria, Sidney')
  const [weatherData, setWeatherData] = useState<ProcessedOpenMeteoData | null>(null)
  const [currentScore, setCurrentScore] = useState<FishingScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const coordinates = COORDINATES[selectedLocation]
      const result = await fetchOpenMeteoWeather(coordinates, 1)

      if (result.success && result.data) {
        setWeatherData(result.data)

        // Calculate score for current time (first available data point)
        if (result.data.minutely15.length > 0 && result.data.daily.length > 0) {
          const currentData = result.data.minutely15[0]
          const today = result.data.daily[0]
          const sunrise = new Date(today.sunrise).getTime() / 1000
          const sunset = new Date(today.sunset).getTime() / 1000

          const score = calculateOpenMeteoFishingScore(currentData, sunrise, sunset)
          setCurrentScore(score)
        }
      } else {
        setError(result.error || 'Failed to fetch weather data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedLocation])

  const getScoreColor = (score: number): string => {
    if (score >= 8.5) return 'text-green-600'
    if (score >= 7.0) return 'text-blue-600'
    if (score >= 5.5) return 'text-yellow-600'
    if (score >= 4.0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 8.5) return 'Excellent'
    if (score >= 7.0) return 'Very Good'
    if (score >= 5.5) return 'Good'
    if (score >= 4.0) return 'Fair'
    return 'Poor'
  }

  const getEnhancedBreakdown = (): EnhancedScoreBreakdown[] => {
    if (!currentScore) return []

    return [
      {
        factor: 'Barometric Pressure',
        description: 'Steady pressure indicates stable weather conditions preferred by fish',
        score: currentScore.breakdown.pressure,
        weight: 20,
        contribution: currentScore.breakdown.pressure * 0.2,
        optimal: '1013-1023 hPa',
      },
      {
        factor: 'Enhanced Wind Analysis',
        description: 'Light winds with minimal gusts, offshore direction preferred',
        score: currentScore.breakdown.wind,
        weight: 15,
        contribution: currentScore.breakdown.wind * 0.15,
        optimal: '≤5 m/s, easterly direction',
      },
      {
        factor: 'Temperature',
        description: 'Optimal water and air temperature for BC fish activity',
        score: currentScore.breakdown.temperature,
        weight: 15,
        contribution: currentScore.breakdown.temperature * 0.15,
        optimal: '8-16°C',
      },
      {
        factor: 'Precipitation',
        description: 'Clear to light precipitation conditions for better fishing',
        score: currentScore.breakdown.precipitation,
        weight: 15,
        contribution: currentScore.breakdown.precipitation * 0.15,
        optimal: '≤0.5mm per 15min',
      },
      {
        factor: 'Cloud Cover',
        description: 'Partly cloudy skies provide ideal light conditions',
        score: currentScore.breakdown.cloudCover,
        weight: 8,
        contribution: currentScore.breakdown.cloudCover * 0.08,
        optimal: '25-50% coverage',
      },
      {
        factor: 'Visibility',
        description: 'Clear visibility for safety and fish spotting',
        score: currentScore.breakdown.visibility,
        weight: 7,
        contribution: currentScore.breakdown.visibility * 0.07,
        optimal: '≥10km',
      },
      {
        factor: 'Sunshine Duration',
        description: 'Natural light affects fish activity and angler success',
        score: currentScore.breakdown.sunshine,
        weight: 5,
        contribution: currentScore.breakdown.sunshine * 0.05,
        optimal: '≥75% of period',
      },
      {
        factor: 'Atmospheric Stability',
        description: 'Stable atmospheric conditions (low CAPE) for consistent weather',
        score: currentScore.breakdown.atmospheric,
        weight: 5,
        contribution: currentScore.breakdown.atmospheric * 0.05,
        optimal: '≤500 J/kg CAPE',
      },
      {
        factor: 'Lightning Safety',
        description: 'Low lightning potential ensures safe fishing conditions',
        score: currentScore.breakdown.lightning,
        weight: 5,
        contribution: currentScore.breakdown.lightning * 0.05,
        optimal: '≤100 J/kg potential',
      },
      {
        factor: 'Angler Comfort',
        description: 'Comfortable conditions based on apparent temperature and humidity',
        score: currentScore.breakdown.comfort,
        weight: 5,
        contribution: currentScore.breakdown.comfort * 0.05,
        optimal: 'Feels like 8-16°C',
      },
      {
        factor: 'Time of Day',
        description: 'Dawn and dusk periods when fish are most active',
        score: currentScore.breakdown.timeOfDay,
        weight: 10,
        contribution: currentScore.breakdown.timeOfDay * 0.1,
        optimal: 'Dawn/dusk ±1.5hrs',
      },
    ]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-4">
            Enhanced BC Fishing Algorithm Demo
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Experience our advanced 11-factor fishing prediction algorithm that analyzes comprehensive weather data
            including barometric pressure, enhanced wind conditions, visibility, atmospheric stability, and safety
            factors.
          </p>
        </div>

        {/* Location Selector */}
        <Card className="bg-gray-800/50 backdrop-blur border-gray-700 p-6 mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Select Location</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {Object.keys(COORDINATES).map(location => (
                <button
                  key={location}
                  onClick={() => setSelectedLocation(location as keyof typeof COORDINATES)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedLocation === location
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {loading && (
          <Card className="bg-gray-800/50 backdrop-blur border-gray-700 p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-300">Fetching enhanced weather data...</p>
          </Card>
        )}

        {error && (
          <Card className="bg-red-900/50 backdrop-blur border-red-700 p-6 text-center">
            <p className="text-red-300">Error: {error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Retry
            </button>
          </Card>
        )}

        {currentScore && weatherData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overall Score */}
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700 p-6 lg:col-span-1">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-4">Current Fishing Score</h3>
                <div className={`text-6xl font-bold mb-2 ${getScoreColor(currentScore.total)}`}>
                  {currentScore.total.toFixed(2)}
                </div>
                <div className={`text-lg font-medium ${getScoreColor(currentScore.total)}`}>
                  {getScoreLabel(currentScore.total)}
                </div>
                <div className="text-sm text-gray-400 mt-2">Out of 10.00</div>
              </div>
            </Card>

            {/* Enhanced Breakdown */}
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700 p-6 lg:col-span-2">
              <h3 className="text-xl font-semibold mb-4">Enhanced Algorithm Breakdown</h3>
              <div className="space-y-3">
                {getEnhancedBreakdown().map((item, index) => (
                  <div key={index} className="border-b border-gray-700 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1">
                        <div className="font-medium text-blue-300">{item.factor}</div>
                        <div className="text-sm text-gray-400">{item.description}</div>
                        <div className="text-xs text-gray-500 mt-1">Optimal: {item.optimal}</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className={`font-bold ${getScoreColor(item.score)}`}>{item.score.toFixed(1)}/10</div>
                        <div className="text-sm text-gray-400">{item.weight}% weight</div>
                        <div className="text-xs text-gray-500">+{item.contribution.toFixed(2)} pts</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          item.score >= 8
                            ? 'bg-green-500'
                            : item.score >= 6
                            ? 'bg-blue-500'
                            : item.score >= 4
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${(item.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Algorithm Information */}
        <Card className="bg-gray-800/50 backdrop-blur border-gray-700 p-6 mt-8">
          <h3 className="text-xl font-semibold mb-4">Enhanced Algorithm Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-blue-300 mb-2">Core Weather (65%)</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Barometric Pressure (20%)</li>
                <li>• Enhanced Wind Analysis (15%)</li>
                <li>• Temperature Optimization (15%)</li>
                <li>• Precipitation Assessment (15%)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-300 mb-2">Environmental (25%)</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Cloud Cover Analysis (8%)</li>
                <li>• Visibility Assessment (7%)</li>
                <li>• Sunshine Duration (5%)</li>
                <li>• Atmospheric Stability (5%)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-purple-300 mb-2">Safety & Timing (20%)</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Lightning Safety (5%)</li>
                <li>• Angler Comfort (5%)</li>
                <li>• Optimal Timing (10%)</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-900/30 rounded-lg">
            <p className="text-sm text-blue-200">
              <strong>15-Minute Precision:</strong> Our algorithm uses Open-Meteo&apos;s high-resolution 15-minute
              weather data to provide the most accurate fishing predictions possible, including advanced parameters like
              CAPE (atmospheric stability), lightning potential, and sunshine duration.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
