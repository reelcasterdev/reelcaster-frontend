/**
 * Analytics Hook
 * Convenience hook for accessing analytics functionality
 */

import { useMixpanel } from '@/contexts/mixpanel-context';
import type { AnalyticsContextType } from '@/types/analytics';

/**
 * Hook to access analytics functionality
 * Provides methods to track events, identify users, and manage user properties
 *
 * @example
 * ```tsx
 * const { trackEvent } = useAnalytics();
 *
 * trackEvent('Location Selected', {
 *   location: 'Victoria, Sidney',
 *   hotspot: 'Waterfront',
 * });
 * ```
 */
export function useAnalytics(): AnalyticsContextType {
  return useMixpanel();
}
