import { redirect, permanentRedirect } from 'next/navigation';

export const dynamic = 'force-static';

/**
 * Phase 6 — alerts/notifications consolidation.
 *
 * "Forecast emails" (scheduled daily/weekly digests) live at
 * `/profile/forecast-emails`. Real-time alerts (custom-alert-engine triggers)
 * live at `/alerts`. This route stays as a 30-day redirect so external links
 * (email footers, bookmarks) keep working.
 *
 * Using `permanentRedirect` so search engines update the indexed URL.
 */
export default function NotificationSettingsRedirect() {
  permanentRedirect('/profile/forecast-emails');
  // Unreachable — kept for type-checker completeness.
  redirect('/profile/forecast-emails');
}
