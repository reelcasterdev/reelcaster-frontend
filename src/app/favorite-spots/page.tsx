'use client'

import { useState } from 'react'
import { AppShell } from '../components/layout'
import DashboardHeader from '../components/forecast/dashboard-header'
import { Heart, MapPin, Plus, MoreVertical, Navigation, Trash2 } from 'lucide-react'

interface FavoriteSpot {
  id: string
  name: string
  location: string
  coordinates: { lat: number; lon: number }
  lastScore?: number
  notes?: string
}

// Mock data - would come from database
const MOCK_SPOTS: FavoriteSpot[] = [
  {
    id: '1',
    name: 'Breakwater Morning Spot',
    location: 'Victoria, Sidney',
    coordinates: { lat: 48.4128, lon: -123.3875 },
    lastScore: 7.8,
    notes: 'Best during incoming tide, early morning',
  },
  {
    id: '2',
    name: 'Oak Bay Reef',
    location: 'Victoria, Sidney',
    coordinates: { lat: 48.4264, lon: -123.3017 },
    lastScore: 6.5,
    notes: 'Good for rockfish on slack tide',
  },
  {
    id: '3',
    name: 'Sooke Point',
    location: 'Sooke, Port Renfrew',
    coordinates: { lat: 48.3722, lon: -123.7356 },
    lastScore: 8.2,
  },
]

export default function FavoriteSpotsPage() {
  const [spots, setSpots] = useState<FavoriteSpot[]>(MOCK_SPOTS)
  const [activeSpot, setActiveSpot] = useState<string | null>(null)

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-blue-400'
    if (score >= 4) return 'text-yellow-400'
    return 'text-red-400'
  }

  const handleDelete = (id: string) => {
    setSpots(spots.filter(s => s.id !== id))
  }

  const handleNavigate = (spot: FavoriteSpot) => {
    // Navigate to forecast with this location
    window.location.href = `/?lat=${spot.coordinates.lat}&lon=${spot.coordinates.lon}&hotspot=${encodeURIComponent(spot.name)}`
  }

  return (
    <AppShell showLocationPanel={false}>
      <div className="p-4 lg:p-6">
        <DashboardHeader
          title="Favorite Spots"
          showTimeframe={false}
          showSetLocation={false}
          showCustomize={false}
        />

        <div className="space-y-6">
        {/* Add New Spot Button */}
        <button className="w-full p-4 border-2 border-dashed border-rc-bg-light rounded-xl hover:border-rc-text-muted hover:bg-rc-bg-dark/50 transition-colors group">
          <div className="flex items-center justify-center gap-2 text-rc-text-muted group-hover:text-rc-text-light">
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add New Favorite Spot</span>
          </div>
        </button>

        {/* Spots List */}
        <div className="space-y-3">
          {spots.map(spot => (
            <div
              key={spot.id}
              className="bg-rc-bg-dark rounded-xl border border-rc-bg-light p-4 hover:border-rc-text-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rc-bg-light rounded-lg">
                    <Heart className="w-5 h-5 text-rc-text-light" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-rc-text">{spot.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-rc-text-muted mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{spot.location}</span>
                    </div>
                    {spot.notes && (
                      <p className="text-sm text-rc-text-muted mt-2">{spot.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {/* Score */}
                  {spot.lastScore && (
                    <div className="text-right">
                      <p className="text-xs text-rc-text-muted">Last Score</p>
                      <p className={`text-lg font-bold ${getScoreColor(spot.lastScore)}`}>
                        {spot.lastScore.toFixed(1)}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveSpot(activeSpot === spot.id ? null : spot.id)}
                      className="p-1.5 hover:bg-rc-bg-light rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-rc-text-muted" />
                    </button>

                    {activeSpot === spot.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveSpot(null)}
                        />
                        <div className="absolute right-0 mt-1 w-40 bg-rc-bg-darkest border border-rc-bg-light rounded-lg shadow-xl z-20 overflow-hidden">
                          <button
                            onClick={() => {
                              handleNavigate(spot)
                              setActiveSpot(null)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-rc-text-light hover:bg-rc-bg-dark flex items-center gap-2"
                          >
                            <Navigation className="w-4 h-4" />
                            View Forecast
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(spot.id)
                              setActiveSpot(null)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-rc-bg-dark flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Coordinates */}
              <div className="mt-3 pt-3 border-t border-rc-bg-light flex items-center justify-between">
                <span className="text-xs text-rc-text-muted">
                  {spot.coordinates.lat.toFixed(4)}°N, {Math.abs(spot.coordinates.lon).toFixed(4)}°W
                </span>
                <button
                  onClick={() => handleNavigate(spot)}
                  className="text-xs text-rc-text-light hover:text-rc-text font-medium"
                >
                  View Forecast →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {spots.length === 0 && (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-rc-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-rc-text mb-2">No favorite spots yet</h3>
            <p className="text-rc-text-muted">Save your favorite fishing locations for quick access</p>
          </div>
        )}
        </div>
      </div>
    </AppShell>
  )
}
