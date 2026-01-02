'use client'

import { useState } from 'react'
import { AppShell } from '../components/layout'
import DashboardHeader from '../components/forecast/dashboard-header'
import { Fish, Search, Info, ChevronRight, X } from 'lucide-react'

interface Species {
  id: string
  name: string
  scientificName: string
  category: 'salmon' | 'groundfish' | 'shellfish' | 'other'
  status: 'open' | 'restricted' | 'closed' | 'non-retention'
  season?: string
  description: string
  minSize?: string
  dailyLimit?: number
}

// Mock data - would come from regulations data
const SPECIES_DATA: Species[] = [
  {
    id: 'chinook-salmon',
    name: 'Chinook Salmon',
    scientificName: 'Oncorhynchus tshawytscha',
    category: 'salmon',
    status: 'restricted',
    season: 'Apr 1 - Sep 30',
    description: 'The largest Pacific salmon species, highly prized by anglers.',
    minSize: '62 cm',
    dailyLimit: 2,
  },
  {
    id: 'coho-salmon',
    name: 'Coho Salmon',
    scientificName: 'Oncorhynchus kisutch',
    category: 'salmon',
    status: 'open',
    season: 'Jul 15 - Oct 31',
    description: 'Silver salmon known for their acrobatic fights.',
    minSize: '30 cm',
    dailyLimit: 4,
  },
  {
    id: 'halibut',
    name: 'Pacific Halibut',
    scientificName: 'Hippoglossus stenolepis',
    category: 'groundfish',
    status: 'restricted',
    season: 'Mar 15 - Nov 15',
    description: 'Large flatfish prized for their firm, white flesh.',
    minSize: '82 cm',
    dailyLimit: 1,
  },
  {
    id: 'lingcod',
    name: 'Lingcod',
    scientificName: 'Ophiodon elongatus',
    category: 'groundfish',
    status: 'open',
    description: 'Aggressive predator with excellent eating quality.',
    minSize: '65 cm',
    dailyLimit: 2,
  },
  {
    id: 'dungeness-crab',
    name: 'Dungeness Crab',
    scientificName: 'Metacarcinus magister',
    category: 'shellfish',
    status: 'open',
    description: 'Popular crab species found along the Pacific coast.',
    minSize: '165 mm',
    dailyLimit: 4,
  },
  {
    id: 'pink-salmon',
    name: 'Pink Salmon',
    scientificName: 'Oncorhynchus gorbuscha',
    category: 'salmon',
    status: 'open',
    season: 'Jul - Sep (odd years)',
    description: 'Smallest Pacific salmon, runs in odd years.',
    dailyLimit: 4,
  },
]

const CATEGORIES = [
  { id: 'all', label: 'All Species' },
  { id: 'salmon', label: 'Salmon' },
  { id: 'groundfish', label: 'Groundfish' },
  { id: 'shellfish', label: 'Shellfish' },
]

export default function SpeciesIdPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)

  const filteredSpecies = SPECIES_DATA.filter(species => {
    const matchesSearch =
      species.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      species.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || species.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getStatusColor = (status: Species['status']) => {
    switch (status) {
      case 'open':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'restricted':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'closed':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'non-retention':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    }
  }

  const getStatusLabel = (status: Species['status']) => {
    switch (status) {
      case 'open':
        return 'Open'
      case 'restricted':
        return 'Restricted'
      case 'closed':
        return 'Closed'
      case 'non-retention':
        return 'Non-Retention'
    }
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6">
        <DashboardHeader
          title="Species ID"
          showTimeframe={false}
          showSetLocation={false}
          showCustomize={false}
        />

        <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rc-text-muted" />
          <input
            type="text"
            placeholder="Search species by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-rc-bg-dark border border-rc-bg-light rounded-xl text-rc-text placeholder-rc-text-muted focus:outline-none focus:border-rc-text-muted"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-rc-bg-light text-rc-text'
                  : 'bg-rc-bg-dark text-rc-text-muted hover:bg-rc-bg-light/50 hover:text-rc-text-light'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Species Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSpecies.map(species => (
            <button
              key={species.id}
              onClick={() => setSelectedSpecies(species)}
              className="bg-rc-bg-dark rounded-xl border border-rc-bg-light p-4 hover:border-rc-text-muted/30 transition-colors text-left group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rc-bg-light rounded-lg">
                    <Fish className="w-5 h-5 text-rc-text-light" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-rc-text group-hover:text-rc-text-light">
                      {species.name}
                    </h3>
                    <p className="text-sm text-rc-text-muted italic">{species.scientificName}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-rc-text-muted group-hover:text-rc-text-light" />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                    species.status
                  )}`}
                >
                  {getStatusLabel(species.status)}
                </span>
                {species.season && (
                  <span className="text-xs text-rc-text-muted">{species.season}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredSpecies.length === 0 && (
          <div className="text-center py-12">
            <Fish className="w-12 h-12 text-rc-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-rc-text mb-2">No species found</h3>
            <p className="text-rc-text-muted">Try adjusting your search or filter</p>
          </div>
        )}
        </div>
      </div>

      {/* Species Detail Modal */}
      {selectedSpecies && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setSelectedSpecies(null)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-rc-bg-darkest rounded-2xl border border-rc-bg-light shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-rc-bg-dark rounded-xl">
                    <Fish className="w-8 h-8 text-rc-text-light" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-rc-text">{selectedSpecies.name}</h2>
                    <p className="text-rc-text-muted italic">{selectedSpecies.scientificName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSpecies(null)}
                  className="p-1 hover:bg-rc-bg-light rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-rc-text-muted" />
                </button>
              </div>

              <p className="text-rc-text-light mb-6">{selectedSpecies.description}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-rc-bg-dark rounded-lg border border-rc-bg-light">
                  <span className="text-rc-text-muted">Status</span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                      selectedSpecies.status
                    )}`}
                  >
                    {getStatusLabel(selectedSpecies.status)}
                  </span>
                </div>

                {selectedSpecies.season && (
                  <div className="flex items-center justify-between p-3 bg-rc-bg-dark rounded-lg border border-rc-bg-light">
                    <span className="text-rc-text-muted">Season</span>
                    <span className="text-rc-text font-medium">{selectedSpecies.season}</span>
                  </div>
                )}

                {selectedSpecies.minSize && (
                  <div className="flex items-center justify-between p-3 bg-rc-bg-dark rounded-lg border border-rc-bg-light">
                    <span className="text-rc-text-muted">Minimum Size</span>
                    <span className="text-rc-text font-medium">{selectedSpecies.minSize}</span>
                  </div>
                )}

                {selectedSpecies.dailyLimit && (
                  <div className="flex items-center justify-between p-3 bg-rc-bg-dark rounded-lg border border-rc-bg-light">
                    <span className="text-rc-text-muted">Daily Limit</span>
                    <span className="text-rc-text font-medium">{selectedSpecies.dailyLimit}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 p-3 bg-rc-bg-dark rounded-lg border border-rc-bg-light flex items-start gap-2">
                <Info className="w-5 h-5 text-rc-text-muted flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rc-text-muted">
                  Regulations may vary by area. Always check current DFO regulations before fishing.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
