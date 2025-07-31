'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

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
}

export default function SpeciesRegulations({ species, areaUrl }: SpeciesRegulationsProps) {
  const [expandedSpecies, setExpandedSpecies] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'Closed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Non Retention':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'Restricted':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const toggleSpecies = (speciesId: string) => {
    setExpandedSpecies(expandedSpecies === speciesId ? null : speciesId)
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Species Regulations</h2>
        {areaUrl && (
          <a
            href={areaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>Official DFO Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      
      <div className="space-y-2">
        {species.map((fish) => (
          <div key={fish.id} className="border border-slate-700/50 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSpecies(fish.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
            >
              <span className="text-slate-300 font-medium text-left">{fish.name}</span>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(fish.status)}`}>
                  {fish.status}
                </span>
                {expandedSpecies === fish.id ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>
            
            {expandedSpecies === fish.id && (
              <div className="px-4 py-3 bg-slate-700/20 border-t border-slate-700/50">
                <div className="space-y-2 text-sm">
                  {fish.scientificName && (
                    <div className="flex">
                      <span className="text-slate-400 w-24">Scientific:</span>
                      <span className="text-slate-300 italic">{fish.scientificName}</span>
                    </div>
                  )}
                  
                  <div className="flex">
                    <span className="text-slate-400 w-24">Daily Limit:</span>
                    <span className="text-slate-300">{fish.dailyLimit}</span>
                  </div>
                  
                  {fish.annualLimit && (
                    <div className="flex">
                      <span className="text-slate-400 w-24">Annual Limit:</span>
                      <span className="text-slate-300">{fish.annualLimit}</span>
                    </div>
                  )}
                  
                  {(fish.minSize || fish.maxSize) && (
                    <div className="flex">
                      <span className="text-slate-400 w-24">Size Limit:</span>
                      <span className="text-slate-300">
                        {fish.minSize && `Min: ${fish.minSize}`}
                        {fish.minSize && fish.maxSize && ', '}
                        {fish.maxSize && `Max: ${fish.maxSize}`}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex">
                    <span className="text-slate-400 w-24">Gear:</span>
                    <span className="text-slate-300">{fish.gear}</span>
                  </div>
                  
                  <div className="flex">
                    <span className="text-slate-400 w-24">Season:</span>
                    <span className="text-slate-300">{fish.season}</span>
                  </div>
                  
                  {fish.notes && fish.notes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <span className="text-slate-400 block mb-1">Important Notes:</span>
                      <ul className="list-disc list-inside space-y-1">
                        {fish.notes.map((note, index) => (
                          <li key={index} className="text-slate-300 text-xs pl-2">{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {species.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            No regulation data available for this location
          </div>
        )}
      </div>
    </div>
  )
}