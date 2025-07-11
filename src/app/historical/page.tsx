'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchOpenMeteoHistoricalWeather, ProcessedOpenMeteoData } from '../utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts, OpenMeteoDailyForecast } from '../utils/fishingCalculations'
import ShadcnMinutelyBarChart from '../components/charts/ShadcnMinutelyBarChart'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import EmptyState from '../components/common/EmptyState'
import DataSummary from '../components/forecast/DataSummary'
import DaySelector from '../components/forecast/DaySelector'
import DayOverview from '../components/forecast/DayOverview'
import ForecastFooter from '../components/forecast/ForecastFooter'
import DateRangeSelector from '../components/common/DateRangeSelector'
import HistoricalFishingScores from '../components/historical/HistoricalFishingScores'

function HistoricalContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const location = searchParams.get('location') || 'Unknown Location'
  const hotspot = searchParams.get('hotspot') || 'Unknown Hotspot'
  const species = searchParams.get('species') || null
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lon = parseFloat(searchParams.get('lon') || '0')

  const [openMeteoData, setOpenMeteoData] = useState<ProcessedOpenMeteoData | null>(null)
  const [forecasts, setForecasts] = useState<OpenMeteoDailyForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [dateRangeSelected, setDateRangeSelected] = useState(false)
  const [currentDateRange, setCurrentDateRange] = useState<{ start: string; end: string } | null>(null)

  const hasValidCoordinates = lat !== 0 && lon !== 0

  const fetchHistoricalData = async (startDate: string, endDate: string) => {
    setLoading(true)
    setError(null)
    setCurrentDateRange({ start: startDate, end: endDate })

    try {
      const result = await fetchOpenMeteoHistoricalWeather({ lat, lon }, startDate, endDate)

      if (!result.success) {
        setError(result.error || 'Failed to fetch historical weather data')
        return
      }

      console.log('Historical Open-Meteo data received:', result.data)
      setOpenMeteoData(result.data!)

      const dailyForecasts = generateOpenMeteoDailyForecasts(result.data!, null, species)
      console.log('Generated historical forecasts:', dailyForecasts)
      setForecasts(dailyForecasts)
      setDateRangeSelected(true)
      setSelectedDay(0) // Reset to first day
    } catch (err) {
      console.error('Error fetching historical data:', err)
      setError('Failed to fetch historical weather data')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    router.back()
  }

  const resetDateRange = () => {
    setDateRangeSelected(false)
    setOpenMeteoData(null)
    setForecasts([])
    setSelectedDay(0)
    setCurrentDateRange(null)
    setError(null)
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
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Historical Analysis</h1>
                <p className="text-gray-400">
                  {location} • {hotspot}
                  {species && ` • ${species}`}
                </p>
              </div>
            </div>

            {dateRangeSelected && currentDateRange && (
              <button
                onClick={resetDateRange}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Change Date Range
              </button>
            )}
          </div>

          {currentDateRange && (
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3">
              <p className="text-blue-400 text-sm">
                Analyzing: {new Date(currentDateRange.start).toLocaleDateString()} to{' '}
                {new Date(currentDateRange.end).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Date Range Selection */}
        {!dateRangeSelected && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-8 mb-6">
            <DateRangeSelector onDateRangeChange={fetchHistoricalData} loading={loading} maxDaysRange={30} />
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingState forecastDays={1} />}

        {/* Error State */}
        {error && !loading && <ErrorState error={error} />}

        {/* Data Summary */}
        {openMeteoData && !loading && dateRangeSelected && (
          <DataSummary openMeteoData={openMeteoData} forecastsCount={forecasts.length} />
        )}

        {/* Historical Analysis Results */}
        {forecasts.length > 0 && !loading && dateRangeSelected && (
          <div className="space-y-6">
            <DaySelector forecasts={forecasts} selectedDay={selectedDay} onDaySelect={setSelectedDay} />

            {forecasts[selectedDay] && (
              <div className="space-y-6">
                <DayOverview forecast={forecasts[selectedDay]} />

                <ShadcnMinutelyBarChart
                  minutelyScores={forecasts[selectedDay].minutelyScores}
                  twoHourForecasts={forecasts[selectedDay].twoHourForecasts}
                  sunrise={forecasts[selectedDay].sunrise}
                  sunset={forecasts[selectedDay].sunset}
                  dayName={forecasts[selectedDay].dayName}
                />
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {forecasts.length === 0 && !loading && !error && dateRangeSelected && <EmptyState />}

        {/* Historical Fishing Data */}
        {!loading && <HistoricalFishingScores location={location} species={species || undefined} />}

        {/* Footer */}
        <ForecastFooter lat={lat} lon={lon} />
      </div>
    </div>
  )
}

export default function HistoricalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading historical analysis...</p>
          </div>
        </div>
      }
    >
      <HistoricalContent />
    </Suspense>
  )
}
