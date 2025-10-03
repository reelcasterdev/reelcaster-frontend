import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ScrapedRegulationData {
  chinook?: {
    dailyLimit: string
    minSize: string
    notes: string[]
  }
  coho?: {
    dailyLimit: string
    notes: string[]
  }
  halibut?: {
    dailyLimit: string
    maxSize: string
  }
  lingcod?: {
    dailyLimit: string
    minSize: string
    season: string
  }
  rockfish?: {
    dailyLimit: string
    status: string
  }
  [key: string]: any
}

/**
 * POST /api/regulations/scrape
 * Scrape DFO websites and store results for review
 * Protected endpoint - requires authentication
 */
export async function POST(request: NextRequest) {
  try {
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

        // Parse regulations from HTML
        // For now, we'll use a simplified approach with pattern matching
        const scrapedData = parseRegulationsFromHTML(html, area.id)

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
 * Parse regulations from DFO HTML page
 * This is a simplified parser - would need to be enhanced based on actual page structure
 */
function parseRegulationsFromHTML(html: string): ScrapedRegulationData {
  const data: ScrapedRegulationData = {}

  // Simple pattern matching for key species
  // In production, this would use a proper HTML parser

  // Chinook patterns
  const chinookDailyMatch = html.match(/Chinook.*?daily.*?(?:limit|bag).*?(\d+)/is)
  const chinookMinSizeMatch = html.match(/Chinook.*?(?:minimum|min).*?(\d+)\s*cm/is)

  if (chinookDailyMatch || chinookMinSizeMatch) {
    data.chinook = {
      dailyLimit: chinookDailyMatch?.[1] || 'unknown',
      minSize: chinookMinSizeMatch?.[1] ? `${chinookMinSizeMatch[1]}cm` : 'unknown',
      notes: [],
    }
  }

  // Coho patterns
  const cohoDailyMatch = html.match(/Coho.*?daily.*?(?:limit|bag).*?(\d+)/is)
  if (cohoDailyMatch) {
    data.coho = {
      dailyLimit: cohoDailyMatch[1],
      notes: [],
    }
  }

  // Halibut patterns
  const halibutDailyMatch = html.match(/Halibut.*?daily.*?(?:limit|bag).*?(\d+)/is)
  const halibutMaxSizeMatch = html.match(/Halibut.*?(?:maximum|max).*?(\d+)\s*cm/is)

  if (halibutDailyMatch || halibutMaxSizeMatch) {
    data.halibut = {
      dailyLimit: halibutDailyMatch?.[1] || '1',
      maxSize: halibutMaxSizeMatch?.[1] ? `${halibutMaxSizeMatch[1]}cm` : 'unknown',
    }
  }

  return data
}

/**
 * Detect changes between current and scraped regulations
 */
function detectChanges(current: any, scraped: ScrapedRegulationData): string[] {
  const changes: string[] = []

  if (!current) {
    changes.push('No existing regulations found - this is new data')
    return changes
  }

  // Compare each species
  for (const [speciesKey, scrapedSpecies] of Object.entries(scraped)) {
    const currentSpecies = current.species?.find(
      (s: any) => s.species_id.includes(speciesKey)
    )

    if (!currentSpecies) {
      changes.push(`New species detected: ${speciesKey}`)
      continue
    }

    // Compare daily limits
    if (scrapedSpecies.dailyLimit &&
        scrapedSpecies.dailyLimit !== 'unknown' &&
        scrapedSpecies.dailyLimit !== currentSpecies.daily_limit) {
      changes.push(
        `${speciesKey}: Daily limit changed from ${currentSpecies.daily_limit} to ${scrapedSpecies.dailyLimit}`
      )
    }

    // Compare sizes
    if (scrapedSpecies.minSize &&
        scrapedSpecies.minSize !== 'unknown' &&
        scrapedSpecies.minSize !== currentSpecies.min_size) {
      changes.push(
        `${speciesKey}: Min size changed from ${currentSpecies.min_size} to ${scrapedSpecies.minSize}`
      )
    }

    if (scrapedSpecies.maxSize &&
        scrapedSpecies.maxSize !== 'unknown' &&
        scrapedSpecies.maxSize !== currentSpecies.max_size) {
      changes.push(
        `${speciesKey}: Max size changed from ${currentSpecies.max_size} to ${scrapedSpecies.maxSize}`
      )
    }
  }

  return changes
}

/**
 * GET /api/regulations/scrape
 * Get pending scraped regulations for review
 */
export async function GET() {
  try {
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
