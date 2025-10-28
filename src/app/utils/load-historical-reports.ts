import { FishingReportData } from '../types/fishing-report'
import { createClient } from '@supabase/supabase-js'

export interface HistoricalReport {
  date: string
  weekEnding: string
  data: FishingReportData
}

export interface GroupedReports {
  [location: string]: HistoricalReport[]
}

/**
 * Get Supabase client for reading fishing reports
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Loads all historical fishing reports from Supabase and groups them by location
 */
export async function loadHistoricalReports(): Promise<GroupedReports> {
  const reports: GroupedReports = {
    'Victoria, Sidney': [],
    'Sooke, Port Renfrew': []
  }

  try {
    const supabase = getSupabaseClient()

    // Fetch all active fishing reports from Supabase
    const { data: fishingReports, error } = await supabase
      .from('fishing_reports')
      .select('location, week_ending, report_data')
      .eq('is_active', true)
      .order('week_ending', { ascending: false })
      .limit(100) // Get last 100 reports total

    if (error) {
      console.error('Error loading fishing reports from Supabase:', error)
      return reports
    }

    if (!fishingReports || fishingReports.length === 0) {
      console.warn('No fishing reports found in Supabase')
      return reports
    }

    // Group reports by location
    for (const report of fishingReports) {
      if (!reports[report.location]) {
        reports[report.location] = []
      }

      reports[report.location].push({
        date: report.week_ending,
        weekEnding: report.report_data.reportMetadata?.weekEnding || report.week_ending,
        data: report.report_data as FishingReportData
      })
    }

    // Sort each location's reports by date (newest first)
    for (const location in reports) {
      reports[location].sort((a, b) => b.date.localeCompare(a.date))
    }

    console.log(`Loaded ${fishingReports.length} fishing reports from Supabase`)
    return reports
  } catch (error) {
    console.error('Failed to load fishing reports:', error)
    return reports
  }
}