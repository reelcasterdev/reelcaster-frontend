'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FishingForecast from './FishingForecast'

interface FishingLocation {
  id: string
  name: string
  hotspots: string[]
  coordinates: { lat: number; lon: number }
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
    coordinates: { lat: 48.4284, lon: -123.3656 }, // Victoria coordinates
    hotspots: [
      'Beacon Hill Park',
      'Clover Point',
      'Esquimalt Lagoon',
      'Inner Harbour',
      'James Bay',
      'Esquimalt Harbour',
      'Cadboro Bay',
      'Ten Mile Point',
      'Esquimalt Anglers',
      'Sidney Pier',
      'Sidney Channel',
      'Coal Island',
      'James Island',
      'Sidney Spit',
      'Haro Strait',
      'Saanich Inlet',
      'Brentwood Bay',
      'Tod Inlet',
      'Goldstream River',
      'Finlayson Arm',
    ],
  },
  {
    id: 'tofino-meares-vargas-flores',
    name: 'Tofino and Meares, Vargas, Flores Islands',
    coordinates: { lat: 49.1533, lon: -125.9066 }, // Tofino coordinates
    hotspots: [
      'Tofino Harbour',
      'Clayoquot Sound',
      'Meares Island',
      'Vargas Island',
      'Flores Island',
      'Hot Springs Cove',
      'Bedwell Sound',
      'Tranquil Creek',
      'Shelter Inlet',
      'Lemmens Inlet',
      'Grice Bay',
      'Browning Passage',
      'Fortune Channel',
      'Millar Channel',
      'Duffin Passage',
      'Chesterman Beach',
      'Long Beach',
      'Cox Bay',
      'Wickaninnish Beach',
      'Kennedy Lake',
      'Toquart Bay',
      'Ucluelet Inlet',
      'Barkley Sound',
      'Imperial Eagle Channel',
      'Pipestem Inlet',
    ],
  },
  {
    id: 'vancouver-bowen-indian-arm-squamish',
    name: 'Vancouver, Bowen Island, Indian Arm, Squamish',
    coordinates: { lat: 49.2827, lon: -123.1207 }, // Vancouver coordinates
    hotspots: [
      'English Bay',
      'Spanish Banks',
      'Jericho Beach',
      'Kitsilano Beach',
      'Second Beach',
      'Third Beach',
      'Coal Harbour',
      'Canada Place',
      'Burnaby Barnet Marine Park',
      'Rocky Point Park',
      'Ambleside Beach',
      'Dundarave Pier',
      'Capilano River',
      'Seymour River',
      'Burrard Inlet',
      'Deep Cove',
      'Indian Arm',
      'Belcarra Regional Park',
      'Sasamat Lake',
      'Bowen Island',
      'Snug Cove',
      'Queen Charlotte Channel',
      'Horseshoe Bay',
      'Sea Island',
      'Iona Beach Regional Park',
      'Garry Point Park',
      'Steveston',
      'Fraser River',
      'Pitt River',
      'Squamish River',
      'Mamquam River',
      'Cheakamus River',
      'Howe Sound',
      'Porteau Cove',
      'Lions Bay',
    ],
  },
  {
    id: 'sooke-port-renfrew',
    name: 'Sooke, Port Renfrew',
    coordinates: { lat: 48.3723, lon: -123.7365 }, // Sooke coordinates
    hotspots: [
      'Sooke Harbour',
      'Sooke Basin',
      'Sooke River',
      'Sooke Potholes',
      'Secretary Island',
      'Becher Bay',
      'Pedder Bay',
      'Race Rocks',
      'Church Point',
      'Otter Point',
      'Sheringham Point',
      'French Beach',
      'Point No Point',
      'Jordan River',
      'China Beach',
      'Mystic Beach',
      'Juan de Fuca Strait',
      'Port Renfrew Harbour',
      'San Juan River',
      'Gordon River',
      'Harris Creek',
      'Fairy Lake',
      'Lizard Lake',
      'Shawnigan Lake',
      'Cowichan Lake',
      'Nitinat Lake',
      'Bamfield Inlet',
      'Trevor Channel',
      'Imperial Eagle Channel',
      'Pachena Bay',
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
    id: 'coho-salmon',
    name: 'Coho Salmon',
    scientificName: 'Oncorhynchus kisutch',
    minSize: '30cm',
    dailyLimit: '2 (hatchery marked only)',
    status: 'Open',
    gear: 'Barbless hook and line',
    season: 'June - October',
    description: 'Silver salmon, excellent fighting fish',
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
    name: 'Pacific Halibut',
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
    name: 'Rockfish (Various)',
    scientificName: 'Sebastes spp.',
    minSize: 'Varies by species',
    dailyLimit: '5 combined',
    status: 'Open',
    gear: 'Hook and line',
    season: 'Year-round (some restrictions)',
    description: 'Bottom dwelling fish, many species',
  },
  {
    id: 'dungeness-crab',
    name: 'Dungeness Crab',
    scientificName: 'Metacarcinus magister',
    minSize: '165mm carapace',
    dailyLimit: '4 (males only)',
    status: 'Open',
    gear: 'Crab trap or ring net',
    season: 'Year-round (check closures)',
    description: 'Popular crab species, males only',
  },
  {
    id: 'steelhead',
    name: 'Steelhead Trout',
    scientificName: 'Oncorhynchus mykiss',
    minSize: '50cm',
    dailyLimit: '0',
    status: 'Non Retention',
    gear: 'Barbless hook and line',
    season: 'Varies by system',
    description: 'Sea-run rainbow trout, catch and release',
  },
]

export default function LocationSelector() {
  const router = useRouter()
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [selectedHotspot, setSelectedHotspot] = useState<string>('')
  const [selectedSpecies, setSelectedSpecies] = useState<string>('')
  const [showForecast, setShowForecast] = useState(false)

  const currentLocation = fishingLocations.find(loc => loc.id === selectedLocation)
  const currentSpecies = fishSpecies.find(species => species.id === selectedSpecies)

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId)
    setSelectedHotspot('') // Reset hotspot when location changes
    setSelectedSpecies('') // Reset species when location changes
  }

  const handleHotspotChange = (hotspot: string) => {
    setSelectedHotspot(hotspot)
    setSelectedSpecies('') // Reset species when hotspot changes
  }

  const handleGetForecast = () => {
    if (selectedLocation && selectedHotspot && currentLocation) {
      setShowForecast(true)
    }
  }

  const handleOpenMeteoForecast = () => {
    if (selectedLocation && selectedHotspot && currentLocation) {
      const params = new URLSearchParams({
        location: currentLocation.name,
        hotspot: selectedHotspot,
        lat: currentLocation.coordinates.lat.toString(),
        lon: currentLocation.coordinates.lon.toString(),
      })

      if (currentSpecies) {
        params.set('species', currentSpecies.name)
      }

      router.push(`/forecast?${params.toString()}`)
    }
  }

  const handleBackToSelection = () => {
    setShowForecast(false)
  }

  // Show forecast component if requested
  if (showForecast && currentLocation && selectedHotspot) {
    return (
      <FishingForecast
        location={currentLocation.name}
        hotspot={selectedHotspot}
        species={currentSpecies?.name}
        coordinates={currentLocation.coordinates}
        onBack={handleBackToSelection}
      />
    )
  }

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

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-green-500/20 border-green-500/30'
      case 'Closed':
        return 'bg-red-500/20 border-red-500/30'
      case 'Non Retention':
        return 'bg-yellow-500/20 border-yellow-500/30'
      default:
        return 'bg-gray-500/20 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-gray-300 to-white rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-sm">1</span>
          </div>
          <h2 className="text-3xl font-bold text-white">Choose Your Region</h2>
        </div>

        {/* Primary Location Selection */}
        <div className="grid gap-4 md:grid-cols-2">
          {fishingLocations.map(location => (
            <button
              key={location.id}
              onClick={() => handleLocationChange(location.id)}
              className={`group relative p-6 text-left rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                selectedLocation === location.id
                  ? 'border-white bg-gradient-to-br from-gray-800/50 to-gray-700/30 shadow-lg shadow-white/10'
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800/70'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div
                    className={`font-semibold text-lg mb-2 ${
                      selectedLocation === location.id ? 'text-white' : 'text-gray-300'
                    }`}
                  >
                    {location.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedLocation === location.id ? 'bg-white' : 'bg-gray-500'
                      }`}
                    ></div>
                    <span className="text-gray-400 text-sm">{location.hotspots.length} premium fishing spots</span>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedLocation === location.id
                      ? 'border-white bg-white'
                      : 'border-gray-500 group-hover:border-gray-400'
                  }`}
                >
                  {selectedLocation === location.id && <div className="w-2 h-2 bg-black rounded-full"></div>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Hotspot Selection */}
      {currentLocation && (
        <div className="border-t border-gray-600 pt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-200 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">2</span>
            </div>
            <h3 className="text-3xl font-bold text-white">Select Fishing Hotspot</h3>
          </div>

          <div className="mb-4">
            <p className="text-gray-300 text-lg">
              Choose your specific location in <span className="text-white font-medium">{currentLocation.name}</span>
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-gray-500 pr-2">
            {currentLocation.hotspots.map(hotspot => (
              <button
                key={hotspot}
                onClick={() => handleHotspotChange(hotspot)}
                className={`group p-4 text-left rounded-lg border transition-all duration-200 hover:scale-[1.02] ${
                  selectedHotspot === hotspot
                    ? 'border-gray-300 bg-gradient-to-br from-gray-700/50 to-gray-600/30 shadow-lg shadow-white/5'
                    : 'border-gray-600 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium ${
                      selectedHotspot === hotspot ? 'text-gray-200' : 'text-gray-300 group-hover:text-white'
                    }`}
                  >
                    {hotspot}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      selectedHotspot === hotspot
                        ? 'border-gray-300 bg-gray-300'
                        : 'border-gray-500 group-hover:border-gray-400'
                    }`}
                  >
                    {selectedHotspot === hotspot && <div className="w-1 h-1 bg-black rounded-full m-[3px]"></div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fish Species Selection */}
      {selectedLocation && selectedHotspot && (
        <div className="border-t border-gray-600 pt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-300 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">3</span>
            </div>
            <h3 className="text-3xl font-bold text-white">Target Species</h3>
            <span className="text-gray-400 text-lg">(Optional)</span>
          </div>

          <div className="mb-6">
            <p className="text-gray-300 text-lg">Select your target fish species for detailed regulations and tips</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-gray-500 pr-2">
            {fishSpecies.map(species => (
              <button
                key={species.id}
                onClick={() => setSelectedSpecies(species.id)}
                className={`group p-4 text-left rounded-lg border-2 transition-all duration-200 hover:scale-[1.02] ${
                  selectedSpecies === species.id
                    ? 'border-gray-300 bg-gradient-to-br from-gray-700/50 to-gray-600/30 shadow-lg shadow-white/5'
                    : 'border-gray-600 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4
                        className={`font-semibold text-base mb-1 ${
                          selectedSpecies === species.id ? 'text-white' : 'text-gray-300 group-hover:text-white'
                        }`}
                      >
                        {species.name}
                      </h4>
                      <p className="text-gray-400 text-xs italic">{species.scientificName}</p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusBgColor(
                        species.status,
                      )} ${getStatusColor(species.status)}`}
                    >
                      {species.status}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span className="text-gray-300">{species.minSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Limit:</span>
                      <span className="text-gray-300">{species.dailyLimit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Season:</span>
                      <span className="text-gray-300">{species.season}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">{species.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Get Forecast Buttons */}
      {selectedLocation && selectedHotspot && (
        <div className="border-t border-gray-600 pt-8 space-y-4">
          {/* Standard Forecast (2 days) */}
          <button
            onClick={handleGetForecast}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 hover:from-gray-700 hover:via-gray-600 hover:to-gray-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg shadow-black/50 hover:shadow-white/10 hover:scale-[1.02] border border-gray-500"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-lg">
                Get Enhanced 3-Day Forecast for {selectedHotspot}
                {selectedSpecies && ` (${currentSpecies?.name})`}
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>

          {/* Open-Meteo Extended Forecast (14 days) */}
          <button
            onClick={handleOpenMeteoForecast}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-green-800 via-green-700 to-green-600 hover:from-green-700 hover:via-green-600 hover:to-green-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg shadow-black/50 hover:shadow-green-500/20 hover:scale-[1.02] border border-green-500"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-lg">
                Get 14-Day Extended Forecast
                {selectedSpecies && ` (${currentSpecies?.name})`}
              </span>
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">FREE</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>

          {/* Forecast Options Info */}
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-green-900/30 rounded-lg p-4 border border-green-600">
              <h5 className="text-white font-semibold mb-2">🌊 Enhanced 3-Day Forecast</h5>
              <ul className="text-green-300 space-y-1">
                <li>• Open-Meteo API (Free)</li>
                <li>• 3 days enhanced forecast</li>
                <li>• 15-minute resolution</li>
                <li>• 11-factor algorithm</li>
                <li>• 2-hour prediction blocks</li>
              </ul>
            </div>
            <div className="bg-green-900/30 rounded-lg p-4 border border-green-600">
              <h5 className="text-white font-semibold mb-2">🌍 Extended 14-Day Forecast</h5>
              <ul className="text-green-300 space-y-1">
                <li>• Open-Meteo API (Free)</li>
                <li>• Up to 14 days forecast</li>
                <li>• 15-minute resolution</li>
                <li>• Enhanced scoring system</li>
                <li>• Daily breakdown view</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {(selectedLocation || selectedHotspot || selectedSpecies) && (
        <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-sm p-6 rounded-xl border border-gray-600">
          <h4 className="font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Current Selection
          </h4>
          <div className="space-y-3">
            {selectedLocation && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-gray-300">Region:</span>
                <span className="text-white font-medium">{currentLocation?.name}</span>
              </div>
            )}
            {selectedHotspot && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span className="text-gray-300">Hotspot:</span>
                <span className="text-gray-200 font-medium">{selectedHotspot}</span>
              </div>
            )}
            {selectedSpecies && currentSpecies && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-300">Species:</span>
                  <span className="text-gray-200 font-medium">{currentSpecies.name}</span>
                  <span
                    className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusBgColor(
                      currentSpecies.status,
                    )} ${getStatusColor(currentSpecies.status)}`}
                  >
                    {currentSpecies.status}
                  </span>
                </div>
                <div className="ml-5 grid grid-cols-2 gap-4 text-sm">
                  <div className="text-gray-400">
                    Min Size: <span className="text-gray-300">{currentSpecies.minSize}</span>
                  </div>
                  <div className="text-gray-400">
                    Daily Limit: <span className="text-gray-300">{currentSpecies.dailyLimit}</span>
                  </div>
                  <div className="text-gray-400">
                    Gear: <span className="text-gray-300">{currentSpecies.gear}</span>
                  </div>
                  <div className="text-gray-400">
                    Season: <span className="text-gray-300">{currentSpecies.season}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
