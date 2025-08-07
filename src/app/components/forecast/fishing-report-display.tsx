'use client'

import React, { useState, useEffect } from 'react'
import { Fish, Waves, Calendar, TrendingUp, Anchor, ChevronRight, AlertCircle } from 'lucide-react'

const conditionColors: Record<string, string> = {
  'EXCELLENT': 'from-green-500 to-green-600',
  'VERY GOOD': 'from-green-400 to-green-500',
  'GOOD': 'from-blue-500 to-blue-600',
  'FAIR': 'from-yellow-400 to-yellow-500',
  'SLOW': 'from-orange-400 to-orange-500',
  'Excellent': 'from-green-500 to-green-600',
  'Very Good': 'from-green-400 to-green-500',
  'Good': 'from-blue-500 to-blue-600',
  'Fair': 'from-yellow-400 to-yellow-500',
  'Slow': 'from-orange-400 to-orange-500'
}

const conditionShadows: Record<string, string> = {
  'EXCELLENT': 'shadow-green-500/30',
  'VERY GOOD': 'shadow-green-400/30',
  'GOOD': 'shadow-blue-500/30',
  'FAIR': 'shadow-yellow-400/30',
  'SLOW': 'shadow-orange-400/30',
  'Excellent': 'shadow-green-500/30',
  'Very Good': 'shadow-green-400/30',
  'Good': 'shadow-blue-500/30',
  'Fair': 'shadow-yellow-400/30',
  'Slow': 'shadow-orange-400/30'
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
      <div className="w-full space-y-3 sm:space-y-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border border-slate-700 p-4 sm:p-6 shadow-xl">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <div className="w-full space-y-3 sm:space-y-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border border-slate-700 p-4 sm:p-6 shadow-xl">
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
      <div className="w-full space-y-3 sm:space-y-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border border-slate-700 p-4 sm:p-6 shadow-xl">
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
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border border-slate-700 p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent flex items-center gap-2">
              <Fish className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              {location} - {hotspot}
            </h2>
            <p className="flex items-center gap-2 mt-2 text-sm text-slate-400">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Week ending {reportData.reportMetadata.weekEnding}
            </p>
          </div>
          <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-700/50 border border-slate-600/30 rounded-full">
            <span className="text-xs sm:text-sm text-slate-300">{reportData.reportMetadata.source}</span>
          </div>
        </div>
      </div>

      {/* Current Conditions */}
      <div className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-700/50 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-3 sm:mb-4 text-white">
          <Waves className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
          Current Conditions at {hotspot}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(hotspotReport.conditions).map(([type, condition]) => (
            <div key={type} className="flex items-center justify-between bg-slate-800 rounded-lg p-3 border border-slate-700/50">
              <span className="text-sm capitalize text-slate-300">
                {type.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <div className={`px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r ${conditionColors[condition] || 'from-gray-500 to-gray-600'} shadow-lg ${conditionShadows[condition] || ''}`}>
                <span className="text-[10px] sm:text-xs font-bold text-white">{condition}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Species Activity */}
      <div className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-700/50 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4 text-white">
          <Fish className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
          Species Activity
        </h3>
        <div className="space-y-3">
          {Object.entries(hotspotReport.species).map(([species, info]) => (
            <div key={species} className="bg-slate-800 rounded-lg p-3 border border-slate-700/50">
              <h4 className="font-medium capitalize text-white mb-2">{species}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-400">Status:</span>{' '}
                  <span className="text-white">{info.status}</span>
                </div>
                {info.size && (
                  <div>
                    <span className="text-slate-400">Size:</span>{' '}
                    <span className="text-white">{info.size}</span>
                  </div>
                )}
                {info.bestDepths && (
                  <div>
                    <span className="text-slate-400">Best Depths:</span>{' '}
                    <span className="text-white">{info.bestDepths}</span>
                  </div>
                )}
                {info.bestArea && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400">Best Area:</span>{' '}
                    <span className="text-white">{info.bestArea}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tackle Recommendations */}
      <div className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-700/50 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4 text-white">
          <Anchor className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          Recommended Setup for {hotspot}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lures & Baits */}
          <div className="space-y-3">
            {hotspotReport.topLures.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium mb-2 text-slate-400">Top Lures</h4>
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
                <h4 className="text-xs sm:text-sm font-medium mb-2 text-slate-400">Top Baits</h4>
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
                <h4 className="text-xs sm:text-sm font-medium mb-2 text-slate-400">Flashers</h4>
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
                <h4 className="text-xs sm:text-sm font-medium mb-2 text-slate-400">Teaser Head Colors</h4>
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
            <h4 className="text-xs sm:text-sm font-medium mb-2 text-slate-400">Techniques</h4>
            <div className="flex flex-wrap gap-1.5">
              {hotspotReport.techniques.map((technique, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-700/50 border border-slate-600/30 rounded text-[10px] sm:text-xs text-slate-300">
                  {technique}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {hotspotReport.notes && (
          <div className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-700/50">
            <p className="text-xs sm:text-sm text-slate-300 italic">💡 {hotspotReport.notes}</p>
          </div>
        )}
      </div>

      {/* General Area Tips */}
      <div className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-700/50 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-4 text-white">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          General {location} Tips
        </h3>
        <ul className="space-y-2">
          {reportData.fishingTips.map((tip, index) => (
            <li key={index} className="flex items-start">
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-slate-300">{tip}</span>
            </li>
          ))}
        </ul>
        
        {/* Depth & Setup Info */}
        {(reportData.recommendedTackle.depths || reportData.recommendedTackle.setupDetails) && (
          <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
            {reportData.recommendedTackle.depths && (
              <p className="text-xs sm:text-sm text-slate-400">
                <span className="font-medium">Recommended Depths:</span> {reportData.recommendedTackle.depths}
              </p>
            )}
            {reportData.recommendedTackle.setupDetails && (
              <p className="text-xs sm:text-sm text-slate-400">
                <span className="font-medium">Setup Details:</span> {reportData.recommendedTackle.setupDetails}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}