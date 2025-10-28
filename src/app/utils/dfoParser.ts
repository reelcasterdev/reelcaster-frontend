/**
 * DFO Regulations Parser
 * Shared utility for parsing DFO fishing regulation pages
 * Uses hybrid approach: Cheerio (fast) + OpenAI (fallback/validation)
 */

import * as cheerio from 'cheerio'
import OpenAI from 'openai'

export interface SpeciesRegulation {
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

export interface AreaRegulations {
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

interface ParseOptions {
  useOpenAI?: boolean
  validateWithAI?: boolean
}

/**
 * Main parsing function - tries Cheerio first, falls back to OpenAI if needed
 */
export async function parseArea(
  html: string,
  areaId: string,
  areaName: string,
  url: string,
  options: ParseOptions = {}
): Promise<AreaRegulations> {
  const { useOpenAI = false, validateWithAI: shouldValidateWithAI = true } = options

  // If explicitly requested to use OpenAI, skip Cheerio
  if (useOpenAI) {
    return await parseWithOpenAI(html, areaId, areaName, url)
  }

  // Try Cheerio first (fast and free)
  const cheerioData = parseWithCheerio(html, areaId, areaName, url)

  // Check if Cheerio extraction was successful
  const cheerioSuccessful = cheerioData.species.length >= 10

  if (cheerioSuccessful) {
    // Validate with OpenAI if requested and API key available
    if (shouldValidateWithAI && process.env.OPENAI_API_KEY) {
      try {
        await validateWithAI(cheerioData)
      } catch (error) {
        console.warn('AI validation failed:', error)
      }
    }

    return cheerioData
  }

  // Fallback to OpenAI if Cheerio failed
  console.warn(`Cheerio extracted only ${cheerioData.species.length} species, falling back to OpenAI`)

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key required for fallback parsing')
  }

  return await parseWithOpenAI(html, areaId, areaName, url)
}

/**
 * Parse DFO page with Cheerio (HTML parser)
 */
export function parseWithCheerio(
  html: string,
  areaId: string,
  areaName: string,
  url: string
): AreaRegulations {
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
        const speciesId = speciesName
          .toLowerCase()
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
          season: 'Year-round', // Default, can be overridden
          notes: [`Section: ${section}`],
        })
      }
    })
  })

  // Extract general rules from "How to follow the rules" section
  $('section ol li').each((i, li) => {
    const $li = $(li)
    // Get text without nested elements
    const ruleText = $li
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim()

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
 * Parse DFO page with OpenAI (fallback when Cheerio fails)
 */
export async function parseWithOpenAI(
  html: string,
  areaId: string,
  areaName: string,
  url: string
): Promise<AreaRegulations> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const $ = cheerio.load(html)
  const mainContent = $('#wb-cont').html() || html

  // Split content into chunks to handle large pages
  const chunks = chunkContent(mainContent, 15000)

  const allSpecies: SpeciesRegulation[] = []
  let generalRules: string[] = []

  // Process each chunk
  for (const chunk of chunks) {
    const prompt = `
Extract ALL fishing regulations from this DFO webpage HTML.

For each species, extract:
- Species name (e.g., "Chinook salmon")
- ID (kebab-case of name, e.g., "chinook-salmon")
- Areas/subareas (e.g., "19-1 to 19-4")
- Minimum size (e.g., "45cm")
- Maximum size (if specified)
- Gear type (e.g., "barbless hook and line")
- Daily limit (e.g., "2" or "2 Combined Total...")
- Status (must be one of: "Open", "Closed", "Non Retention", "Restricted")
- Season (default to "Year-round" if not specified)
- Notes (any special restrictions)

Also extract the top 10 general fishing rules.

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
      "season": "Year-round",
      "notes": []
    }
  ],
  "generalRules": ["Rule 1", "Rule 2", ...]
}

Extract ALL species mentioned in the HTML. Be thorough.

HTML Content:
${chunk}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a fishing regulation data extraction expert. Extract all data accurately and return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
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
 * Validate extracted data with AI
 */
export async function validateWithAI(data: AreaRegulations): Promise<void> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const sample = {
    areaId: data.areaId,
    areaName: data.areaName,
    speciesCount: data.species.length,
    sampleSpecies: data.species.slice(0, 5),
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `
Validate this fishing regulation data for accuracy.

Check:
1. Daily limits are reasonable numbers
2. Sizes are in proper format (e.g., "45cm")
3. Status values are valid (Open/Closed/Non Retention/Restricted)
4. All required fields are present

Return JSON:
{
  "valid": true/false,
  "issues": ["issue 1", "issue 2"]
}

Data to validate:
${JSON.stringify(sample, null, 2)}
`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')

  if (!result.valid && result.issues?.length > 0) {
    console.warn('⚠️  Validation issues found:', result.issues)
  }
}

/**
 * Utility: Normalize status values
 */
function normalizeStatus(status: string): 'Open' | 'Closed' | 'Non Retention' | 'Restricted' {
  const normalized = status.trim()
  if (normalized === 'Open') return 'Open'
  if (normalized === 'Closed') return 'Closed'
  if (normalized.includes('Non Retention')) return 'Non Retention'
  return 'Restricted'
}

/**
 * Utility: Split content into chunks
 */
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
 * Detect changes between current and new regulations
 */
export function detectChanges(
  current: any,
  scraped: AreaRegulations
): string[] {
  const changes: string[] = []

  if (!current) {
    changes.push('No existing regulations found - this is new data')
    return changes
  }

  // Compare each species
  for (const scrapedSpecies of scraped.species) {
    const currentSpecies = current.species?.find(
      (s: any) =>
        s.species_id === scrapedSpecies.id ||
        s.species_name === scrapedSpecies.name
    )

    if (!currentSpecies) {
      changes.push(`New species detected: ${scrapedSpecies.name}`)
      continue
    }

    // Compare fields
    if (scrapedSpecies.dailyLimit !== currentSpecies.daily_limit) {
      changes.push(
        `${scrapedSpecies.name}: Daily limit changed from ${currentSpecies.daily_limit} to ${scrapedSpecies.dailyLimit}`
      )
    }

    if (scrapedSpecies.minSize && scrapedSpecies.minSize !== currentSpecies.min_size) {
      changes.push(
        `${scrapedSpecies.name}: Min size changed from ${currentSpecies.min_size} to ${scrapedSpecies.minSize}`
      )
    }

    if (scrapedSpecies.maxSize && scrapedSpecies.maxSize !== currentSpecies.max_size) {
      changes.push(
        `${scrapedSpecies.name}: Max size changed from ${currentSpecies.max_size} to ${scrapedSpecies.maxSize}`
      )
    }

    if (scrapedSpecies.status !== currentSpecies.status) {
      changes.push(
        `${scrapedSpecies.name}: Status changed from ${currentSpecies.status} to ${scrapedSpecies.status}`
      )
    }
  }

  return changes
}
