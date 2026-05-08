'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useSubscription } from '@/hooks/use-subscription';

/**
 * Tier-aware CTA next to a spot's RC score:
 *   - Signed-out  → "Unlock 14-Day Forecast" → /signup?from=fishing&spot=...
 *   - Free authed → "Upgrade to Pro" → /pricing?from=spot-score&slug=...
 *   - Pro authed  → render nothing (the score IS unlocked)
 *
 * While auth/subscription state is loading we render a small placeholder so
 * the layout doesn't jump on hydration.
 */
export default function SpotScoreCtaButton({ spotSlug }: { spotSlug: string }) {
  const { user, loading: authLoading } = useAuth();
  const { isPaid, loading: subLoading } = useSubscription();

  if (authLoading || (user && subLoading)) {
    return (
      <span className="border border-rc-bg-light text-rc-text-muted text-sm px-6 py-3 uppercase tracking-widest font-medium rounded">
        &nbsp;
      </span>
    );
  }

  if (user && isPaid) return null;

  if (!user) {
    return (
      <Link
        href={`/signup?from=fishing&spot=${spotSlug}`}
        className="border border-rc-bg-light text-rc-text-light text-sm px-6 py-3 uppercase tracking-widest font-medium hover:border-blue-500/40 hover:bg-rc-bg-dark transition-colors rounded"
      >
        Unlock 14-Day Forecast &rarr;
      </Link>
    );
  }

  // Free authed user.
  return (
    <Link
      href={`/pricing?from=spot-score&slug=${encodeURIComponent(spotSlug)}`}
      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-6 py-3 uppercase tracking-widest font-semibold transition-colors rounded"
    >
      Upgrade to Pro &rarr;
    </Link>
  );
}
