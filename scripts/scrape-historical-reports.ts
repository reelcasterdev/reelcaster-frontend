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

function calculateReportDates(): ReportInfo[] {
  const reports: ReportInfo[] = []
  
  // Starting from report 381 (August 3, 2025)
  const baseReportId = 381
  const baseDate = new Date('2025-08-03')
  
  for (let i = 0; i < 20; i++) {
    const reportId = baseReportId - i
    const date = new Date(baseDate)
    date.setDate(date.getDate() - (i * 7)) // Go back 7 days for each week
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = monthNames[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    
    // Format URL date (e.g., "july-27-2025")
    const urlMonth = monthName.toLowerCase()
    const urlDate = `${urlMonth}-${day}-${year}`
    
    reports.push({
      id: reportId,
      date: date,
      weekEnding: `${monthName} ${day}, ${year}`,
      url: `https://www.fishingvictoria.com/fishing-reports/${reportId}-${urlDate}`
    })
  }
  
  return reports
}

async function scrapeReport(reportInfo: ReportInfo, location: string, hotspots: string[]) {
  try {
    console.log(`\n📅 Scraping report #${reportInfo.id} - Week ending ${reportInfo.weekEnding}`)
    console.log(`🌐 URL: ${reportInfo.url}`)
    
    const response = await fetch('http://localhost:3004/api/scrape-fishing-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: reportInfo.url,
        location: location,
        hotspots: hotspots
      })
    })

    const result = await response.json()

    if (result.success && result.data) {
      // Create directory structure: fishing-reports/historical/location/week-ending-date.json
      const locationDir = location.toLowerCase().replace(/, /g, '-').replace(/ /g, '-')
      const dir = path.join(
        process.cwd(),
        'src/app/data/fishing-reports/historical',
        locationDir
      )
      await fs.mkdir(dir, { recursive: true })
      
      // Save with week ending date as filename
      const filename = `week-${reportInfo.date.toISOString().split('T')[0]}.json`
      const filePath = path.join(dir, filename)
      
      await fs.writeFile(filePath, JSON.stringify(result.data, null, 2))
      console.log(`✅ Saved to: ${filePath}`)
      
      return true
    } else {
      console.error(`❌ Failed to scrape report #${reportInfo.id}: ${result.error}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Error scraping report #${reportInfo.id}:`, error)
    return false
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
  } catch (error) {
    console.error('❌ Dev server not running. Please run "pnpm dev" first.')
    process.exit(1)
  }

  // Define locations and their hotspots
  const locations = [
    {
      name: 'Victoria, Sidney',
      hotspots: ['Oak Bay', 'Waterfront', 'Sidney', 'Constance Bank', 'Ten Mile Point']
    },
    {
      name: 'Sooke, Port Renfrew',
      hotspots: ['East Sooke', 'Becher Bay', 'Pedder Bay', 'Church Rock']
    }
  ]

  // Calculate report dates
  const reports = calculateReportDates()
  console.log(`📊 Will scrape ${reports.length} weeks of reports for ${locations.length} locations`)
  console.log(`📍 Locations: ${locations.map(l => l.name).join(', ')}\n`)

  // Add delay between requests to avoid rate limiting
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  let successCount = 0
  let failCount = 0

  // Scrape reports for each location
  for (const location of locations) {
    console.log(`\n🏞️  Processing location: ${location.name}`)
    console.log(`📌 Hotspots: ${location.hotspots.join(', ')}`)
    console.log('─'.repeat(50))

    for (const report of reports) {
      const success = await scrapeReport(report, location.name, location.hotspots)
      if (success) {
        successCount++
      } else {
        failCount++
      }
      
      // Wait 2 seconds between requests to avoid rate limiting
      await delay(2000)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Scraping Complete!')
  console.log(`✅ Successful: ${successCount} reports`)
  console.log(`❌ Failed: ${failCount} reports`)
  console.log(`📁 Reports saved to: src/app/data/fishing-reports/historical/`)
}

// Run the scraper
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})