import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseArea, detectChanges } from '@/app/utils/dfoParser'

// Initialize Supabase client with service role for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * POST /api/regulations/scrape
 * Scrape DFO websites and store results for review
 * Protected endpoint - requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    // Verify authentication (check for cron secret or admin auth)
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.headers.get('x-cron-secret')

    if (cronSecret !== process.env.CRON_SECRET && !authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const areas = [
      {
        id: '19',
        name: 'Victoria, Sidney',
        url: 'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s19-eng.html',
      },
      {
        id: '20',
        name: 'Sooke',
        url: 'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s20-eng.html',
      },
    ]

    const results = []

    for (const area of areas) {
      try {
        // Fetch the DFO page content
        const response = await fetch(area.url, {
          headers: {
            'User-Agent': 'ReelCaster/1.0 (Fishing Regulation Monitor)',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch ${area.url}: ${response.status}`)
        }

        const html = await response.text()

        // Parse regulations using shared parser utility
        const scrapedData = await parseArea(html, area.id, area.name, area.url, {
          validateWithAI: true,
        })

        // Get current regulations for comparison
        const { data: currentReg } = await supabase
          .from('fishing_regulations')
          .select('*, species:species_regulations(*)')
          .eq('area_id', area.id)
          .eq('is_active', true)
          .single()

        // Detect changes
        const changes = detectChanges(currentReg, scrapedData)

        // Store scraped data for review
        const { data: scraped } = await supabase
          .from('scraped_regulations')
          .insert({
            area_id: area.id,
            scraped_data: scrapedData,
            changes_detected: changes,
            approval_status: changes.length > 0 ? 'pending' : 'approved',
          })
          .select()
          .single()

        results.push({
          area: area.name,
          success: true,
          changesDetected: changes.length,
          changes,
          scrapedId: scraped?.id,
        })

        // If no changes and auto-approve is enabled, approve immediately
        if (changes.length === 0 && process.env.AUTO_APPROVE_NO_CHANGES === 'true') {
          await supabase
            .from('scraped_regulations')
            .update({ approval_status: 'approved' })
            .eq('id', scraped?.id)
        }

      } catch (err) {
        const error = err as Error
        results.push({
          area: area.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        // Log error to scraped_regulations
        await supabase.from('scraped_regulations').insert({
          area_id: area.id,
          scraped_data: {},
          error_message: error instanceof Error ? error.message : 'Unknown error',
          approval_status: 'rejected',
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      scrapedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json(
      { error: 'Scraping failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/regulations/scrape
 * Get pending scraped regulations for review
 */
export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('scraped_regulations')
      .select('*')
      .eq('approval_status', 'pending')
      .order('scrape_timestamp', { ascending: false })
      .limit(20)

    return NextResponse.json({ scraped: data })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch scraped regulations' },
      { status: 500 }
    )
  }
}
