'use client'

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  fetchOpenMeteoWeather,
  fetchOpenMeteoMarine,
  mergeMarineData,
  ProcessedOpenMeteoData
} from './utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts, OpenMeteoDailyForecast } from './utils/fishingCalculations'
import { fetchCHSTideData, CHSWaterData } from './utils/chsTideApi'
import ForecastCacheService from './utils/forecastCacheService'
import { useAnalytics } from '@/hooks/use-analytics'
import ErrorState from './components/common/error-state'


import { AppShell } from './components/layout'
import DashboardHeader from './components/forecast/dashboard-header'

import NewForecastHeader from './components/forecast/new-forecast-header'
import DayOutlookNew from './components/forecast/day-outlook-new'
import HourlyChartNew from './components/forecast/hourly-chart-new'
import HourlyTableNew from './components/forecast/hourly-table-new'
import WeatherConditions from './components/forecast/weather-conditions'
import FishingReports from './components/forecast/fishing-reports'
import { FishingReportDisplay } from './components/forecast/fishing-report-display'
import SeasonalStatusBanner from './components/forecast/seasonal-status-banner'
import AlgorithmInfoModal from './components/forecast/algorithm-info-modal'
import { setAlgorithmVersion } from './utils/speciesAlgorithms'
import type { AlgorithmVersion } from './components/forecast/algorithm-version-toggle'
import { useAuthForecast } from '@/hooks/use-auth-forecast'
import { useAuth } from '@/contexts/auth-context'
import { UserPreferencesService } from '@/lib/user-preferences'

// New widget components
import OverallScoreWidget from './components/forecast/overall-score-widget'
import MapViewWidget from './components/forecast/map-view-widget'
import WeatherWidget from './components/forecast/weather-widget'
import TideWidget from './components/forecast/tide-widget'
import TideForecastChart from './components/forecast/tide-forecast-chart'
import MapModal from './components/forecast/map-modal'
import ForecastMap from './components/forecast/forecast-map'
import ForecastMapSwitcher from './components/forecast/forecast-map-switcher'

// Centralized config
import {
  FISHING_LOCATIONS,
  type FishingHotspot,
} from './config/locations'

// Use centralized config
const fishingLocations = FISHING_LOCATIONS

function NewForecastContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { trackEvent } = useAnalytics()
  const pageLoadStartTime = useRef<number>(Date.now())
  const hasTrackedPageView = useRef<boolean>(false)
  const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitialDataLoaded = useRef<boolean>(false)

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
  const [hoveredHourIndex, setHoveredHourIndex] = useState<number | null>(null)
  const [mobilePeriod, setMobilePeriod] = useState<'am' | 'pm'>('am')
  const [showAlgorithmModal, setShowAlgorithmModal] = useState(false)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)

  // Cache-related state
  const [isCachedData, setIsCachedData] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<{ createdAt?: string; expiresAt?: string }>({})
  
  // Use auth forecast hook to manage data based on authentication
  const { forecastData, shouldBlurAfterDay } = useAuthForecast(forecasts)

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
      // Fetch ALL data in parallel: weather, marine, AND tide
      const locationId = selectedLocation.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')

      const [weatherResult, marineResult, tideResult] = await Promise.all([
        fetchOpenMeteoWeather(coordinates, 14),
        fetchOpenMeteoMarine(coordinates, 7),
        // Wrap tide fetch to handle errors gracefully
        fetchCHSTideData(locationId).catch(err => {
          console.warn('CHS tide data not available:', err)
          return null
        })
      ])

      const finalTideData = tideResult || null
      if (finalTideData) {
        console.log('CHS data fetched successfully')
      }

      if (!weatherResult.success) {
        throw new Error(weatherResult.error || 'Failed to fetch weather data')
      }

      // Merge marine data into weather data (sea temp, waves, currents)
      const weatherData = weatherResult.data!
      if (marineResult.success && marineResult.data) {
        console.log('Marine data fetched successfully - merging into weather data')
        console.log('Marine data sample:', {
          hourlyPoints: marineResult.data.hourly.length,
          firstSST: marineResult.data.hourly[0]?.seaSurfaceTemp,
          firstWaveHeight: marineResult.data.hourly[0]?.waveHeight
        })

        weatherData.minutely15 = mergeMarineData(
          weatherData.minutely15,
          marineResult.data.hourly
        )

        // Verify merge worked
        const merged = weatherData.minutely15.filter(d => d.seaSurfaceTemp !== undefined)
        console.log('Merge result:', {
          totalWeatherPoints: weatherData.minutely15.length,
          pointsWithSST: merged.length,
          sampleSST: weatherData.minutely15[0]?.seaSurfaceTemp,
          sampleWaveHeight: weatherData.minutely15[0]?.waveHeight
        })
      } else {
        console.warn('Marine data not available:', marineResult.error)
      }

      // Generate daily forecasts with tide data
      const dailyForecasts = generateOpenMeteoDailyForecasts(
        weatherData,
        finalTideData,
        species
      )

      return {
        forecasts: dailyForecasts,
        openMeteoData: weatherData,
        tideData: finalTideData
      }
    } catch (err) {
      console.error('Error fetching fresh forecast data:', err)
      throw err
    }
  }, [coordinates, species, selectedLocation])

  // Main forecast data fetching with caching
  const fetchForecastData = useCallback(async () => {
    // Only show full loader on initial load (no existing data)
    // For subsequent fetches (e.g., tab refocus), refresh in background without loader
    const isInitialLoad = !hasInitialDataLoaded.current
    if (isInitialLoad) {
      setLoading(true)
    } else {
      // Background refresh - show subtle indicator instead of full loader
      setIsRefreshing(true)
    }
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
        hasInitialDataLoaded.current = true
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
          hasInitialDataLoaded.current = true

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
      // Only show error if this is the initial load (no existing data to display)
      if (isInitialLoad) {
        setError('Failed to fetch weather data')
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      } else {
        setIsRefreshing(false)
      }
    }
  }, [coordinates, species, selectedLocation, selectedHotspot, fetchFreshForecastData, trackEvent])

  // Handle algorithm version change
  const handleAlgorithmChange = useCallback((version: AlgorithmVersion) => {
    setAlgorithmVersion(version)
    fetchForecastData()
  }, [fetchForecastData])

  // Reset initial data flag when location changes (so new locations show loader)
  const prevLocationRef = useRef<string | null>(null)
  useEffect(() => {
    const currentLocationKey = `${selectedLocation}-${selectedHotspot}`
    if (prevLocationRef.current !== null && prevLocationRef.current !== currentLocationKey) {
      // Location changed - reset so we show loader for new location if not cached
      hasInitialDataLoaded.current = false
    }
    prevLocationRef.current = currentLocationKey
  }, [selectedLocation, selectedHotspot])

  // Debounced fetch to prevent rapid re-fetches on URL param changes
  useEffect(() => {
    // Clear any pending fetch
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current)
    }

    // Debounce fetch by 100ms to batch rapid param changes
    fetchDebounceRef.current = setTimeout(() => {
      fetchForecastData()
    }, 100)

    return () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current)
      }
    }
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

  // Right sidebar content for desktop
  const rightSidebarContent = !loading ? (
    <div className="p-4 space-y-4">
      {/* Overall Score Widget */}
      <OverallScoreWidget
        score={
          forecastData[selectedDay]?.twoHourForecasts.length > 0
            ? Math.max(...forecastData[selectedDay].twoHourForecasts.map(f => f.score.total))
            : 0
        }
        onDetailsClick={() => setShowAlgorithmModal(true)}
      />

      {/* Map View Widget */}
      <MapViewWidget
        lat={coordinates.lat}
        lon={coordinates.lon}
        locationName={selectedLocation}
        hotspotName={selectedHotspot}
        onExpand={() => setIsMapModalOpen(true)}
      />

      {/* Weather Widget */}
      <WeatherWidget
        forecasts={forecastData}
        openMeteoData={openMeteoData}
        selectedDay={selectedDay}
      />

      {/* Tide Widget */}
      <TideWidget tideData={tideData} selectedDay={selectedDay} />
    </div>
  ) : null

  return (
    <AppShell rightSidebar={rightSidebarContent}>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

        <DashboardHeader
          title="Reports"
          showAlgorithm={false}
          showTimeframe={false}
          onAlgorithmChange={handleAlgorithmChange}
        />

          <NewForecastHeader
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

          {/* Show loading skeleton or actual content for data-dependent components */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {loading ? (
              <div className="space-y-3 sm:space-y-4">
                {/* Day Outlook Skeleton */}
                <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="flex-shrink-0 w-20 h-24 bg-rc-bg-light rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>
                {/* Hourly Chart Skeleton */}
                <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl h-64 animate-pulse" />
                {/* Hourly Table Skeleton */}
                <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl h-96 animate-pulse" />
                {/* Tide Chart Skeleton */}
                <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl h-64 animate-pulse" />
              </div>
            ) : (
              <>
                {/* Forecast Outlook */}
                <DayOutlookNew
                  forecasts={forecastData}
                  selectedDay={selectedDay}
                  onDaySelect={setSelectedDay}
                  shouldBlurAfterDay={shouldBlurAfterDay}
                />

                {/* Weather Map - between 14-day outlook and hourly data */}
                {currentLocation && (
                  <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4" onClick={(e) => e.stopPropagation()}>
                    <ForecastMapSwitcher
                      key={`${selectedLocation}-${selectedHotspot}`}
                      location={selectedLocation}
                      hotspot={selectedHotspot}
                      hotspots={currentLocation.hotspots}
                      centerCoordinates={coordinates}
                      onHotspotChange={handleHotspotChange}
                      openMeteoData={openMeteoData}
                      tideData={tideData}
                    />
                  </div>
                )}

                {/* Hourly Fishing Score Chart */}
                <HourlyChartNew forecasts={forecastData} selectedDay={selectedDay} species={species} tideData={tideData} onHoverChange={setHoveredHourIndex} mobilePeriod={mobilePeriod} onPeriodChange={setMobilePeriod} />

                {/* Hourly Data Table - directly below chart */}
                <HourlyTableNew
                  forecasts={forecastData}
                  openMeteoData={openMeteoData}
                  tideData={tideData || tideData}
                  selectedDay={selectedDay}
                  highlightedIndex={hoveredHourIndex}
                  mobilePeriod={mobilePeriod}
                  onPeriodChange={setMobilePeriod}
                />

                {/* 14-Day Tide Forecast Chart */}
                <TideForecastChart tideData={tideData} />
              </>
            )}
          </div>

          <div className="lg:col-span-2 space-y-3 sm:space-y-6">
            {/* Weather and Conditions - Show here on mobile, hide on desktop */}
            {!loading && (
              <div className="lg:hidden">
                <WeatherConditions
                  forecasts={forecastData}
                  openMeteoData={openMeteoData}
                  tideData={tideData}
                  selectedDay={selectedDay}
                />
              </div>
            )}
          </div>

          {/* Reports - Show at bottom on mobile */}
          <div className="lg:hidden">
            <FishingReports />
          </div>

          {/* Fishing Report Display */}
          <div className="mt-6">
            <FishingReportDisplay location={selectedLocation} hotspot={selectedHotspot} />
          </div>
      </div>

      {/* Algorithm Info Modal */}
      <AlgorithmInfoModal
        isOpen={showAlgorithmModal}
        onClose={() => setShowAlgorithmModal(false)}
        species={species}
      />

      {/* Map Modal */}
      {currentLocation && (
        <MapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          location={selectedLocation}
          hotspot={selectedHotspot}
          hotspots={currentLocation.hotspots}
          centerCoordinates={coordinates}
          onHotspotChange={handleHotspotChange}
          openMeteoData={openMeteoData}
          tideData={tideData}
        />
      )}
    </AppShell>
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