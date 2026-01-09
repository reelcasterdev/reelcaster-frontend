'use client'

import { MapPin } from 'lucide-react'

interface LocationSelectorProps {
  selectedLocation: string
  onLocationChange: (location: string) => void
  availableLocations: string[]
}

export default function LocationSelector({
  selectedLocation,
  onLocationChange,
  availableLocations,
}: LocationSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-rc-text-muted">
        <MapPin className="w-5 h-5" />
        <span className="text-sm font-medium">Location:</span>
      </div>
      <div className="flex gap-2">
        {availableLocations.map((location) => (
          <button
            key={location}
            onClick={() => onLocationChange(location)}
            className={`
              px-4 py-2 rounded-lg border transition-all duration-200 text-sm font-medium
              ${
                selectedLocation === location
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-rc-bg-light/30 text-rc-text-light border-rc-bg-light hover:bg-rc-bg-light/50 hover:text-rc-text'
              }
            `}
          >
            {location}
          </button>
        ))}
      </div>
    </div>
  )
}
