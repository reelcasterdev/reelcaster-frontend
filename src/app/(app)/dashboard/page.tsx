'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useSubscription } from '@/hooks/use-subscription'
import { supabase } from '@/lib/supabase'
import FreeDashboard from '@/app/components/dashboard/free-dashboard'
import ProDashboard from '@/app/components/dashboard/pro-dashboard'
import OnboardingModal from '@/app/components/onboarding/onboarding-modal'

function DashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { isPaid, loading: subLoading } = useSubscription()
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
    }
  }, [authLoading, user, router])

  // Auto-open the onboarding modal if ?onboarding=1 is present and the user
  // hasn't completed onboarding yet. We check the DB rather than trusting
  // the query param alone so refresh-after-finish doesn't reopen it.
  useEffect(() => {
    if (!user) return
    if (searchParams.get('onboarding') !== '1') {
      setOnboardingChecked(true)
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
      if (!data?.onboarding_completed_at) setOnboardingOpen(true)
      setOnboardingChecked(true)
    })()
    return () => {
      cancelled = true
    }
  }, [user, searchParams])

  if (authLoading || subLoading || !user || !onboardingChecked) {
    return (
      <div className="min-h-screen bg-rc-bg-darkest flex items-center justify-center">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse [animation-delay:300ms]" />
        </div>
      </div>
    )
  }

  return (
    <>
      {isPaid ? <ProDashboard /> : <FreeDashboard />}
      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={() => setOnboardingOpen(false)}
      />
    </>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  )
}
