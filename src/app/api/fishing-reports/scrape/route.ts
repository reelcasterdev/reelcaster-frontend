import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface ReportInfo {
  id: number
  date: Date
  weekEnding: string
  url: string
}

interface LatestReportConfig {
  id: number
  date: string
}

/**
 * Get Supabase client with service role key for write operations
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Get the latest report configuration
 */
function getLatestReportConfig(): LatestReportConfig {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Reference: Report 381 was August 3, 2025
  const referenceDate = new Date('2025-08-03')
  const referenceId = 381

  // Calculate weeks difference
  const weeksDiff = Math.floor((today.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const estimatedId = referenceId + weeksDiff

  return { id: estimatedId, date: todayStr }
}

function calculateReportDates(latestReport: LatestReportConfig, daysToCheck: number = 140): ReportInfo[] {
  const reports: ReportInfo[] = []

  const baseReportId = latestReport.id
  const baseDate = new Date(latestReport.date)

  // Check each day going backwards
  for (let daysBack = 0; daysBack < daysToCheck; daysBack++) {
    const potentialReportIds = [
      baseReportId - Math.floor(daysBack / 7), // Assuming weekly reports
      baseReportId - daysBack, // In case IDs are sequential daily
    ]

    const date = new Date(baseDate)
    date.setDate(date.getDate() - daysBack)

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    const monthName = monthNames[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()

    // Format URL date (e.g., "july-27-2025")
    const urlMonth = monthName.toLowerCase()
    const urlDate = `${urlMonth}-${day}-${year}`

    // Use the most likely report ID (weekly pattern)
    const reportId = potentialReportIds[0]

    reports.push({
      id: reportId,
      date: date,
      weekEnding: `${monthName} ${day}, ${year}`,
      url: `https://www.fishingvictoria.com/fishing-reports/${reportId}-${urlDate}`,
    })
  }

  return reports
}

/**
 * Check if a report already exists in Supabase for this location and date
 */
async function checkReportExists(reportInfo: ReportInfo, location: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    const weekEnding = reportInfo.date.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('fishing_reports')
      .select('id')
      .eq('location', location)
      .eq('week_ending', weekEnding)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('Error checking report existence:', error)
    }

    return !!data
  } catch {
    return false
  }
}

/**
 * Check if a fishing report URL exists by making a HEAD request
 * The site returns 302 redirects for non-existent reports
 */
async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReelCaster/1.0; +https://reelcaster.com)',
      },
      redirect: 'manual', // Don't follow redirects
    })
    return response.status === 200
  } catch {
    return false
  }
}

async function scrapeReport(
  reportInfo: ReportInfo,
  location: string,
  hotspots: string[],
  skipExisting: boolean = true,
) {
  try {
    // Check if report already exists in Supabase
    if (skipExisting && (await checkReportExists(reportInfo, location))) {
      return { skipped: true, success: false, notFound: false, message: 'Already scraped' }
    }

    // Check if the URL exists before attempting to scrape
    const urlExists = await checkUrlExists(reportInfo.url)
    if (!urlExists) {
      return { skipped: true, success: false, notFound: true, message: 'No report found' }
    }

    // Call the existing scraping endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'
    const response = await fetch(`${baseUrl}/api/scrape-fishing-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: reportInfo.url,
        location: location,
        hotspots: hotspots,
      }),
    })

    const result = await response.json()

    if (result.success && result.data) {
      // Store in Supabase
      const supabase = getSupabaseClient()
      const weekEnding = reportInfo.date.toISOString().split('T')[0]

      const { error: insertError } = await supabase.from('fishing_reports').insert({
        location: location,
        week_ending: weekEnding,
        report_id: reportInfo.id.toString(),
        source_url: reportInfo.url,
        report_data: result.data,
        is_active: true,
      })

      if (insertError) {
        console.error('Error inserting report into Supabase:', insertError)
        return {
          skipped: false,
          success: false,
          notFound: false,
          message: `Supabase error: ${insertError.message}`,
        }
      }

      return {
        skipped: false,
        success: true,
        notFound: false,
        message: `Saved to Supabase: ${location} - ${weekEnding}`,
      }
    } else {
      return { skipped: false, success: false, notFound: false, message: result.error || 'Failed to scrape' }
    }
  } catch (error) {
    return {
      skipped: false,
      success: false,
      notFound: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * API endpoint to scrape fishing reports
 * Protected by CRON_SECRET to prevent abuse
 *
 * Query parameters:
 * - days: Number of days to check backwards (default: 14)
 * - force: Force re-scrape existing reports (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const cronSecret = request.headers.get('x-cron-secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '14') // Default to 2 weeks
    const force = searchParams.get('force') === 'true'

    console.log('🎣 Fishing Report Scraper API')
    console.log(`📅 Checking ${days} days backwards`)
    console.log(`🔄 Force mode: ${force}`)

    // Define locations and their hotspots
    const locations = [
      {
        name: 'Victoria, Sidney',
        hotspots: ['Oak Bay', 'Waterfront', 'Sidney', 'Constance Bank', 'Ten Mile Point'],
      },
      {
        name: 'Sooke, Port Renfrew',
        hotspots: ['East Sooke', 'Becher Bay', 'Pedder Bay', 'Church Rock'],
      },
    ]

    // Get latest report configuration
    const latestReport = getLatestReportConfig()
    console.log(`📌 Auto-detected latest report: ID ${latestReport.id}, Date ${latestReport.date}`)

    // Calculate potential report dates
    const reports = calculateReportDates(latestReport, days)

    let successCount = 0
    let failCount = 0
    let alreadyScrapedCount = 0
    let notFoundCount = 0

    const results: any[] = []

    // Scrape reports for each location
    for (const location of locations) {
      console.log(`\n🏞️  Processing location: ${location.name}`)

      for (const report of reports) {
        const result = await scrapeReport(report, location.name, location.hotspots, !force)

        if (result.skipped && result.notFound) {
          notFoundCount++
        } else if (result.skipped) {
          alreadyScrapedCount++
        } else if (result.success) {
          successCount++
          results.push({
            location: location.name,
            report: report.id,
            date: report.date.toISOString().split('T')[0],
            status: 'success',
          })
        } else {
          failCount++
          results.push({
            location: location.name,
            report: report.id,
            date: report.date.toISOString().split('T')[0],
            status: 'failed',
            error: result.message,
          })
        }

        // Add delay between requests to avoid rate limiting
        if (!result.skipped) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds for actual scrapes
        } else {
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms for checks
        }
      }
    }

    console.log('\n📊 Scraping Complete!')
    console.log(`✅ Successfully scraped: ${successCount} reports`)
    console.log(`❌ Failed: ${failCount} reports`)
    console.log(`📄 Already scraped: ${alreadyScrapedCount} reports`)
    console.log(`🚫 No report found: ${notFoundCount} days`)
    console.log(`💾 Data stored in Supabase`)

    return NextResponse.json({
      success: true,
      summary: {
        successCount,
        failCount,
        alreadyScrapedCount,
        notFoundCount,
        totalChecked: successCount + failCount + alreadyScrapedCount + notFoundCount,
        storage: 'supabase',
      },
      results: results.filter(r => r.status === 'success' || r.status === 'failed'), // Only include actual scrapes
    })
  } catch (error) {
    console.error('❌ Error in fishing reports scraper:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
