'use client'

import React, { useState } from 'react'
import { X, Fish, Anchor, MapPin, Navigation, Gauge, ChevronDown, ChevronUp } from 'lucide-react'
import { GeoLocationResult, formatAccuracy, getAccuracyColor } from '@/lib/geolocation-service'

interface QuickCatchModalProps {
  gpsData: GeoLocationResult
  onSelectOutcome: (outcome: 'bite' | 'landed', speciesId?: string, speciesName?: string) => void
  onClose: () => void
}

// Species list (same as in species-selector.tsx)
const SPECIES_OPTIONS = [
  { id: 'chinook-salmon', name: 'Chinook Salmon' },
  { id: 'coho-salmon', name: 'Coho Salmon' },
  { id: 'chum-salmon', name: 'Chum Salmon' },
  { id: 'pink-salmon', name: 'Pink Salmon' },
  { id: 'sockeye-salmon', name: 'Sockeye Salmon' },
  { id: 'halibut', name: 'Pacific Halibut' },
  { id: 'lingcod', name: 'Lingcod' },
  { id: 'rockfish', name: 'Rockfish' },
]

const QuickCatchModal: React.FC<QuickCatchModalProps> = ({
  gpsData,
  onSelectOutcome,
  onClose,
}) => {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null)
  const [showSpecies, setShowSpecies] = useState(false)

  const handleOutcomeSelect = (outcome: 'bite' | 'landed') => {
    const species = SPECIES_OPTIONS.find((s) => s.id === selectedSpecies)
    onSelectOutcome(outcome, species?.id, species?.name)
  }

  // Format coordinates for display
  const formatCoord = (coord: number, isLat: boolean) => {
    const direction = isLat ? (coord >= 0 ? 'N' : 'S') : coord >= 0 ? 'E' : 'W'
    return `${Math.abs(coord).toFixed(5)}° ${direction}`
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up sm:animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Fish className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Fish On!</h2>
              <p className="text-xs text-gray-400">What happened?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* GPS Info */}
        <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-gray-500">Location</p>
                <p className="text-white font-mono">
                  {formatCoord(gpsData.latitude, true)}, {formatCoord(gpsData.longitude, false)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className={`w-4 h-4 ${getAccuracyColor(gpsData.accuracy)}`} />
              <div>
                <p className="text-gray-500">Accuracy</p>
                <p className={`font-medium ${getAccuracyColor(gpsData.accuracy)}`}>
                  {formatAccuracy(gpsData.accuracy)} ({Math.round(gpsData.accuracy)}m)
                </p>
              </div>
            </div>
            {gpsData.heading !== null && (
              <div className="flex items-center gap-2">
                <Navigation
                  className="w-4 h-4 text-emerald-400"
                  style={{ transform: `rotate(${gpsData.heading}deg)` }}
                />
                <div>
                  <p className="text-gray-500">Heading</p>
                  <p className="text-white font-medium">{Math.round(gpsData.heading)}°</p>
                </div>
              </div>
            )}
            {gpsData.speed !== null && (
              <div className="flex items-center gap-2">
                <Anchor className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-gray-500">Speed</p>
                  <p className="text-white font-medium">{gpsData.speed.toFixed(1)} km/h</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Species Selection (Collapsible) */}
        <div className="px-4 py-3 border-b border-gray-700">
          <button
            onClick={() => setShowSpecies(!showSpecies)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <p className="text-sm font-medium text-white">
                {selectedSpecies
                  ? SPECIES_OPTIONS.find((s) => s.id === selectedSpecies)?.name
                  : 'Species (optional)'}
              </p>
              <p className="text-xs text-gray-500">You can add this later</p>
            </div>
            {showSpecies ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showSpecies && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SPECIES_OPTIONS.map((species) => (
                <button
                  key={species.id}
                  onClick={() =>
                    setSelectedSpecies(selectedSpecies === species.id ? null : species.id)
                  }
                  className={`
                    p-2 rounded-lg text-left text-sm transition-all
                    ${
                      selectedSpecies === species.id
                        ? 'bg-blue-600/30 border-2 border-blue-500 text-blue-300'
                        : 'bg-gray-800 border-2 border-transparent text-white hover:bg-gray-700'
                    }
                  `}
                >
                  {species.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Outcome Selection */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-400 text-center mb-4">What was the outcome?</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Bite (Lost) */}
            <button
              onClick={() => handleOutcomeSelect('bite')}
              className="group relative flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 hover:border-amber-500 hover:from-amber-500/20 hover:to-orange-500/20 transition-all active:scale-95"
            >
              <div className="p-4 bg-amber-500/20 rounded-full group-hover:bg-amber-500/30 transition-colors">
                <Fish className="w-8 h-8 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-300">Bite</p>
                <p className="text-xs text-amber-400/70 mt-1">Got away</p>
              </div>
            </button>

            {/* In the Boat (Landed) */}
            <button
              onClick={() => handleOutcomeSelect('landed')}
              className="group relative flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-2 border-emerald-500/30 hover:border-emerald-500 hover:from-emerald-500/20 hover:to-green-500/20 transition-all active:scale-95"
            >
              <div className="p-4 bg-emerald-500/20 rounded-full group-hover:bg-emerald-500/30 transition-colors">
                <Anchor className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-300">In the Boat</p>
                <p className="text-xs text-emerald-400/70 mt-1">Landed!</p>
              </div>
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center pt-2">
            You can add more details later from your catch log
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

export default QuickCatchModal
