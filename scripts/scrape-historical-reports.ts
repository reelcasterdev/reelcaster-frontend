#!/usr/bin/env tsx

import { config } from 'dotenv'
import path from 'path'
import fs from 'fs/promises'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

interface ReportInfo {
  id: number
  date: Date
  weekEnding: string
  url: string
}

interface LatestReportConfig {
  id: number
  date: string // Format: YYYY-MM-DD
}

/**
 * Get the latest report configuration
 * Can be passed via command line args or uses default
 */
function getLatestReportConfig(): LatestReportConfig {
  const args = process.argv.slice(2)

  // Check for command line arguments: --id=123 --date=2025-10-19
  const idArg = args.find(arg => arg.startsWith('--id='))
  const dateArg = args.find(arg => arg.startsWith('--date='))

  if (idArg && dateArg) {
    const id = parseInt(idArg.split('=')[1])
    const date = dateArg.split('=')[1]

    if (!isNaN(id) && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.log(`📌 Using custom latest report: ID ${id}, Date ${date}`)
      return { id, date }
    }
  }

  // Default to current date and estimate report ID
  // Assuming weekly reports, we can calculate approximate ID based on date
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Reference: Report 381 was August 3, 2025
  const referenceDate = new Date('2025-08-03')
  const referenceId = 381

  // Calculate weeks difference
  const weeksDiff = Math.floor((today.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const estimatedId = referenceId + weeksDiff

  console.log(`📌 Auto-detected latest report: ID ${estimatedId}, Date ${todayStr}`)
  console.log(
    `💡 To use a specific report, run: pnpm tsx scripts/scrape-historical-reports.ts --id=XXX --date=YYYY-MM-DD`,
  )

  return { id: estimatedId, date: todayStr }
}

function calculateReportDates(latestReport: LatestReportConfig, daysToCheck: number = 140): ReportInfo[] {
  const reports: ReportInfo[] = []

  const baseReportId = latestReport.id
  const baseDate = new Date(latestReport.date)

  console.log(`📅 Starting from potential report #${baseReportId} (${latestReport.date})`)
  console.log(`📊 Checking back ${daysToCheck} days (will skip days without reports)\n`)

  // Check each day going backwards
  for (let daysBack = 0; daysBack < daysToCheck; daysBack++) {
    // Try multiple report ID patterns since we don't know exact IDs
    // We'll check current ID minus daysBack and also some offset patterns
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

    // We'll try the most likely report ID (weekly pattern)
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

async function checkLocalReportExists(reportInfo: ReportInfo, location: string): Promise<boolean> {
  const locationDir = location.toLowerCase().replace(/, /g, '-').replace(/ /g, '-')
  const filename = `week-${reportInfo.date.toISOString().split('T')[0]}.json`
  const filePath = path.join(process.cwd(), 'src/app/data/fishing-reports/historical', locationDir, filename)

  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a fishing report URL exists by making a HEAD request
 * The site returns 302 redirects for non-existent reports, so we need to check for that
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
    // Only 200 status means the report exists
    // 302 means it redirects to index (report doesn't exist)
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
    // Check if report already exists locally
    if (skipExisting && (await checkLocalReportExists(reportInfo, location))) {
      console.log(`⏭️  Day ${reportInfo.date.toISOString().split('T')[0]} - Already scraped`)
      return { skipped: true, success: false, notFound: false }
    }

    // Check if the URL exists before attempting to scrape
    const urlExists = await checkUrlExists(reportInfo.url)
    if (!urlExists) {
      console.log(`⏭️  Day ${reportInfo.date.toISOString().split('T')[0]} - No report found`)
      return { skipped: true, success: false, notFound: true }
    }

    console.log(`\n📅 Found report #${reportInfo.id} - ${reportInfo.weekEnding}`)
    console.log(`🌐 URL: ${reportInfo.url}`)

    const response = await fetch('http://localhost:3004/api/scrape-fishing-report', {
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
      // Create directory structure: fishing-reports/historical/location/week-ending-date.json
      const locationDir = location.toLowerCase().replace(/, /g, '-').replace(/ /g, '-')
      const dir = path.join(process.cwd(), 'src/app/data/fishing-reports/historical', locationDir)
      await fs.mkdir(dir, { recursive: true })

      // Save with week ending date as filename
      const filename = `week-${reportInfo.date.toISOString().split('T')[0]}.json`
      const filePath = path.join(dir, filename)

      await fs.writeFile(filePath, JSON.stringify(result.data, null, 2))
      console.log(`✅ Saved: ${filename}`)

      return { skipped: false, success: true, notFound: false }
    } else {
      console.error(`❌ Failed to scrape report #${reportInfo.id}: ${result.error}`)
      return { skipped: false, success: false, notFound: false }
    }
  } catch (error) {
    console.error(`❌ Error scraping report #${reportInfo.id}:`, error)
    return { skipped: false, success: false, notFound: false }
  }
}

async function main() {
  console.log('🎣 Historical Fishing Report Scraper')
  console.log('===================================\n')

  // Check if API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables')
    console.log('Please add OPENAI_API_KEY to your .env.local file')
    process.exit(1)
  }

  // Check if dev server is running
  try {
    const healthCheck = await fetch('http://localhost:3004/api/scrape-fishing-report')
    if (!healthCheck.ok && healthCheck.status !== 405) {
      throw new Error('API not responding')
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error: any) {
    console.error('❌ Dev server not running. Please run "pnpm dev" first.')
    process.exit(1)
  }

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

  // Get latest report configuration (from args or auto-detect)
  const latestReport = getLatestReportConfig()

  // Check for --days argument to specify how many days to check (default 140 = ~20 weeks)
  const args = process.argv.slice(2)
  const daysArg = args.find(arg => arg.startsWith('--days='))
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : 140

  // Check for --force flag to re-scrape existing reports
  const forceRescrape = args.includes('--force')
  if (forceRescrape) {
    console.log('🔄 Force mode enabled - will re-scrape existing reports\n')
  }

  // Calculate potential report dates (checking each day)
  const reports = calculateReportDates(latestReport, days)
  console.log(`📊 Will check ${reports.length} days for reports across ${locations.length} locations`)
  console.log(`📍 Locations: ${locations.map(l => l.name).join(', ')}\n`)

  // Add delay between requests to avoid rate limiting
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  let successCount = 0
  let failCount = 0
  let alreadyScrapedCount = 0
  let notFoundCount = 0

  // Scrape reports for each location
  for (const location of locations) {
    console.log(`\n🏞️  Processing location: ${location.name}`)
    console.log(`📌 Hotspots: ${location.hotspots.join(', ')}`)
    console.log('─'.repeat(50))

    for (const report of reports) {
      const result = await scrapeReport(report, location.name, location.hotspots, !forceRescrape)

      if (result.skipped && result.notFound) {
        notFoundCount++
      } else if (result.skipped) {
        alreadyScrapedCount++
      } else if (result.success) {
        successCount++
      } else {
        failCount++
      }

      // Wait between requests to avoid rate limiting
      // Shorter delay for skipped/not found, longer for actual scrapes
      if (!result.skipped) {
        await delay(2000) // 2 seconds for actual scrapes
      } else {
        await delay(100) // 100ms for checks
      }
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 Scraping Complete!')
  console.log(`✅ Successfully scraped: ${successCount} reports`)
  console.log(`❌ Failed: ${failCount} reports`)
  console.log(`📄 Already scraped: ${alreadyScrapedCount} reports`)
  console.log(`🚫 No report found: ${notFoundCount} days`)
  console.log(`📁 Reports saved to: src/app/data/fishing-reports/historical/`)

  const totalChecked = successCount + failCount + alreadyScrapedCount + notFoundCount
  const reportsFound = successCount + alreadyScrapedCount
  console.log(`\n📈 Summary: Found ${reportsFound} reports out of ${totalChecked / locations.length} days checked`)
}

// Run the scraper
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
