'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Map, Maximize2 } from 'lucide-react'

interface MapViewWidgetProps {
  lat?: number
  lon?: number
  locationName?: string
  hotspotName?: string
  onExpand?: () => void
}

export default function MapViewWidget({
  lat = 48.4128,
  lon = -123.3875,
  locationName = 'Victoria, Sidney',
  hotspotName = 'Breakwater',
  onExpand,
}: MapViewWidgetProps) {
  const [imageError, setImageError] = useState(false)

  // Static map URL using OpenStreetMap tiles
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const mapUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+3b82f6(${lon},${lat})/${lon},${lat},10,0/280x160@2x?access_token=${mapboxToken}`
    : null

  return (
    <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light overflow-hidden">
      {/* Map Preview */}
      <div className="relative h-40 bg-rc-bg-dark">
        {mapUrl && !imageError ? (
          <Image
            src={mapUrl}
            alt={`Map of ${hotspotName}`}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rc-bg-light to-rc-bg-dark">
            <Map className="w-12 h-12 text-rc-text-muted" />
          </div>
        )}

        {/* Location marker overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3 h-3 bg-blue-500 rounded-full ring-4 ring-blue-500/30 animate-pulse" />
        </div>

        {/* Expand button */}
        {onExpand && (
          <button
            onClick={onExpand}
            className="absolute top-2 right-2 p-1.5 bg-rc-bg-darkest/80 hover:bg-rc-bg-light rounded-lg text-rc-text-muted hover:text-rc-text transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-rc-text mb-1">{hotspotName}</h3>
        <p className="text-xs text-rc-text-muted mb-2">{locationName}</p>
        <p className="text-xs text-rc-text-muted">
          {lat.toFixed(4)}°N, {Math.abs(lon).toFixed(4)}°W
        </p>

        {/* Explore button */}
        {onExpand && (
          <button
            onClick={onExpand}
            className="w-full mt-3 py-2 px-3 bg-rc-bg-light hover:bg-rc-bg-dark rounded-lg text-xs font-medium text-rc-text transition-colors flex items-center justify-center gap-2"
          >
            <Map className="w-3.5 h-3.5" />
            Explore with map view
          </button>
        )}
      </div>
    </div>
  )
}
