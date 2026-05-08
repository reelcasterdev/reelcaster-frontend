'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import type { BlueCasterSpotPage } from '@/lib/bluecaster'
import { useAuth } from '@/contexts/auth-context'
import { useSubscription } from '@/hooks/use-subscription'
import SpotForecastStrip from '@/components/fishing/spot-forecast-strip'

const FREE_HORIZON_DAYS = 1
const PRO_HORIZON_DAYS = 14

interface Props {
  /** Full forecast (14-day) returned by BlueCaster. */
  fullForecast: BlueCasterSpotPage['forecast']
  /** Pre-clipped 6-hour preview for signed-out viewers. */
  previewForecast: BlueCasterSpotPage['forecast']
  speciesOptions: Array<{ id: string; name: string }>
  /** Used for the upgrade CTA so we can attribute conversions back to spot pages. */
  spotSlug: string
}

function clipForecastByDays(
  forecast: BlueCasterSpotPage['forecast'],
  days: number,
): BlueCasterSpotPage['forecast'] {
  if (days <= 0) return { ...forecast, rows: [], horizon_hours: 0 }
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  return {
    ...forecast,
    rows: forecast.rows.filter(r => r.hour_utc <= cutoff),
    horizon_hours: Math.min(forecast.horizon_hours, days * 24),
  }
}

/**
 * Renders the forecast strip clipped to the viewer's allowed horizon:
 *   - Signed-out: 6h tease (consumes `previewForecast`)
 *   - Free authed: 1 day + locked-days inline teaser
 *   - Pro authed: 14 days, no teaser
 *
 * While auth/subscription is loading we render nothing to avoid flashing the
 * pro forecast at a free user (and vice-versa).
 */
export default function HorizonAwareForecast({
  fullForecast,
  previewForecast,
  speciesOptions,
  spotSlug,
}: Props) {
  const { user, loading: authLoading } = useAuth()
  const { isPaid, loading: subLoading } = useSubscription()

  if (authLoading || (user && subLoading)) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="h-24 rounded-xl bg-rc-bg-light animate-pulse" />
      </div>
    )
  }

  if (!user) {
    return <SpotForecastStrip forecast={previewForecast} speciesOptions={speciesOptions} />
  }

  if (isPaid) {
    return <SpotForecastStrip forecast={fullForecast} speciesOptions={speciesOptions} />
  }

  const freeForecast = clipForecastByDays(fullForecast, FREE_HORIZON_DAYS)
  const lockedDays = PRO_HORIZON_DAYS - FREE_HORIZON_DAYS

  return (
    <div data-testid="horizon-aware-forecast" data-tier="free">
      <SpotForecastStrip forecast={freeForecast} speciesOptions={speciesOptions} />
      <div
        className="max-w-5xl mx-auto px-6"
        data-testid="forecast-locked-teaser"
      >
        <div className="rounded-xl border border-blue-500/40 bg-blue-500/15 p-5 flex items-start gap-4">
          <div className="p-2 bg-rc-bg-darkest rounded-lg border border-blue-500/40">
            <Lock className="w-5 h-5 text-blue-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-rc-text">
              Unlock {lockedDays} more days of forecast
            </p>
            <p className="text-sm text-rc-text-light mt-1">
              Pro shows the full 14-day window with hourly detail and 5-species comparison. You&rsquo;re
              currently on Free, which shows today only.
            </p>
          </div>
          <Link
            href={`/pricing?from=spot-horizon&slug=${encodeURIComponent(spotSlug)}`}
            className="shrink-0 inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
            data-testid="upgrade-cta"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  )
}
