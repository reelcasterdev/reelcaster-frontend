'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Fish } from 'lucide-react'
import { SpeciesInfo } from '@/app/api/species-calendar/route'

interface SpeciesCardProps {
  species: SpeciesInfo
}

export default function SpeciesCard({ species }: SpeciesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'text-emerald-400'
      case 'Closed':
        return 'text-red-400'
      case 'Non Retention':
        return 'text-amber-400'
      case 'Restricted':
        return 'text-orange-400'
      default:
        return 'text-rc-text-muted'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open':
        return '✓'
      case 'Closed':
        return '✗'
      case 'Non Retention':
        return '⚠'
      case 'Restricted':
        return '!'
      default:
        return ''
    }
  }

  return (
    <div className="bg-rc-bg-dark rounded-lg border border-rc-bg-light overflow-hidden hover:border-rc-bg-light transition-all duration-200">
      {/* Card Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-4 flex items-start justify-between hover:bg-rc-bg-light/30 transition-colors"
      >
        <div className="flex items-start gap-3 flex-1 text-left">
          <div className="mt-0.5">
            <Fish className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-rc-text font-semibold text-base">{species.name}</h3>
            {species.scientificName && (
              <p className="text-rc-text-muted text-sm italic mt-0.5">{species.scientificName}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-medium ${getStatusColor(species.status)} flex items-center gap-1`}>
                <span>{getStatusIcon(species.status)}</span>
                <span>{species.status}</span>
              </span>
              {species.dailyLimit && species.dailyLimit !== '0' && (
                <span className="text-rc-text-muted text-xs">
                  Daily: <span className="text-rc-text-light font-medium">{species.dailyLimit}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="ml-2 flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-rc-text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-rc-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-rc-bg-light/50">
          <div className="mt-4 space-y-3">
            {/* Limits */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-rc-text-muted text-sm block mb-1">Daily Limit</span>
                <span className="text-rc-text text-sm font-medium">{species.dailyLimit}</span>
              </div>
              {species.annualLimit && (
                <div>
                  <span className="text-rc-text-muted text-sm block mb-1">Annual Limit</span>
                  <span className="text-rc-text text-sm font-medium">{species.annualLimit}</span>
                </div>
              )}
            </div>

            {/* Size Limits */}
            {(species.minSize || species.maxSize) && (
              <div>
                <span className="text-rc-text-muted text-sm block mb-1">Size Limits</span>
                <div className="flex gap-3">
                  {species.minSize && (
                    <span className="text-rc-text text-sm">
                      Min: <span className="font-medium">{species.minSize}</span>
                    </span>
                  )}
                  {species.maxSize && (
                    <span className="text-rc-text text-sm">
                      Max: <span className="font-medium">{species.maxSize}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Gear */}
            <div>
              <span className="text-rc-text-muted text-sm block mb-1">Allowed Gear</span>
              <span className="text-rc-text text-sm">{species.gear}</span>
            </div>

            {/* Season */}
            <div>
              <span className="text-rc-text-muted text-sm block mb-1">Season</span>
              <span className="text-rc-text text-sm">{species.season}</span>
            </div>

            {/* Notes */}
            {species.notes && species.notes.length > 0 && (
              <div className="pt-3 border-t border-rc-bg-light/50">
                <span className="text-rc-text-muted text-sm block mb-2">Important Notes</span>
                <ul className="space-y-1">
                  {species.notes.map((note, index) => (
                    <li key={index} className="text-rc-text-light text-xs flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span className="flex-1">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
