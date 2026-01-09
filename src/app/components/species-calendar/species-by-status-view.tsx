'use client'

import { useState } from 'react'
import { SpeciesInfo } from '@/app/api/species-calendar/route'
import SpeciesCard from './species-card'

interface SpeciesByStatusViewProps {
  speciesByStatus: {
    Open: SpeciesInfo[]
    Closed: SpeciesInfo[]
    'Non Retention': SpeciesInfo[]
    Restricted: SpeciesInfo[]
  }
  searchQuery?: string
}

type StatusType = 'Open' | 'Closed' | 'Non Retention' | 'Restricted'

export default function SpeciesByStatusView({ speciesByStatus, searchQuery = '' }: SpeciesByStatusViewProps) {
  const [activeTab, setActiveTab] = useState<StatusType>('Open')

  const getStatusTextColor = (status: StatusType) => {
    switch (status) {
      case 'Open':
        return 'text-emerald-400'
      case 'Closed':
        return 'text-red-400'
      case 'Non Retention':
        return 'text-amber-400'
      case 'Restricted':
        return 'text-orange-400'
    }
  }

  const getStatusCount = (status: StatusType) => {
    const species = speciesByStatus[status]
    if (!searchQuery) return species.length

    return species.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).length
  }

  const filteredSpecies = searchQuery
    ? speciesByStatus[activeTab].filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : speciesByStatus[activeTab]

  const statuses: StatusType[] = ['Open', 'Closed', 'Non Retention', 'Restricted']

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => {
          const textColor = getStatusTextColor(status)
          const count = getStatusCount(status)
          const isActive = activeTab === status

          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`
                px-4 py-2 rounded-lg border transition-all duration-200 text-sm
                ${isActive
                  ? `bg-rc-bg-light border-rc-bg-light ${textColor}`
                  : `bg-rc-bg-dark border-rc-bg-light text-rc-text-muted hover:bg-rc-bg-light hover:text-rc-text-light`
                }
              `}
            >
              <span className="font-medium">{status}</span>
              <span className="ml-2 opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Species Grid */}
      <div className="space-y-3">
        {filteredSpecies.length > 0 ? (
          <>
            <div className="text-rc-text-muted text-sm">
              Showing {filteredSpecies.length} {filteredSpecies.length === 1 ? 'species' : 'species'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpecies.map((species) => (
                <SpeciesCard key={species.id} species={species} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-rc-bg-dark/50 rounded-lg border border-rc-bg-light">
            <p className="text-rc-text-muted text-lg">
              {searchQuery
                ? `No species found matching "${searchQuery}"`
                : `No ${activeTab.toLowerCase()} species in this location`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
