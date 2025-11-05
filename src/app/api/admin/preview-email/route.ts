import { NextRequest, NextResponse } from 'next/server';
import { generateAdminBroadcastEmail, AdminBroadcastEmailData } from '@/lib/email-templates/admin-broadcast';

/**
 * POST /api/admin/preview-email
 * Generate a preview of the broadcast email without sending it
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract email data from request
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

    // Generate email HTML
    const emailHtml = generateAdminBroadcastEmail(emailData);

    return NextResponse.json({
      success: true,
      html: emailHtml,
      subject: body.subject || 'Update from ReelCaster',
    });
  } catch (error) {
    console.error('Error generating email preview:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview',
      },
      { status: 500 }
    );
  }
}
