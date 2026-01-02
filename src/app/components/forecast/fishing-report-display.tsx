'use client'

import React, { useState, useEffect } from 'react'
import { Fish, Waves, Calendar, TrendingUp, Anchor, ChevronRight, AlertCircle } from 'lucide-react'

// Condition badge colors - solid backgrounds for better visibility
const conditionStyles: Record<string, { bg: string; text: string }> = {
  'EXCELLENT': { bg: 'bg-green-500', text: 'text-white' },
  'VERY GOOD': { bg: 'bg-green-400', text: 'text-white' },
  'GOOD': { bg: 'bg-blue-500', text: 'text-white' },
  'FAIR': { bg: 'bg-yellow-500', text: 'text-black' },
  'SLOW': { bg: 'bg-orange-500', text: 'text-white' },
  'Excellent': { bg: 'bg-green-500', text: 'text-white' },
  'Very Good': { bg: 'bg-green-400', text: 'text-white' },
  'Good': { bg: 'bg-blue-500', text: 'text-white' },
  'Fair': { bg: 'bg-yellow-500', text: 'text-black' },
  'Slow': { bg: 'bg-orange-500', text: 'text-white' }
}

interface FishingReportDisplayProps {
  location: string
  hotspot: string
}

interface ReportData {
  reportMetadata: {
    source: string
    reportId: string
    date: string
    weekEnding: string
    location: string
    region: string
  }
  overallConditions: Record<string, string>
  hotspotReports: Record<string, {
    conditions: Record<string, string>
    species: Record<string, any>
    topBaits: string[]
    topLures: string[]
    flashers: string[]
    baitDetails: {
      primary: string
      teaserHeadColors: string[]
    }
    techniques: string[]
    notes: string
  }>
  recommendedTackle: {
    flashers: string[]
    teaserHeadColors: string[]
    spoons: string[]
    jigs?: string[]
    otherLures?: string[]
    bait: string[]
    depths: string
    setupDetails: string
  }
  fishingTips: string[]
}

export function FishingReportDisplay({ location, hotspot }: FishingReportDisplayProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Convert location name to filename format
        const locationKey = location.toLowerCase().replace(/, /g, '-').replace(/ /g, '-')
        const reportModule = await import(`@/app/data/fishing-reports/${locationKey}.json`)
        setReportData(reportModule.default)
      } catch (err) {
        console.error('Error loading fishing report:', err)
        setError('No fishing report available for this location')
      } finally {
        setLoading(false)
      }
    }

    loadReportData()
  }, [location])

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-5">
          <div className="animate-pulse">
            <div className="h-6 bg-rc-bg-dark rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-rc-bg-dark rounded w-1/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-5">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error || 'No fishing report available'}</p>
          </div>
        </div>
      </div>
    )
  }

  // Get the specific hotspot report
  const hotspotReport = reportData.hotspotReports[hotspot]

  if (!hotspotReport) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-5">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">No specific report available for {hotspot}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="bg-rc-bg-darkest rounded-xl sm:rounded-2xl border border-rc-bg-light p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-rc-text flex items-center gap-2">
              <Fish className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              {location} - {hotspot}
            </h2>
            <p className="flex items-center gap-2 mt-2 text-sm text-rc-text-muted">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Week ending {reportData.reportMetadata.weekEnding}
            </p>
          </div>
          <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-rc-bg-dark border border-rc-bg-light rounded-full">
            <span className="text-xs sm:text-sm text-rc-text-light">{reportData.reportMetadata.source}</span>
          </div>
        </div>
      </div>

      {/* Current Conditions */}
      <div className="bg-rc-bg-darkest rounded-xl sm:rounded-2xl border border-rc-bg-light p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-3 sm:mb-4 text-rc-text">
          <Waves className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
          Current Conditions at {hotspot}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(hotspotReport.conditions).map(([type, condition]) => {
            const style = conditionStyles[condition] || { bg: 'bg-gray-500', text: 'text-white' }
            return (
              <div key={type} className="flex items-center justify-between bg-rc-bg-dark rounded-lg p-3 border border-rc-bg-light">
                <span className="text-sm capitalize text-rc-text-light">
                  {type.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className={`px-2 sm:px-3 py-1 rounded-full ${style.bg}`}>
                  <span className={`text-[10px] sm:text-xs font-bold ${style.text}`}>{condition}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Species Activity */}
      <div className="bg-rc-bg-darkest rounded-xl sm:rounded-2xl border border-rc-bg-light p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4 text-rc-text">
          <Fish className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
          Species Activity
        </h3>
        <div className="space-y-3">
          {Object.entries(hotspotReport.species).map(([species, info]) => (
            <div key={species} className="bg-rc-bg-dark rounded-lg p-3 border border-rc-bg-light">
              <h4 className="font-medium capitalize text-rc-text mb-2">{species}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                <div>
                  <span className="text-rc-text-muted">Status:</span>{' '}
                  <span className="text-rc-text">{info.status}</span>
                </div>
                {info.size && (
                  <div>
                    <span className="text-rc-text-muted">Size:</span>{' '}
                    <span className="text-rc-text">{info.size}</span>
                  </div>
                )}
                {info.bestDepths && (
                  <div>
                    <span className="text-rc-text-muted">Best Depths:</span>{' '}
                    <span className="text-rc-text">{info.bestDepths}</span>
                  </div>
                )}
                {info.bestArea && (
                  <div className="sm:col-span-2">
                    <span className="text-rc-text-muted">Best Area:</span>{' '}
                    <span className="text-rc-text">{info.bestArea}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tackle Recommendations */}
      <div className="bg-rc-bg-darkest rounded-xl sm:rounded-2xl border border-rc-bg-light p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4 text-rc-text">
          <Anchor className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          Recommended Setup for {hotspot}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lures & Baits */}
          <div className="space-y-3">
            {hotspotReport.topLures.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium mb-2 text-rc-text-muted">Top Lures</h4>
                <div className="flex flex-wrap gap-1.5">
                  {hotspotReport.topLures.map((lure, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-[10px] sm:text-xs text-blue-300">
                      {lure}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hotspotReport.topBaits.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium mb-2 text-rc-text-muted">Top Baits</h4>
                <div className="flex flex-wrap gap-1.5">
                  {hotspotReport.topBaits.map((bait, i) => (
                    <span key={i} className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full text-[10px] sm:text-xs text-green-300">
                      {bait}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Flashers & Setup */}
          <div className="space-y-3">
            {hotspotReport.flashers.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium mb-2 text-rc-text-muted">Flashers</h4>
                <div className="flex flex-wrap gap-1.5">
                  {hotspotReport.flashers.map((flasher, i) => (
                    <span key={i} className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-[10px] sm:text-xs text-cyan-300">
                      {flasher}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hotspotReport.baitDetails?.teaserHeadColors && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium mb-2 text-rc-text-muted">Teaser Head Colors</h4>
                <div className="flex flex-wrap gap-1.5">
                  {hotspotReport.baitDetails.teaserHeadColors.map((color, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-[10px] sm:text-xs text-purple-300">
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Techniques */}
        {hotspotReport.techniques.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs sm:text-sm font-medium mb-2 text-rc-text-muted">Techniques</h4>
            <div className="flex flex-wrap gap-1.5">
              {hotspotReport.techniques.map((technique, i) => (
                <span key={i} className="px-2 py-0.5 bg-rc-bg-dark border border-rc-bg-light rounded text-[10px] sm:text-xs text-rc-text-light">
                  {technique}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {hotspotReport.notes && (
          <div className="mt-4 p-3 bg-rc-bg-dark rounded-lg border border-rc-bg-light">
            <p className="text-xs sm:text-sm text-rc-text-light italic">💡 {hotspotReport.notes}</p>
          </div>
        )}
      </div>

      {/* General Area Tips */}
      <div className="bg-rc-bg-darkest rounded-xl sm:rounded-2xl border border-rc-bg-light p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4 text-rc-text">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          General {location} Tips
        </h3>
        <ul className="space-y-2">
          {reportData.fishingTips.map((tip, index) => (
            <li key={index} className="flex items-start">
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-rc-text-light">{tip}</span>
            </li>
          ))}
        </ul>

        {/* Depth & Setup Info */}
        {(reportData.recommendedTackle.depths || reportData.recommendedTackle.setupDetails) && (
          <div className="mt-4 pt-4 border-t border-rc-bg-light space-y-2">
            {reportData.recommendedTackle.depths && (
              <p className="text-xs sm:text-sm text-rc-text-muted">
                <span className="font-medium text-rc-text-light">Recommended Depths:</span> {reportData.recommendedTackle.depths}
              </p>
            )}
            {reportData.recommendedTackle.setupDetails && (
              <p className="text-xs sm:text-sm text-rc-text-muted">
                <span className="font-medium text-rc-text-light">Setup Details:</span> {reportData.recommendedTackle.setupDetails}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}