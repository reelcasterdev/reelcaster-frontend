import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrapeDFOPage, parseDFOHtmlWithCheerio } from '@/app/utils/dfoScraperV2'
import type { AreaRegulations } from '@/app/services/regulations'

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
 * Update regulations in the database (directly, no approval flow)
 */
async function updateRegulationsInDatabase(supabase: any, areaId: string, regulations: AreaRegulations) {
  // Check if the area exists
  const { data: existingReg, error: fetchError } = await supabase
    .from('fishing_regulations')
    .select('id')
    .eq('area_id', areaId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError
  }

  let regulationId: string

  if (existingReg) {
    // Update existing regulation
    const { data, error } = await supabase
      .from('fishing_regulations')
      .update({
        last_updated: regulations.lastUpdated,
        last_verified: regulations.lastVerified,
        next_review_date: regulations.nextReviewDate,
        page_modified_date: regulations.pageModifiedDate || null,
        most_recent_update_date: regulations.mostRecentUpdateDate || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingReg.id)
      .select('id')
      .single()

    if (error) throw error
    regulationId = data.id

    // Delete existing data to replace with new
    await supabase.from('species_regulations').delete().eq('regulation_id', regulationId)
    await supabase.from('regulation_general_rules').delete().eq('regulation_id', regulationId)
    await supabase.from('regulation_protected_areas').delete().eq('regulation_id', regulationId)
  } else {
    // Insert new regulation
    const { data, error } = await supabase
      .from('fishing_regulations')
      .insert({
        area_id: areaId,
        area_name: regulations.areaName,
        official_url: regulations.url,
        last_updated: regulations.lastUpdated,
        last_verified: regulations.lastVerified,
        next_review_date: regulations.nextReviewDate,
        page_modified_date: regulations.pageModifiedDate || null,
        most_recent_update_date: regulations.mostRecentUpdateDate || null,
        data_source: regulations.dataSource,
        is_active: true
      })
      .select('id')
      .single()

    if (error) throw error
    regulationId = data.id
  }

  // Insert species regulations
  if (regulations.species && regulations.species.length > 0) {
    const speciesData = regulations.species.map((species: any) => ({
      regulation_id: regulationId,
      species_id: species.id,
      species_name: species.name,
      scientific_name: species.scientificName || null,
      daily_limit: species.dailyLimit,
      annual_limit: species.annualLimit || null,
      min_size: species.minSize || null,
      max_size: species.maxSize || null,
      status: species.status,
      gear: species.gear,
      season: species.season,
      notes: species.notes || []
    }))

    await supabase.from('species_regulations').insert(speciesData)
  }

  // Insert general rules
  if (regulations.generalRules && regulations.generalRules.length > 0) {
    const rulesData = regulations.generalRules.map((rule: string, index: number) => ({
      regulation_id: regulationId,
      rule_text: rule,
      sort_order: index
    }))

    await supabase.from('regulation_general_rules').insert(rulesData)
  }

  // Insert protected areas
  if (regulations.protectedAreas && regulations.protectedAreas.length > 0) {
    const areasData = regulations.protectedAreas.map((area: string) => ({
      regulation_id: regulationId,
      area_name: area
    }))

    await supabase.from('regulation_protected_areas').insert(areasData)
  }
}

/**
 * POST /api/regulations/scrape
 * Scrape DFO websites and directly update regulations in database
 * Protected endpoint - requires CRON_SECRET
 *
 * Query params:
 *   - area_id: Specific area to scrape (optional, defaults to all configured areas)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    // Verify authentication
    const cronSecret = request.headers.get('x-cron-secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const specificAreaId = searchParams.get('area_id')

    // Configure areas to scrape
    const allAreas = [
      { id: '19', name: 'Victoria, Sidney' },
      { id: '20', name: 'Sooke, Port Renfrew' },
    ]

    // Filter to specific area if requested
    const areasToScrape = specificAreaId
      ? allAreas.filter(a => a.id === specificAreaId)
      : allAreas

    if (areasToScrape.length === 0) {
      return NextResponse.json(
        { error: `Area ${specificAreaId} not found` },
        { status: 404 }
      )
    }

    console.log(`🎣 Scraping ${areasToScrape.length} area(s)...`)

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const area of areasToScrape) {
      try {
        console.log(`\n📍 Scraping area ${area.id} (${area.name})...`)

        // Scrape and parse with Cheerio
        const scrapedData = await scrapeDFOPage(area.id)
        const parsedData = parseDFOHtmlWithCheerio(scrapedData)

        console.log(`   ✅ Parsed ${parsedData.regulations.species.length} species`)

        // Log parse errors if any
        if (parsedData.parseErrors.length > 0) {
          console.warn(`   ⚠️  Parse errors:`, parsedData.parseErrors)
        }

        // Directly update database
        await updateRegulationsInDatabase(supabase, area.id, parsedData.regulations)

        console.log(`   ✅ Database updated`)

        successCount++
        results.push({
          area: area.name,
          areaId: area.id,
          success: true,
          speciesCount: parsedData.regulations.species.length,
          rulesCount: parsedData.regulations.generalRules.length,
          protectedAreasCount: parsedData.regulations.protectedAreas?.length || 0,
        })

        // Delay between areas to be respectful
        if (areasToScrape.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (err) {
        errorCount++
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error(`   ❌ Error scraping area ${area.id}:`, errorMessage)

        results.push({
          area: area.name,
          areaId: area.id,
          success: false,
          error: errorMessage,
        })
      }
    }

    console.log(`\n✅ Scraping complete: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      summary: {
        successCount,
        errorCount,
        totalAreas: areasToScrape.length,
      },
      results,
      scrapedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('❌ Fatal scraping error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Scraping failed',
        details: error instanceof Error ? error.message : 'Unknown'
      },
      { status: 500 }
    )
  }
}

