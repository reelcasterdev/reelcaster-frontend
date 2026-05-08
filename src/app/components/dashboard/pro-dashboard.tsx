import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForecastData } from '@/hooks/use-forecast-data'
import ErrorState from '@/app/components/common/error-state'
import { useAuth } from '@/contexts/auth-context'
import { UserPreferencesService } from '@/lib/user-preferences'

import AppShellV2 from '@/app/components/layout/app-shell-v2'

import MapOverlayTopBar from '@/app/components/v2/map-overlay-top-bar'
import DayOutlookOverlay from '@/app/components/v2/day-outlook-overlay'
import MapLayerControls from '@/app/components/v2/map-layer-controls'
import BottomDataPanel from '@/app/components/v2/bottom-data-panel'
import BottomSheetMobile from '@/app/components/v2/bottom-sheet-mobile'

import V2RightSidebar from '@/app/components/v2/v2-right-sidebar'

import ForecastMapSwitcher from '@/app/components/forecast/forecast-map-switcher'

import AlgorithmInfoModal from '@/app/components/forecast/algorithm-info-modal'
import { Sparkles } from 'lucide-react'

function ProDashboardContent() {
  const data = useForecastData()
  const {
    selectedLocation,
    selectedHotspot,
    species,
    coordinates,
    openMeteoData,
    forecastData,
    tideData,
    loading,
    error,
    selectedDay,
    setSelectedDay,
    hoveredHourIndex,
    setHoveredHourIndex,
    mobilePeriod,
    setMobilePeriod,
    showAlgorithmModal,
    setShowAlgorithmModal,
    currentLocation,
    hasValidCoordinates,
    handleHotspotChange,
    dataMetadata,
  } = data

  const [activeLayers, setActiveLayers] = useState<string[]>([])

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev =>
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    )
  }

  if (
    !hasValidCoordinates &&
    (parseFloat(new URLSearchParams(window.location.search).get('lat') || '0') !== 0 ||
      parseFloat(new URLSearchParams(window.location.search).get('lon') || '0') !== 0)
  ) {
    return <ErrorState message="Invalid coordinates provided" />
  }

  const rightSidebar = !loading ? (
    <V2RightSidebar
      forecastData={forecastData}
      openMeteoData={openMeteoData}
      tideData={tideData}
      selectedDay={selectedDay}
      species={species}
      selectedLocation={selectedLocation}
      coordinates={coordinates}
      onDetailsClick={() => setShowAlgorithmModal(true)}
    />
  ) : null

  return (
    <AppShellV2 rightSidebar={rightSidebar}>
      <div className="relative h-full" data-testid="pro-dashboard-root">
        {/* Pro badge — sits above the map overlays so it's always visible. */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none hidden lg:block">
          <span
            data-testid="pro-badge"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold tracking-wide uppercase"
          >
            <Sparkles className="w-3 h-3" />
            Pro
          </span>
        </div>
        {loading ? (
          <div className="absolute inset-0 bg-rc-bg-darkest flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse [animation-delay:300ms]" />
              </div>
              <p className="text-sm text-rc-text-muted">Loading forecast data...</p>
            </div>
          </div>
        ) : (
          <>
            {currentLocation && (
              <div className="absolute inset-0" data-testid="forecast-map">
                <ForecastMapSwitcher
                  key={`${selectedLocation}-${selectedHotspot}`}
                  variant="fullscreen"
                  location={selectedLocation}
                  hotspot={selectedHotspot}
                  hotspots={currentLocation.hotspots}
                  centerCoordinates={coordinates}
                  onHotspotChange={handleHotspotChange}
                  openMeteoData={openMeteoData}
                  tideData={tideData}
                  activeLayers={activeLayers}
                />
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none hidden lg:flex flex-col z-10">
              <MapOverlayTopBar
                selectedLocation={selectedLocation}
                selectedHotspot={selectedHotspot}
                species={species}
              />

              <DayOutlookOverlay
                forecasts={forecastData}
                selectedDay={selectedDay}
                onDaySelect={setSelectedDay}
              />

              <MapLayerControls
                activeLayers={activeLayers}
                onToggleLayer={toggleLayer}
              />

              <div className="flex-1" />

              <BottomDataPanel
                forecasts={forecastData}
                openMeteoData={openMeteoData}
                tideData={tideData}
                dataMetadata={dataMetadata}
                selectedDay={selectedDay}
                species={species}
                hoveredHourIndex={hoveredHourIndex}
                onHoverChange={setHoveredHourIndex}
                mobilePeriod={mobilePeriod}
                onPeriodChange={setMobilePeriod}
              />
            </div>

            <div className="absolute inset-0 pointer-events-none lg:hidden flex flex-col z-10">
              <MapOverlayTopBar
                selectedLocation={selectedLocation}
                selectedHotspot={selectedHotspot}
                species={species}
                compact
              />

              <DayOutlookOverlay
                forecasts={forecastData}
                selectedDay={selectedDay}
                onDaySelect={setSelectedDay}
                compact
              />

              <MapLayerControls
                activeLayers={activeLayers}
                onToggleLayer={toggleLayer}
              />

              <div className="flex-1" />
            </div>

            <div className="lg:hidden">
              <BottomSheetMobile
                forecastData={forecastData}
                openMeteoData={openMeteoData}
                tideData={tideData}
                dataMetadata={dataMetadata}
                selectedDay={selectedDay}
                species={species}
                selectedLocation={selectedLocation}
                coordinates={coordinates}
                hoveredHourIndex={hoveredHourIndex}
                onHoverChange={setHoveredHourIndex}
                mobilePeriod={mobilePeriod}
                onPeriodChange={setMobilePeriod}
                onDetailsClick={() => setShowAlgorithmModal(true)}
              />
            </div>
          </>
        )}

        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
            <ErrorState message={error} />
          </div>
        )}
      </div>

      <AlgorithmInfoModal
        isOpen={showAlgorithmModal}
        onClose={() => setShowAlgorithmModal(false)}
        species={species}
      />
    </AppShellV2>
  )
}

function ProDashboardInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [defaultsLoaded, setDefaultsLoaded] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setDefaultsLoaded(true)
      return
    }

    const loadDefaultLocation = async () => {
      if (searchParams.get('location') || searchParams.get('hotspot')) {
        setDefaultsLoaded(true)
        return
      }
      try {
        const defaultLocation = await UserPreferencesService.getDefaultLocation()
        const params = new URLSearchParams({
          location: defaultLocation.location,
          hotspot: defaultLocation.hotspot,
          lat: defaultLocation.lat.toString(),
          lon: defaultLocation.lon.toString(),
        })
        if (defaultLocation.species) params.set('species', defaultLocation.species)
        router.replace(`/dashboard?${params.toString()}`)
      } catch (error) {
        console.error('Error loading default location:', error)
        const params = new URLSearchParams({
          location: 'Victoria, Sidney',
          hotspot: 'Waterfront',
          lat: '48.4284',
          lon: '-123.3656',
        })
        router.replace(`/dashboard?${params.toString()}`)
      }
    }

    loadDefaultLocation()
  }, [authLoading, user, searchParams, router])

  if (!defaultsLoaded && !searchParams.get('location') && !searchParams.get('hotspot')) {
    return (
      <AppShellV2 rightSidebar={null}>
        <div className="relative h-full">
          <div className="absolute inset-0 bg-rc-bg-darkest flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        </div>
      </AppShellV2>
    )
  }

  return <ProDashboardContent />
}

export default function ProDashboard() {
  return (
    <Suspense fallback={null}>
      <ProDashboardInner />
    </Suspense>
  )
}
