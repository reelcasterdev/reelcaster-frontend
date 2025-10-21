'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, MapPin, Fish } from 'lucide-react'
import { getRegulationsByLocation } from '@/app/data/regulations'

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

interface FishSpecies {
  id: string
  name: string
  scientificName: string
  minSize: string
  dailyLimit: string
  status: 'Open' | 'Closed' | 'Non Retention' | 'Restricted'
  gear: string
  season: string
  description: string
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

// This will be populated based on the selected location
const getFishSpeciesForLocation = (locationName: string): FishSpecies[] => {
  const regulations = getRegulationsByLocation(locationName)

  if (!regulations || !regulations.species) {
    return []
  }

  return regulations.species.map(species => ({
    id: species.id,
    name: species.name,
    scientificName: species.scientificName || 'N/A',
    minSize: species.minSize || 'N/A',
    dailyLimit: species.dailyLimit,
    status: species.status as 'Open' | 'Closed' | 'Non Retention' | 'Restricted',
    gear: species.gear,
    season: species.season,
    description: `${species.name} - ${species.scientificName || 'N/A'}`,
  }))
}

interface CompactLocationSelectorProps {
  onLocationChange?: () => void
}

export default function CompactLocationSelector({ onLocationChange }: CompactLocationSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial values from URL
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [selectedHotspot, setSelectedHotspot] = useState<string>('')
  const [selectedSpecies, setSelectedSpecies] = useState<string>('')
  const [fishSpecies, setFishSpecies] = useState<FishSpecies[]>([])

  // Dropdown states
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showHotspotDropdown, setShowHotspotDropdown] = useState(false)
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false)

  // Initialize from URL params
  useEffect(() => {
    const location = searchParams.get('location')
    const hotspot = searchParams.get('hotspot')
    const species = searchParams.get('species')

    if (location) {
      const locationData = fishingLocations.find(loc => loc.name === location)
      if (locationData) {
        setSelectedLocation(locationData.id)
        if (hotspot) {
          setSelectedHotspot(hotspot)
        }
        if (species) {
          // Try to find by ID first, then by name for backwards compatibility
          const speciesData = fishSpecies.find(s => s.id === species || s.name === species)
          if (speciesData) {
            setSelectedSpecies(speciesData.id)
          }
        }
      }
    }
  }, [searchParams])

  const currentLocation = fishingLocations.find(loc => loc.id === selectedLocation)
  const currentSpecies = fishSpecies.find(species => species.id === selectedSpecies)

  // Update fish species when location changes
  useEffect(() => {
    if (currentLocation) {
      const species = getFishSpeciesForLocation(currentLocation.name)
      setFishSpecies(species)
    }
  }, [currentLocation])

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId)
    setSelectedHotspot('')
    setSelectedSpecies('')
    setShowLocationDropdown(false)
  }

  const handleHotspotChange = (hotspot: string) => {
    setSelectedHotspot(hotspot)
    setShowHotspotDropdown(false)
  }

  const handleSpeciesChange = (speciesId: string) => {
    setSelectedSpecies(speciesId)
    setShowSpeciesDropdown(false)
  }

  const updateUrl = useCallback(() => {
    if (currentLocation && selectedHotspot) {
      const selectedHotspotData = currentLocation.hotspots.find(h => h.name === selectedHotspot)
      const coordinates = selectedHotspotData?.coordinates || currentLocation.coordinates

      const params = new URLSearchParams({
        location: currentLocation.name,
        hotspot: selectedHotspot,
        lat: coordinates.lat.toString(),
        lon: coordinates.lon.toString(),
      })

      if (currentSpecies) {
        params.set('species', currentSpecies.id)
      }

      router.push(`/?${params.toString()}`)
      onLocationChange?.()
    }
  }, [currentLocation, selectedHotspot, currentSpecies, router, onLocationChange])

  // Update URL when selections change
  useEffect(() => {
    if (currentLocation && selectedHotspot) {
      updateUrl()
    }
  }, [selectedLocation, selectedHotspot, selectedSpecies, currentLocation, updateUrl])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.dropdown-container')) {
        setShowLocationDropdown(false)
        setShowHotspotDropdown(false)
        setShowSpeciesDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'text-green-400'
      case 'Closed':
        return 'text-red-400'
      case 'Non Retention':
        return 'text-yellow-400'
      case 'Restricted':
        return 'text-orange-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-gray-700">
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        {/* Location Dropdown */}
        <div className="relative dropdown-container">
          <button
            onClick={() => {
              setShowLocationDropdown(!showLocationDropdown)
              setShowHotspotDropdown(false)
              setShowSpeciesDropdown(false)
            }}
            className="flex items-center justify-between sm:justify-start gap-2 px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white w-full sm:w-auto"
          >
            <MapPin className="w-4 h-4" />
            <span className="font-medium flex-1 sm:flex-none">{currentLocation?.name || 'Select Location'}</span>
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          </button>

          {showLocationDropdown && (
            <div className="absolute top-full left-0 right-0 sm:left-0 sm:right-auto mt-2 w-full sm:w-64 bg-gray-900 rounded-lg shadow-xl border border-gray-700 z-[9999]">
              <div className="p-2">
                {fishingLocations.map(location => (
                  <button
                    key={location.id}
                    onClick={() => handleLocationChange(location.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedLocation === location.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <div className="font-medium">{location.name}</div>
                    <div className="text-xs opacity-70">{location.hotspots.length} hotspots</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hotspot Dropdown */}
        {currentLocation && (
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowHotspotDropdown(!showHotspotDropdown)
                setShowLocationDropdown(false)
                setShowSpeciesDropdown(false)
              }}
              className="flex items-center justify-between sm:justify-start gap-2 px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white w-full sm:w-auto"
            >
              <MapPin className="w-4 h-4" />
              <span className="font-medium flex-1 sm:flex-none">{selectedHotspot || 'Select Hotspot'}</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>

            {showHotspotDropdown && (
              <div className="absolute top-full left-0 right-0 sm:left-0 sm:right-auto mt-2 w-full sm:w-72 bg-gray-900 rounded-lg shadow-xl border border-gray-700 z-[9999] max-h-64 overflow-y-auto">
                <div className="p-2">
                  {currentLocation.hotspots.map(hotspot => (
                    <button
                      key={hotspot.name}
                      onClick={() => handleHotspotChange(hotspot.name)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedHotspot === hotspot.name
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {hotspot.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Species Dropdown */}
        {selectedHotspot && (
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowSpeciesDropdown(!showSpeciesDropdown)
                setShowLocationDropdown(false)
                setShowHotspotDropdown(false)
              }}
              className="flex items-center justify-between sm:justify-start gap-2 px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white w-full sm:w-auto"
            >
              <Fish className="w-4 h-4" />
              <span className="font-medium flex-1 sm:flex-none">{currentSpecies?.name || 'All Species'}</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>

            {showSpeciesDropdown && (
              <div className="absolute top-full left-0 right-0 sm:left-0 sm:right-auto mt-2 w-full sm:w-80 bg-gray-900 rounded-lg shadow-xl border border-gray-700 z-[9999] max-h-64 overflow-y-auto">
                <div className="p-2">
                  {/* All Species option */}
                  <button
                    onClick={() => handleSpeciesChange('')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      !selectedSpecies ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    All Species
                  </button>

                  {/* Individual species */}
                  {fishSpecies.map(species => (
                    <button
                      key={species.id}
                      onClick={() => handleSpeciesChange(species.id)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedSpecies === species.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{species.name}</span>
                        <span className={`text-xs ${getStatusColor(species.status)}`}>{species.status}</span>
                      </div>
                      <div className="text-xs opacity-70">{species.scientificName}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
