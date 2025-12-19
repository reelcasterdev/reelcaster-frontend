/**
 * Alert Evaluation API
 *
 * POST /api/alerts/evaluate - Process all active alert profiles
 *
 * This endpoint is called by the GitHub Actions cron job every 15-30 minutes.
 * It evaluates all active alert profiles and sends notifications for matches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAlerts, getUserEmail, logAlertHistory } from '@/lib/custom-alert-engine';
import { sendEmail } from '@/lib/email-service';
import { generateCustomAlertEmail } from '@/lib/email-templates/custom-alert';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log('Starting alert evaluation...');

    // Process all active alerts
    const results = await processAlerts();

    console.log(`Processed ${results.processed} profiles, ${results.triggered} triggered`);

    // Send notifications for triggered alerts
    const notificationResults: Array<{
      profileId: string;
      email: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const result of results.results) {
      if (!result.triggered) continue;

      try {
        // Get alert profile details
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_alert_profiles')
          .select('*')
          .eq('id', result.profileId)
          .single();

        if (profileError || !profile) {
          console.error(`Failed to fetch profile ${result.profileId}:`, profileError);
          continue;
        }

        // Get user email
        const email = await getUserEmail(profile.user_id);
        if (!email) {
          console.error(`No email found for user ${profile.user_id}`);
          continue;
        }

        // Get most recent history entry for condition snapshot
        const { data: historyEntry } = await supabaseAdmin
          .from('alert_history')
          .select('*')
          .eq('alert_profile_id', result.profileId)
          .order('triggered_at', { ascending: false })
          .limit(1)
          .single();

        // Generate email
        const emailContent = generateCustomAlertEmail({
          alertName: profile.name,
          locationName: profile.location_name || `${profile.location_lat.toFixed(4)}, ${profile.location_lng.toFixed(4)}`,
          matchedTriggers: historyEntry?.matched_triggers || [],
          conditionSnapshot: historyEntry?.condition_snapshot || {},
          logicMode: profile.logic_mode,
          forecastUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://reelcaster.com'}?lat=${profile.location_lat}&lng=${profile.location_lng}`,
          manageAlertsUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://reelcaster.com'}/profile/custom-alerts`,
        });

        // Send email
        const sendResult = await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (sendResult.success) {
          notificationResults.push({
            profileId: result.profileId,
            email,
            success: true,
          });

          // Update history to mark notification as sent
          if (historyEntry) {
            await supabaseAdmin
              .from('alert_history')
              .update({ notification_sent: true })
              .eq('id', historyEntry.id);
          }
        } else {
          notificationResults.push({
            profileId: result.profileId,
            email,
            success: false,
            error: sendResult.error,
          });

          // Log notification error
          if (historyEntry) {
            await supabaseAdmin
              .from('alert_history')
              .update({
                notification_sent: false,
                notification_error: sendResult.error,
              })
              .eq('id', historyEntry.id);
          }
        }
      } catch (notifyError) {
        console.error(`Error sending notification for ${result.profileId}:`, notifyError);
        notificationResults.push({
          profileId: result.profileId,
          email: 'unknown',
          success: false,
          error: notifyError instanceof Error ? notifyError.message : 'Unknown error',
        });
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const successfulNotifications = notificationResults.filter((r) => r.success).length;
    const failedNotifications = notificationResults.filter((r) => !r.success).length;

    const summary = {
      success: true,
      duration_ms: duration,
      profiles_processed: results.processed,
      alerts_triggered: results.triggered,
      alerts_skipped: results.skipped,
      errors: results.errors,
      notifications_sent: successfulNotifications,
      notifications_failed: failedNotifications,
      results: results.results,
      notification_results: notificationResults,
    };

    console.log('Alert evaluation complete:', {
      duration_ms: duration,
      processed: results.processed,
      triggered: results.triggered,
      notifications_sent: successfulNotifications,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error in alert evaluation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'alerts/evaluate',
    description: 'POST with CRON_SECRET to evaluate all active alert profiles',
  });
}
