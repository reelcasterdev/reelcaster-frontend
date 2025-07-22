'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { fetchOpenMeteoWeather, ProcessedOpenMeteoData } from '../utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts, OpenMeteoDailyForecast } from '../utils/fishingCalculations'
import { findNearestTideStation, getCachedTideData, TideData } from '../utils/tideApi'
import ModernLoadingState from '../components/common/modern-loading-state'
import ErrorState from '../components/common/error-state'

// Component imports
import NewForecastHeader from '../components/forecast/new-forecast-header'
import DayOutlook from '../components/forecast/day-outlook'
import OverallScore from '../components/forecast/overall-score'
import HourlyChart from '../components/forecast/hourly-chart'
import HourlyTable from '../components/forecast/hourly-table'
import WeatherConditions from '../components/forecast/weather-conditions'
import SpeciesRegulations from '../components/forecast/species-regulations'
import FishingReports from '../components/forecast/fishing-reports'

// Real fishing location and species data
interface FishingHotspot {
  name: string
  coordinates: { lat: number; lon: number }
}

interface FishingLocation {
  id: string
  name: string
  coordinates: { lat: number; lon: number }
  hotspots: FishingHotspot[]
}

interface FishSpecies {
  id: string
  name: string
  scientificName: string
  minSize: string
  dailyLimit: string
  status: 'Open' | 'Closed' | 'Non Retention'
  gear: string
  season: string
  description: string
}

const fishingLocations: FishingLocation[] = [
  {
    id: 'victoria-sidney',
    name: 'Victoria, Sidney',
    coordinates: { lat: 48.4113, lon: -123.398 },
    hotspots: [
      { name: 'Breakwater (Shore Fishing)', coordinates: { lat: 48.4113, lon: -123.398 } },
      { name: 'Waterfront', coordinates: { lat: 48.4284, lon: -123.3656 } },
      { name: 'Ten Mile Point (Shore Fishing)', coordinates: { lat: 48.4167, lon: -123.3 } },
      { name: 'Oak Bay', coordinates: { lat: 48.4264, lon: -123.3145 } },
      { name: 'Waterfront Bay', coordinates: { lat: 48.4632, lon: -123.3127 } },
      { name: 'Constance Bank', coordinates: { lat: 48.3833, lon: -123.4167 } },
      { name: 'Sidney', coordinates: { lat: 48.65, lon: -123.4 } },
    ],
  },
  {
    id: 'sooke-port-renfrew',
    name: 'Sooke, Port Renfrew',
    coordinates: { lat: 48.3415, lon: -123.5507 },
    hotspots: [
      { name: 'East Sooke', coordinates: { lat: 48.35, lon: -123.6167 } },
      { name: 'Becher Bay', coordinates: { lat: 48.3167, lon: -123.6333 } },
      { name: 'Pedder Bay', coordinates: { lat: 48.3415, lon: -123.5507 } },
      { name: 'Church Rock', coordinates: { lat: 48.3, lon: -123.6 } },
    ],
  },
]

const fishSpecies: FishSpecies[] = [
  {
    id: 'lingcod',
    name: 'Lingcod',
    scientificName: 'Ophiodon elongatus',
    minSize: '65cm',
    dailyLimit: '1',
    status: 'Open',
    gear: 'Hook and line',
    season: 'Year-round',
    description: 'Large predatory fish, great eating',
  },
  {
    id: 'pink-salmon',
    name: 'Pink Salmon',
    scientificName: 'Oncorhynchus gorbuscha',
    minSize: '30cm',
    dailyLimit: '4',
    status: 'Open',
    gear: 'Barbless hook and line',
    season: 'July - September (odd years)',
    description: 'Humpy salmon, abundant in odd years',
  },
  {
    id: 'coho-salmon',
    name: 'Coho Salmon',
    scientificName: 'Oncorhynchus kisutch',
    minSize: '30cm',
    dailyLimit: '2',
    status: 'Open',
    gear: 'Barbless hook and line',
    season: 'June - October',
    description: 'Silver salmon, excellent fighting fish',
  },
  {
    id: 'halibut',
    name: 'Halibut',
    scientificName: 'Hippoglossus stenolepis',
    minSize: '83cm',
    dailyLimit: '1',
    status: 'Closed',
    gear: 'Hook and line',
    season: 'Year-round',
    description: 'Large flatfish, excellent table fare',
  },
  {
    id: 'chinook-salmon',
    name: 'Chinook Salmon',
    scientificName: 'Oncorhynchus tshawytscha',
    minSize: '62cm',
    dailyLimit: '0',
    status: 'Closed',
    gear: 'Barbless hook and line',
    season: 'Year-round (varies by area)',
    description: 'King salmon, largest Pacific salmon species',
  },
]

function NewForecastContent() {
  const searchParams = useSearchParams()

  // URL parameters
  const location = searchParams.get('location') || 'Unknown Location'
  const hotspot = searchParams.get('hotspot') || 'Unknown Hotspot'
  const species = searchParams.get('species') || null
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lon = parseFloat(searchParams.get('lon') || '0')

  // State variables
  const [selectedLocation] = useState<string>(
    location !== 'Unknown Location' ? location : 'Victoria, Sidney',
  )
  const [selectedHotspot] = useState<string>(
    hotspot !== 'Unknown Hotspot' ? hotspot : 'Breakwater (Shore Fishing)',
  )
  const [openMeteoData, setOpenMeteoData] = useState<ProcessedOpenMeteoData | null>(null)
  const [forecasts, setForecasts] = useState<OpenMeteoDailyForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tideData, setTideData] = useState<TideData | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)

  // Coordinate validation
  const hasValidCoordinates = lat !== 0 && lon !== 0

  // Get current location data for dropdowns
  const currentLocation = fishingLocations.find(loc => loc.name === selectedLocation)
  const currentHotspot = currentLocation?.hotspots.find(h => h.name === selectedHotspot)

  // Use URL coordinates if valid, otherwise use selected location coordinates (memoized to prevent re-creation)
  const coordinates = useMemo(() => {
    return hasValidCoordinates
      ? { lat, lon }
      : currentHotspot?.coordinates || currentLocation?.coordinates || { lat: 48.4113, lon: -123.398 }
  }, [hasValidCoordinates, lat, lon, currentHotspot?.coordinates, currentLocation?.coordinates])

  const fetchForecastData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch tide data
      const tideStation = findNearestTideStation(coordinates)
      const tideResult = await getCachedTideData(tideStation)
      setTideData(tideResult)

      // Fetch weather forecast
      const result = await fetchOpenMeteoWeather(coordinates, 14)

      if (!result.success) {
        setError(result.error || 'Failed to fetch weather data')
        return
      }

      setOpenMeteoData(result.data!)

      // Generate daily forecasts with tide data
      const dailyForecasts = generateOpenMeteoDailyForecasts(result.data!, tideResult, species)
      setForecasts(dailyForecasts)
    } catch (err) {
      console.error('Error fetching forecast data:', err)
      setError('Failed to fetch weather data')
    } finally {
      setLoading(false)
    }
  }, [coordinates, species])

  useEffect(() => {
    fetchForecastData()
  }, [fetchForecastData])


  // Handle invalid coordinates
  if (!hasValidCoordinates && (lat !== 0 || lon !== 0)) {
    return <ErrorState error="Invalid coordinates provided" />
  }

  if (loading) {
    return <ModernLoadingState forecastDays={14} />
  }

  if (error) {
    return <ErrorState error={error} />
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <NewForecastHeader 
          location={selectedLocation}
          hotspot={selectedHotspot}
        />

        {/* Top Row: 14-Day Outlook and Overall Score */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 14-Day Outlook */}
          <div className="lg:col-span-2">
            <DayOutlook 
              forecasts={forecasts} 
              selectedDay={selectedDay}
              onDaySelect={setSelectedDay}
            />
          </div>

          {/* Overall Score */}
          <OverallScore forecasts={forecasts} selectedDay={selectedDay} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts and Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hourly Fishing Score Chart */}
            <HourlyChart forecasts={forecasts} selectedDay={selectedDay} />

            {/* Hourly Data Table */}
            <HourlyTable 
              forecasts={forecasts}
              openMeteoData={openMeteoData}
              tideData={tideData}
              selectedDay={selectedDay}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Weather and Conditions */}
            <WeatherConditions 
              forecasts={forecasts}
              openMeteoData={openMeteoData}
              tideData={tideData}
              selectedDay={selectedDay}
            />

            {/* Species Regulations */}
            <SpeciesRegulations species={fishSpecies} />

            {/* Reports */}
            <FishingReports />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewForecastPage() {
  return (
    <Suspense fallback={<ModernLoadingState forecastDays={14} />}>
      <NewForecastContent />
    </Suspense>
  )
}