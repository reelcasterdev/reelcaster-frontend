'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, MapPin, Fish } from 'lucide-react'

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
  status: 'Open' | 'Closed' | 'Non Retention'
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

const fishSpecies: FishSpecies[] = [
  {
    id: 'chinook-salmon',
    name: 'Chinook Salmon',
    scientificName: 'Oncorhynchus tshawytscha',
    minSize: '62cm',
    dailyLimit: '0',
    status: 'Non Retention',
    gear: 'Barbless hook and line',
    season: 'Year-round (varies by area)',
    description: 'King salmon, largest Pacific salmon species',
  },
  {
    id: 'chum-salmon',
    name: 'Chum Salmon',
    scientificName: 'Oncorhynchus keta',
    minSize: '30cm',
    dailyLimit: '0',
    status: 'Non Retention',
    gear: 'Barbless hook and line',
    season: 'September - December',
    description: 'Dog salmon, spawning runs in fall',
  },
  {
    id: 'coho-salmon',
    name: 'Coho Salmon (hatchery and wild combined)',
    scientificName: 'Oncorhynchus kisutch',
    minSize: '30cm',
    dailyLimit: '2',
    status: 'Open',
    gear: 'Barbless hook and line',
    season: 'June - October',
    description: 'Silver salmon, excellent fighting fish',
  },
  {
    id: 'pink-salmon',
    name: 'Pink Salmon',
    scientificName: 'Oncorhynchus gorbuscha',
    minSize: '30cm',
    dailyLimit: '4',
    status: 'Open',
    gear: 'Barbless hook and line',
    season: 'July - September (odd years)',
    description: 'Humpy salmon, abundant in odd years',
  },
  {
    id: 'sockeye-salmon',
    name: 'Sockeye Salmon',
    scientificName: 'Oncorhynchus nerka',
    minSize: '30cm',
    dailyLimit: '0',
    status: 'Non Retention',
    gear: 'Barbless hook and line',
    season: 'June - August',
    description: 'Red salmon, prized for eating quality',
  },
  {
    id: 'halibut',
    name: 'Halibut',
    scientificName: 'Hippoglossus stenolepis',
    minSize: '83cm',
    dailyLimit: '1',
    status: 'Open',
    gear: 'Hook and line',
    season: 'Year-round',
    description: 'Large flatfish, excellent table fare',
  },
  {
    id: 'lingcod',
    name: 'Lingcod',
    scientificName: 'Ophiodon elongatus',
    minSize: '65cm',
    dailyLimit: '1',
    status: 'Open',
    gear: 'Hook and line',
    season: 'Year-round',
    description: 'Large predatory fish, great eating',
  },
  {
    id: 'rockfish',
    name: 'Rockfish',
    scientificName: 'Sebastes spp.',
    minSize: 'Varies by species',
    dailyLimit: '5 combined',
    status: 'Open',
    gear: 'Hook and line',
    season: 'Year-round (some restrictions)',
    description: 'Bottom dwelling fish, many species',
  },
  {
    id: 'greenling',
    name: 'Greenling',
    scientificName: 'Hexagrammos spp.',
    minSize: '23cm',
    dailyLimit: '15',
    status: 'Open',
    gear: 'Hook and line',
    season: 'Year-round',
    description: 'Common nearshore fish, good eating',
  },
]

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
          const speciesData = fishSpecies.find(s => s.name === species)
          if (speciesData) {
            setSelectedSpecies(speciesData.id)
          }
        }
      }
    }
  }, [searchParams])

  const currentLocation = fishingLocations.find(loc => loc.id === selectedLocation)
  const currentSpecies = fishSpecies.find(species => species.id === selectedSpecies)

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
        params.set('species', currentSpecies.name)
      }

      router.push(`/?${params.toString()}`)
      onLocationChange?.()
    }
  }, [currentLocation, selectedHotspot, currentSpecies, router, onLocationChange])

  // Only update URL when user makes a selection, not on initial load
  useEffect(() => {
    const isInitialLoad = searchParams.get('location') === currentLocation?.name &&
                         searchParams.get('hotspot') === selectedHotspot
    
    if (currentLocation && selectedHotspot && !isInitialLoad) {
      updateUrl()
    }
  }, [selectedLocation, selectedHotspot, selectedSpecies])

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
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
      <div className="flex flex-wrap gap-3">
        {/* Location Dropdown */}
        <div className="relative dropdown-container">
          <button
            onClick={() => {
              setShowLocationDropdown(!showLocationDropdown)
              setShowHotspotDropdown(false)
              setShowSpeciesDropdown(false)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
          >
            <MapPin className="w-4 h-4" />
            <span className="font-medium">
              {currentLocation?.name || 'Select Location'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showLocationDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
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
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
            >
              <MapPin className="w-4 h-4" />
              <span className="font-medium">
                {selectedHotspot || 'Select Hotspot'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showHotspotDropdown && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 max-h-64 overflow-y-auto">
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
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
            >
              <Fish className="w-4 h-4" />
              <span className="font-medium">
                {currentSpecies?.name || 'All Species'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showSpeciesDropdown && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 max-h-96 overflow-y-auto">
                <div className="p-2">
                  {/* All Species option */}
                  <button
                    onClick={() => handleSpeciesChange('')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      !selectedSpecies
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
                        <span className={`text-xs ${getStatusColor(species.status)}`}>
                          {species.status}
                        </span>
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