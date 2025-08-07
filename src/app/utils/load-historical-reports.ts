import { FishingReportData } from '../types/fishing-report'

export interface HistoricalReport {
  date: string
  weekEnding: string
  data: FishingReportData
}

export interface GroupedReports {
  [location: string]: HistoricalReport[]
}

/**
 * Loads all historical fishing reports and groups them by location
 */
export async function loadHistoricalReports(): Promise<GroupedReports> {
  const reports: GroupedReports = {
    'Victoria, Sidney': [],
    'Sooke, Port Renfrew': []
  }

  // Define the locations and their directory names
  const locations = [
    { name: 'Victoria, Sidney', dir: 'victoria-sidney' },
    { name: 'Sooke, Port Renfrew', dir: 'sooke-port-renfrew' }
  ]

  // Generate list of weeks (past 20 weeks)
  const weeks: string[] = []
  const baseDate = new Date('2025-08-03')
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() - (i * 7))
    weeks.push(date.toISOString().split('T')[0])
  }

  // Load reports for each location
  for (const location of locations) {
    const locationReports: HistoricalReport[] = []
    
    for (const week of weeks) {
      try {
        const reportModule = await import(
          `@/app/data/fishing-reports/historical/${location.dir}/week-${week}.json`
        )
        
        locationReports.push({
          date: week,
          weekEnding: reportModule.default.reportMetadata.weekEnding,
          data: reportModule.default
        })
      } catch {
        console.warn(`Report not found for ${location.name} week ${week}`)
      }
    }
    
    // Sort by date (newest first)
    locationReports.sort((a, b) => b.date.localeCompare(a.date))
    reports[location.name] = locationReports
  }

  return reports
}