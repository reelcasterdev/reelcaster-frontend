'use client'

import { useState } from 'react'
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/use-subscription'
import { supabase } from '@/lib/supabase'

export default function DangerZoneCard() {
  const { isPaid, stripeCustomerId } = useSubscription()
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCancel = async () => {
    setOpening(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await res.json()
      if (!res.ok || !body.url) throw new Error(body.error ?? 'Could not open portal')
      window.location.href = body.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open portal')
      setOpening(false)
    }
  }

  return (
    <Card className="bg-rc-bg-dark border-red-500/30">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <CardTitle className="text-rc-text text-xl">Danger zone</CardTitle>
            <CardDescription className="text-rc-text-muted mt-1">
              Cancellation and account deletion
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-md p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-rc-bg-light bg-rc-bg-darkest">
          <div>
            <p className="text-rc-text font-medium">Cancel subscription</p>
            <p className="text-sm text-rc-text-muted mt-1">
              {isPaid
                ? 'Cancel anytime via Stripe — you keep access until the end of your billing period.'
                : 'You don’t have an active paid subscription.'}
            </p>
          </div>
          <Button
            onClick={handleCancel}
            disabled={!isPaid || opening || !stripeCustomerId}
            variant="outline"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            {opening ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening portal…
              </>
            ) : (
              <>
                Cancel via Stripe <ExternalLink className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-rc-bg-light bg-rc-bg-darkest opacity-60">
          <div>
            <p className="text-rc-text font-medium">Delete account</p>
            <p className="text-sm text-rc-text-muted mt-1">
              Permanently remove your account and personal data. Coming soon — for now,
              email{' '}
              <a href="mailto:support@reelcaster.com" className="text-blue-400 hover:text-blue-300">
                support@reelcaster.com
              </a>
              .
            </p>
          </div>
          <Button disabled variant="outline" className="border-rc-bg-light text-rc-text-muted">
            Coming soon
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
