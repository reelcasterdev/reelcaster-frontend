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
 * Reports are published WEEKLY on SUNDAYS based on pattern analysis:
 * - Report 389: October 26, 2025 (Sunday)
 * - Report 388: October 19, 2025 (Sunday)
 * - Report 387: October 12, 2025 (Sunday)
 */
function getLatestReportConfig(): LatestReportConfig {
  const today = new Date()

  // Find the most recent Sunday (reports are published on Sundays)
  const dayOfWeek = today.getDay() // 0 = Sunday
  const mostRecentSunday = new Date(today)
  mostRecentSunday.setDate(today.getDate() - dayOfWeek)

  const sundayStr = mostRecentSunday.toISOString().split('T')[0]

  // Reference: Report 389 was October 26, 2025 (Sunday)
  const referenceDate = new Date('2025-10-26')
  const referenceId = 389

  // Calculate weeks difference (reports are weekly, published on Sundays)
  const weeksDiff = Math.floor((mostRecentSunday.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const estimatedId = referenceId + weeksDiff

  return { id: estimatedId, date: sundayStr }
}

/**
 * Generate potential report dates by checking SUNDAYS going backwards
 * Reports are published weekly on Sundays with sequential IDs
 */
function calculateReportDates(latestReport: LatestReportConfig, weeksToCheck: number = 4): ReportInfo[] {
  const reports: ReportInfo[] = []

  const baseReportId = latestReport.id
  const baseDate = new Date(latestReport.date)

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

  // Check Sundays going backwards (7 days at a time)
  for (let weeksBack = 0; weeksBack < weeksToCheck; weeksBack++) {
    const reportId = baseReportId - weeksBack
    const date = new Date(baseDate)
    date.setDate(date.getDate() - (weeksBack * 7)) // Each week back is 7 days

    // Verify it's a Sunday (day 0)
    if (date.getDay() !== 0) {
      console.warn(`⚠️  Date ${date.toISOString().split('T')[0]} is not a Sunday!`)
    }

    const monthName = monthNames[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()

    // Format URL date (e.g., "october-26-2025")
    const urlMonth = monthName.toLowerCase()
    const urlDate = `${urlMonth}-${day}-${year}`

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

/**
 * Scrape a single report with retry logic
 */
async function scrapeReport(
  reportInfo: ReportInfo,
  location: string,
  hotspots: string[],
  skipExisting: boolean = true,
  maxRetries: number = 2,
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

    // Try scraping with retries
    let lastError = ''
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Use production URL or fallback to localhost for development
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://reelcaster.com'
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

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

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
            scraped_at: new Date().toISOString(),
            is_active: true,
          })

          if (insertError) {
            // Check if it's a duplicate key error (report already exists)
            if (insertError.code === '23505') {
              return {
                skipped: true,
                success: false,
                notFound: false,
                message: 'Report already exists',
              }
            }

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
          lastError = result.error || 'Failed to scrape'
          if (attempt < maxRetries) {
            console.log(`⚠️  Attempt ${attempt + 1} failed, retrying...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
            continue
          }
        }
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : 'Network error'
        if (attempt < maxRetries) {
          console.log(`⚠️  Attempt ${attempt + 1} failed, retrying...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
      }
    }

    return { skipped: false, success: false, notFound: false, message: lastError }
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
 * PUBLIC - No authentication required
 *
 * Optimized to find only the LATEST report for each location by:
 * - Checking SUNDAYS specifically (reports published weekly on Sundays)
 * - Stopping after finding the first report for each location
 * - Using retry logic for robustness
 *
 * Query parameters:
 * - weeks: Number of weeks to check backwards (default: 4)
 * - force: Force re-scrape existing reports (default: false)
 * - findLatestOnly: Stop after finding first report per location (default: true)
 */
export async function POST(request: NextRequest) {
  try {

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const weeks = parseInt(searchParams.get('weeks') || '4') // Default to 4 weeks back
    const force = searchParams.get('force') === 'true'
    const findLatestOnly = searchParams.get('findLatestOnly') !== 'false' // Default to true

    console.log('🎣 Fishing Report Scraper API')
    console.log(`📅 Checking ${weeks} weeks backwards`)
    console.log(`🔄 Force mode: ${force}`)
    console.log(`🎯 Find latest only: ${findLatestOnly}`)

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

    // Calculate potential report dates (weekly intervals)
    const reports = calculateReportDates(latestReport, weeks)

    let successCount = 0
    let failCount = 0
    let alreadyScrapedCount = 0
    let notFoundCount = 0

    const results: any[] = []

    // Scrape reports for each location
    for (const location of locations) {
      console.log(`\n🏞️  Processing location: ${location.name}`)
      let foundReportForLocation = false

      for (const report of reports) {
        // If we already found a report for this location and we're in findLatestOnly mode, skip remaining
        if (foundReportForLocation && findLatestOnly) {
          console.log(`   ✅ Latest report found for ${location.name}, skipping older reports`)
          break
        }

        const result = await scrapeReport(report, location.name, location.hotspots, !force)

        if (result.skipped && result.notFound) {
          notFoundCount++
          console.log(`   ⏭️  Report #${report.id} - Not found`)
        } else if (result.skipped) {
          alreadyScrapedCount++
          foundReportForLocation = true // Count already-scraped as "found"
          console.log(`   📄 Report #${report.id} - Already scraped`)
          if (findLatestOnly) break // Exit early
        } else if (result.success) {
          successCount++
          foundReportForLocation = true
          console.log(`   ✅ Report #${report.id} - Successfully scraped`)
          results.push({
            location: location.name,
            report: report.id,
            date: report.date.toISOString().split('T')[0],
            status: 'success',
          })
          if (findLatestOnly) break // Exit early after first success
        } else {
          failCount++
          console.log(`   ❌ Report #${report.id} - Failed: ${result.message}`)
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

      // If no report was found for this location after checking all weeks
      if (!foundReportForLocation) {
        console.log(`   ⚠️  No reports found for ${location.name} in the last ${weeks} weeks`)
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

/**
 * GET endpoint for API documentation and status
 */
export async function GET() {
  const latestReport = getLatestReportConfig()

  return NextResponse.json({
    name: 'Fishing Reports Scraper API',
    status: 'active',
    description: 'Scrapes fishing reports from FishingVictoria.com',
    publicAccess: true,
    reportPattern: {
      frequency: 'Weekly on Sundays',
      estimatedLatestId: latestReport.id,
      estimatedLatestDate: latestReport.date,
    },
    locations: ['Victoria, Sidney', 'Sooke, Port Renfrew'],
    usage: {
      method: 'POST',
      endpoint: '/api/fishing-reports/scrape',
      queryParams: {
        weeks: 'Number of weeks to check backwards (default: 4)',
        force: 'Force re-scrape existing reports (default: false)',
        findLatestOnly: 'Stop after finding first report per location (default: true)',
      },
      examples: [
        {
          description: 'Scrape latest reports (default)',
          curl: 'curl -X POST https://reelcaster.com/api/fishing-reports/scrape',
        },
        {
          description: 'Check back 8 weeks',
          curl: 'curl -X POST "https://reelcaster.com/api/fishing-reports/scrape?weeks=8"',
        },
        {
          description: 'Force re-scrape all reports in range',
          curl: 'curl -X POST "https://reelcaster.com/api/fishing-reports/scrape?force=true&findLatestOnly=false"',
        },
      ],
    },
  })
}
