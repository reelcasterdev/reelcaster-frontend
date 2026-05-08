'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import NotificationLocationSelector from '@/app/components/notifications/notification-location-selector'
import SpeciesSelector from '@/app/components/notifications/species-selector'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { apiFetch, ApiError } from '@/lib/api-client'

interface Props {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

type Step = 1 | 2 | 3

const DEFAULT_LAT = 48.4284
const DEFAULT_LNG = -123.3656

export default function OnboardingModal({ open, onClose, onComplete }: Props) {
  const { user } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [lat, setLat] = useState(DEFAULT_LAT)
  const [lng, setLng] = useState(DEFAULT_LNG)
  const [radius, setRadius] = useState(25)
  const [locationName, setLocationName] = useState('My home water')
  const [species, setSpecies] = useState<string[]>([])
  const [forecastEmails, setForecastEmails] = useState(true)

  if (!open) return null

  const markComplete = async () => {
    if (!user) return
    await supabase
      .from('user_settings')
      .upsert(
        { user_id: user.id, onboarding_completed_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
  }

  const saveAndFinish = async () => {
    if (!user) return
    setSubmitting(true)
    setError(null)
    try {
      // 1. Save home water as the first favorite spot (only if no spots yet).
      try {
        const existing = await apiFetch<{ spots: { id: string }[] }>('/api/favorite-spots')
        if (!existing.spots || existing.spots.length === 0) {
          await apiFetch('/api/favorite-spots', {
            method: 'POST',
            body: JSON.stringify({
              name: locationName.trim() || 'My home water',
              lat,
              lon: lng,
              location: locationName.trim() || null,
            }),
          })
        }
      } catch (e) {
        // Soft-fail — user can add later. Surfaces only if we hit a hard 500.
        if (e instanceof ApiError && e.status >= 500) throw e
      }

      // 2. Save species + forecast email prefs.
      await supabase.from('notification_preferences').upsert(
        {
          user_id: user.id,
          location_lat: lat,
          location_lng: lng,
          location_radius_km: radius,
          location_name: locationName.trim() || null,
          species_ids: species,
          notifications_enabled: forecastEmails,
          email_enabled: forecastEmails,
        },
        { onConflict: 'user_id' },
      )

      // 3. Mark onboarding complete.
      await markComplete()

      onComplete()
      // Strip ?onboarding=1
      router.replace('/dashboard')
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Failed to save onboarding state')
    } finally {
      setSubmitting(false)
    }
  }

  const skipOnboarding = async () => {
    onClose()
    router.replace('/dashboard')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-rc-bg-dark border border-rc-bg-light rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="onboarding-modal"
      >
        <header className="flex items-center justify-between p-5 border-b border-rc-bg-light">
          <div>
            <h2 className="text-lg font-semibold text-rc-text">Set up your account</h2>
            <p className="text-xs text-rc-text-muted mt-0.5">Step {step} of 3 · Skippable</p>
          </div>
          <button
            type="button"
            onClick={skipOnboarding}
            className="text-rc-text-muted hover:text-rc-text"
            aria-label="Skip onboarding"
            data-testid="onboarding-skip"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-5 space-y-5">
          {step === 1 && (
            <section data-testid="onboarding-step-1">
              <h3 className="text-rc-text font-medium">Pick your home water</h3>
              <p className="text-sm text-rc-text-muted mt-1">
                We&rsquo;ll use this for your daily forecast and the &ldquo;Today at home&rdquo; card.
              </p>
              <input
                type="text"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder="Name this spot (e.g. Oak Bay)"
                className="mt-3 w-full bg-rc-bg-light border border-rc-bg-light rounded-lg px-3 py-2 text-rc-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-3">
                <NotificationLocationSelector
                  initialLat={lat}
                  initialLng={lng}
                  initialRadius={radius}
                  onLocationChange={(la, ln, r) => {
                    setLat(la)
                    setLng(ln)
                    setRadius(r)
                  }}
                />
              </div>
            </section>
          )}

          {step === 2 && (
            <section data-testid="onboarding-step-2">
              <h3 className="text-rc-text font-medium">What do you fish for?</h3>
              <p className="text-sm text-rc-text-muted mt-1">
                Pick a few species so we can show what&rsquo;s biting. You can change this later.
              </p>
              <div className="mt-3">
                <SpeciesSelector selectedSpecies={species} onChange={setSpecies} />
              </div>
            </section>
          )}

          {step === 3 && (
            <section data-testid="onboarding-step-3">
              <h3 className="text-rc-text font-medium">Forecast emails</h3>
              <p className="text-sm text-rc-text-muted mt-1">
                A short daily briefing for your home water. Off by default during the off-season.
              </p>
              <label className="mt-4 flex items-center justify-between bg-rc-bg-light/50 border border-rc-bg-light rounded-lg p-3 cursor-pointer">
                <div>
                  <p className="text-sm text-rc-text">Send me forecast emails</p>
                  <p className="text-xs text-rc-text-muted">
                    Daily, only when conditions look promising.
                  </p>
                </div>
                <Switch checked={forecastEmails} onCheckedChange={setForecastEmails} />
              </label>
            </section>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between p-5 border-t border-rc-bg-light">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as Step)}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-rc-text-muted hover:text-rc-text"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={skipOnboarding}
              className="px-3 py-2 text-sm text-rc-text-muted hover:text-rc-text"
            >
              Skip for now
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as Step)}
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
              data-testid="onboarding-next"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={saveAndFinish}
              disabled={submitting}
              className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
              data-testid="onboarding-finish"
            >
              {submitting ? 'Saving…' : (
                <>
                  Finish <Check className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
