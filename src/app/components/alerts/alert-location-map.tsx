'use client'

import React, { useState, useRef, useCallback } from 'react'
import Map, { Marker, MapRef } from 'react-map-gl/mapbox'
import type { MapMouseEvent } from 'mapbox-gl'
import { MapPin } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'

interface AlertLocationMapProps {
  latitude: number
  longitude: number
  onLocationChange: (lat: number, lng: number) => void
}

export function AlertLocationMap({ latitude, longitude, onLocationChange }: AlertLocationMapProps) {
  const mapRef = useRef<MapRef>(null)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  const [viewport, setViewport] = useState({
    latitude,
    longitude,
    zoom: 10,
  })

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    const { lng, lat } = e.lngLat
    onLocationChange(lat, lng)
  }, [onLocationChange])

  const handleMarkerDragEnd = useCallback((e: { lngLat: { lng: number; lat: number } }) => {
    const { lng, lat } = e.lngLat
    onLocationChange(lat, lng)
  }, [onLocationChange])

  if (!mapboxToken) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-400 text-sm">
          Mapbox token not configured.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative w-full h-[250px] rounded-lg overflow-hidden border border-rc-bg-light">
        <Map
          ref={mapRef}
          {...viewport}
          onMove={evt => setViewport(evt.viewState)}
          onClick={handleMapClick}
          mapboxAccessToken={mapboxToken}
          mapStyle="mapbox://styles/mapbox/navigation-night-v1"
          style={{ width: '100%', height: '100%' }}
        >
          <Marker
            latitude={latitude}
            longitude={longitude}
            anchor="bottom"
            draggable
            onDragEnd={handleMarkerDragEnd}
          >
            <div className="cursor-grab active:cursor-grabbing">
              <div className="w-8 h-8">
                <MapPin className="w-full h-full text-amber-500 fill-amber-400 drop-shadow-lg" />
              </div>
            </div>
          </Marker>
        </Map>

        {/* Instructions overlay */}
        <div className="absolute bottom-2 left-2 bg-rc-bg-dark/80 backdrop-blur-sm px-2.5 py-1 rounded-md pointer-events-none">
          <p className="text-[10px] text-rc-text-muted">
            Click to place pin or drag to adjust
          </p>
        </div>
      </div>

      {/* Coordinates display */}
      <div className="flex items-center gap-3 text-xs text-rc-text-muted">
        <span>Lat: <span className="text-rc-text font-mono">{latitude.toFixed(4)}</span></span>
        <span>Lng: <span className="text-rc-text font-mono">{longitude.toFixed(4)}</span></span>
      </div>
    </div>
  )
}
