'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '../components/layout'
import DashboardHeader from '../components/forecast/dashboard-header'
import { Heart, MapPin, Plus, MoreVertical, Navigation, Trash2, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'

interface FavoriteSpot {
  id: string
  name: string
  location: string | null
  lat: number
  lon: number
  notes: string | null
  created_at: string
}

export default function FavoriteSpotsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [spots, setSpots] = useState<FavoriteSpot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSpot, setActiveSpot] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSpots = useCallback(async () => {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const res = await fetch('/api/favorite-spots', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        throw new Error('Failed to fetch spots')
      }

      const data = await res.json()
      setSpots(data.spots || [])
    } catch (err) {
      console.error('Error fetching favorite spots:', err)
      setError('Failed to load favorite spots')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      fetchSpots()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [authLoading, user, fetchSpots])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/favorite-spots?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (res.ok) {
        setSpots(prev => prev.filter(s => s.id !== id))
      }
    } catch (err) {
      console.error('Error deleting spot:', err)
    } finally {
      setDeletingId(null)
      setActiveSpot(null)
    }
  }

  const handleNavigate = (spot: FavoriteSpot) => {
    const params = new URLSearchParams({
      hotspot: spot.name,
      lat: spot.lat.toString(),
      lon: spot.lon.toString(),
    })
    if (spot.location) {
      params.set('location', spot.location)
    }
    router.push(`/?${params.toString()}`)
  }

  if (authLoading || loading) {
    return (
      <AppShell showLocationPanel={false}>
        <div className="p-4 lg:p-6">
          <DashboardHeader
            title="Favorite Spots"
            showTimeframe={false}
            showSetLocation={false}
            showCustomize={false}
          />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-rc-text-muted animate-spin" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!user) {
    return (
      <AppShell showLocationPanel={false}>
        <div className="p-4 lg:p-6">
          <DashboardHeader
            title="Favorite Spots"
            showTimeframe={false}
            showSetLocation={false}
            showCustomize={false}
          />
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-rc-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-rc-text mb-2">Sign in to save spots</h3>
            <p className="text-rc-text-muted">Create an account to save your favorite fishing locations</p>
          </div>
        </div>
      </AppShell>
    )
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
          {/* Add New Spot Hint */}
          <button
            onClick={() => router.push('/')}
            className="w-full p-4 border-2 border-dashed border-rc-bg-light rounded-xl hover:border-rc-text-muted hover:bg-rc-bg-dark/50 transition-colors group"
          >
            <div className="flex items-center justify-center gap-2 text-rc-text-muted group-hover:text-rc-text-light">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add New Favorite Spot</span>
            </div>
            <p className="text-xs text-rc-text-muted mt-1">Click anywhere on the forecast map to place a pin and save it</p>
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={fetchSpots}
                className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Spots List */}
          <div className="space-y-3">
            {spots.map(spot => (
              <div
                key={spot.id}
                className="bg-rc-bg-dark rounded-xl border border-rc-bg-light p-4 hover:border-rc-text-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-rc-bg-light rounded-lg flex-shrink-0">
                      <Heart className="w-5 h-5 text-rc-text-light" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-rc-text truncate">{spot.name}</h3>
                      {spot.location && (
                        <div className="flex items-center gap-1 text-sm text-rc-text-muted mt-0.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{spot.location}</span>
                        </div>
                      )}
                      {spot.notes && (
                        <p className="text-sm text-rc-text-muted mt-2">{spot.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative flex-shrink-0">
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
                            onClick={() => handleDelete(spot.id)}
                            disabled={deletingId === spot.id}
                            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-rc-bg-dark flex items-center gap-2 disabled:opacity-50"
                          >
                            {deletingId === spot.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Coordinates */}
                <div className="mt-3 pt-3 border-t border-rc-bg-light flex items-center justify-between">
                  <span className="text-xs text-rc-text-muted">
                    {Number(spot.lat).toFixed(4)}°N, {Math.abs(Number(spot.lon)).toFixed(4)}°W
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
          {!loading && spots.length === 0 && !error && (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-rc-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-rc-text mb-2">No favorite spots yet</h3>
              <p className="text-rc-text-muted">
                Open the forecast map and click anywhere to place a pin, then save it as a favorite
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
