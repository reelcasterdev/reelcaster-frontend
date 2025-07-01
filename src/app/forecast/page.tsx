'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchOpenMeteoWeather, ProcessedOpenMeteoData } from '../utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts, OpenMeteoDailyForecast } from '../utils/fishingCalculations'
import ShadcnMinutelyBarChart from '../components/charts/ShadcnMinutelyBarChart'
import ForecastHeader from '../components/forecast/ForecastHeader'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import DataSummary from '../components/forecast/DataSummary'
import DaySelector from '../components/forecast/DaySelector'
import DayOverview from '../components/forecast/DayOverview'
import ForecastFooter from '../components/forecast/ForecastFooter'
import EmptyState from '../components/common/EmptyState'

function ForecastContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

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
        <ForecastHeader
          location={location}
          hotspot={hotspot}
          species={species}
          forecastDays={forecastDays}
          loading={loading}
          onBack={goBack}
          onForecastDaysChange={setForecastDays}
          onRefresh={fetchForecastData}
        />

        {loading && <LoadingState forecastDays={forecastDays} />}

        {error && !loading && <ErrorState error={error} />}

        {openMeteoData && !loading && <DataSummary openMeteoData={openMeteoData} forecastsCount={forecasts.length} />}

        {forecasts.length > 0 && !loading && (
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

        {forecasts.length === 0 && !loading && !error && <EmptyState />}

        <ForecastFooter lat={lat} lon={lon} />
      </div>
    </div>
  )
}

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
