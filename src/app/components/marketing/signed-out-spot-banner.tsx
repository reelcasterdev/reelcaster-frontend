'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import AuthAwareReveal from './auth-aware-reveal';

interface Props {
  spotSlug: string;
}

/**
 * Sticky bottom CTA shown ONLY to signed-out visitors on a spot page.
 * "Light tease" mode (per locked product decision): visitors see the next 6
 * hours of forecast above; full 14-day forecast and breakdown panel sit
 * behind sign-up.
 */
export default function SignedOutSpotBanner({ spotSlug }: Props) {
  return (
    <AuthAwareReveal mode="signed-out">
      <div
        data-testid="signed-out-spot-banner"
        className="fixed bottom-0 inset-x-0 z-40 bg-rc-bg-light text-rc-text shadow-2xl border-t border-rc-bg-light"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 text-sm">
          <p className="font-medium">
            <span className="hidden sm:inline">You&apos;re seeing the next 6 hours.</span>{' '}
            <span className="text-rc-text-muted">Sign up free</span> for the full 1-day forecast.
          </p>
          <Link
            href={`/signup?from=spot&slug=${encodeURIComponent(spotSlug)}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold whitespace-nowrap transition-colors"
          >
            Sign up free <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </AuthAwareReveal>
  );
}
