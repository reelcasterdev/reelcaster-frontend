'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { AppShell } from '../components/layout'
import DashboardHeader from '../components/forecast/dashboard-header'
import {
  MapPin,
  Plus,
  Trash2,
  Loader2,
  Search,
  Wind,
  Thermometer,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Crosshair,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { getAvailableLocations, type FishingLocation, type FishingHotspot } from '../config/locations'
import { fetchOpenMeteoWeather, getWeatherDescription } from '../utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts } from '../utils/fishingCalculations'

// Dynamically import the map picker (SSR-incompatible)
const MapPicker = dynamic(() => import('./map-picker'), { ssr: false })

interface FavoriteSpot {
  id: string
  name: string
  location: string | null
  lat: number
  lon: number
  notes: string | null
  created_at: string
}

interface SpotForecast {
  score: number
  temp: number
  windSpeed: number
  conditions: string
  icon: string
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

function SpotMapPreview({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  if (!MAPBOX_TOKEN) return null

  const src = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+3b82f6(${lon},${lat})/${lon},${lat},11,0/400x180@2x?access_token=${MAPBOX_TOKEN}`

  return (
    <div className="relative w-full h-[160px] bg-rc-bg-darkest">
      <div className="absolute inset-0 bg-rc-bg-light/30 animate-pulse" />
      <img
        src={src}
        alt={`Map of ${name}`}
        className="relative w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  )
}

export default function FavoriteSpotsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [spots, setSpots] = useState<FavoriteSpot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [addingSpot, setAddingSpot] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAddMore, setShowAddMore] = useState(false)
  const [forecasts, setForecasts] = useState<Record<string, SpotForecast>>({})
  const [forecastsLoading, setForecastsLoading] = useState(false)

  const availableLocations = getAvailableLocations()

  const fetchSpots = useCallback(async () => {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const res = await fetch('/api/favorite-spots', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) throw new Error('Failed to fetch spots')

      const data = await res.json()
      setSpots(data.spots || [])
    } catch (err) {
      console.error('Error fetching favorite spots:', err)
      setError('Failed to load favorite spots')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      fetchSpots()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [authLoading, user, fetchSpots])

  // Fetch forecast data for saved favorites
  const fetchForecasts = useCallback(async (savedSpots: FavoriteSpot[]) => {
    if (savedSpots.length === 0) return
    setForecastsLoading(true)

    const spotsToFetch = savedSpots.slice(0, 10)
    const results = await Promise.allSettled(
      spotsToFetch.map(async (spot) => {
        const weatherResult = await fetchOpenMeteoWeather({ lat: spot.lat, lon: spot.lon }, 1)
        if (!weatherResult.success || !weatherResult.data) return null

        const dailyForecasts = generateOpenMeteoDailyForecasts(weatherResult.data, null, null, null)
        if (!dailyForecasts.length || !dailyForecasts[0].minutelyScores.length) return null

        const scores = dailyForecasts[0].minutelyScores
        const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)

        // Get current or midday data point
        const now = Date.now() / 1000
        const currentPoint = scores.reduce((closest, s) =>
          Math.abs(s.timestamp - now) < Math.abs(closest.timestamp - now) ? s : closest
        )

        return {
          spotId: spot.id,
          forecast: {
            score: avgScore,
            temp: Math.round(currentPoint.temp),
            windSpeed: Math.round(currentPoint.windSpeed),
            conditions: currentPoint.conditions,
            icon: currentPoint.icon,
          },
        }
      })
    )

    const forecastMap: Record<string, SpotForecast> = {}
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        forecastMap[result.value.spotId] = result.value.forecast
      }
    })
    setForecasts(forecastMap)
    setForecastsLoading(false)
  }, [])

  useEffect(() => {
    if (!loading && spots.length > 0) {
      fetchForecasts(spots)
    }
  }, [loading, spots, fetchForecasts])

  const isFavorited = (hotspot: FishingHotspot) => {
    return spots.some(
      (s) => s.name === hotspot.name && Math.abs(s.lat - hotspot.coordinates.lat) < 0.01
    )
  }

  const handleAddSpot = async (hotspot: FishingHotspot, location: FishingLocation) => {
    const key = `${hotspot.name}-${location.id}`
    setAddingSpot(key)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/favorite-spots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: hotspot.name,
          location: location.name,
          lat: hotspot.coordinates.lat,
          lon: hotspot.coordinates.lon,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSpots((prev) => [data.spot, ...prev])
      }
    } catch (err) {
      console.error('Error adding spot:', err)
    } finally {
      setAddingSpot(null)
    }
  }

  const handleRemoveSpot = async (id: string) => {
    setDeletingId(id)
    // Optimistic update
    const removedSpot = spots.find((s) => s.id === id)
    setSpots((prev) => prev.filter((s) => s.id !== id))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/favorite-spots?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok && removedSpot) {
        // Revert on failure
        setSpots((prev) => [removedSpot, ...prev])
      }
    } catch (err) {
      console.error('Error deleting spot:', err)
      if (removedSpot) {
        setSpots((prev) => [removedSpot, ...prev])
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handleSaveFromMap = useCallback(async (spot: { name: string; lat: number; lon: number }) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/favorite-spots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: spot.name,
        location: 'Custom Location',
        lat: spot.lat,
        lon: spot.lon,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setSpots((prev) => [data.spot, ...prev])
    } else {
      throw new Error('Failed to save')
    }
  }, [])

  const navigateToDashboard = (path = '/') => {
    sessionStorage.setItem('rc-visited-favorites', 'true')
    router.push(path)
  }

  const handleNavigate = (spot: FavoriteSpot) => {
    const params = new URLSearchParams({
      hotspot: spot.name,
      lat: spot.lat.toString(),
      lon: spot.lon.toString(),
    })
    if (spot.location) {
      params.set('location', spot.location)
    }
    navigateToDashboard(`/?${params.toString()}`)
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400 bg-emerald-500/30'
    if (score >= 40) return 'text-amber-400 bg-amber-500/30'
    return 'text-red-400 bg-red-500/30'
  }

  const getWeatherEmoji = (icon: string) => {
    if (icon.startsWith('01')) return '☀️'
    if (icon.startsWith('02')) return '🌤️'
    if (icon.startsWith('03') || icon.startsWith('04')) return '☁️'
    if (icon.startsWith('09') || icon.startsWith('10')) return '🌧️'
    if (icon.startsWith('11')) return '⛈️'
    if (icon.startsWith('13')) return '❄️'
    if (icon.startsWith('50')) return '🌫️'
    return '🌤️'
  }

  // Filter hotspots by search query
  const filterHotspots = (hotspots: FishingHotspot[]) => {
    if (!searchQuery) return hotspots
    return hotspots.filter((h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const isOnboarding = !loading && spots.length === 0

  if (authLoading || loading) {
    return (
      <AppShell showLocationPanel={false}>
        <div className="p-4 lg:p-6">
          <DashboardHeader
            title="Favorite Spots"
            showTimeframe={false}
            showSetLocation={false}
            showCustomize={false}
          />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-rc-text-muted animate-spin" />
          </div>
        </div>
      </AppShell>
    )
  }

  // =========================================================================
  // Mode A: Onboarding (no saved favorites)
  // =========================================================================
  if (isOnboarding) {
    return (
      <AppShell showLocationPanel={false}>
        <div className="flex-1 min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-rc-text">
                Pick Your Favorite Spots
              </h1>
              <p className="text-sm text-rc-text-muted mt-1">
                Select the fishing hotspots you want to track
              </p>
            </div>
            <button
              onClick={() => navigateToDashboard()}
              className="text-sm text-rc-text-muted hover:text-rc-text transition-colors px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Skip →
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rc-text-muted" />
            <input
              type="text"
              placeholder="Search hotspots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-rc-bg-dark border border-rc-bg-light rounded-xl pl-10 pr-4 py-2.5 text-sm text-rc-text placeholder:text-rc-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Map Picker — add custom location */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crosshair className="w-4 h-4 text-rc-text-muted" />
              <h2 className="text-sm font-semibold text-rc-text-muted uppercase tracking-wider">
                Or pick any location on the map
              </h2>
            </div>
            <MapPicker onSave={handleSaveFromMap} />
          </div>

          {/* Hotspot Groups */}
          <div className="space-y-8">
            {availableLocations.map((location) => {
              const filtered = filterHotspots(location.hotspots)
              if (filtered.length === 0) return null

              return (
                <div key={location.id}>
                  <h2 className="text-sm font-semibold text-rc-text-muted uppercase tracking-wider mb-3">
                    {location.name}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filtered.map((hotspot) => {
                      const favorited = isFavorited(hotspot)
                      const key = `${hotspot.name}-${location.id}`
                      const isAdding = addingSpot === key

                      return (
                        <button
                          key={hotspot.name}
                          onClick={() =>
                            favorited
                              ? handleRemoveSpot(
                                  spots.find(
                                    (s) =>
                                      s.name === hotspot.name &&
                                      Math.abs(s.lat - hotspot.coordinates.lat) < 0.01
                                  )!.id
                                )
                              : handleAddSpot(hotspot, location)
                          }
                          disabled={isAdding}
                          className={`group/card relative rounded-xl border overflow-hidden transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            favorited
                              ? 'border-blue-500/50 ring-2 ring-blue-500/30'
                              : 'border-rc-bg-light hover:border-blue-500/40'
                          }`}
                        >
                          {/* Map thumbnail */}
                          <SpotMapPreview
                            lat={hotspot.coordinates.lat}
                            lon={hotspot.coordinates.lon}
                            name={hotspot.name}
                          />

                          {/* Plus indicator (always visible on mobile, hover on desktop) */}
                          {!favorited && !isAdding && (
                            <>
                              {/* Always-visible plus badge on mobile */}
                              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity">
                                <Plus className="w-3.5 h-3.5 text-rc-text" />
                              </div>
                              {/* Hover overlay for desktop */}
                              <div className="absolute inset-0 bg-blue-600/0 group-hover/card:bg-blue-600/20 transition-colors flex items-center justify-center opacity-0 group-hover/card:opacity-100">
                                <div className="p-2 rounded-full bg-blue-600/80">
                                  <Plus className="w-5 h-5 text-rc-text" />
                                </div>
                              </div>
                            </>
                          )}

                          {/* Label overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between gap-1">
                            <span className="text-sm font-medium text-rc-text truncate">
                              {hotspot.name}
                            </span>
                            {isAdding ? (
                              <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                            ) : favorited ? (
                              <div className="p-1 rounded-full bg-blue-600">
                                <Check className="w-3.5 h-3.5 text-rc-text flex-shrink-0" />
                              </div>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom Sticky Bar */}
          {spots.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-rc-bg-dark/95 backdrop-blur-sm border-t border-rc-bg-light p-4 pb-safe z-50">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <span className="text-sm text-rc-text-light">
                  {spots.length} favorite{spots.length !== 1 ? 's' : ''} added
                </span>
                <button
                  onClick={() => navigateToDashboard()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-rc-text font-medium rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-rc-bg-dark"
                >
                  Continue to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    )
  }

  // =========================================================================
  // Mode B: Returning User (has favorites)
  // =========================================================================
  return (
    <AppShell showLocationPanel={false}>
      <div className="flex-1 min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-rc-text">
              Your Favorite Spots
            </h1>
            <p className="text-sm text-rc-text-muted mt-1">
              {spots.length} spot{spots.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button
            onClick={() => navigateToDashboard()}
            className="flex items-center gap-2 px-4 py-2 bg-rc-bg-dark hover:bg-rc-bg-light border border-rc-bg-light rounded-xl text-sm text-rc-text-light transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Dashboard
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-xl">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={fetchSpots}
              className="mt-3 px-3 py-1.5 text-xs font-medium text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Try again
            </button>
          </div>
        )}

        {/* Favorite Spot Cards with Forecast Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spots.map((spot) => {
            const forecast = forecasts[spot.id]
            const isLoadingForecast = forecastsLoading && !forecast

            return (
              <div
                key={spot.id}
                className="bg-rc-bg-dark border border-rc-bg-light rounded-xl overflow-hidden hover:border-blue-500/30 transition-colors group shadow-sm shadow-black/25"
              >
                {/* Map Preview */}
                <SpotMapPreview lat={spot.lat} lon={spot.lon} name={spot.name} />

                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-rc-text truncate">
                        {spot.name}
                      </h3>
                      {spot.location && (
                        <div className="flex items-center gap-1 text-xs text-rc-text-muted mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{spot.location}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveSpot(spot.id)}
                      disabled={deletingId === spot.id}
                      className="p-2.5 -m-1 text-rc-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Remove ${spot.name} from favorites`}
                    >
                      {deletingId === spot.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Forecast Data */}
                  {isLoadingForecast ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-20 bg-rc-bg-light rounded-full animate-pulse" />
                        <div className="h-4 w-24 bg-rc-bg-light rounded animate-pulse" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-14 bg-rc-bg-light rounded animate-pulse" />
                        <div className="h-4 w-16 bg-rc-bg-light rounded animate-pulse" />
                      </div>
                    </div>
                  ) : forecast ? (
                    <div className="mt-3 space-y-2">
                      {/* Score + Weather Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getScoreColor(
                            forecast.score
                          )}`}
                        >
                          Score: {forecast.score}
                        </span>
                        <span className="text-xs text-rc-text-muted">
                          {getWeatherEmoji(forecast.icon)}{' '}
                          {getWeatherDescription(
                            // Reverse lookup weather code from description
                            parseInt(forecast.icon) || 0
                          ).description !== 'unknown'
                            ? forecast.conditions
                            : forecast.conditions}
                        </span>
                      </div>
                      {/* Metrics Row */}
                      <div className="flex items-center gap-3 text-xs text-rc-text-muted">
                        <span className="flex items-center gap-1">
                          <Thermometer className="w-3 h-3" />
                          {forecast.temp}°C
                        </span>
                        <span className="flex items-center gap-1">
                          <Wind className="w-3 h-3" />
                          {forecast.windSpeed} km/h
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 border-t border-rc-bg-light flex items-center justify-between">
                  <span className="text-xs text-rc-text-muted">
                    {Number(spot.lat).toFixed(4)}°N, {Math.abs(Number(spot.lon)).toFixed(4)}°W
                  </span>
                  <button
                    onClick={() => handleNavigate(spot)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors px-2 py-1 -mr-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    View Forecast →
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add More Spots Section */}
        <div className="border border-rc-bg-light rounded-xl overflow-hidden shadow-sm shadow-black/25">
          <button
            onClick={() => setShowAddMore(!showAddMore)}
            className="w-full flex items-center justify-between p-4 bg-rc-bg-dark hover:bg-rc-bg-light/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-t-xl"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-rc-text-muted" />
              <span className="font-medium text-rc-text-light">Add More Spots</span>
            </div>
            {showAddMore ? (
              <ChevronUp className="w-5 h-5 text-rc-text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-rc-text-muted" />
            )}
          </button>

          {showAddMore && (
            <div className="p-4 space-y-4 border-t border-rc-bg-light">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rc-text-muted" />
                <input
                  type="text"
                  placeholder="Search hotspots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-rc-bg-darkest border border-rc-bg-light rounded-xl pl-10 pr-4 py-2.5 text-sm text-rc-text placeholder:text-rc-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-rc-bg-light transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-rc-text-muted hover:text-rc-text" />
                  </button>
                )}
              </div>

              {/* Hotspot Groups */}
              {availableLocations.map((location) => {
                const unfavorited = filterHotspots(
                  location.hotspots.filter((h) => !isFavorited(h))
                )
                if (unfavorited.length === 0) return null

                return (
                  <div key={location.id}>
                    <h3 className="text-xs font-semibold text-rc-text-muted uppercase tracking-wider mb-3">
                      {location.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {unfavorited.map((hotspot) => {
                        const key = `${hotspot.name}-${location.id}`
                        const isAdding = addingSpot === key

                        return (
                          <button
                            key={hotspot.name}
                            onClick={() => handleAddSpot(hotspot, location)}
                            disabled={isAdding}
                            className="flex items-center gap-1.5 px-3 py-2 bg-rc-bg-darkest border border-rc-bg-light rounded-lg text-sm text-rc-text-light hover:border-blue-500/50 hover:text-blue-400 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            {isAdding ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            {hotspot.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* All favorited */}
              {availableLocations.every((loc) =>
                loc.hotspots.every((h) => isFavorited(h))
              ) && (
                <p className="text-center text-sm text-rc-text-muted py-4">
                  All available hotspots have been added!
                </p>
              )}

              {/* Map picker for custom locations */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Crosshair className="w-4 h-4 text-rc-text-muted" />
                  <h3 className="text-xs font-semibold text-rc-text-muted uppercase tracking-wider">
                    Or pick any location on the map
                  </h3>
                </div>
                <MapPicker onSave={handleSaveFromMap} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
