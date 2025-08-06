import { NextRequest, NextResponse } from 'next/server'
import { scrapeFishingReport } from '@/app/utils/scrape-fishing-report'
import { ScrapeFishingReportRequest, ScrapeFishingReportResponse } from '@/app/types/fishing-report'

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json<ScrapeFishingReportResponse>(
        { 
          success: false, 
          error: 'OpenAI API key not configured' 
        },
        { status: 500 }
      )
    }

    // Parse request body
    const body = await request.json() as ScrapeFishingReportRequest
    
    // Validate required fields
    if (!body.url || !body.location || !body.hotspots || body.hotspots.length === 0) {
      return NextResponse.json<ScrapeFishingReportResponse>(
        { 
          success: false, 
          error: 'Missing required fields: url, location, and hotspots are required' 
        },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(body.url)
    } catch {
      return NextResponse.json<ScrapeFishingReportResponse>(
        { 
          success: false, 
          error: 'Invalid URL format' 
        },
        { status: 400 }
      )
    }

    // Scrape and process the fishing report
    const reportData = await scrapeFishingReport(
      body.url,
      body.location,
      body.hotspots
    )

    return NextResponse.json<ScrapeFishingReportResponse>({
      success: true,
      data: reportData
    })

  } catch (error) {
    console.error('Error in scrape-fishing-report API:', error)
    
    return NextResponse.json<ScrapeFishingReportResponse>(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape and process fishing report' 
      },
      { status: 500 }
    )
  }
}

// Optional: Add GET method to check if the endpoint is working
export async function GET() {
  return NextResponse.json({
    message: 'Fishing report scraper API is running',
    usage: {
      method: 'POST',
      body: {
        url: 'URL of the fishing report to scrape',
        location: 'Main location name (e.g., "Victoria, Sidney")',
        hotspots: ['Array of hotspot names to extract data for']
      }
    }
  })
}