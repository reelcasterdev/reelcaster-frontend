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

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'Open':
        return {
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/30',
          activeBg: 'bg-green-500/30',
        }
      case 'Closed':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/30',
          activeBg: 'bg-red-500/30',
        }
      case 'Non Retention':
        return {
          bg: 'bg-yellow-500/20',
          text: 'text-yellow-400',
          border: 'border-yellow-500/30',
          activeBg: 'bg-yellow-500/30',
        }
      case 'Restricted':
        return {
          bg: 'bg-orange-500/20',
          text: 'text-orange-400',
          border: 'border-orange-500/30',
          activeBg: 'bg-orange-500/30',
        }
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
          const colors = getStatusColor(status)
          const count = getStatusCount(status)
          const isActive = activeTab === status

          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`
                px-4 py-2.5 rounded-lg border transition-all duration-200
                ${isActive
                  ? `${colors.activeBg} ${colors.text} ${colors.border}`
                  : `${colors.bg} ${colors.text} ${colors.border} hover:${colors.activeBg}`
                }
              `}
            >
              <span className="font-medium">{status}</span>
              <span className="ml-2 text-sm opacity-80">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Species Grid */}
      <div className="space-y-3">
        {filteredSpecies.length > 0 ? (
          <>
            <div className="text-slate-400 text-sm">
              Showing {filteredSpecies.length} {filteredSpecies.length === 1 ? 'species' : 'species'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpecies.map((species) => (
                <SpeciesCard key={species.id} species={species} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-lg">
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
