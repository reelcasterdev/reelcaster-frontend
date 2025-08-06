#!/usr/bin/env tsx

import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

async function testScrapeReport() {
  console.log('🎣 Testing fishing report scraper API...\n')

  // Check if API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables')
    console.log('Please add OPENAI_API_KEY to your .env.local file')
    process.exit(1)
  }

  // Example: Scrape Victoria fishing report
  const testData = {
    url: 'https://www.fishingvictoria.com/fishing-reports/381-august-3-2025',
    location: 'Victoria, Sidney',
    hotspots: ['Oak Bay', 'Waterfront', 'Sidney', 'Constance Bank']
  }

  try {
    console.log('📍 Scraping report for:', testData.location)
    console.log('🌐 URL:', testData.url)
    console.log('📌 Hotspots:', testData.hotspots.join(', '))
    console.log('')

    const response = await fetch('http://localhost:3004/api/scrape-fishing-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })

    const result = await response.json()

    if (result.success && result.data) {
      console.log('✅ Successfully scraped fishing report!\n')
      console.log('📊 Report Summary:')
      console.log('- Date:', result.data.reportMetadata.date)
      console.log('- Week Ending:', result.data.reportMetadata.weekEnding)
      console.log('- Overall Conditions:')
      Object.entries(result.data.overallConditions).forEach(([key, value]) => {
        console.log(`  • ${key}: ${value}`)
      })
      console.log('\n🎯 Hotspot Reports Found:')
      Object.keys(result.data.hotspotReports).forEach(hotspot => {
        console.log(`  • ${hotspot}`)
      })
      console.log('\n💾 Full report data available in response')
      
      // Optionally save to file
      if (process.argv.includes('--save')) {
        const fs = await import('fs/promises')
        const outputPath = path.join(process.cwd(), 'test-report-output.json')
        await fs.writeFile(outputPath, JSON.stringify(result.data, null, 2))
        console.log(`\n📁 Report saved to: ${outputPath}`)
      }
    } else {
      console.error('❌ Failed to scrape report:', result.error)
    }
  } catch (error) {
    console.error('❌ Error calling API:', error)
  }
}

// Run the test
testScrapeReport().catch(console.error)

console.log('\n💡 Tip: Add --save flag to save the output to a file')
console.log('   Example: pnpm tsx scripts/test-scrape-report.ts --save')