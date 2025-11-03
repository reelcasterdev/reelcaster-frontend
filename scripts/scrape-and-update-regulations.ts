#!/usr/bin/env ts-node
/**
 * Script to scrape DFO regulations and update the database
 * Run with: pnpm tsx scripts/scrape-and-update-regulations.ts
 */

import { createClient } from '@supabase/supabase-js'
import { scrapeAllAreas, scrapeDFOPage, parseDFOHtmlWithCheerio } from '../src/app/utils/dfoScraperV2'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Update regulations in the database
 */
async function updateRegulationsInDatabase(areaId: string, regulations: any) {
  try {
    console.log(`Updating database for area ${areaId}...`)

    // First, check if the area exists
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

      // Delete existing species regulations to replace with new ones
      await supabase
        .from('species_regulations')
        .delete()
        .eq('regulation_id', regulationId)

      // Delete existing general rules
      await supabase
        .from('regulation_general_rules')
        .delete()
        .eq('regulation_id', regulationId)

      // Delete existing protected areas
      await supabase
        .from('regulation_protected_areas')
        .delete()
        .eq('regulation_id', regulationId)
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

      const { error: speciesError } = await supabase
        .from('species_regulations')
        .insert(speciesData)

      if (speciesError) {
        console.error(`Error inserting species for area ${areaId}:`, speciesError)
      }
    }

    // Insert general rules
    if (regulations.generalRules && regulations.generalRules.length > 0) {
      const rulesData = regulations.generalRules.map((rule: string, index: number) => ({
        regulation_id: regulationId,
        rule_text: rule,
        sort_order: index
      }))

      const { error: rulesError } = await supabase
        .from('regulation_general_rules')
        .insert(rulesData)

      if (rulesError) {
        console.error(`Error inserting rules for area ${areaId}:`, rulesError)
      }
    }

    // Insert protected areas
    if (regulations.protectedAreas && regulations.protectedAreas.length > 0) {
      const areasData = regulations.protectedAreas.map((area: string) => ({
        regulation_id: regulationId,
        area_name: area
      }))

      const { error: areasError } = await supabase
        .from('regulation_protected_areas')
        .insert(areasData)

      if (areasError) {
        console.error(`Error inserting protected areas for area ${areaId}:`, areasError)
      }
    }

    console.log(`✅ Successfully updated area ${areaId}`)
  } catch (error) {
    console.error(`❌ Error updating area ${areaId}:`, error)
    throw error
  }
}

/**
 * Main function to scrape and update all areas
 */
async function main() {
  console.log('🎣 Starting DFO regulation scraper...\n')

  const args = process.argv.slice(2)
  const specificArea = args[0] // Optional: specify a single area to scrape

  try {
    if (specificArea) {
      // Scrape specific area
      console.log(`Scraping area ${specificArea}...`)
      const scrapedData = await scrapeDFOPage(specificArea)
      const parsedData = parseDFOHtmlWithCheerio(scrapedData)

      if (parsedData.parseErrors.length > 0) {
        console.warn('⚠️  Parse errors encountered:')
        parsedData.parseErrors.forEach(err => console.warn(`   - ${err}`))
      }

      if (parsedData.changesDetected.length > 0) {
        console.log('📝 Changes detected:')
        parsedData.changesDetected.forEach(change => console.log(`   - ${change}`))
      }

      await updateRegulationsInDatabase(specificArea, parsedData.regulations)
    } else {
      // Scrape all areas
      console.log('Scraping all configured areas...\n')
      const results = await scrapeAllAreas()

      let successCount = 0
      let errorCount = 0

      for (const [areaId, parsedData] of results.entries()) {
        try {
          if (parsedData.parseErrors.length > 0) {
            console.warn(`⚠️  Parse errors for area ${areaId}:`)
            parsedData.parseErrors.forEach(err => console.warn(`   - ${err}`))
          }

          await updateRegulationsInDatabase(areaId, parsedData.regulations)
          successCount++
        } catch (error) {
          console.error(`Failed to update area ${areaId}:`, error)
          errorCount++
        }
      }

      console.log('\n📊 Scraping Summary:')
      console.log(`   ✅ Successfully updated: ${successCount} areas`)
      console.log(`   ❌ Failed: ${errorCount} areas`)
    }

    console.log('\n🎉 Scraping complete!')
  } catch (error) {
    console.error('Fatal error during scraping:', error)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)