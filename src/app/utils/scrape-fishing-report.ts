import * as cheerio from 'cheerio'
import { FishingReportData } from '../types/fishing-report'

export async function scrapeFishingReport(
  url: string,
  location: string,
  hotspots: string[]
): Promise<FishingReportData> {
  // Dynamic import to avoid build-time issues with File API
  const OpenAI = (await import('openai')).default
  
  // Initialize OpenAI client inside the function
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  try {
    // Fetch the webpage
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Remove script and style tags
    $('script').remove()
    $('style').remove()
    
    // Extract text content
    const textContent = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000) // Limit to prevent token overflow
    
    // Create the system prompt with JSON schema
    const systemPrompt = `You are a fishing report analyzer. Extract fishing information from the provided text and return it as JSON following this exact schema:
    
    {
      "reportMetadata": {
        "source": "string - source website name",
        "reportId": "string - unique ID for this report",
        "date": "string - report date in YYYY-MM-DD format",
        "weekEnding": "string - week ending date (e.g., 'August 3, 2025')",
        "location": "string - main location name",
        "region": "string - broader region (e.g., 'Vancouver Island, British Columbia')"
      },
      "overallConditions": {
        "salmon": "string - condition rating (EXCELLENT/GOOD/FAIR/SLOW)",
        "bottomFishing": "string - condition rating",
        "crabbing": "string - condition rating"
      },
      "hotspotReports": {
        "HotspotName": {
          "conditions": {
            "salmon": "string - condition rating",
            "halibut": "string - condition rating (if applicable)",
            "crabbing": "string - condition rating (if applicable)"
          },
          "species": {
            "speciesName": {
              "status": "string - Active/Fair/Slow/etc",
              "size": "string - size description",
              "bestDepths": "string - depth range or 'Not specified'",
              "bestArea": "string - specific area if mentioned"
            }
          },
          "topBaits": ["array of bait names"],
          "topLures": ["array of lure names"],
          "flashers": ["array of flasher names"],
          "baitDetails": {
            "primary": "string - main bait type",
            "teaserHeadColors": ["array of teaser head colors"]
          },
          "techniques": ["array of fishing techniques"],
          "notes": "string - important notes about this hotspot"
        }
      },
      "recommendedTackle": {
        "flashers": ["array of all flasher names mentioned"],
        "teaserHeadColors": ["array of all teaser colors mentioned"],
        "spoons": ["array of all spoon names mentioned"],
        "jigs": ["array of jig names if mentioned"],
        "otherLures": ["array of other lure types"],
        "bait": ["array of all bait types with notes"],
        "depths": "string - general depth recommendations",
        "setupDetails": "string - leader lengths, weights, etc or 'Not specified'"
      },
      "fishingTips": ["array of general fishing tips extracted from the report"]
    }
    
    Important instructions:
    1. Extract data for these specific hotspots: ${hotspots.join(', ')}
    2. If a hotspot has no specific data, create minimal entry with "Not specified" values
    3. Consolidate all tackle recommendations into recommendedTackle section
    4. Extract specific product names for lures, flashers, etc.
    5. Include teaser head colors when mentioned with bait
    6. Note fishing depths when specified
    7. If data is not available, use "Not specified" rather than leaving empty
    8. Ensure all condition ratings use EXCELLENT/GOOD/FAIR/SLOW format`

    const userPrompt = `Extract fishing report data for ${location} from this text:
    
    ${textContent}
    
    Focus on these hotspots: ${hotspots.join(', ')}`

    // Call OpenAI API with JSON mode
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000
    })

    const result = completion.choices[0].message.content
    if (!result) {
      throw new Error('No response from OpenAI')
    }

    // Parse and validate the JSON response
    const reportData = JSON.parse(result) as FishingReportData
    
    // Ensure all required fields are present
    if (!reportData.reportMetadata || !reportData.hotspotReports || !reportData.recommendedTackle) {
      throw new Error('Invalid report structure returned from OpenAI')
    }

    return reportData
  } catch (error) {
    console.error('Error scraping fishing report:', error)
    throw error
  }
}