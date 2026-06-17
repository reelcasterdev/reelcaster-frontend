'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Heart,
  Bell,
  Anchor,
  Compass,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Lock,
} from 'lucide-react'
import { AppShell } from '@/app/components/layout'
import { useAuth } from '@/contexts/auth-context'
import { apiFetch } from '@/lib/api-client'
import UnlockWithProCard from '@/app/components/paywall/unlock-with-pro-card'
import CompleteProfileBanner from '@/app/components/onboarding/complete-profile-banner'

interface FavoriteSpot {
  id: string
  name: string
  slug: string
  location: string | null
  lat: number
  lon: number
}

interface CatchRow {
  id: string
  species_id: string | null
  outcome: 'bite' | 'landed'
  retention_status: 'released' | 'kept' | null
  caught_at: string
  notes: string | null
}

interface AlertRow {
  id: string
  name: string
  is_active: boolean
}

export default function FreeDashboard() {
  const { user } = useAuth()
  const [spots, setSpots] = useState<FavoriteSpot[]>([])
  const [catches, setCatches] = useState<CatchRow[]>([])
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const [spotsRes, catchesRes, alertsRes] = await Promise.all([
          apiFetch<{ spots: FavoriteSpot[] }>('/api/favorite-spots').catch(() => ({ spots: [] })),
          apiFetch<{ catches: CatchRow[] }>('/api/catches?limit=3').catch(() => ({ catches: [] })),
          apiFetch<{ profiles: AlertRow[] }>('/api/alerts').catch(() => ({ profiles: [] })),
        ])
        if (cancelled) return
        setSpots(spotsRes.spots ?? [])
        setCatches(catchesRes.catches ?? [])
        setAlerts(alertsRes.profiles ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const homeSpot = spots[0] ?? null
  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'angler'

  return (
    <AppShell showLocationPanel={false}>
      <div
        className="flex-1 min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6"
        data-testid="free-dashboard-root"
      >
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Welcome row */}
          <header>
            <h1 className="text-2xl sm:text-3xl font-semibold text-rc-text">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-rc-text-muted mt-1">
              Today&rsquo;s briefing for your home water and recent activity.
            </p>
          </header>

          <CompleteProfileBanner />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Today at home spot */}
            <section
              className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-5 md:col-span-2"
              data-testid="home-spot-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-rc-text-muted text-xs uppercase tracking-wide">
                    <Heart className="w-4 h-4" />
                    Today at your home spot
                  </div>
                  {homeSpot ? (
                    <>
                      <h2 className="text-xl font-semibold text-rc-text mt-2">
                        {homeSpot.name}
                      </h2>
                      <p className="text-sm text-rc-text-muted">
                        {homeSpot.location ?? `${homeSpot.lat.toFixed(3)}, ${homeSpot.lon.toFixed(3)}`}
                      </p>
                    </>
                  ) : (
                    <h2 className="text-xl font-semibold text-rc-text mt-2">
                      Pick a home water to see today&rsquo;s outlook
                    </h2>
                  )}
                </div>
                {homeSpot ? (
                  <Link
                    href={`/my-spots/${homeSpot.slug}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                  >
                    Open <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    href="/my-spots"
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                  >
                    Add spot <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Forecast horizon" value="Today" />
                <Stat label="Locked days" value="13 (Pro)" muted />
                <Stat label="Species scored" value="1 of 5" muted />
                <Stat label="Bathymetry" value="Pro" muted />
              </div>

              <p className="text-xs text-rc-text-muted mt-4">
                Free plan shows today only. Upgrade to unlock the full 14-day window and 5-species
                comparison.
              </p>
            </section>

            {/* Recent catches */}
            <section className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rc-text-muted text-xs uppercase tracking-wide">
                  <Anchor className="w-4 h-4" /> Recent catches
                </div>
                <Link
                  href="/profile/catch-log"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  View all
                </Link>
              </div>
              {loading ? (
                <p className="text-sm text-rc-text-muted mt-4">Loading…</p>
              ) : catches.length === 0 ? (
                <div className="text-sm text-rc-text-muted mt-4">
                  No catches yet. Tap the &ldquo;Fish On&rdquo; button next time you&rsquo;re on the
                  water.
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {catches.slice(0, 3).map(c => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between text-sm border-b border-rc-bg-light/50 last:border-0 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-rc-text">
                          {c.species_id ?? (c.outcome === 'landed' ? 'In the boat' : 'Bite')}
                        </span>
                        {c.retention_status && (
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded-full ${
                              c.retention_status === 'released'
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {c.retention_status}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-rc-text-muted">
                        {new Date(c.caught_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Your alert */}
            <section className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rc-text-muted text-xs uppercase tracking-wide">
                  <Bell className="w-4 h-4" /> Your alert
                </div>
                <Link href="/alerts" className="text-xs text-blue-400 hover:text-blue-300">
                  Manage
                </Link>
              </div>
              {loading ? (
                <p className="text-sm text-rc-text-muted mt-4">Loading…</p>
              ) : alerts.length === 0 ? (
                <div className="mt-3">
                  <p className="text-sm text-rc-text-muted">
                    Get notified when conditions match your setup.
                  </p>
                  <Link
                    href="/alerts"
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                  >
                    Create alert <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-rc-text">{alerts[0].name}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full ${
                        alerts[0].is_active
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-rc-bg-light text-rc-text-muted'
                      }`}
                    >
                      {alerts[0].is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-rc-bg-light text-rc-text-muted rounded-lg text-sm cursor-not-allowed"
                    data-testid="alert-add-locked"
                  >
                    <Lock className="w-3.5 h-3.5" /> Add another (Pro)
                  </button>
                </div>
              )}
            </section>

            {/* Browse spots tile */}
            <Tile
              icon={<Compass className="w-5 h-5 text-blue-400" />}
              title="Browse fishing spots"
              subtitle="Explore cities, regions, and known hotspots."
              actions={[
                { href: '/fishing', label: 'By region' },
                { href: '/explore', label: 'Map view' },
              ]}
            />

            {/* Regulations tile */}
            <Tile
              icon={<AlertCircle className="w-5 h-5 text-amber-400" />}
              title="Regulations & DFO notices"
              subtitle="Latest closures, openings, and biotoxin advisories."
              actions={[
                { href: '/regulations', label: 'View regulations' },
              ]}
            />
          </div>

          {/* Big upgrade hero */}
          <UnlockWithProCard
            headline="Unlock the full forecast"
            bullets={[
              '14-day forecast with hourly detail',
              '5-species comparative scoring',
              'Bathymetry layer (NOAA + CHS)',
              'Unlimited alerts and favorites',
              'Forecast emails tuned to your home water',
            ]}
            ctaHref="/pricing?from=free-dashboard"
            theme="dark"
          />
        </div>
      </div>
    </AppShell>
  )
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="bg-rc-bg-darkest border border-rc-bg-light rounded-lg p-3">
      <div className={`text-xs ${muted ? 'text-rc-text-muted' : 'text-rc-text-muted'}`}>{label}</div>
      <div
        className={`mt-1 text-base font-semibold ${
          muted ? 'text-rc-text-muted flex items-center gap-1' : 'text-rc-text'
        }`}
      >
        {muted && <Lock className="w-3 h-3" />}
        {value}
      </div>
    </div>
  )
}

function Tile({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  actions: { href: string; label: string }[]
}) {
  return (
    <section className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rc-bg-light rounded-lg">{icon}</div>
        <div className="flex-1">
          <h3 className="text-rc-text font-semibold">{title}</h3>
          <p className="text-sm text-rc-text-muted mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map(a => (
          <Link
            key={a.href}
            href={a.href}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rc-bg-light hover:bg-rc-bg-darkest border border-rc-bg-light rounded-lg text-sm text-rc-text transition-colors"
          >
            {a.label} <ChevronRight className="w-4 h-4" />
          </Link>
        ))}
      </div>
    </section>
  )
}
