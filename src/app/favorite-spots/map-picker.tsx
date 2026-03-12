'use client'

import { useState, useRef, useCallback } from 'react'
import Map, { Marker, MapRef } from 'react-map-gl/mapbox'
import type { MapMouseEvent } from 'mapbox-gl'
import { MapPin, Loader2, Check } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

interface MapPickerProps {
  onSave: (spot: { name: string; lat: number; lon: number }) => Promise<void>
}

export default function MapPicker({ onSave }: MapPickerProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewport, setViewport] = useState({
    latitude: 48.41,
    longitude: -123.4,
    zoom: 9.5,
  })
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    setPin({ lat: e.lngLat.lat, lon: e.lngLat.lng })
    setSaved(false)
    setName('')
  }, [])

  const handleSave = useCallback(async () => {
    if (!pin || !name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), lat: pin.lat, lon: pin.lon })
      setSaved(true)
      setTimeout(() => {
        setPin(null)
        setName('')
        setSaved(false)
      }, 1500)
    } catch {
      // parent handles error
    } finally {
      setSaving(false)
    }
  }, [pin, name, onSave])

  const handleClearPin = useCallback(() => {
    setPin(null)
    setName('')
    setSaved(false)
  }, [])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
        <p className="text-red-400 text-sm">Mapbox token not configured.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-rc-bg-light overflow-hidden shadow-sm shadow-black/25">
      {/* Map instructions */}
      <div className="px-4 py-2.5 bg-rc-bg-dark border-b border-rc-bg-light flex items-center justify-between">
        <p className="text-xs text-rc-text-muted">
          {pin ? 'Name your spot and save it' : 'Click anywhere on the map to place a pin'}
        </p>
        {pin && (
          <button
            onClick={handleClearPin}
            className="text-xs text-rc-text-muted hover:text-rc-text transition-colors px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear pin
          </button>
        )}
      </div>

      {/* Map */}
      <div className="relative w-full h-[300px] sm:h-[400px]">
        <Map
          ref={mapRef}
          {...viewport}
          onMove={(evt) => setViewport(evt.viewState)}
          onClick={handleMapClick}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: '100%', height: '100%' }}
        >
          {pin && (
            <Marker
              latitude={pin.lat}
              longitude={pin.lon}
              anchor="bottom"
              draggable
              onDragEnd={(e) => {
                setPin({ lat: e.lngLat.lat, lon: e.lngLat.lng })
                setSaved(false)
              }}
            >
              <div className="flex flex-col items-center">
                <div className="p-1.5 bg-blue-600 rounded-full shadow-lg shadow-blue-600/30">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="w-0.5 h-2 bg-blue-600" />
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {/* Save form */}
      {pin && (
        <div className="p-3 bg-rc-bg-dark border-t border-rc-bg-light">
          <div className="flex items-center gap-2 text-xs text-rc-text-muted mb-2">
            <MapPin className="w-3 h-3" />
            <span>
              {pin.lat.toFixed(4)}°N, {Math.abs(pin.lon).toFixed(4)}°W
            </span>
            <span className="text-rc-text-muted/50">— drag pin to adjust</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Name this spot..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
              className="flex-1 bg-rc-bg-light border border-rc-bg-light rounded-lg px-3 py-2 text-sm text-rc-text placeholder:text-rc-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving || saved}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-rc-text text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-rc-bg-dark"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
