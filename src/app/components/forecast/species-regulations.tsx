'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import RegulationsWarningBanner from './regulations-warning-banner'

interface FishSpecies {
  id: string
  name: string
  scientificName?: string
  minSize?: string
  maxSize?: string
  dailyLimit: string
  annualLimit?: string
  status: 'Open' | 'Closed' | 'Non Retention' | 'Restricted'
  gear: string
  season: string
  notes?: string[]
}

interface SpeciesRegulationsProps {
  species: FishSpecies[]
  areaUrl?: string
  lastVerified?: string
  nextReviewDate?: string
}

export default function SpeciesRegulations({
  species,
  areaUrl,
  lastVerified,
  nextReviewDate
}: SpeciesRegulationsProps) {
  const [expandedSpecies, setExpandedSpecies] = useState<string | null>(null)
  const [showAllSpecies, setShowAllSpecies] = useState(false)

  const displayedSpecies = showAllSpecies ? species : species.slice(0, 5)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-rc-bg-light text-green-400 border-rc-bg-light'
      case 'Closed':
        return 'bg-rc-bg-light text-red-400 border-rc-bg-light'
      case 'Non Retention':
        return 'bg-rc-bg-light text-orange-400 border-rc-bg-light'
      case 'Restricted':
        return 'bg-rc-bg-light text-yellow-400 border-rc-bg-light'
      default:
        return 'bg-rc-bg-light text-rc-text-muted border-rc-bg-light'
    }
  }

  const toggleSpecies = (speciesId: string) => {
    setExpandedSpecies(expandedSpecies === speciesId ? null : speciesId)
  }

  return (
    <div className="bg-rc-bg-darkest rounded-xl p-4 border border-rc-bg-light">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-rc-text">Species Regulations</h2>
        {areaUrl && (
          <a
            href={areaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>Official DFO Page</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {lastVerified && nextReviewDate && areaUrl && (
        <RegulationsWarningBanner
          lastVerified={lastVerified}
          nextReviewDate={nextReviewDate}
          officialUrl={areaUrl}
        />
      )}

      <div className="space-y-1.5">
        {displayedSpecies.map((fish) => (
          <div key={fish.id} className="border border-rc-bg-light rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSpecies(fish.id)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-rc-bg-dark/50 transition-colors"
            >
              <span className="text-rc-text-light font-medium text-left text-sm">{fish.name}</span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(fish.status)}`}>
                  {fish.status}
                </span>
                {expandedSpecies === fish.id ? (
                  <ChevronUp className="w-3.5 h-3.5 text-rc-text-muted" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-rc-text-muted" />
                )}
              </div>
            </button>

            {expandedSpecies === fish.id && (
              <div className="px-3 py-2 bg-rc-bg-dark/30 border-t border-rc-bg-light">
                <div className="space-y-1.5 text-xs">
                  <div className="flex">
                    <span className="text-rc-text-muted w-20">Daily Limit:</span>
                    <span className="text-rc-text-light">{fish.dailyLimit}</span>
                  </div>

                  {fish.annualLimit && (
                    <div className="flex">
                      <span className="text-rc-text-muted w-20">Annual Limit:</span>
                      <span className="text-rc-text-light">{fish.annualLimit}</span>
                    </div>
                  )}

                  {(fish.minSize || fish.maxSize) && (
                    <div className="flex">
                      <span className="text-rc-text-muted w-20">Size Limit:</span>
                      <span className="text-rc-text-light">
                        {fish.minSize && `Min: ${fish.minSize}`}
                        {fish.minSize && fish.maxSize && ', '}
                        {fish.maxSize && `Max: ${fish.maxSize}`}
                      </span>
                    </div>
                  )}

                  <div className="flex">
                    <span className="text-rc-text-muted w-20">Gear:</span>
                    <span className="text-rc-text-light">{fish.gear}</span>
                  </div>

                  <div className="flex">
                    <span className="text-rc-text-muted w-20">Season:</span>
                    <span className="text-rc-text-light">{fish.season}</span>
                  </div>

                  {fish.notes && fish.notes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-rc-bg-light">
                      <span className="text-rc-text-muted block mb-1">Important Notes:</span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {fish.notes.map((note, index) => (
                          <li key={index} className="text-rc-text-light text-xs pl-1">{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {species.length > 5 && (
          <button
            onClick={() => setShowAllSpecies(!showAllSpecies)}
            className="w-full py-2 text-center text-blue-400 hover:text-blue-300 transition-colors text-xs font-medium border border-rc-bg-light rounded-lg hover:bg-rc-bg-dark/50"
          >
            {showAllSpecies ? 'Show Less' : `Show ${species.length - 5} More Species`}
          </button>
        )}

        {species.length === 0 && (
          <div className="text-center py-6 text-rc-text-muted text-sm">
            No regulation data available for this location
          </div>
        )}
      </div>
    </div>
  )
}