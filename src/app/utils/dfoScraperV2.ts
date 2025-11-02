/**
 * DFO Regulation Scraper V2
 * Enhanced scraper using Cheerio for parsing DFO fishing regulation pages
 */

import * as cheerio from 'cheerio'
import { AreaRegulations, SpeciesRegulation } from '../services/regulations'

interface ScrapedData {
  areaId: string
  areaName: string
  url: string
  rawHtml: string
  scrapedAt: string
}

interface ParsedRegulation {
  regulations: AreaRegulations
  changesDetected: string[]
  parseErrors: string[]
}

/**
 * Map of area IDs to area names
 */
const AREA_NAMES: Record<string, string> = {
  '3': 'Prince Rupert',
  '13': 'Campbell River',
  '19': 'Victoria, Sidney',
  '20': 'Sooke, Port Renfrew',
  '23': 'Tofino, Ucluelet',
  '27': 'Nanaimo',
  '28': 'Pender Harbour',
  '29': 'Powell River',
  '121': 'Haida Gwaii'
}

/**
 * Scrape a DFO regulation page
 */
export async function scrapeDFOPage(areaId: string): Promise<ScrapedData> {
  const url = `https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s${areaId}-eng.html`
  const areaName = AREA_NAMES[areaId] || `Area ${areaId}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ReelCaster Regulation Scraper/2.0',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-CA,en;q=0.9',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }

    const html = await response.text()

    return {
      areaId,
      areaName,
      url,
      rawHtml: html,
      scrapedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Error scraping DFO page for area ${areaId}:`, error)
    throw error
  }
}

/**
 * Parse status text to standardized enum
 */
function parseStatus(statusText: string): 'Open' | 'Closed' | 'Non Retention' | 'Restricted' {
  const text = statusText.toLowerCase().trim()

  if (text.includes('closed') || text === '0') {
    return 'Closed'
  } else if (text.includes('non-retention') || text.includes('no retention')) {
    return 'Non Retention'
  } else if (text.includes('restricted') || text.includes('varies')) {
    return 'Restricted'
  }

  return 'Open'
}

/**
 * Extract species regulations from a table
 */
function extractSpeciesFromTable($: cheerio.CheerioAPI, table: cheerio.Element): SpeciesRegulation[] {
  const species: SpeciesRegulation[] = []
  const rows = $(table).find('tbody tr')

  rows.each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length < 4) return // Skip invalid rows

    // Parse table cells based on typical DFO table structure
    // Column order usually: Species, Areas/Subareas, Min Size, Gear, Daily Limits, Status
    const speciesName = $(cells[0]).text().trim()
    const areas = $(cells[1]).text().trim()
    const minSize = $(cells[2]).text().trim()
    const gear = $(cells[3]).text().trim()
    const dailyLimit = cells.length > 4 ? $(cells[4]).text().trim() : '0'
    const statusText = cells.length > 5 ? $(cells[5]).text().trim() : 'Open'

    if (!speciesName) return

    // Generate species ID from name
    const speciesId = speciesName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')

    // Extract scientific name if present (usually in parentheses)
    const scientificMatch = speciesName.match(/\(([^)]+)\)/)
    const scientificName = scientificMatch ? scientificMatch[1] : undefined
    const cleanSpeciesName = speciesName.replace(/\([^)]+\)/g, '').trim()

    const regulation: SpeciesRegulation = {
      id: speciesId,
      name: cleanSpeciesName,
      scientificName,
      dailyLimit: dailyLimit || '0',
      minSize: minSize !== '-' && minSize ? minSize : undefined,
      status: parseStatus(statusText),
      gear: gear || 'Hook and line',
      season: areas.includes('to') || areas.includes('-') ? 'Varies by subarea' : 'Check DFO',
      notes: areas ? [`Applicable to: ${areas}`] : []
    }

    species.push(regulation)
  })

  return species
}

/**
 * Extract restrictions and notes from text sections
 */
function extractRestrictions($: cheerio.CheerioAPI, section: cheerio.Element): string[] {
  const restrictions: string[] = []

  $(section).find('ul li').each((_, li) => {
    const text = $(li).text().trim()
    if (text && text.length < 500) { // Avoid extremely long text blocks
      restrictions.push(text)
    }
  })

  return restrictions
}

/**
 * Parse HTML content using Cheerio
 */
export function parseDFOHtmlWithCheerio(scrapedData: ScrapedData, currentData?: AreaRegulations): ParsedRegulation {
  const parseErrors: string[] = []
  const changesDetected: string[] = []

  try {
    const $ = cheerio.load(scrapedData.rawHtml)

    // Initialize regulations object
    const regulations: AreaRegulations = {
      areaId: scrapedData.areaId,
      areaName: scrapedData.areaName,
      url: scrapedData.url,
      lastUpdated: scrapedData.scrapedAt,
      lastVerified: scrapedData.scrapedAt,
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      dataSource: 'DFO Pacific Region',
      species: [],
      generalRules: [],
      protectedAreas: []
    }

    // Find all tables with regulation data
    // DFO pages typically use class="table" for regulation tables
    const tables = $('table.table, table').filter((_, el) => {
      const headers = $(el).find('th').text().toLowerCase()
      return headers.includes('species') || headers.includes('daily') || headers.includes('limit')
    })

    // Extract species from each table
    tables.each((_, table) => {
      try {
        const speciesFromTable = extractSpeciesFromTable($, table)
        regulations.species.push(...speciesFromTable)
      } catch (error) {
        parseErrors.push(`Error parsing table: ${error}`)
      }
    })

    // Find restriction sections
    const restrictionSections = $('h3:contains("Restrictions"), h2:contains("Restrictions")').parent()
    restrictionSections.each((_, section) => {
      const restrictions = extractRestrictions($, section)

      // Add restrictions as general rules
      regulations.generalRules.push(...restrictions)
    })

    // Extract general rules from common sections
    const generalSections = $('h3:contains("General"), h2:contains("General")').parent()
    generalSections.each((_, section) => {
      const rules = extractRestrictions($, section)
      regulations.generalRules.push(...rules)
    })

    // Add default general rules if none found
    if (regulations.generalRules.length === 0) {
      regulations.generalRules = [
        'Must have BC Tidal Waters sport fishing licence',
        'Must record retained salmon immediately',
        'Barbless hooks required for salmon',
        'Check current DFO regulations for complete information'
      ]
    }

    // Extract protected areas
    const protectedSections = $('h3:contains("Protected"), h2:contains("Protected"), h3:contains("Closed"), h2:contains("Closed")').parent()
    protectedSections.each((_, section) => {
      $(section).find('li').each((_, li) => {
        const areaText = $(li).text().trim()
        if (areaText && areaText.length < 200) {
          regulations.protectedAreas?.push(areaText)
        }
      })
    })

    // Compare with current data if available
    if (currentData) {
      // Check for species changes
      regulations.species.forEach(newSpecies => {
        const existing = currentData.species.find(s => s.id === newSpecies.id)
        if (!existing) {
          changesDetected.push(`New species added: ${newSpecies.name}`)
        } else {
          const changes: string[] = []

          if (existing.dailyLimit !== newSpecies.dailyLimit) {
            changes.push(`daily limit: ${existing.dailyLimit} → ${newSpecies.dailyLimit}`)
          }
          if (existing.status !== newSpecies.status) {
            changes.push(`status: ${existing.status} → ${newSpecies.status}`)
          }
          if (existing.minSize !== newSpecies.minSize) {
            changes.push(`min size: ${existing.minSize || 'none'} → ${newSpecies.minSize || 'none'}`)
          }

          if (changes.length > 0) {
            changesDetected.push(`${newSpecies.name}: ${changes.join(', ')}`)
          }
        }
      })

      // Check for removed species
      currentData.species.forEach(oldSpecies => {
        const stillExists = regulations.species.find(s => s.id === oldSpecies.id)
        if (!stillExists) {
          changesDetected.push(`Species removed: ${oldSpecies.name}`)
        }
      })
    }

    return {
      regulations,
      changesDetected,
      parseErrors
    }
  } catch (error) {
    console.error('Error parsing DFO HTML:', error)
    parseErrors.push(`Fatal parsing error: ${error}`)

    // Return minimal valid structure on error
    return {
      regulations: {
        areaId: scrapedData.areaId,
        areaName: scrapedData.areaName,
        url: scrapedData.url,
        lastUpdated: scrapedData.scrapedAt,
        lastVerified: scrapedData.scrapedAt,
        nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        dataSource: 'DFO Pacific Region',
        species: [],
        generalRules: ['Error parsing regulations - please check DFO website directly'],
        protectedAreas: []
      },
      changesDetected,
      parseErrors
    }
  }
}

/**
 * Scrape and parse all configured areas
 */
export async function scrapeAllAreas(): Promise<Map<string, ParsedRegulation>> {
  const results = new Map<string, ParsedRegulation>()

  for (const areaId of Object.keys(AREA_NAMES)) {
    try {
      console.log(`Scraping area ${areaId}...`)
      const scrapedData = await scrapeDFOPage(areaId)
      const parsedData = parseDFOHtmlWithCheerio(scrapedData)
      results.set(areaId, parsedData)

      // Add delay to be respectful to DFO servers
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`Failed to scrape area ${areaId}:`, error)
    }
  }

  return results
}