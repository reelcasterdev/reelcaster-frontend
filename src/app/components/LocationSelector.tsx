'use client'

import { useState } from 'react'

interface FishingLocation {
  id: string
  name: string
  hotspots: string[]
}

const fishingLocations: FishingLocation[] = [
  {
    id: 'victoria-sidney',
    name: 'Victoria, Sidney',
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

export default function LocationSelector() {
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [selectedHotspot, setSelectedHotspot] = useState<string>('')

  const currentLocation = fishingLocations.find(loc => loc.id === selectedLocation)

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId)
    setSelectedHotspot('') // Reset hotspot when location changes
  }

  const handleGetForecast = () => {
    if (selectedLocation && selectedHotspot) {
      const locationName = currentLocation?.name
      alert(`Getting forecast for ${selectedHotspot} in ${locationName}`)
      // Here you would typically navigate to forecast page or fetch forecast data
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
                onClick={() => setSelectedHotspot(hotspot)}
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

      {/* Get Forecast Button */}
      {selectedLocation && selectedHotspot && (
        <div className="border-t border-gray-600 pt-8">
          <button
            onClick={handleGetForecast}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 hover:from-gray-700 hover:via-gray-600 hover:to-gray-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg shadow-black/50 hover:shadow-white/10 hover:scale-[1.02] border border-gray-500"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-lg">Get Fishing Forecast for {selectedHotspot}</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>
        </div>
      )}

      {/* Selection Summary */}
      {(selectedLocation || selectedHotspot) && (
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
          </div>
        </div>
      )}
    </div>
  )
}
