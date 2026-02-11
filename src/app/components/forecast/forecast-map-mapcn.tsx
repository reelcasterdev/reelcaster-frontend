'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  MapPopup,
  MapControls,
  type MapRef,
  type MapViewport,
} from '@/components/ui/map'
import { MapPin, Wind, CloudRain, Thermometer, X, Star, Heart, Check, Loader2, Navigation, Crosshair } from 'lucide-react'
import type MapLibreGL from 'maplibre-gl'
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { useAuth } from '@/contexts/auth-context'
import { UserPreferencesService } from '@/lib/user-preferences'
import { supabase } from '@/lib/supabase'

interface FishingHotspot {
  name: string
  coordinates: { lat: number; lon: number }
}

interface ForecastMapMapcnProps {
  location: string
  hotspot: string
  hotspots: FishingHotspot[]
  centerCoordinates: { lat: number; lon: number }
  onHotspotChange: (hotspot: FishingHotspot) => void
  openMeteoData: ProcessedOpenMeteoData | null
  tideData?: CHSWaterData | null
}

const ForecastMapMapcn: React.FC<ForecastMapMapcnProps> = ({
  location,
  hotspot,
  hotspots,
  centerCoordinates,
  onHotspotChange,
  openMeteoData,
  tideData,
}) => {
  const mapRef = useRef<MapRef>(null)
  const { user } = useAuth()

  const [viewport, setViewport] = useState<MapViewport>({
    center: [centerCoordinates.lon, centerCoordinates.lat],
    zoom: 10,
    bearing: 0,
    pitch: 0,
  })

  // Custom pin state
  const [customPin, setCustomPin] = useState<{ lat: number; lng: number } | null>(
    () => {
      if (hotspot === 'Custom Pin') {
        return { lat: centerCoordinates.lat, lng: centerCoordinates.lon }
      }
      return null
    }
  )
  const [showPinPopup, setShowPinPopup] = useState(true)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [defaultStatus, setDefaultStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Selected hotspot popup
  const [selectedHotspotPopup, setSelectedHotspotPopup] = useState<string | null>(hotspot)

  // Update viewport when center coordinates change
  React.useEffect(() => {
    setViewport(prev => ({
      ...prev,
      center: [centerCoordinates.lon, centerCoordinates.lat],
    }))
  }, [centerCoordinates])

  // Handle hotspot click
  const handleHotspotClick = useCallback((hotspotData: FishingHotspot) => {
    setCustomPin(null)
    setShowSaveForm(false)
    setSaveStatus('idle')
    setDefaultStatus('idle')
    setSelectedHotspotPopup(hotspotData.name)
    onHotspotChange(hotspotData)
  }, [onHotspotChange])

  // Handle custom pin drag end
  const handlePinDragEnd = useCallback((lngLat: { lng: number; lat: number }) => {
    setCustomPin({ lat: lngLat.lat, lng: lngLat.lng })
    setSaveStatus('idle')
    setDefaultStatus('idle')
    onHotspotChange({
      name: 'Custom Pin',
      coordinates: { lat: lngLat.lat, lon: lngLat.lng },
    })
  }, [onHotspotChange])

  // Close pin popup
  const handleClosePinPopup = useCallback(() => {
    setShowPinPopup(false)
    setShowSaveForm(false)
  }, [])

  // Clear custom pin
  const handleClearCustomPin = useCallback(() => {
    setCustomPin(null)
    setShowSaveForm(false)
    setShowPinPopup(true)
    setSaveStatus('idle')
    setDefaultStatus('idle')
  }, [])

  // Set custom pin as default location
  const handleSetAsDefault = useCallback(async () => {
    if (!customPin || !user) return
    setDefaultStatus('saving')
    const result = await UserPreferencesService.updateUserPreferences({
      favoriteLocation: location,
      favoriteHotspot: 'Custom Pin',
      favoriteLat: customPin.lat,
      favoriteLon: customPin.lng,
    })
    setDefaultStatus(result.success ? 'saved' : 'error')
  }, [customPin, user, location])

  // Save custom pin to favorites
  const handleSaveToFavorites = useCallback(async () => {
    if (!customPin || !user || !saveName.trim()) return
    setSaveStatus('saving')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setSaveStatus('error')
        return
      }
      const res = await fetch('/api/favorite-spots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: saveName.trim(),
          lat: customPin.lat,
          lon: customPin.lng,
          location,
        }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        setShowSaveForm(false)
        setSaveName('')
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }, [customPin, user, saveName, location])

  // Get current weather data for display
  const currentWeather = useMemo(() => {
    if (!openMeteoData || !openMeteoData.minutely15 || openMeteoData.minutely15.length === 0) {
      return null
    }
    const current = openMeteoData.minutely15[0]
    return {
      temp: current.temp,
      windSpeed: current.windSpeed,
      windDirection: current.windDirection,
      precipitation: current.precipitation,
    }
  }, [openMeteoData])

  // Get wind direction label
  const getWindDirectionLabel = (deg: number) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    return dirs[Math.round(deg / 45) % 8]
  }

  // Register map click handler for placing pins
  React.useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const handler = (e: MapLibreGL.MapMouseEvent) => {
      const lngLat = e.lngLat
      setCustomPin({ lat: lngLat.lat, lng: lngLat.lng })
      setShowPinPopup(true)
      setShowSaveForm(false)
      setSaveStatus('idle')
      setDefaultStatus('idle')
      setSelectedHotspotPopup(null)
      onHotspotChange({
        name: 'Custom Pin',
        coordinates: { lat: lngLat.lat, lon: lngLat.lng },
      })
    }
    map.on('click', handler)
    return () => {
      map.off('click', handler)
    }
  }, [onHotspotChange])

  return (
    <div className="space-y-3">
      {/* Map Header - Beautiful gradient header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <Navigation className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-rc-text">{location}</h3>
            <p className="text-[10px] text-rc-text-muted">MapLibre - Experimental</p>
          </div>
        </div>
        {currentWeather && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rc-bg-light/50 border border-rc-bg-light">
              <Thermometer className="w-3 h-3 text-orange-400" />
              <span className="text-xs text-rc-text font-medium">{currentWeather.temp.toFixed(1)}°C</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rc-bg-light/50 border border-rc-bg-light">
              <Wind className="w-3 h-3 text-sky-400" />
              <span className="text-xs text-rc-text font-medium">
                {currentWeather.windSpeed.toFixed(0)} km/h {getWindDirectionLabel(currentWeather.windDirection)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rc-bg-light/50 border border-rc-bg-light">
              <CloudRain className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-rc-text font-medium">{currentWeather.precipitation.toFixed(1)} mm</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[350px] sm:h-[500px] rounded-xl overflow-hidden border border-rc-bg-light shadow-lg shadow-black/20">
        <Map
          ref={mapRef}
          theme="dark"
          viewport={viewport}
          onViewportChange={setViewport}
        >
          {/* Map Controls */}
          <MapControls
            position="bottom-right"
            showZoom
            showCompass
            showLocate
          />

          {/* Hotspot Markers */}
          {hotspots.map((hotspotData) => {
            const isSelected = hotspotData.name === hotspot
            const showPopup = selectedHotspotPopup === hotspotData.name

            return (
              <MapMarker
                key={hotspotData.name}
                longitude={hotspotData.coordinates.lon}
                latitude={hotspotData.coordinates.lat}
                onClick={(e) => {
                  e.stopPropagation()
                  handleHotspotClick(hotspotData)
                }}
              >
                <MarkerContent>
                  <div className="relative">
                    {/* Pulse ring for selected */}
                    {isSelected && (
                      <div className="absolute inset-0 -m-2 rounded-full bg-blue-500/20 animate-ping" />
                    )}
                    <div
                      className={`relative rounded-full transition-all duration-200 ${
                        isSelected
                          ? 'w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/40 ring-2 ring-white/80'
                          : 'w-3.5 h-3.5 bg-gradient-to-br from-blue-300 to-blue-500 shadow-md shadow-blue-500/20 ring-1 ring-white/60 hover:w-4 hover:h-4 hover:shadow-blue-500/40'
                      }`}
                    />
                  </div>
                </MarkerContent>
                <MarkerTooltip className="!bg-rc-bg-dark/95 !text-rc-text border border-rc-bg-light backdrop-blur-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold">{hotspotData.name}</p>
                    <p className="text-[10px] text-rc-text-muted font-mono">
                      {hotspotData.coordinates.lat.toFixed(4)}, {hotspotData.coordinates.lon.toFixed(4)}
                    </p>
                    {isSelected && (
                      <p className="text-[10px] text-blue-400 font-medium pt-0.5">Active</p>
                    )}
                  </div>
                </MarkerTooltip>
              </MapMarker>
            )
          })}

          {/* Custom Pin Marker */}
          {customPin && (
            <MapMarker
              longitude={customPin.lng}
              latitude={customPin.lat}
              draggable
              onDragEnd={handlePinDragEnd}
              onClick={(e) => {
                e.stopPropagation()
                setShowPinPopup(true)
              }}
            >
              <MarkerContent>
                <div className="relative cursor-grab active:cursor-grabbing">
                  {/* Glow effect */}
                  <div className="absolute inset-0 -m-3 rounded-full bg-amber-500/10 blur-md" />
                  <div className="relative">
                    <MapPin className="w-8 h-8 text-amber-500 fill-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" />
                  </div>
                </div>
              </MarkerContent>
            </MapMarker>
          )}

          {/* Custom Pin Popup */}
          {customPin && showPinPopup && (
            <MapPopup
              longitude={customPin.lng}
              latitude={customPin.lat}
              onClose={handleClosePinPopup}
              closeOnClick={false}
              focusAfterOpen={false}
              className="!bg-rc-bg-dark/95 !border-rc-bg-light !text-rc-text backdrop-blur-sm !p-0 min-w-[220px]"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={handleClosePinPopup}
                className="absolute top-2 right-2 p-0.5 rounded-md hover:bg-rc-bg-light transition-colors z-20"
              >
                <X className="w-3.5 h-3.5 text-rc-text-muted hover:text-rc-text" />
              </button>

              <div className="p-3 pr-8">
                <div className="flex items-center gap-2 mb-1">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-xs font-semibold text-amber-400">Custom Pin</p>
                </div>
                <p className="text-[10px] text-rc-text-muted font-mono">
                  {customPin.lat.toFixed(4)}, {customPin.lng.toFixed(4)}
                </p>
                <p className="text-[10px] text-rc-text-muted/50 mt-1">Drag to adjust position</p>
              </div>

              {/* Action buttons */}
              <div className="border-t border-rc-bg-light px-2 py-1.5 space-y-0.5">
                {user ? (
                  <button
                    type="button"
                    onClick={handleSetAsDefault}
                    disabled={defaultStatus === 'saving' || defaultStatus === 'saved'}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-rc-text-light hover:bg-rc-bg-light rounded transition-colors disabled:opacity-50"
                  >
                    {defaultStatus === 'saving' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : defaultStatus === 'saved' ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Star className="w-3 h-3 text-amber-400" />
                    )}
                    <span>{defaultStatus === 'saved' ? 'Default saved!' : 'Set as Default'}</span>
                  </button>
                ) : null}

                {user ? (
                  !showSaveForm ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSaveForm(true)
                        setSaveStatus('idle')
                      }}
                      disabled={saveStatus === 'saved'}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-rc-text-light hover:bg-rc-bg-light rounded transition-colors disabled:opacity-50"
                    >
                      {saveStatus === 'saved' ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Heart className="w-3 h-3 text-pink-400" />
                      )}
                      <span>{saveStatus === 'saved' ? 'Saved!' : 'Save to Favorites'}</span>
                    </button>
                  ) : (
                    <div className="space-y-1.5 px-1">
                      <input
                        type="text"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveToFavorites()
                          if (e.key === 'Escape') setShowSaveForm(false)
                        }}
                        placeholder="Spot name..."
                        className="w-full bg-rc-bg-light border border-rc-bg-light rounded px-2 py-1 text-[11px] text-rc-text placeholder:text-rc-text-muted focus:outline-none focus:ring-1 focus:ring-amber-500"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={handleSaveToFavorites}
                          disabled={!saveName.trim() || saveStatus === 'saving'}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-500 text-rc-text text-[11px] rounded transition-colors disabled:opacity-50"
                        >
                          {saveStatus === 'saving' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSaveForm(false)
                            setSaveName('')
                          }}
                          className="px-2 py-1 bg-rc-bg-light hover:bg-rc-bg-dark text-rc-text-muted text-[11px] rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {saveStatus === 'error' && (
                        <p className="text-[10px] text-red-400">Failed to save. Try again.</p>
                      )}
                    </div>
                  )
                ) : (
                  <p className="px-2 py-1.5 text-[10px] text-rc-text-muted">Sign in to save spots</p>
                )}

                <button
                  type="button"
                  onClick={handleClearCustomPin}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-red-400 hover:bg-rc-bg-light rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Pin</span>
                </button>
              </div>
            </MapPopup>
          )}
        </Map>

        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        {/* Custom Pin Instructions */}
        <div className="absolute bottom-3 left-3 bg-rc-bg-dark/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-rc-bg-light/30 pointer-events-none">
          <p className="text-[10px] text-rc-text-muted">
            {customPin ? 'Drag pin to adjust \u2022 Click map to reposition' : 'Click anywhere to drop a pin'}
          </p>
        </div>

        {/* Experimental badge */}
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-600/80 to-blue-600/80 backdrop-blur-sm border border-purple-400/20">
          <p className="text-[10px] font-medium text-white">Experimental</p>
        </div>
      </div>
    </div>
  )
}

export default ForecastMapMapcn
