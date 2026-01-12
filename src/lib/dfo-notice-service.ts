/**
 * DFO Notice Service
 *
 * Helper functions for fetching and filtering DFO notices relevant to users
 * Used by the notification system to include DFO notices in scheduled emails
 */

import { createClient } from '@supabase/supabase-js';
import type { NotificationPreferences } from './user-preferences';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface DFONotice {
  id: string;
  notice_number: string;
  dfo_category: string;
  title: string;
  date_issued: string;
  full_text: string;
  notice_url: string;
  notice_type: string;
  priority_level: 'critical' | 'high' | 'medium' | 'low';
  areas: number[];
  subareas: string[];
  species: string[];
  effective_date: string | null;
  expiry_date: string | null;
  is_closure: boolean;
  is_opening: boolean;
  is_biotoxin_alert: boolean;
  is_sanitary_closure: boolean;
}

/**
 * Fetch relevant DFO notices for a user based on their preferences
 */
export async function getRelevantDFONoticesForUser(
  preferences: NotificationPreferences,
  since?: Date
): Promise<DFONotice[]> {
  try {
    // If DFO notices are disabled, return empty array
    if (!preferences.dfo_notices_enabled) {
      return [];
    }

    // Use last_notification_sent or 7 days ago if not specified
    const rawDate = since || preferences.last_notification_sent || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sinceDate = typeof rawDate === 'string' ? new Date(rawDate) : rawDate;

    // Fetch notices issued since last notification
    let query = supabaseAdmin
      .from('dfo_fishery_notices')
      .select('*')
      .gte('date_issued', sinceDate.toISOString())
      .order('date_issued', { ascending: false })
      .limit(20);

    // Filter by user's areas of interest if specified
    if (preferences.dfo_areas_of_interest && preferences.dfo_areas_of_interest.length > 0) {
      query = query.overlaps('areas', preferences.dfo_areas_of_interest);
    }

    const { data: notices, error } = await query;

    if (error) {
      console.error('Error fetching DFO notices:', error);
      return [];
    }

    if (!notices || notices.length === 0) {
      return [];
    }

    // Additional client-side filtering by species if user has favorites
    let filteredNotices = notices;

    if (preferences.favorite_species && preferences.favorite_species.length > 0) {
      // Include notices that mention user's favorite species
      // OR critical/high priority notices (biotoxin, closures)
      filteredNotices = notices.filter(notice => {
        // Always include critical and high priority notices
        if (notice.priority_level === 'critical' || notice.priority_level === 'high') {
          return true;
        }

        // Check if notice mentions any of user's favorite species
        if (notice.species && Array.isArray(notice.species)) {
          return notice.species.some((noticeSpecies: string) =>
            preferences.favorite_species?.some(userSpecies =>
              noticeSpecies.toLowerCase().includes(userSpecies.toLowerCase()) ||
              userSpecies.toLowerCase().includes(noticeSpecies.toLowerCase())
            )
          );
        }

        return false;
      });
    }

    return filteredNotices as DFONotice[];
  } catch (error) {
    console.error('Error fetching relevant DFO notices:', error);
    return [];
  }
}

