/**
 * Send Scheduled Notifications API Endpoint
 *
 * This endpoint is called by the GitHub Actions workflow to send
 * scheduled fishing notifications to all users with notifications enabled.
 *
 * POST /api/notifications/send-scheduled
 *
 * Security: Requires CRON_SECRET header for authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUsersWithNotificationsEnabled,
  generateNotificationForUser,
  updateLastNotificationSent,
  type NotificationData,
} from '@/lib/notification-service';
import {
  generateScheduledNotificationEmail,
  generateNotificationSubject,
  type ScheduledNotificationEmailData,
} from '@/lib/email-templates/scheduled-notification';
import { sendEmail } from '@/lib/email-service';

const BATCH_SIZE = 20; // Send emails in batches of 20

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.warn('CRON_SECRET not configured - allowing request (development mode)');
    } else if (cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting scheduled notification job...');

    // Fetch all users with notifications enabled
    const users = await getUsersWithNotificationsEnabled();
    console.log(`Found ${users.length} users with notifications enabled`);

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with notifications enabled',
        stats: {
          total: 0,
          sent: 0,
          skipped: 0,
          failed: 0,
        },
      });
    }

    // Generate notification data for each user
    const notifications: NotificationData[] = [];
    const skippedReasons: Record<string, number> = {};

    console.log('Generating notifications for users...');
    for (const user of users) {
      try {
        const notificationData = await generateNotificationForUser(user);
        notifications.push(notificationData);

        if (!notificationData.shouldSend) {
          const reason = notificationData.reason || 'Unknown';
          skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
        }
      } catch (error) {
        console.error(`Error generating notification for user ${user.id}:`, error);
        notifications.push({
          user,
          shouldSend: false,
          reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // Filter users who should receive notifications
    const usersToNotify = notifications.filter((n) => n.shouldSend);
    console.log(`${usersToNotify.length} users will receive notifications`);
    console.log(`${notifications.length - usersToNotify.length} users skipped`);
    console.log('Skip reasons:', skippedReasons);

    if (usersToNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users meet notification criteria',
        stats: {
          total: users.length,
          sent: 0,
          skipped: notifications.length,
          failed: 0,
          skipReasons: skippedReasons,
        },
      });
    }

    // Prepare emails
    const emails: Array<{ to: string; subject: string; html: string }> = [];

    for (const notification of usersToNotify) {
      const { user, forecastDays, bestDay, weatherAlerts, regulationChanges } = notification;

      if (!bestDay || !forecastDays) {
        console.warn(`Missing data for user ${user.id}, skipping`);
        continue;
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

      emails.push({
        to: user.email,
        subject,
        html,
      });
    }

    console.log(`Sending ${emails.length} emails...`);

    // Send emails individually (each has unique subject/content)
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const notification = usersToNotify.find((n) => n.user.email === email.to);

      try {
        const result = await sendEmail({
          to: email.to,
          subject: email.subject,
          html: email.html,
        });

        if (result.success) {
          sent++;
          // Update last_notification_sent for successfully sent email
          if (notification) {
            await updateLastNotificationSent(notification.user.id);
          }
        } else {
          failed++;
          console.error(`Failed to send email to ${email.to}:`, result.error);
        }
      } catch (error) {
        console.error(`Error sending email to ${email.to}:`, error);
        failed++;
      }

      // Add delay every BATCH_SIZE emails to avoid rate limiting
      if ((i + 1) % BATCH_SIZE === 0 && i + 1 < emails.length) {
        console.log(`Sent ${i + 1} emails, waiting 1 second...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('Notification job completed');
    console.log(`Sent: ${sent}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      message: `Notifications sent successfully`,
      stats: {
        total: users.length,
        sent,
        skipped: notifications.length - usersToNotify.length,
        failed,
        skipReasons: skippedReasons,
      },
    });
  } catch (error) {
    console.error('Error in send-scheduled notification job:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also allow GET for manual testing (with secret)
export async function GET(request: NextRequest) {
  const cronSecret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json({ message: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Use POST method to trigger notifications',
    info: 'This endpoint sends scheduled fishing notifications to users',
  });
}
