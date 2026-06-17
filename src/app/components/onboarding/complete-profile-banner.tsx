'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'

/**
 * Persistent "Complete your profile" banner. Visible only when the user has
 * skipped or never started onboarding (user_settings.onboarding_completed_at IS NULL).
 * Clicking it sets ?onboarding=1 which the dashboard reads to open the modal.
 */
export default function CompleteProfileBanner() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (!user) {
      setShowBanner(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('onboarding_completed_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      const onboarded = !!data?.onboarding_completed_at
      setShowBanner(!onboarded)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  if (!showBanner) return null
  if (searchParams.get('onboarding') === '1') return null

  return (
    <div
      className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between gap-4"
      data-testid="complete-profile-banner"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-rc-text">Finish setting up your profile</p>
          <p className="text-xs text-rc-text-muted mt-0.5">
            Pick your home water, favorite species, and email preferences so we can tailor your
            forecasts.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => router.push('/dashboard?onboarding=1')}
        className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Continue
      </button>
    </div>
  )
}
