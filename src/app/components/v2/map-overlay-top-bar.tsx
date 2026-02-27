'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin, ChevronDown, Bell, Settings } from 'lucide-react'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  FISHING_LOCATIONS,
  getLocationByName,
  getDefaultLocation,
  type FishingLocation,
  type Hotspot,
} from '@/app/config/locations'

interface MapOverlayTopBarProps {
  selectedLocation: string
  selectedHotspot: string
  species: string | null
  compact?: boolean
}

export default function MapOverlayTopBar({
  selectedLocation,
  selectedHotspot,
  compact = false,
}: MapOverlayTopBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showAreaDropdown, setShowAreaDropdown] = useState(false)
  const locationRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)

  const selectedLocationData = useMemo(() => {
    return getLocationByName(selectedLocation) || getDefaultLocation()
  }, [selectedLocation])

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key)
      else params.set(key, value)
    })
    router.push(`/?${params.toString()}`)
  }, [router, searchParams])

  const handleLocationSelect = useCallback((location: FishingLocation) => {
    if (!location.available) return
    const firstHotspot = location.hotspots[0]
    updateParams({
      location: location.name,
      hotspot: firstHotspot?.name || null,
      lat: firstHotspot?.coordinates.lat.toString() || null,
      lon: firstHotspot?.coordinates.lon.toString() || null,
      species: null,
    })
    setShowLocationDropdown(false)
  }, [updateParams])

  const handleAreaSelect = useCallback((hotspot: Hotspot) => {
    updateParams({
      hotspot: hotspot.name,
      lat: hotspot.coordinates.lat.toString(),
      lon: hotspot.coordinates.lon.toString(),
    })
    setShowAreaDropdown(false)
  }, [updateParams])

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowLocationDropdown(false)
      }
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) {
        setShowAreaDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (compact) {
    return (
      <div className="pointer-events-auto p-2">
        <div className="flex items-center gap-2 bg-rc-bg-dark rounded-xl px-3 py-2 border border-rc-bg-light">
          <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-rc-text truncate">{selectedHotspot}</span>
          <span className="text-xs text-rc-text-muted truncate">{selectedLocation}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-auto p-3">
      <div className="flex items-center gap-2 bg-rc-bg-dark rounded-xl px-4 py-2.5 border border-rc-bg-light">
        {/* Location Dropdown */}
        <div ref={locationRef} className="relative">
          <button
            onClick={() => {
              setShowLocationDropdown(!showLocationDropdown)
              setShowAreaDropdown(false)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rc-bg-light/50 hover:bg-rc-bg-light rounded-lg text-sm transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-rc-text font-medium">{selectedLocation}</span>
            <ChevronDown className="w-3.5 h-3.5 text-rc-text-muted" />
          </button>

          {showLocationDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-rc-bg-dark/95 backdrop-blur-md border border-rc-bg-light rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
              {FISHING_LOCATIONS.map(loc => (
                <button
                  key={loc.name}
                  onClick={() => handleLocationSelect(loc)}
                  disabled={!loc.available}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedLocation === loc.name
                      ? 'bg-blue-600/20 text-blue-400'
                      : loc.available
                        ? 'text-rc-text-light hover:bg-rc-bg-light'
                        : 'text-rc-text-muted cursor-not-allowed'
                  }`}
                >
                  <div className="font-medium">{loc.name}</div>
                  <div className="text-xs text-rc-text-muted">
                    {loc.available ? `${loc.hotspots.length} hotspots` : 'Coming soon'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Area Dropdown */}
        <div ref={areaRef} className="relative">
          <button
            onClick={() => {
              setShowAreaDropdown(!showAreaDropdown)
              setShowLocationDropdown(false)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rc-bg-light/50 hover:bg-rc-bg-light rounded-lg text-sm transition-colors"
          >
            <span className="text-rc-text font-medium">{selectedHotspot}</span>
            <ChevronDown className="w-3.5 h-3.5 text-rc-text-muted" />
          </button>

          {showAreaDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-rc-bg-dark/95 backdrop-blur-md border border-rc-bg-light rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
              {selectedLocationData.hotspots.map(hs => (
                <button
                  key={hs.name}
                  onClick={() => handleAreaSelect(hs)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedHotspot === hs.name
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-rc-text-light hover:bg-rc-bg-light'
                  }`}
                >
                  {hs.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Right side buttons */}
        <button
          onClick={() => router.push('/profile/custom-alerts')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rc-bg-light/50 hover:bg-rc-bg-light rounded-lg text-sm transition-colors text-rc-text-muted hover:text-rc-text"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Alerts</span>
        </button>

        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rc-bg-light/50 hover:bg-rc-bg-light rounded-lg text-sm transition-colors text-rc-text-muted hover:text-rc-text"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Settings</span>
        </button>
      </div>
    </div>
  )
}
