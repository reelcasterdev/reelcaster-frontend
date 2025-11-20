/**
 * DFO Notices Scraper API Endpoint
 *
 * Scrapes recreational and safety notices from DFO Pacific Region
 * and stores them in the database.
 *
 * Usage:
 *   POST /api/dfo-notices/scrape?limit=30
 *   Headers: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeDFONotices } from '@/app/utils/scrape-dfo-notices';

// Initialize Supabase client with service role (for inserting data)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
        { status: 500 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '30');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    console.log(`[DFO Scraper] Starting scrape for year ${year}, limit ${limit}`);

    // Create scraper run record
    const { data: scraperRun, error: runError } = await supabase
      .from('dfo_scraper_runs')
      .insert({
        run_started_at: new Date().toISOString(),
        status: 'running',
      })
      .select()
      .single();

    if (runError) {
      console.error('Failed to create scraper run record:', runError);
      return NextResponse.json(
        { error: 'Failed to initialize scraper run' },
        { status: 500 }
      );
    }

    let noticesNew = 0;
    let noticesUpdated = 0;
    const allErrors: string[] = [];

    try {
      // Run scraper
      const { notices, errors, stats } = await scrapeDFONotices({
        year,
        limit,
        openaiApiKey: process.env.OPENAI_API_KEY,
      });

      allErrors.push(...errors);

      console.log(`[DFO Scraper] Stats:`, stats);
      console.log(`[DFO Scraper] Parsed ${notices.length} recreational/safety notices`);

      // Save notices to database
      for (const notice of notices) {
        try {
          // Check if notice already exists
          const { data: existing } = await supabase
            .from('dfo_fishery_notices')
            .select('id, updated_at')
            .eq('notice_number', notice.noticeNumber)
            .single();

          const noticeData = {
            notice_number: notice.noticeNumber,
            doc_id: notice.docId,
            dfo_category: notice.dfoCategory,
            title: notice.title,
            date_issued: notice.dateIssued,
            full_text: notice.fullText,
            notice_url: notice.noticeUrl,
            notice_type: notice.noticeType,
            priority_level: notice.priorityLevel,
            areas: notice.areas,
            subareas: notice.subareas,
            region: 'Pacific',
            species: notice.species,
            effective_date: notice.effectiveDate,
            expiry_date: notice.expiryDate,
            is_closure: notice.isClosure,
            is_opening: notice.isOpening,
            is_biotoxin_alert: notice.isBiotoxinAlert,
            is_sanitary_closure: notice.isSanitaryClosure,
            contact_name: notice.contactName,
            contact_email: notice.contactEmail,
            contact_phone: notice.contactPhone,
            updated_at: new Date().toISOString(),
          };

          if (existing) {
            // Update existing notice
            const { error: updateError } = await supabase
              .from('dfo_fishery_notices')
              .update(noticeData)
              .eq('id', existing.id);

            if (updateError) {
              allErrors.push(`Failed to update ${notice.noticeNumber}: ${updateError.message}`);
            } else {
              noticesUpdated++;
              console.log(`Updated notice ${notice.noticeNumber}`);
            }
          } else {
            // Insert new notice
            const { error: insertError } = await supabase
              .from('dfo_fishery_notices')
              .insert(noticeData);

            if (insertError) {
              allErrors.push(`Failed to insert ${notice.noticeNumber}: ${insertError.message}`);
            } else {
              noticesNew++;
              console.log(`Inserted new notice ${notice.noticeNumber}`);
            }
          }
        } catch (dbError) {
          const errorMsg = dbError instanceof Error ? dbError.message : 'Unknown error';
          allErrors.push(`Database error for ${notice.noticeNumber}: ${errorMsg}`);
        }
      }

      // Update scraper run record
      await supabase
        .from('dfo_scraper_runs')
        .update({
          run_completed_at: new Date().toISOString(),
          notices_found: stats.found,
          notices_new: noticesNew,
          notices_updated: noticesUpdated,
          errors: allErrors,
          status: 'completed',
        })
        .eq('id', scraperRun.id);

      return NextResponse.json({
        success: true,
        stats: {
          ...stats,
          new: noticesNew,
          updated: noticesUpdated,
        },
        errors: allErrors,
        scraperRunId: scraperRun.id,
      });

    } catch (scraperError) {
      // Update run as failed
      const errorMsg = scraperError instanceof Error ? scraperError.message : 'Unknown error';
      await supabase
        .from('dfo_scraper_runs')
        .update({
          run_completed_at: new Date().toISOString(),
          status: 'failed',
          errors: [...allErrors, errorMsg],
        })
        .eq('id', scraperRun.id);

      throw scraperError;
    }

  } catch (error) {
    console.error('[DFO Scraper] Critical error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET() {
  return NextResponse.json({
    message: 'DFO Notices Scraper API',
    usage: 'POST /api/dfo-notices/scrape?limit=30',
    auth: 'Requires Authorization: Bearer <CRON_SECRET> header',
  });
}
