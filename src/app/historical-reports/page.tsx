'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Fish, MapPin, TrendingUp, ChevronRight } from 'lucide-react'
import { loadHistoricalReports, GroupedReports } from '../utils/load-historical-reports'
import Sidebar from '../components/common/sidebar'
import ModernLoadingState from '../components/common/modern-loading-state'
import ErrorState from '../components/common/error-state'

const conditionColors: Record<string, string> = {
  'EXCELLENT': 'from-green-500 to-green-600',
  'VERY GOOD': 'from-green-400 to-green-500',
  'GOOD': 'from-blue-500 to-blue-600',
  'FAIR': 'from-yellow-400 to-yellow-500',
  'SLOW': 'from-orange-400 to-orange-500',
  'SPOTTY': 'from-yellow-500 to-orange-500'
}

export default function HistoricalReportsPage() {
  const [reports, setReports] = useState<GroupedReports | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('Victoria, Sidney')
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await loadHistoricalReports()
        setReports(data)
        // Select the most recent week by default
        if (data[selectedLocation]?.length > 0) {
          setSelectedWeek(data[selectedLocation][0].date)
        }
      } catch (err) {
        console.error('Error loading historical reports:', err)
        setError('Failed to load historical reports')
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [selectedLocation])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen overflow-auto">
          <ModernLoadingState forecastDays={20} />
        </div>
      </div>
    )
  }

  if (error || !reports) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen overflow-auto">
          <ErrorState message={error || 'Failed to load reports'} />
        </div>
      </div>
    )
  }

  const currentReport = reports[selectedLocation]?.find(r => r.date === selectedWeek)

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Sidebar />
      
      <div className="lg:ml-64 min-h-screen overflow-auto">
        <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-6 pt-16 lg:pt-6">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border border-slate-700 p-4 sm:p-6 shadow-xl">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent flex items-center gap-2">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
              Historical Fishing Reports
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-400">
              Browse fishing reports from the past 20 weeks
            </p>
          </div>

          {/* Location Selector */}
          <div className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Select Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.keys(reports).map(location => (
                <button
                  key={location}
                  onClick={() => {
                    setSelectedLocation(location)
                    setSelectedWeek(reports[location][0]?.date || null)
                  }}
                  className={`p-3 rounded-lg font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    selectedLocation === location
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  {location}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Week Selector */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Select Week</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
                  {reports[selectedLocation]?.map(report => (
                    <button
                      key={report.date}
                      onClick={() => setSelectedWeek(report.date)}
                      className={`w-full p-3 rounded-lg text-left transition-all duration-300 ${
                        selectedWeek === report.date
                          ? 'bg-slate-700 border border-blue-500/50 shadow-lg'
                          : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="text-xs text-slate-500 mb-1">Week ending</div>
                      <div className="text-sm font-medium text-white">{report.weekEnding}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Report Content */}
            <div className="lg:col-span-3">
              {currentReport ? (
                <div className="space-y-4">
                  {/* Report Header */}
                  <div className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Fish className="w-5 h-5 text-blue-400" />
                        {selectedLocation} - Week ending {currentReport.weekEnding}
                      </h2>
                      <div className="px-3 py-1 bg-slate-700/50 border border-slate-600/30 rounded-full">
                        <span className="text-xs text-slate-300">{currentReport.data.reportMetadata.source}</span>
                      </div>
                    </div>

                    {/* Overall Conditions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(currentReport.data.overallConditions).map(([type, condition]) => (
                        <div key={type} className="bg-slate-800 rounded-lg p-3 border border-slate-700/50">
                          <span className="text-xs text-slate-400 capitalize">
                            {type.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <div className={`mt-1 px-2 py-1 rounded-full bg-gradient-to-r ${
                            conditionColors[condition as string] || 'from-gray-500 to-gray-600'
                          } inline-block`}>
                            <span className="text-xs font-bold text-white">{condition}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hotspot Reports */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-green-400" />
                      Hotspot Reports
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(currentReport.data.hotspotReports).map(([hotspot, data]) => (
                        <div key={hotspot} className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
                          <h4 className="font-semibold text-white mb-3">{hotspot}</h4>
                          
                          {/* Conditions */}
                          <div className="mb-3">
                            <span className="text-xs text-slate-400">Conditions</span>
                            <div className="flex gap-2 flex-wrap mt-1">
                              {Object.entries(data.conditions).map(([type, condition]) => (
                                <span key={type} className="px-2 py-0.5 bg-slate-700/50 border border-slate-600/30 rounded-full text-[10px] text-slate-300">
                                  {type}: {condition}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Top Species */}
                          <div className="mb-3">
                            <span className="text-xs text-slate-400">Active Species</span>
                            <div className="mt-1 space-y-1">
                              {Object.entries(data.species).slice(0, 3).map(([species, info]) => (
                                <div key={species} className="text-xs text-slate-300">
                                  <span className="capitalize">{species}</span>: {info.status}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Top Tackle */}
                          <div>
                            <span className="text-xs text-slate-400">Top Tackle</span>
                            <div className="flex gap-1 flex-wrap mt-1">
                              {data.topLures.slice(0, 3).map((lure, i) => (
                                <span key={i} className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-[10px] text-blue-300">
                                  {lure}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fishing Tips */}
                  <div className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 sm:p-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-white">
                      <TrendingUp className="w-5 h-5 text-yellow-400" />
                      Fishing Tips
                    </h3>
                    <ul className="space-y-2">
                      {currentReport.data.fishingTips.slice(0, 5).map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <ChevronRight className="w-3 h-3 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                          <span className="text-sm text-slate-300">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center">
                  <p className="text-slate-400">Select a week to view the report</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}