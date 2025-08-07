export interface FishingReportSpecies {
  status: string
  size: string
  bestDepths?: string
  bestArea?: string
}

export interface FishingReportBaitDetails {
  primary: string
  teaserHeadColors: string[]
}

export interface FishingReportHotspot {
  conditions: Record<string, string>
  species: Record<string, FishingReportSpecies>
  topBaits: string[]
  topLures: string[]
  flashers: string[]
  baitDetails: FishingReportBaitDetails
  techniques: string[]
  notes: string
}

export interface FishingReportTackle {
  flashers: string[]
  teaserHeadColors: string[]
  spoons: string[]
  jigs?: string[]
  otherLures?: string[]
  bait: string[]
  depths: string
  setupDetails: string
}

export interface FishingReportData {
  reportMetadata: {
    source: string
    reportId: string
    date: string
    weekEnding: string
    location: string
    region: string
  }
  overallConditions: Record<string, string>
  hotspotReports: Record<string, FishingReportHotspot>
  recommendedTackle: FishingReportTackle
  fishingTips: string[]
}

export interface ScrapeFishingReportRequest {
  url: string
  location: string
  hotspots: string[]
}

export interface ScrapeFishingReportResponse {
  success: boolean
  data?: FishingReportData
  error?: string
}