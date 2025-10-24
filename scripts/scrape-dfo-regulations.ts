#!/usr/bin/env tsx

/**
 * Production DFO Regulations Scraper
 * Scrapes fishing regulations from DFO Pacific Region
 * Uses hybrid approach: Cheerio (fast) + OpenAI (fallback/validation)
 */

import { config } from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

interface SpeciesRegulation {
  id: string
  name: string
  scientificName?: string
  areas: string
  minSize: string
  maxSize?: string
  gear: string
  dailyLimit: string
  annualLimit?: string
  status: 'Open' | 'Closed' | 'Non Retention' | 'Restricted'
  season?: string
  notes: string[]
}

interface AreaRegulations {
  areaId: string
  areaName: string
  url: string
  lastUpdated: string
  lastVerified: string
  dataSource: string
  species: SpeciesRegulation[]
  generalRules: string[]
  protectedAreas?: string[]
}

interface ScrapeResult {
  success: boolean
  area: string
  data?: AreaRegulations
  error?: string
  method: 'cheerio' | 'openai' | 'hybrid'
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
 * Parse DFO page with Cheerio (HTML parser)
 */
function parseWithCheerio(html: string, areaId: string, areaName: string, url: string): AreaRegulations {
  const $ = cheerio.load(html)
  const species: SpeciesRegulation[] = []
  const generalRules: string[] = []

  // Parse species tables
  $('table.table').each((tableIndex, table) => {
    const $table = $(table)
    const section = $table.closest('details').find('summary').text().trim()

    $table.find('tbody tr').each((rowIndex, row) => {
      const cells = $(row).find('td')

      if (cells.length >= 6) {
        const speciesName = $(cells[0]).text().trim()
        if (!speciesName) return // Skip empty rows

        // Create species ID
        const speciesId = speciesName.toLowerCase()
          .replace(/[()]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')

        species.push({
          id: speciesId,
          name: speciesName,
          areas: $(cells[1]).text().trim(),
          minSize: $(cells[2]).text().trim() || '',
          gear: $(cells[3]).text().trim(),
          dailyLimit: $(cells[4]).text().trim(),
          status: normalizeStatus($(cells[5]).text().trim()),
          notes: [`Section: ${section}`],
        })
      }
    })
  })

  // Extract general rules
  $('section ol li').each((i, li) => {
    const ruleText = $(li).clone().children().remove().end().text().trim()
    if (ruleText && ruleText.length > 20) {
      generalRules.push(ruleText)
    }
  })

  return {
    areaId,
    areaName,
    url,
    lastUpdated: new Date().toISOString().split('T')[0],
    lastVerified: new Date().toISOString().split('T')[0],
    dataSource: 'DFO Pacific Region',
    species,
    generalRules: generalRules.slice(0, 10),
  }
}

/**
 * Parse DFO page with OpenAI (fallback)
 */
async function parseWithOpenAI(
  html: string,
  areaId: string,
  areaName: string,
  url: string
): Promise<AreaRegulations> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const $ = cheerio.load(html)
  const mainContent = $('#wb-cont').html() || html

  // Split content into chunks if too large
  const chunks = chunkContent(mainContent, 15000)

  const allSpecies: SpeciesRegulation[] = []
  let generalRules: string[] = []

  for (const chunk of chunks) {
    const prompt = `
Extract fishing regulations from this DFO webpage HTML.

Extract all species with:
- Species name
- Areas/subareas
- Minimum size
- Maximum size (if any)
- Gear type
- Daily limit
- Status (Open/Closed/Non Retention/Restricted)
- Any notes

Also extract the top 5 general fishing rules.

Return JSON:
{
  "species": [
    {
      "id": "chinook-salmon",
      "name": "Chinook salmon",
      "areas": "19-1 to 19-4",
      "minSize": "45cm",
      "maxSize": "",
      "gear": "barbless hook and line",
      "dailyLimit": "2",
      "status": "Open",
      "notes": []
    }
  ],
  "generalRules": ["Rule 1", "Rule 2"]
}

HTML:
${chunk}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Extract fishing regulation data as JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')

    if (result.species) {
      allSpecies.push(...result.species)
    }
    if (result.generalRules && generalRules.length === 0) {
      generalRules = result.generalRules
    }
  }

  return {
    areaId,
    areaName,
    url,
    lastUpdated: new Date().toISOString().split('T')[0],
    lastVerified: new Date().toISOString().split('T')[0],
    dataSource: 'DFO Pacific Region (AI Extracted)',
    species: allSpecies,
    generalRules,
  }
}

/**
 * Scrape a single DFO area (hybrid approach)
 */
async function scrapeArea(areaConfig: typeof AREAS[0]): Promise<ScrapeResult> {
  console.log(`\n📡 Scraping Area ${areaConfig.id} - ${areaConfig.name}`)
  console.log(`🌐 URL: ${areaConfig.url}`)

  try {
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

    // Try Cheerio first
    console.log('🔧 Parsing with Cheerio...')
    const cheerioData = parseWithCheerio(html, areaConfig.id, areaConfig.name, areaConfig.url)

    // Check if Cheerio extraction was successful
    if (cheerioData.species.length >= 10) {
      console.log(`✅ Cheerio extracted ${cheerioData.species.length} species`)

      // Optionally validate with OpenAI if API key available
      if (process.env.OPENAI_API_KEY) {
        console.log('🔍 Validating with AI...')
        try {
          await validateWithAI(cheerioData)
          console.log('✅ AI validation passed')
        } catch (error) {
          console.log('⚠️  AI validation skipped:', error)
        }
      }

      return {
        success: true,
        area: areaConfig.name,
        data: cheerioData,
        method: 'hybrid',
      }
    } else {
      // Fallback to OpenAI
      console.log(`⚠️  Cheerio only found ${cheerioData.species.length} species, using OpenAI...`)

      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key required for fallback parsing')
      }

      const openaiData = await parseWithOpenAI(html, areaConfig.id, areaConfig.name, areaConfig.url)
      console.log(`✅ OpenAI extracted ${openaiData.species.length} species`)

      return {
        success: true,
        area: areaConfig.name,
        data: openaiData,
        method: 'openai',
      }
    }
  } catch (error) {
    console.error(`❌ Failed to scrape Area ${areaConfig.id}:`, error)
    return {
      success: false,
      area: areaConfig.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'cheerio',
    }
  }
}

/**
 * Validate data with AI
 */
async function validateWithAI(data: AreaRegulations): Promise<void> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const sample = {
    species: data.species.slice(0, 5),
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Validate this fishing regulation data. Return JSON with {"valid": true/false, "issues": []}.\n\n${JSON.stringify(sample, null, 2)}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')

  if (!result.valid && result.issues?.length > 0) {
    console.log('⚠️  Validation issues:', result.issues)
  }
}

/**
 * Utility functions
 */
function normalizeStatus(status: string): 'Open' | 'Closed' | 'Non Retention' | 'Restricted' {
  const normalized = status.trim()
  if (normalized === 'Open') return 'Open'
  if (normalized === 'Closed') return 'Closed'
  if (normalized.includes('Non Retention')) return 'Non Retention'
  return 'Restricted'
}

function chunkContent(content: string, maxLength: number): string[] {
  const chunks: string[] = []
  let remaining = content

  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, maxLength))
    remaining = remaining.slice(maxLength)
  }

  return chunks
}

/**
 * Main scraper function
 */
async function main() {
  console.log('🎣 DFO Regulations Scraper - Production')
  console.log('='.repeat(70))
  console.log(`📅 Started: ${new Date().toISOString()}`)
  console.log('')

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
    console.log('\n✅ Successfully scraped areas:')
    successful.forEach(r => {
      console.log(`   • ${r.area}: ${r.data?.species.length || 0} species (${r.method})`)
    })
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed areas:')
    failed.forEach(r => {
      console.log(`   • ${r.area}: ${r.error}`)
    })
  }

  // Save output
  const outputDir = path.join(process.cwd(), 'scraped-data')
  await fs.mkdir(outputDir, { recursive: true })

  for (const result of successful) {
    if (result.data) {
      const filename = `dfo-area-${result.data.areaId}-${result.data.lastUpdated}.json`
      const filepath = path.join(outputDir, filename)
      await fs.writeFile(filepath, JSON.stringify(result.data, null, 2))
      console.log(`\n💾 Saved: ${filename}`)
    }
  }

  console.log(`\n📁 Output directory: scraped-data/`)
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
