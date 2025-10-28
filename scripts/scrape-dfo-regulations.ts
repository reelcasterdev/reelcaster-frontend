#!/usr/bin/env tsx

/**
 * Production DFO Regulations Scraper
 * Scrapes fishing regulations from DFO Pacific Region and stores in Supabase
 * Uses hybrid approach: Cheerio (fast) + OpenAI (fallback/validation)
 */

import { config } from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { parseArea, detectChanges, type AreaRegulations } from '../src/app/utils/dfoParser'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

interface ScrapeResult {
  success: boolean
  area: string
  speciesCount?: number
  changesDetected?: number
  scrapedId?: string
  error?: string
  method?: 'cheerio' | 'openai' | 'hybrid'
}

const AREAS = [
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

/**
 * Initialize Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local')
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Scrape a single DFO area and store in Supabase
 */
async function scrapeArea(areaConfig: typeof AREAS[0]): Promise<ScrapeResult> {
  console.log(`\n📡 Scraping Area ${areaConfig.id} - ${areaConfig.name}`)
  console.log(`🌐 URL: ${areaConfig.url}`)

  try {
    const supabase = getSupabaseClient()

    // Fetch HTML
    const response = await fetch(areaConfig.url, {
      headers: {
        'User-Agent': 'ReelCaster/1.0 (Fishing Regulation Monitor)',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    console.log(`✅ Fetched ${(html.length / 1024).toFixed(1)}KB`)

    // Parse with hybrid approach
    console.log('🔧 Parsing regulations...')
    const scrapedData = await parseArea(html, areaConfig.id, areaConfig.name, areaConfig.url, {
      validateWithAI: true,
    })

    console.log(`✅ Extracted ${scrapedData.species.length} species`)

    // Get current regulations for comparison
    const { data: currentReg } = await supabase
      .from('fishing_regulations')
      .select('*, species:species_regulations(*)')
      .eq('area_id', areaConfig.id)
      .eq('is_active', true)
      .single()

    // Detect changes
    const changes = detectChanges(currentReg, scrapedData)
    console.log(`📊 Changes detected: ${changes.length}`)

    if (changes.length > 0) {
      console.log('📝 Changes:')
      changes.forEach(change => console.log(`   • ${change}`))
    }

    // Store in scraped_regulations table
    const { data: scraped, error: insertError } = await supabase
      .from('scraped_regulations')
      .insert({
        area_id: areaConfig.id,
        scraped_data: scrapedData,
        changes_detected: changes,
        approval_status: changes.length > 0 ? 'pending' : 'approved',
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to insert into database: ${insertError.message}`)
    }

    console.log(`💾 Stored in Supabase (status: ${scraped.approval_status})`)

    // If no changes and auto-approve enabled, activate immediately
    if (changes.length === 0 && process.env.AUTO_APPROVE_NO_CHANGES === 'true') {
      console.log('✅ Auto-approving (no changes detected)...')
      // Note: The approval logic is handled by the API endpoint
      // This is just for tracking purposes
    }

    return {
      success: true,
      area: areaConfig.name,
      speciesCount: scrapedData.species.length,
      changesDetected: changes.length,
      scrapedId: scraped.id,
      method: 'hybrid',
    }

  } catch (error) {
    console.error(`❌ Failed to scrape Area ${areaConfig.id}:`, error)

    // Try to log error to database
    try {
      const supabase = getSupabaseClient()
      await supabase.from('scraped_regulations').insert({
        area_id: areaConfig.id,
        scraped_data: {},
        error_message: error instanceof Error ? error.message : 'Unknown error',
        approval_status: 'rejected',
      })
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError)
    }

    return {
      success: false,
      area: areaConfig.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Main scraper function
 */
async function main() {
  console.log('🎣 DFO Regulations Scraper - Production (Supabase Storage)')
  console.log('='.repeat(70))
  console.log(`📅 Started: ${new Date().toISOString()}`)
  console.log('')

  // Verify required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nPlease add them to .env.local')
    process.exit(1)
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not found. Will use Cheerio only (no AI validation/fallback).')
  }

  const results: ScrapeResult[] = []
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Scrape all areas
  for (const area of AREAS) {
    const result = await scrapeArea(area)
    results.push(result)

    // Delay between areas
    if (area !== AREAS[AREAS.length - 1]) {
      console.log('⏸️  Waiting 3 seconds before next area...')
      await delay(3000)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 SCRAPING SUMMARY')
  console.log('='.repeat(70))

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`✅ Successful: ${successful.length}/${results.length}`)
  console.log(`❌ Failed: ${failed.length}/${results.length}`)

  if (successful.length > 0) {
    console.log('\n✅ Successfully scraped and stored in Supabase:')
    successful.forEach(r => {
      const changesText = r.changesDetected === 0
        ? '(no changes)'
        : `(${r.changesDetected} changes - pending review)`
      console.log(`   • ${r.area}: ${r.speciesCount} species ${changesText}`)
    })
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed areas:')
    failed.forEach(r => {
      console.log(`   • ${r.area}: ${r.error}`)
    })
  }

  console.log(`\n💾 Data stored in: Supabase → scraped_regulations table`)
  console.log(`🔍 Review at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/admin/regulations`)
  console.log(`📅 Completed: ${new Date().toISOString()}`)
  console.log('')

  // Exit with error code if any failed
  if (failed.length > 0) {
    process.exit(1)
  }
}

// Run the scraper
main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
