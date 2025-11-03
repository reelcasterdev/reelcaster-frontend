#!/usr/bin/env tsx
/**
 * Test date extraction from DFO pages
 */

import { scrapeDFOPage, parseDFOHtmlWithCheerio } from '../src/app/utils/dfoScraperV2'

async function testDateExtraction(areaId: string) {
  console.log(`\n🔍 Testing date extraction for area ${areaId}...`)

  try {
    // Scrape the page
    const scrapedData = await scrapeDFOPage(areaId)
    console.log(`✅ Scraped ${scrapedData.url}`)

    // Parse with Cheerio
    const parsedData = parseDFOHtmlWithCheerio(scrapedData)

    console.log(`\n📅 Date Extraction Results:`)
    console.log(`   Page Modified Date: ${parsedData.regulations.pageModifiedDate || 'NOT FOUND'}`)
    console.log(`   Most Recent Update: ${parsedData.regulations.mostRecentUpdateDate || 'NOT FOUND'}`)
    console.log(`   Last Verified (our scrape): ${parsedData.regulations.lastVerified}`)
    console.log(`   Using for lastUpdated: ${parsedData.regulations.lastUpdated}`)

    if (!parsedData.regulations.pageModifiedDate) {
      console.log(`\n⚠️  WARNING: Could not extract page modified date from meta tag`)
    }

    if (!parsedData.regulations.mostRecentUpdateDate) {
      console.log(`\n⚠️  WARNING: Could not extract any section update dates`)
    }

    if (parsedData.regulations.pageModifiedDate && parsedData.regulations.mostRecentUpdateDate) {
      console.log(`\n✅ SUCCESS: Both dates extracted correctly!`)
      console.log(`   DFO's official page date: ${parsedData.regulations.pageModifiedDate}`)
      console.log(`   Latest section update: ${parsedData.regulations.mostRecentUpdateDate}`)

      const isMoreRecent = parsedData.regulations.mostRecentUpdateDate >= parsedData.regulations.pageModifiedDate
      if (isMoreRecent) {
        console.log(`   ✅ Most recent update (${parsedData.regulations.mostRecentUpdateDate}) is after page modified (${parsedData.regulations.pageModifiedDate})`)
      } else {
        console.log(`   📝 Page modified (${parsedData.regulations.pageModifiedDate}) is more recent than section updates`)
      }
    }

  } catch (error) {
    console.error(`❌ Error testing area ${areaId}:`, error)
  }
}

async function main() {
  console.log('📅 DFO Date Extraction Test')
  console.log('===========================')

  for (const areaId of ['19', '20']) {
    await testDateExtraction(areaId)
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log('\n✅ Date extraction test complete!')
}

main().catch(console.error)
