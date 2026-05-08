'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export type SubscriptionTier = 'free' | 'pro_monthly' | 'pro_annual';
export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid';

export interface SubscriptionState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isPaid: boolean;
  loading: boolean;
  periodEnd: string | null;
  stripeCustomerId: string | null;
  phoneE164: string | null;
  phoneVerified: boolean;
  refresh: () => void;
}

const DEFAULT: SubscriptionState = {
  tier: 'free',
  status: 'none',
  isPaid: false,
  loading: true,
  periodEnd: null,
  stripeCustomerId: null,
  phoneE164: null,
  phoneVerified: false,
  refresh: () => {},
};

export function useSubscription(): SubscriptionState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>(DEFAULT);
  const [reloadCounter, setReloadCounter] = useState(0);

  const refresh = () => setReloadCounter((n) => n + 1);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;

    if (!user) {
      setState({
        tier: 'free',
        status: 'none',
        isPaid: false,
        loading: false,
        periodEnd: null,
        stripeCustomerId: null,
        phoneE164: null,
        phoneVerified: false,
        refresh,
      });
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select(
          'subscription_tier, subscription_status, subscription_period_end, stripe_customer_id, phone_e164, phone_verified',
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setState({
          tier: 'free',
          status: 'none',
          isPaid: false,
          loading: false,
          periodEnd: null,
          stripeCustomerId: null,
          phoneE164: null,
          phoneVerified: false,
          refresh,
        });
        return;
      }

      const tier = (data.subscription_tier ?? 'free') as SubscriptionTier;
      const status = (data.subscription_status ?? 'none') as SubscriptionStatus;
      const isPaid =
        (tier === 'pro_monthly' || tier === 'pro_annual') &&
        (status === 'active' || status === 'trialing');

      setState({
        tier,
        status,
        isPaid,
        loading: false,
        periodEnd: data.subscription_period_end ?? null,
        stripeCustomerId: data.stripe_customer_id ?? null,
        phoneE164: data.phone_e164 ?? null,
        phoneVerified: !!data.phone_verified,
        refresh,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, reloadCounter]);

  return state;
}
