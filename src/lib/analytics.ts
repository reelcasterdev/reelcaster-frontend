/**
 * Analytics Helper Functions
 * Wrapper functions for type-safe Mixpanel tracking
 */

import { getMixpanel, isMixpanelEnabled } from './mixpanel';
import type { AnalyticsEventName, UserProperties } from '@/types/analytics';

/**
 * Track an analytics event
 * @param eventName - The name of the event
 * @param properties - Event properties (optional)
 */
export function trackEvent<T extends Record<string, unknown>>(
  eventName: AnalyticsEventName,
  properties?: T
): void {
  if (!isMixpanelEnabled()) {
    // In development, log to console for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventName, properties);
    }
    return;
  }

  const mixpanel = getMixpanel();
  if (!mixpanel) return;

  try {
    // Add timestamp to all events
    const eventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    };

    mixpanel.track(eventName, eventProperties);
  } catch (error) {
    console.error('[Analytics] Track error:', error);
  }
}

/**
 * Identify a user with Mixpanel
 * @param userId - The unique user ID
 * @param properties - User properties (optional)
 */
export function identifyUser(
  userId: string,
  properties?: UserProperties
): void {
  if (!isMixpanelEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Identify:', userId, properties);
    }
    return;
  }

  const mixpanel = getMixpanel();
  if (!mixpanel) return;

  try {
    mixpanel.identify(userId);

    if (properties) {
      setUserProperties(properties);
    }
  } catch (error) {
    console.error('[Analytics] Identify error:', error);
  }
}

/**
 * Alias a user (used when converting anonymous user to authenticated)
 * @param userId - The authenticated user ID
 */
export function aliasUser(userId: string): void {
  if (!isMixpanelEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Alias:', userId);
    }
    return;
  }

  const mixpanel = getMixpanel();
  if (!mixpanel) return;

  try {
    mixpanel.alias(userId);
  } catch (error) {
    console.error('[Analytics] Alias error:', error);
  }
}

/**
 * Set user properties
 * @param properties - User properties to set
 */
export function setUserProperties(properties: UserProperties): void {
  if (!isMixpanelEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Set user properties:', properties);
    }
    return;
  }

  const mixpanel = getMixpanel();
  if (!mixpanel) return;

  try {
    mixpanel.people.set(properties);
  } catch (error) {
    console.error('[Analytics] Set user properties error:', error);
  }
}

/**
 * Increment a user property
 * @param property - The property to increment
 * @param by - The amount to increment by (default: 1)
 */
export function incrementUserProperty(property: string, by: number = 1): void {
  if (!isMixpanelEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Increment:', property, 'by', by);
    }
    return;
  }

  const mixpanel = getMixpanel();
  if (!mixpanel) return;

  try {
    mixpanel.people.increment(property, by);
  } catch (error) {
    console.error('[Analytics] Increment error:', error);
  }
}

/**
 * Reset analytics (used on logout)
 */
export function resetAnalytics(): void {
  if (!isMixpanelEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Reset');
    }
    return;
  }

  const mixpanel = getMixpanel();
  if (!mixpanel) return;

  try {
    mixpanel.reset();
  } catch (error) {
    console.error('[Analytics] Reset error:', error);
  }
}

/**
 * Track page load time
 * @param page - The page name
 * @param loadTime - Load time in milliseconds
 */
export function trackPageLoadTime(page: string, loadTime: number): void {
  trackEvent('Page Load Time', {
    page,
    loadTime,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track API call performance
 * @param endpoint - API endpoint name
 * @param duration - Call duration in milliseconds
 * @param success - Whether the call succeeded
 * @param error - Error message if failed
 */
export function trackApiCall(
  endpoint: string,
  duration: number,
  success: boolean,
  error?: string
): void {
  trackEvent('API Call', {
    endpoint,
    duration,
    success,
    error,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track an error
 * @param errorType - Type of error
 * @param errorMessage - Error message
 * @param component - Component where error occurred
 */
export function trackError(
  errorType: string,
  errorMessage: string,
  component?: string
): void {
  trackEvent('Error', {
    errorType,
    errorMessage,
    component,
    timestamp: new Date().toISOString(),
  });
}
