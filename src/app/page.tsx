'use client'

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchOpenMeteoWeather, ProcessedOpenMeteoData } from './utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts, OpenMeteoDailyForecast } from './utils/fishingCalculations'
import { fetchCHSTideData, CHSWaterData } from './utils/chsTideApi'
import ForecastCacheService from './utils/forecastCacheService'
import { useAnalytics } from '@/hooks/use-analytics'
// import ModernLoadingState from './components/common/modern-loading-state'
import ErrorState from './components/common/error-state'

// Component imports
import NewForecastHeader from './components/forecast/new-forecast-header'
import DayOutlook from './components/forecast/day-outlook'
import OverallScore from './components/forecast/overall-score'
import HourlyChart from './components/forecast/hourly-chart'
import HourlyTable from './components/forecast/hourly-table'
import WeatherConditions from './components/forecast/weather-conditions'
import SpeciesRegulations from './components/forecast/species-regulations'
import FishingReports from './components/forecast/fishing-reports'
import { FishingReportDisplay } from './components/forecast/fishing-report-display'
import { TideChart } from './components/forecast/tide-chart'
import { TideStatusWidget } from './components/forecast/tide-status-widget'
import Sidebar from './components/common/sidebar'
import CompactLocationSelector from './components/location/compact-location-selector'
import SeasonalStatusBanner from './components/forecast/seasonal-status-banner'
import ForecastMapSwitcher from './components/forecast/forecast-map-switcher'
import { DFONoticesSection } from './components/forecast/dfo-notices-section'
import { useAuthForecast } from '@/hooks/use-auth-forecast'
import { useAuth } from '@/contexts/auth-context'
import { UserPreferencesService } from '@/lib/user-preferences'
import { useLocationRegulations } from '@/hooks/use-regulations'

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

// Helper function to map location names to DFO fishing areas
function getDFOAreasForLocation(locationName: string): number[] {
  const locationToAreas: Record<string, number[]> = {
    'Victoria, Sidney': [19],
    'Sooke, Port Renfrew': [20],
  }
  return locationToAreas[locationName] || [19, 20] // Default to both areas if unknown
}

function NewForecastContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { trackEvent } = useAnalytics()
  const pageLoadStartTime = useRef<number>(Date.now())
  const hasTrackedPageView = useRef<boolean>(false)

  // Default to Victoria Waterfront if no parameters provided
  const location = searchParams.get('location') || 'Victoria, Sidney'
  const hotspot = searchParams.get('hotspot') || 'Waterfront'
  const species = searchParams.get('species') || null
  const lat = parseFloat(searchParams.get('lat') || '48.4284')
  const lon = parseFloat(searchParams.get('lon') || '-123.3656')

  // Use search params directly instead of state (so they update when URL changes)
  const selectedLocation = location
  const selectedHotspot = hotspot
  const [openMeteoData, setOpenMeteoData] = useState<ProcessedOpenMeteoData | null>(null)
  const [forecasts, setForecasts] = useState<OpenMeteoDailyForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Single source of truth for tide data - using CHS API
  const [tideData, setTideData] = useState<CHSWaterData | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)

  // Cache-related state
  const [isCachedData, setIsCachedData] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<{ createdAt?: string; expiresAt?: string }>({})
  
  // Use auth forecast hook to manage data based on authentication
  const { forecastData, shouldBlurAfterDay } = useAuthForecast(forecasts)

  // Fetch regulations dynamically
  const { regulations: dynamicRegulations } = useLocationRegulations(selectedLocation)

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

  // Handle hotspot change from map click
  const handleHotspotChange = useCallback((hotspotData: FishingHotspot) => {
    if (!currentLocation) return;

    const params = new URLSearchParams({
      location: currentLocation.name,
      hotspot: hotspotData.name,
      lat: hotspotData.coordinates.lat.toString(),
      lon: hotspotData.coordinates.lon.toString(),
    });

    if (species) {
      params.set('species', species);
    }

    trackEvent('Hotspot Selected', {
      location: currentLocation.name,
      hotspot: hotspotData.name,
      coordinates: hotspotData.coordinates,
      source: 'map',
      timestamp: new Date().toISOString(),
    });

    // Use replace instead of push to avoid adding to history stack
    // This makes navigation feel smoother
    router.replace(`/?${params.toString()}`);
  }, [currentLocation, species, router, trackEvent]);

  // Fresh data fetching function (used for both initial load and background refresh)
  const fetchFreshForecastData = useCallback(async (): Promise<{
    forecasts: OpenMeteoDailyForecast[]
    openMeteoData: ProcessedOpenMeteoData
    tideData: CHSWaterData | null
  } | null> => {
    try {
      // Fetch tide data from CHS API
      let finalTideData: CHSWaterData | null = null
      
      try {
        const locationId = selectedLocation.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')
        console.log('Fetching CHS data for location:', locationId)
        const chsData = await fetchCHSTideData(locationId)
        if (chsData) {
          console.log('CHS data fetched successfully')
          finalTideData = chsData
        }
      } catch (chsError) {
        console.warn('CHS tide data not available:', chsError)
      }

      // Fetch weather forecast
      const result = await fetchOpenMeteoWeather(coordinates, 14)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch weather data')
      }

      // Generate daily forecasts with tide data
      const dailyForecasts = generateOpenMeteoDailyForecasts(
        result.data!, 
        finalTideData, 
        species
      )

      return {
        forecasts: dailyForecasts,
        openMeteoData: result.data!,
        tideData: finalTideData
      }
    } catch (err) {
      console.error('Error fetching fresh forecast data:', err)
      throw err
    }
  }, [coordinates, species, selectedLocation])

  // Main forecast data fetching with caching
  const fetchForecastData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIsCachedData(false)

    try {
      // Try to get cached data first
      const cacheResult = await ForecastCacheService.getCachedForecast(
        selectedLocation,
        selectedHotspot,
        species
      )

      if (cacheResult.cached && cacheResult.data) {
        // We have cached data - use it immediately
        setForecasts(cacheResult.data.forecasts)
        setOpenMeteoData(cacheResult.data.openMeteoData)
        // Set CHS tide data from cache
        const cachedTideData = cacheResult.data.chsTideData || null
        setTideData(cachedTideData)
        setIsCachedData(true)
        setCacheInfo({
          createdAt: cacheResult.createdAt,
          expiresAt: cacheResult.expiresAt
        })
        setLoading(false)

        // Track cache hit event
        const cacheAge = cacheResult.createdAt
          ? (Date.now() - new Date(cacheResult.createdAt).getTime()) / (1000 * 60 * 60) // hours
          : 0
        trackEvent('Cache Hit', {
          location: selectedLocation,
          cacheAge,
          timestamp: new Date().toISOString(),
        })

        // Track forecast loaded event (from cache)
        const loadTime = Date.now() - pageLoadStartTime.current
        trackEvent('Forecast Loaded', {
          location: selectedLocation,
          hotspot: selectedHotspot,
          species: species || undefined,
          cached: true,
          loadTime,
          timestamp: new Date().toISOString(),
        })

        // Start background refresh
        setIsRefreshing(true)
        try {
          const freshData = await fetchFreshForecastData()
          if (freshData) {
            // Store fresh data in cache
            await ForecastCacheService.storeForecastCache(
              selectedLocation,
              selectedHotspot,
              species,
              coordinates,
              freshData.forecasts,
              freshData.openMeteoData,
              freshData.tideData
            )

            // Update UI with fresh data for this user only
            setForecasts(freshData.forecasts)
            setOpenMeteoData(freshData.openMeteoData)
            setTideData(freshData.tideData)
            setIsCachedData(false) // Now showing fresh data
            setCacheInfo({}) // Clear cache info since we have fresh data

            // Track forecast refreshed event
            trackEvent('Forecast Refreshed', {
              location: selectedLocation,
              hotspot: selectedHotspot,
              species: species || undefined,
              timestamp: new Date().toISOString(),
            })
          }
        } catch (refreshError) {
          console.error('Background refresh failed:', refreshError)
          // Keep serving cached data - don't show error to user
        } finally {
          setIsRefreshing(false)
        }
      } else {
        // No cached data - fetch fresh data
        const freshData = await fetchFreshForecastData()
        if (freshData) {
          setForecasts(freshData.forecasts)
          setOpenMeteoData(freshData.openMeteoData)
          setTideData(freshData.tideData)
          setIsCachedData(false)
          setCacheInfo({})

          // Track forecast loaded event (fresh data)
          const loadTime = Date.now() - pageLoadStartTime.current
          trackEvent('Forecast Loaded', {
            location: selectedLocation,
            hotspot: selectedHotspot,
            species: species || undefined,
            cached: false,
            loadTime,
            timestamp: new Date().toISOString(),
          })

          // Store in cache for future requests
          await ForecastCacheService.storeForecastCache(
            selectedLocation,
            selectedHotspot,
            species,
            coordinates,
            freshData.forecasts,
            freshData.openMeteoData,
            freshData.tideData
          )
        }
      }
    } catch (err) {
      console.error('Error fetching forecast data:', err)
      setError('Failed to fetch weather data')
    } finally {
      setLoading(false)
    }
  }, [coordinates, species, selectedLocation, selectedHotspot, fetchFreshForecastData, trackEvent])

  useEffect(() => {
    fetchForecastData()
  }, [fetchForecastData])

  // Track page view once when page loads and data is ready
  useEffect(() => {
    if (!loading && !hasTrackedPageView.current && forecasts.length > 0) {
      const pageLoadTime = Date.now() - pageLoadStartTime.current
      trackEvent('Forecast Page Viewed', {
        location: selectedLocation,
        hotspot: selectedHotspot,
        species: species || undefined,
        pageLoadTime,
        timestamp: new Date().toISOString(),
      })
      hasTrackedPageView.current = true
    }
  }, [loading, forecasts, selectedLocation, selectedHotspot, species, trackEvent])


  // Handle invalid coordinates
  if (!hasValidCoordinates && (lat !== 0 || lon !== 0)) {
    return <ErrorState message="Invalid coordinates provided" />
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen overflow-auto">
        <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-6 pt-16 lg:pt-6">
          {/* Location Selector */}
          <CompactLocationSelector />

          {/* Weather Map */}
          {!loading && currentLocation && (
            <ForecastMapSwitcher
              location={selectedLocation}
              hotspot={selectedHotspot}
              hotspots={currentLocation.hotspots}
              centerCoordinates={coordinates}
              onHotspotChange={handleHotspotChange}
              openMeteoData={openMeteoData}
            />
          )}

          {/* Header - Always show */}
          <NewForecastHeader
            location={selectedLocation}
            hotspot={selectedHotspot}
            isCachedData={isCachedData}
            isRefreshing={isRefreshing}
            cacheInfo={cacheInfo}
          />

          {/* Seasonal Status Banner - Show when species is out of season */}
          <SeasonalStatusBanner
            forecasts={forecastData}
            species={species}
            selectedDay={selectedDay}
          />

          {/* Show error if there is one */}
          {error && (
            <ErrorState message={error} />
          )}

          {/* Show loading skeleton or actual content */}
          {loading ? (
            // Simple loading skeleton instead of full-screen loader
            <div className="space-y-6">
              {/* Top Section Skeleton */}
              <div className="space-y-3 sm:space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-slate-800 rounded-lg h-48 animate-pulse" />
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-slate-800 rounded-lg h-48 animate-pulse" />
                </div>
              </div>

              {/* Main Content Skeleton */}
              <div className="space-y-3 sm:space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
                <div className="lg:col-span-2 space-y-3 sm:space-y-6">
                  <div className="bg-slate-800 rounded-lg h-64 animate-pulse" />
                  <div className="lg:hidden bg-slate-800 rounded-lg h-48 animate-pulse" />
                  <div className="bg-slate-800 rounded-lg h-96 animate-pulse" />
                </div>
                <div className="hidden lg:block lg:col-span-1 space-y-4 sm:space-y-6">
                  <div className="bg-slate-800 rounded-lg h-48 animate-pulse" />
                  <div className="bg-slate-800 rounded-lg h-64 animate-pulse" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Top Section - Always full width on mobile */}
              <div className="space-y-3 sm:space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
                {/* Left column - Forecast Outlook and Chart */}
                <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                  {/* Forecast Outlook */}
                  <DayOutlook
                    forecasts={forecastData}
                    selectedDay={selectedDay}
                    onDaySelect={setSelectedDay}
                    shouldBlurAfterDay={shouldBlurAfterDay}
                  />

                  {/* Hourly Fishing Score Chart - Now above the fold */}
                  <HourlyChart forecasts={forecastData} selectedDay={selectedDay} species={species} />
                </div>

                {/* Overall Score - Full width on mobile */}
                <div className="lg:col-span-1">
                  <OverallScore forecasts={forecastData} selectedDay={selectedDay} />
                </div>
              </div>

              {/* Main Content - Stack on mobile, grid on desktop */}
              <div className="space-y-3 sm:space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
                {/* Charts and Table Section */}
                <div className="lg:col-span-2 space-y-3 sm:space-y-6">
                  {/* Weather and Conditions - Show here on mobile, hide on desktop */}
                  <div className="lg:hidden">
                    <WeatherConditions
                      forecasts={forecastData}
                      openMeteoData={openMeteoData}
                      tideData={tideData}
                      selectedDay={selectedDay}
                    />
                  </div>

                  {/* Tide Status Widget - Mobile */}
                  {tideData && (
                    <div className="lg:hidden mb-4">
                      <TideStatusWidget
                        tideData={tideData}
                      />
                    </div>
                  )}

                  {/* Tide Chart - Mobile */}
                  {tideData && (
                    <div className="lg:hidden mb-4">
                      <TideChart tideData={tideData} />
                    </div>
                  )}

                  {/* Species Regulations - Show here on mobile, hide on desktop */}
                  <div className="lg:hidden">
                    <SpeciesRegulations
                      species={dynamicRegulations?.species || []}
                      areaUrl={dynamicRegulations?.url}
                      lastVerified={dynamicRegulations?.lastVerified}
                      nextReviewDate={dynamicRegulations?.nextReviewDate}
                    />
                  </div>

                  {/* Hourly Data Table */}
                  <HourlyTable
                    forecasts={forecastData}
                    openMeteoData={openMeteoData}
                    tideData={tideData || tideData}
                    selectedDay={selectedDay}
                  />

                  {/* Tide Chart - Desktop (below hourly table) */}
                  {tideData && (
                    <div className="mt-6">
                      <TideChart tideData={tideData} />
                    </div>
                  )}

                </div>

                {/* Right Column - Desktop only */}
                <div className="hidden lg:block lg:col-span-1 space-y-4 sm:space-y-6">
                  {/* Weather and Conditions */}
                  <WeatherConditions
                    forecasts={forecastData}
                    openMeteoData={openMeteoData}
                    tideData={tideData}
                    selectedDay={selectedDay}
                  />

                  {/* Tide Status Widget - Desktop */}
                  {tideData && (
                    <TideStatusWidget
                      tideData={tideData}
                    />
                  )}

                  {/* Species Regulations */}
                  <SpeciesRegulations
                    species={dynamicRegulations?.species || []}
                    areaUrl={dynamicRegulations?.url}
                    lastVerified={dynamicRegulations?.lastVerified}
                    nextReviewDate={dynamicRegulations?.nextReviewDate}
                  />

                  {/* Reports */}
                  <FishingReports />
                </div>
              </div>

              {/* Reports - Show at bottom on mobile */}
              <div className="lg:hidden">
                <FishingReports />
              </div>

              {/* Fishing Report Display */}
              <div className="mt-6">
                <FishingReportDisplay location={selectedLocation} hotspot={selectedHotspot} />
              </div>

              {/* DFO Fishery Notices */}
              <div className="mt-6">
                <DFONoticesSection
                  areas={getDFOAreasForLocation(selectedLocation)}
                  species={species ? [species] : []}
                  limit={10}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function HomePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  
  useEffect(() => {
    const loadDefaultLocation = async () => {
      // If no parameters are provided, redirect to default location
      if (!searchParams.get('location') && !searchParams.get('hotspot')) {
        try {
          // Get user's favorite location if authenticated, otherwise use default
          const defaultLocation = await UserPreferencesService.getDefaultLocation()
          
          const params = new URLSearchParams({
            location: defaultLocation.location,
            hotspot: defaultLocation.hotspot,
            lat: defaultLocation.lat.toString(),
            lon: defaultLocation.lon.toString()
          })
          
          if (defaultLocation.species) {
            params.set('species', defaultLocation.species)
          }
          
          router.replace(`/?${params.toString()}`)
        } catch (error) {
          console.error('Error loading default location:', error)
          // Fallback to hardcoded default
          const params = new URLSearchParams({
            location: 'Victoria, Sidney',
            hotspot: 'Waterfront',
            lat: '48.4284',
            lon: '-123.3656'
          })
          router.replace(`/?${params.toString()}`)
        }
      }
    }

    loadDefaultLocation()
  }, [searchParams, router, user])
  
  return <NewForecastContent />
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  )
}