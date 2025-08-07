import { FishingReportData } from '../types/fishing-report'
import fs from 'fs/promises'
import path from 'path'

/**
 * Updates or creates a fishing report JSON file for a specific location
 */
export async function updateFishingReport(
  location: string,
  reportData: FishingReportData
): Promise<void> {
  try {
    // Convert location name to filename format
    const filename = location.toLowerCase().replace(/, /g, '-').replace(/ /g, '-')
    const filePath = path.join(
      process.cwd(),
      'src/app/data/fishing-reports',
      `${filename}.json`
    )

    // Ensure directory exists
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })

    // Write the report data
    await fs.writeFile(
      filePath,
      JSON.stringify(reportData, null, 2),
      'utf-8'
    )

    console.log(`✅ Updated fishing report for ${location} at ${filePath}`)
  } catch (error) {
    console.error('Error updating fishing report:', error)
    throw error
  }
}

/**
 * Example usage function that can be called from a script or API
 */
export async function scrapeAndUpdateReport(
  url: string,
  location: string,
  hotspots: string[]
): Promise<void> {
  try {
    // Call the API endpoint
    const response = await fetch('http://localhost:3004/api/scrape-fishing-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        location,
        hotspots
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to scrape report')
    }

    // Update the local JSON file
    await updateFishingReport(location, result.data)
    
  } catch (error) {
    console.error('Error scraping and updating report:', error)
    throw error
  }
}