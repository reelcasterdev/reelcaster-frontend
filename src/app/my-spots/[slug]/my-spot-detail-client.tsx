'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Anchor, Compass, Fish, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/app/components/layout'
import DashboardHeader from '@/app/components/forecast/dashboard-header'
import { Card, CardContent } from '@/components/ui/card'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

interface SpotDetail {
  id: string
  name: string
  slug: string
  location: string | null
  lat: number
  lon: number
  notes: string | null
  coverage_tier: 't1' | 't2' | 't3' | null
  dfo_area: string | null
  tide_offset_minutes: number | null
  expected_species: string[] | null
  access_notes: string | null
  suggested_species_fingerprint: {
    species: Array<{ slug: string; rank: number; confidence: number }>
    updated_at: string
  } | null
  created_at: string
}

export default function MySpotDetailClient({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [spot, setSpot] = useState<SpotDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?next=/my-spots/${slug}`)
  }, [authLoading, user, router, slug])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch('/api/favorite-spots', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error('Failed to load spot')
        const data = await res.json()
        const match = (data.spots ?? []).find(
          (s: SpotDetail) => s.slug === slug,
        )
        if (cancelled) return
        if (!match) {
          setError('Spot not found')
        } else {
          setSpot(match)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, slug])

  if (authLoading || !user) return null

  return (
    <AppShell showLocationPanel={false}>
      <div className="flex-1 min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6">
        <DashboardHeader
          title={spot?.name ?? 'Spot'}
          showTimeframe={false}
          showSetLocation={false}
          showCustomize={false}
        />

        <div className="max-w-4xl mx-auto space-y-6">
          <Link
            href="/my-spots"
            className="inline-flex items-center gap-2 text-sm text-rc-text-muted hover:text-rc-text"
          >
            <ArrowLeft className="w-4 h-4" /> Back to my spots
          </Link>

          {loading ? (
            <Card className="bg-rc-bg-dark border-rc-bg-light">
              <CardContent className="py-12 flex items-center justify-center text-rc-text-muted">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="bg-rc-bg-dark border-red-500/40">
              <CardContent className="py-12 text-center text-red-400">{error}</CardContent>
            </Card>
          ) : !spot ? null : (
            <>
              <Card className="bg-rc-bg-dark border-rc-bg-light overflow-hidden">
                {MAPBOX_TOKEN && (
                  <div className="relative w-full h-[260px] bg-rc-bg-darkest">
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+3b82f6(${spot.lon},${spot.lat})/${spot.lon},${spot.lat},12,0/800x320@2x?access_token=${MAPBOX_TOKEN}`}
                      alt={`Map of ${spot.name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="py-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-rc-text">{spot.name}</h1>
                      {spot.location && (
                        <p className="text-sm text-rc-text-muted mt-1 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" /> {spot.location}
                        </p>
                      )}
                    </div>
                    {spot.coverage_tier && (
                      <span
                        className={`px-2.5 py-1 text-xs rounded-full ${
                          spot.coverage_tier === 't1'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : spot.coverage_tier === 't3'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        Coverage: {spot.coverage_tier.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-rc-text-muted font-mono">
                    {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
                  </p>

                  {spot.notes && (
                    <p className="text-sm text-rc-text-light pt-2 border-t border-rc-bg-light">
                      {spot.notes}
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="bg-rc-bg-dark border-rc-bg-light">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 text-rc-text-muted text-xs mb-1">
                      <Anchor className="w-4 h-4" />
                      <span>Tide offset</span>
                    </div>
                    <p className="text-base font-semibold text-rc-text">
                      {spot.tide_offset_minutes !== null
                        ? `${spot.tide_offset_minutes >= 0 ? '+' : ''}${spot.tide_offset_minutes}m`
                        : '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-rc-bg-dark border-rc-bg-light">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 text-rc-text-muted text-xs mb-1">
                      <Compass className="w-4 h-4" />
                      <span>DFO area</span>
                    </div>
                    <p className="text-base font-semibold text-rc-text truncate">
                      {spot.dfo_area ?? '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-rc-bg-dark border-rc-bg-light">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 text-rc-text-muted text-xs mb-1">
                      <Fish className="w-4 h-4" />
                      <span>Suggested species</span>
                    </div>
                    <p className="text-base font-semibold text-rc-text">
                      {spot.suggested_species_fingerprint?.species.length ?? 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {spot.suggested_species_fingerprint?.species &&
                spot.suggested_species_fingerprint.species.length > 0 && (
                  <Card className="bg-rc-bg-dark border-rc-bg-light">
                    <CardContent className="py-5">
                      <h2 className="text-rc-text font-semibold mb-3">
                        Likely species near this spot
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {spot.suggested_species_fingerprint.species.map((s) => (
                          <span
                            key={s.slug}
                            className="px-2.5 py-1 text-xs rounded-full bg-rc-bg-light text-rc-text-light"
                            title={`Confidence ${(s.confidence * 100).toFixed(0)}%`}
                          >
                            {s.slug.replace(/-/g, ' ')}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-rc-text-muted mt-3">
                        Pulled from BlueCaster reference data near your coordinates.
                      </p>
                    </CardContent>
                  </Card>
                )}

              <Card className="bg-rc-bg-dark border-rc-bg-light">
                <CardContent className="py-5 text-sm text-rc-text-muted space-y-2">
                  <p>
                    <strong className="text-rc-text">What&apos;s this page?</strong> Your custom
                    spots are private — only you see them.
                  </p>
                  <p>
                    Forecast charts for custom spots are coming soon. For now, use the main
                    forecast at{' '}
                    <Link href={`/?lat=${spot.lat}&lng=${spot.lon}`} className="text-blue-400">
                      home
                    </Link>{' '}
                    or set up an{' '}
                    <Link href="/alerts" className="text-blue-400">
                      alert
                    </Link>{' '}
                    on this location.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
