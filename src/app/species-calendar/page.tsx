'use client'

import { useState, useEffect } from 'react'
import { Search, ExternalLink, AlertCircle } from 'lucide-react'
import { AppShell } from '../components/layout'
import DashboardHeader from '../components/forecast/dashboard-header'
import LocationSelector from '../components/species-calendar/location-selector'
import SpeciesByStatusView from '../components/species-calendar/species-by-status-view'
import ErrorState from '../components/common/error-state'
import { SpeciesCalendarData } from '../api/species-calendar/route'
import { DFONoticesSection } from '../components/forecast/dfo-notices-section'

const AVAILABLE_LOCATIONS = ['Victoria, Sidney', 'Sooke, Port Renfrew']

// Helper function to map location names to DFO fishing areas
function getDFOAreasForLocation(locationName: string): number[] {
  const locationToAreas: Record<string, number[]> = {
    'Victoria, Sidney': [19],
    'Sooke, Port Renfrew': [20],
  }
  return locationToAreas[locationName] || [19, 20] // Default to both areas if unknown
}

export default function SpeciesCalendarPage() {
  const [selectedLocation, setSelectedLocation] = useState('Victoria, Sidney')
  const [searchQuery, setSearchQuery] = useState('')
  const [calendarData, setCalendarData] = useState<SpeciesCalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSpeciesData() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/species-calendar?location=${encodeURIComponent(selectedLocation)}`)

        if (!response.ok) {
          throw new Error('Failed to fetch species data')
        }

        const data = await response.json()
        setCalendarData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching species calendar data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSpeciesData()
  }, [selectedLocation])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <AppShell showLocationPanel={false}>
      <div className="flex-1 min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6">
        <DashboardHeader
          title="Species Calendar"
          showTimeframe={false}
          showSetLocation={false}
          showCustomize={false}
        />

        <div className="max-w-7xl mx-auto space-y-6">

          {/* Controls Section */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
            {/* Location Selector */}
            <LocationSelector
              selectedLocation={selectedLocation}
              onLocationChange={setSelectedLocation}
              availableLocations={AVAILABLE_LOCATIONS}
            />

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search species by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>

          {/* Regulations Info Banner */}
          {calendarData && !loading && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-slate-300">
                      Last Verified: <span className="text-blue-400 font-medium">{formatDate(calendarData.lastVerified)}</span>
                    </span>
                    <span className="text-slate-300">
                      Next Review: <span className="text-blue-400 font-medium">{formatDate(calendarData.nextReviewDate)}</span>
                    </span>
                    {calendarData.officialUrl && (
                      <a
                        href={calendarData.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                      >
                        <span>Official DFO Page</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs">
                    Always verify current regulations on the official DFO website before fishing
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col justify-center items-center py-20 space-y-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-slate-700/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
              <p className="text-slate-400 text-lg">Loading species data...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <ErrorState message={error} />
          )}

          {/* Species Grid */}
          {calendarData && !loading && !error && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-slate-400 text-sm mb-1">Total Species</div>
                  <div className="text-white text-2xl font-bold">{calendarData.totalSpecies}</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="text-green-400 text-sm mb-1">Open</div>
                  <div className="text-white text-2xl font-bold">{calendarData.speciesByStatus.Open.length}</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="text-red-400 text-sm mb-1">Closed</div>
                  <div className="text-white text-2xl font-bold">{calendarData.speciesByStatus.Closed.length}</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="text-yellow-400 text-sm mb-1">Non Retention</div>
                  <div className="text-white text-2xl font-bold">{calendarData.speciesByStatus['Non Retention'].length}</div>
                </div>
              </div>

              {/* Species by Status View */}
              <SpeciesByStatusView
                speciesByStatus={calendarData.speciesByStatus}
                searchQuery={searchQuery}
              />

              {/* DFO Fishery Notices */}
              <div className="mt-8">
                <DFONoticesSection
                  areas={getDFOAreasForLocation(selectedLocation)}
                  species={[]}
                  limit={15}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
