/**
 * Preview Notification API Endpoint
 *
 * Generates a preview of what the user's notification email would look like
 * based on their current preferences and actual forecast data.
 *
 * GET /api/notifications/preview
 *
 * Query params:
 *   - userId: Optional user ID (defaults to current authenticated user)
 *
 * Security: Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateNotificationForUser,
  type UserWithPreferences,
} from '@/lib/notification-service';
import {
  generateScheduledNotificationEmail,
  generateNotificationSubject,
  type ScheduledNotificationEmailData,
} from '@/lib/email-templates/scheduled-notification';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's notification preferences
    const { data: preferences, error: prefsError } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (prefsError || !preferences) {
      return NextResponse.json(
        {
          error: 'No notification preferences found',
          message: 'Please set up your notification preferences first',
        },
        { status: 404 }
      );
    }

    // Check if user has location set
    if (!preferences.location_lat || !preferences.location_lng) {
      return NextResponse.json(
        {
          error: 'No location set',
          message: 'Please set your notification location in preferences',
        },
        { status: 400 }
      );
    }

    // Create user object
    const user: UserWithPreferences = {
      id: authUser.id,
      email: authUser.email!,
      raw_user_meta_data: authUser.user_metadata,
      preferences,
    };

    console.log(`Generating preview for user ${user.id}`);

    // Generate notification data (ignoring frequency/timing checks)
    // Override last_notification_sent to force generation
    const userWithOverride = {
      ...user,
      preferences: {
        ...user.preferences,
        last_notification_sent: null, // Force generation
      },
    };

    const notificationData = await generateNotificationForUser(userWithOverride);

    // Check if notification would be sent
    if (!notificationData.shouldSend) {
      return NextResponse.json(
        {
          error: 'No notification would be sent',
          reason: notificationData.reason,
          message:
            'Based on your current preferences and forecast, no notification would be sent. Try adjusting your thresholds.',
        },
        { status: 200 }
      );
    }

    const { forecastDays, bestDay, weatherAlerts, regulationChanges } = notificationData;

    if (!bestDay || !forecastDays) {
      return NextResponse.json(
        {
          error: 'Unable to generate preview',
          message: 'Missing forecast data',
        },
        { status: 500 }
      );
    }

    // Get species names from IDs
    const speciesNames = user.preferences.favorite_species.map((id) => {
      const speciesMap: Record<string, string> = {
        'chinook-salmon': 'Chinook Salmon',
        'coho-salmon': 'Coho Salmon',
        'chum-salmon': 'Chum Salmon',
        'pink-salmon': 'Pink Salmon',
        'sockeye-salmon': 'Sockeye Salmon',
        halibut: 'Pacific Halibut',
        lingcod: 'Lingcod',
        rockfish: 'Rockfish',
      };
      return speciesMap[id] || id;
    });

    const emailData: ScheduledNotificationEmailData = {
      userName: user.raw_user_meta_data?.name || undefined,
      userEmail: user.email,
      locationName: user.preferences.location_name || undefined,
      bestDay,
      forecastDays,
      weatherAlerts,
      regulationChanges,
      speciesNames: speciesNames.length > 0 ? speciesNames : undefined,
      preferences: {
        fishing_score_threshold: user.preferences.fishing_score_threshold,
        wind_speed_threshold_kph: user.preferences.wind_speed_threshold_kph,
        precipitation_threshold_mm: user.preferences.precipitation_threshold_mm,
      },
    };

    const subject = generateNotificationSubject(emailData);
    const html = generateScheduledNotificationEmail(emailData);

    return NextResponse.json({
      success: true,
      preview: {
        subject,
        html,
      },
      metadata: {
        bestDayScore: bestDay.score,
        forecastDays: forecastDays.length,
        hasAlerts: (weatherAlerts?.length || 0) > 0,
        hasRegulationChanges: (regulationChanges?.length || 0) > 0,
        species: speciesNames,
      },
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
