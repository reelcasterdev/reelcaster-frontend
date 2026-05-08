'use client';

import { useEffect, type ReactNode } from 'react';
import { useSubscription, type SubscriptionTier } from '@/hooks/use-subscription';
import { useAnalytics } from '@/hooks/use-analytics';
import { UnlockWithProCard } from './unlock-with-pro-card';
import { cn } from '@/lib/utils';

export type PaywallMode = 'block' | 'overlay' | 'inline';
export type PaywallTier = 'free' | 'pro';

export interface PaywallGateProps {
  /** Identifier for analytics (paywall_shown / paywall_cta_clicked events). */
  feature: string;
  /** Minimum tier required to see children. Default 'pro'. */
  requiredTier?: PaywallTier;
  /**
   * 'block'   — replace children entirely with the upsell card.
   * 'overlay' — render children behind a frosted blur with the upsell on top (default).
   * 'inline'  — render children as-is, with the upsell card appended below.
   */
  mode?: PaywallMode;
  /** Optional override for the upsell content; defaults to <UnlockWithProCard>. */
  fallback?: ReactNode;
  /** Headline / bullets / cta passthrough to the default <UnlockWithProCard>. */
  headline?: string;
  bullets?: string[];
  ctaHref?: string;
  ctaLabel?: string;
  /** Theme passthrough to the upsell card. */
  theme?: 'auto' | 'light' | 'dark';
  /** Compact variant of the default upsell. */
  compact?: boolean;
  className?: string;
  children: ReactNode;
}

function tierMeetsRequirement(
  current: SubscriptionTier,
  isPaid: boolean,
  required: PaywallTier,
): boolean {
  if (required === 'free') return true;
  // 'pro' = any paid tier
  return isPaid || current === 'pro_monthly' || current === 'pro_annual';
}

export function PaywallGate({
  feature,
  requiredTier = 'pro',
  mode = 'overlay',
  fallback,
  headline,
  bullets,
  ctaHref,
  ctaLabel,
  theme,
  compact,
  className,
  children,
}: PaywallGateProps) {
  const { tier, isPaid, loading } = useSubscription();
  const { trackEvent } = useAnalytics();

  const meets = tierMeetsRequirement(tier, isPaid, requiredTier);
  const showUpsell = !loading && !meets;

  // Fire paywall_shown event once per render cycle when upsell is visible.
  useEffect(() => {
    if (!showUpsell) return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('paywall_shown', {
          detail: { feature, tier, requiredTier, mode },
        }),
      );
    }
    trackEvent('Paywall Shown', { feature, tier, required_tier: requiredTier, mode });
  }, [showUpsell, feature, tier, requiredTier, mode, trackEvent]);

  const upsell = fallback ?? (
    <UnlockWithProCard
      feature={feature}
      headline={headline}
      bullets={bullets}
      ctaHref={ctaHref}
      ctaLabel={ctaLabel}
      theme={theme}
      compact={compact}
    />
  );

  if (loading) {
    // Render children optimistically while we resolve tier — avoids paywall flash
    // for paid users on every navigation.
    return <>{children}</>;
  }

  if (meets) {
    return <>{children}</>;
  }

  if (mode === 'block') {
    return (
      <div data-testid="paywall-gate" data-feature={feature} className={className}>
        {upsell}
      </div>
    );
  }

  if (mode === 'inline') {
    return (
      <div data-testid="paywall-gate" data-feature={feature} className={cn('space-y-4', className)}>
        {children}
        {upsell}
      </div>
    );
  }

  // overlay
  return (
    <div
      data-testid="paywall-gate"
      data-feature={feature}
      className={cn('relative', className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none select-none blur-sm opacity-60"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="max-w-md w-full">{upsell}</div>
      </div>
    </div>
  );
}

export default PaywallGate;
