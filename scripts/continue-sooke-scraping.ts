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
      const locationDir = location.toLowerCase().replace(/, /g, '-').replace(/ /g, '-')
      const dir = path.join(
        process.cwd(),
        'src/app/data/fishing-reports/historical',
        locationDir
      )
      await fs.mkdir(dir, { recursive: true })
      
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
  console.log('🎣 Continue Sooke Historical Reports Scraping')
  console.log('=============================================\n')

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Continue from report #377 (July 6) for Sooke
  const remainingReports: ReportInfo[] = []
  const baseDate = new Date('2025-07-06')
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']
  
  // Generate remaining 17 reports (377 to 361)
  for (let i = 0; i < 17; i++) {
    const reportId = 377 - i
    const date = new Date(baseDate)
    date.setDate(date.getDate() - (i * 7))
    
    const monthName = monthNames[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    const urlMonth = monthName.toLowerCase()
    const urlDate = `${urlMonth}-${day}-${year}`
    
    remainingReports.push({
      id: reportId,
      date: date,
      weekEnding: `${monthName} ${day}, ${year}`,
      url: `https://www.fishingvictoria.com/fishing-reports/${reportId}-${urlDate}`
    })
  }

  const location = 'Sooke, Port Renfrew'
  const hotspots = ['East Sooke', 'Becher Bay', 'Pedder Bay', 'Church Rock']
  
  console.log(`📍 Location: ${location}`)
  console.log(`📌 Hotspots: ${hotspots.join(', ')}`)
  console.log(`📊 Remaining reports to scrape: ${remainingReports.length}`)
  console.log('─'.repeat(50))

  let successCount = 0
  let failCount = 0

  for (const report of remainingReports) {
    const success = await scrapeReport(report, location, hotspots)
    if (success) {
      successCount++
    } else {
      failCount++
    }
    
    // Wait 2 seconds between requests
    await delay(2000)
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Scraping Complete!')
  console.log(`✅ Successful: ${successCount} reports`)
  console.log(`❌ Failed: ${failCount} reports`)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})