'use client'

import { useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Fish } from 'lucide-react'
import { getRegulationsByLocation } from '@/app/data/regulations'

interface V2SpeciesPanelProps {
  selectedLocation: string
  species: string | null
}

export default function V2SpeciesPanel({ selectedLocation, species }: V2SpeciesPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const speciesList = useMemo(() => {
    const regulations = getRegulationsByLocation(selectedLocation)
    if (!regulations) return []
    return regulations.species.map(s => ({
      id: s.id,
      name: s.name,
      status: s.status,
    }))
  }, [selectedLocation])

  const handleSpeciesSelect = useCallback((speciesId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (speciesId === null) {
      params.delete('species')
    } else {
      params.set('species', speciesId)
    }
    router.push(`/?${params.toString()}`)
  }, [router, searchParams])

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'open') return 'text-green-400 bg-green-500/10'
    if (s === 'restricted') return 'text-yellow-400 bg-yellow-500/10'
    if (s === 'non retention' || s === 'non-retention') return 'text-orange-400 bg-orange-500/10'
    if (s === 'closed') return 'text-red-400 bg-red-500/10'
    return 'text-rc-text-muted bg-rc-bg-light'
  }

  if (!speciesList.length) return null

  return (
    <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4">
      <div className="flex items-center gap-2 mb-3">
        <Fish className="w-4 h-4 text-rc-text-muted" />
        <h3 className="text-sm font-semibold text-rc-text">Species</h3>
      </div>

      <div className="space-y-1">
        {/* All Species option */}
        <button
          onClick={() => handleSpeciesSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            !species
              ? 'bg-blue-600/20 text-blue-400 font-medium'
              : 'text-rc-text-light hover:bg-rc-bg-light'
          }`}
        >
          All Species
        </button>

        {speciesList.map(s => (
          <button
            key={s.id}
            onClick={() => handleSpeciesSelect(s.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
              species === s.id
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-rc-text-light hover:bg-rc-bg-light'
            }`}
          >
            <span>{s.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(s.status)}`}>
              {s.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
