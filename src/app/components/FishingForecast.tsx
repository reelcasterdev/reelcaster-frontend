'use client'

import { useState, useEffect } from 'react'
import { fetchOpenMeteoWeather, ProcessedOpenMeteoData } from '../utils/openMeteoApi'
import { FishingScore, OpenMeteoDailyForecast, generateOpenMeteoDailyForecasts } from '../utils/fishingCalculations'
import { formatDate, formatTime, getScoreColor, getScoreLabel } from '../utils/formatters'
import { LoadingStep, createLoadingSteps } from '../utils/loadingSteps'
import ShadcnMinutelyBarChart from './ShadcnMinutelyBarChart'
import WeatherComparison from './OpenMeteoDemo'

interface ForecastProps {
  location: string
  hotspot: string
  species?: string
  coordinates: { lat: number; lon: number }
  onBack: () => void
}

export default function FishingForecast({ location, hotspot, species, coordinates, onBack }: ForecastProps) {
  const [openMeteoData, setOpenMeteoData] = useState<ProcessedOpenMeteoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fishingScore, setFishingScore] = useState<FishingScore | null>(null)
  const [dailyForecasts, setDailyForecasts] = useState<OpenMeteoDailyForecast[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [steps, setSteps] = useState<LoadingStep[]>(createLoadingSteps(hotspot, location))

  useEffect(() => {
    startProgressiveLoading()
  }, [coordinates])

  const startProgressiveLoading = async () => {
    setLoading(true)
    setError(null)
    setCurrentStep(0)
    setShowResults(false)

    await executeStep(0)

    await executeStep(1)
    // Use Open-Meteo API for enhanced 15-minute resolution data
    const weatherResult = await fetchOpenMeteoWeather(coordinates, 3) // 3 days for standard forecast

    console.log({ weatherResult })

    if (!weatherResult.success) {
      setError(weatherResult.error || 'Failed to fetch weather data')
      updateStepStatus(1, 'error')
      setLoading(false)
      return
    }

    setOpenMeteoData(weatherResult.data!)

    await executeStep(2)

    await executeStep(3)
    if (weatherResult.data) {
      // Generate daily forecasts with enhanced algorithm
      const daily = generateOpenMeteoDailyForecasts(weatherResult.data)
      console.log(
        'Generated enhanced daily forecasts:',
        daily.map(d => ({
          dayName: d.dayName,
          minutelyCount: d.minutelyScores.length,
          twoHourCount: d.twoHourForecasts.length,
        })),
      )
      setDailyForecasts(daily)

      // Get tomorrow's best score for the main display
      if (daily.length > 0) {
        const tomorrowForecasts = daily[0].twoHourForecasts
        if (tomorrowForecasts.length > 0) {
          // Find the best 2-hour block for tomorrow
          const bestBlock = tomorrowForecasts.reduce((best, current) =>
            current.score.total > best.score.total ? current : best,
          )
          setFishingScore(bestBlock.score)
        }
      }
    }

    await executeStep(4)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
        <div className="max-w-4xl mx-auto">
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

          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="max-w-6xl mx-auto">
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

        {/* Daily Forecasts with Tabs */}
        {dailyForecasts.length > 0 && showResults && (
          <div className="mb-8">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-gray-800/50 p-1 rounded-lg">
                {dailyForecasts.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTab(index)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      activeTab === index
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    {day.dayName}
                    <div className="text-xs opacity-75">{formatDate(day.date).split(',')[1].trim()}</div>
                  </button>
                ))}
              </div>

              {/* Active Day Content */}
              {dailyForecasts[activeTab] && (
                <div className="space-y-6">
                  {/* 15-Minute Bar Chart */}
                  <ShadcnMinutelyBarChart
                    minutelyScores={dailyForecasts[activeTab].minutelyScores}
                    twoHourForecasts={dailyForecasts[activeTab].twoHourForecasts}
                    sunrise={dailyForecasts[activeTab].sunrise}
                    sunset={dailyForecasts[activeTab].sunset}
                    dayName={dailyForecasts[activeTab].dayName}
                  />

                  {/* 2-Hour Detailed Forecasts */}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">2-Hour Detailed Forecasts</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {dailyForecasts[activeTab].twoHourForecasts.map((forecast, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/50 rounded-lg p-4 border border-gray-600 animate-slideInLeft"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="text-center mb-3">
                            <div className="text-white font-semibold">
                              {formatTime(forecast.startTime)} - {formatTime(forecast.endTime)}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {Math.round(forecast.avgTemp)}°C • {forecast.precipitation.toFixed(1)}mm rain
                            </div>
                          </div>

                          <div className="flex items-center justify-center mb-3">
                            <img
                              src={`https://openweathermap.org/img/wn/${forecast.icon}@2x.png`}
                              alt={forecast.conditions}
                              className="w-12 h-12"
                            />
                          </div>

                          <div className="text-center">
                            <div className={`text-3xl font-bold ${getScoreColor(forecast.score.total)}`}>
                              {forecast.score.total}
                            </div>
                            <div className="text-gray-400 text-sm">{getScoreLabel(forecast.score.total)}</div>
                            <div className="text-gray-300 text-xs mt-1 capitalize">{forecast.conditions}</div>
                            <div className="text-gray-400 text-xs">
                              Wind: {Math.round(forecast.windSpeed * 3.6)} km/h
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Open-Meteo 15-Minute Demo */}
        {/* {showResults && <OpenMeteoDemo coordinates={coordinates} location={`${hotspot}, ${location}`} />} */}
        <WeatherComparison coordinates={coordinates} location={`${hotspot}, ${location}`} />

        {dailyForecasts.length > 0 && showResults && (
          <div className="grid gap-6 lg:grid-cols-3">
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

            <div className="lg:col-span-2">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Enhanced Weather Forecast - {formatDate(dailyForecasts[0].date)}
                </h2>

                {dailyForecasts[0].twoHourForecasts.length > 0 &&
                  (() => {
                    const firstForecast = dailyForecasts[0].twoHourForecasts[0]

                    return (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-white">Conditions</h3>

                          <div className="flex items-center gap-4">
                            <img
                              src={`https://openweathermap.org/img/wn/${firstForecast.icon}@2x.png`}
                              alt={firstForecast.conditions}
                              className="w-16 h-16"
                            />
                            <div>
                              <div className="text-white text-lg capitalize">{firstForecast.conditions}</div>
                              <div className="text-gray-400">Avg: {Math.round(firstForecast.avgTemp)}°C</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-gray-800/50 p-3 rounded-lg">
                              <div className="text-gray-400">Pressure</div>
                              <div className="text-white font-semibold">{Math.round(firstForecast.pressure)} hPa</div>
                            </div>
                            <div className="bg-gray-800/50 p-3 rounded-lg">
                              <div className="text-gray-400">Wind</div>
                              <div className="text-white font-semibold">{Math.round(firstForecast.windSpeed)} km/h</div>
                            </div>
                            <div className="bg-gray-800/50 p-3 rounded-lg">
                              <div className="text-gray-400">Precipitation</div>
                              <div className="text-white font-semibold">
                                {firstForecast.precipitation.toFixed(1)} mm
                              </div>
                            </div>
                            <div className="bg-gray-800/50 p-3 rounded-lg">
                              <div className="text-gray-400">Score</div>
                              <div className={`font-semibold ${getScoreColor(firstForecast.score.total)}`}>
                                {firstForecast.score.total}/10
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-white">Best Fishing Times</h3>

                          <div className="space-y-3">
                            <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 p-3 rounded-lg">
                              <div className="text-orange-300 font-semibold">Dawn (Best)</div>
                              <div className="text-white">
                                {formatTime(dailyForecasts[0].sunrise - 1800)} -{' '}
                                {formatTime(dailyForecasts[0].sunrise + 3600)}
                              </div>
                              <div className="text-gray-400 text-sm">1.5 hours around sunrise</div>
                            </div>

                            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-3 rounded-lg">
                              <div className="text-purple-300 font-semibold">Dusk (Best)</div>
                              <div className="text-white">
                                {formatTime(dailyForecasts[0].sunset - 3600)} -{' '}
                                {formatTime(dailyForecasts[0].sunset + 1800)}
                              </div>
                              <div className="text-gray-400 text-sm">1.5 hours around sunset</div>
                            </div>

                            <div className="bg-gray-800/50 p-3 rounded-lg">
                              <div className="text-gray-400">Best 2-Hour Block</div>
                              <div className="text-white font-semibold">
                                {formatTime(
                                  dailyForecasts[0].twoHourForecasts.reduce((best, current) =>
                                    current.score.total > best.score.total ? current : best,
                                  ).startTime,
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                <div className="mt-6 p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg border border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-2">Enhanced Fishing Recommendations</h3>
                  <div className="text-gray-300 space-y-1">
                    {fishingScore && fishingScore.total >= 7 && (
                      <p>• Excellent conditions with enhanced 15-minute resolution data!</p>
                    )}
                    <p>• 15-minute precision allows for optimal timing of your fishing trip.</p>
                    <p>• Enhanced algorithm considers 11 factors including visibility and lightning safety.</p>
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
