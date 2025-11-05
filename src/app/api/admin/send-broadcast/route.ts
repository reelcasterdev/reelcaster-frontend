import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAdminBroadcastEmail, AdminBroadcastEmailData } from '@/lib/email-templates/admin-broadcast';
import { sendBatchEmails, isValidEmail } from '@/lib/email-service';

// Initialize Supabase admin client (needs service role key to access auth.users)
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Service role key for admin operations - add to .env.local
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * POST /api/admin/send-broadcast
 * Send broadcast email to all users
 *
 * Body: {
 *   subject: string
 *   customMessage: string
 *   locationName?: string
 *   includeForecast?: boolean
 *   forecastDays?: ForecastDay[]
 *   includeWeather?: boolean
 *   weatherHighlights?: WeatherHighlights
 *   includeTides?: boolean
 *   tideInfo?: TideInfo[]
 *   includeReports?: boolean
 *   fishingReports?: FishingReport[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject = 'Update from ReelCaster' } = body;

    console.log('🚀 Starting broadcast email send...');

    // Step 1: Get all users from Supabase
    const supabase = getSupabaseAdminClient();

    // Fetch all users - using admin client to access auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch users: ' + usersError.message,
        },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        total: 0,
        message: 'No users found',
      });
    }

    console.log(`📧 Found ${users.length} users`);

    // Step 2: Extract and validate email addresses
    const emailAddresses = users
      .map(user => user.email)
      .filter((email): email is string => !!email && isValidEmail(email));

    const skipped = users.length - emailAddresses.length;

    if (emailAddresses.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        total: users.length,
        skipped,
        message: 'No valid email addresses found',
      });
    }

    console.log(`✅ ${emailAddresses.length} valid emails (${skipped} skipped)`);

    // Step 3: Generate email HTML
    const emailData: AdminBroadcastEmailData = {
      customMessage: body.customMessage || '',
      locationName: body.locationName,
      includeForecast: body.includeForecast,
      forecastDays: body.forecastDays,
      includeWeather: body.includeWeather,
      weatherHighlights: body.weatherHighlights,
      includeTides: body.includeTides,
      tideInfo: body.tideInfo,
      includeReports: body.includeReports,
      fishingReports: body.fishingReports,
    };

    const emailHtml = generateAdminBroadcastEmail(emailData);

    console.log('📝 Email HTML generated, length:', emailHtml.length);

    // Step 4: Send emails in batches
    console.log('📮 Sending emails in batches...');

    const { sent, failed, results } = await sendBatchEmails(
      emailAddresses,
      subject,
      emailHtml,
      20 // batch size
    );

    console.log(`✨ Broadcast complete: ${sent} sent, ${failed} failed`);

    // Step 5: Return results
    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: emailAddresses.length,
      skipped,
      results: results.map((r, i) => ({
        email: emailAddresses[i],
        success: r.success,
        messageId: r.messageId,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send broadcast',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/send-broadcast
 * Get user count (for preview before sending)
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      throw error;
    }

    const validEmails = users.filter(user => user.email && isValidEmail(user.email));

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      validEmails: validEmails.length,
      invalidEmails: users.length - validEmails.length,
    });
  } catch (error) {
    console.error('Error getting user count:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user count',
      },
      { status: 500 }
    );
  }
}
