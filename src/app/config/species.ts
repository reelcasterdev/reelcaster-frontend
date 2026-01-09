/**
 * Fish Species Configuration
 *
 * Centralized species data for the ReelCaster application.
 * This file exports species definitions, categories, and helper functions.
 */

export type SpeciesCategory = 'salmon' | 'bottomfish' | 'shellfish'

export interface FishSpecies {
  id: string
  name: string
  scientificName?: string
  description?: string
  category: SpeciesCategory
  /** Whether a fishing algorithm exists for this species */
  hasAlgorithm: boolean
}

/**
 * All fish species supported by the application
 */
export const FISH_SPECIES: FishSpecies[] = [
  // Salmon species
  {
    id: 'chinook-salmon',
    name: 'Chinook Salmon',
    scientificName: 'Oncorhynchus tshawytscha',
    description: 'Spring, Summer, Fall runs',
    category: 'salmon',
    hasAlgorithm: true,
  },
  {
    id: 'coho-salmon',
    name: 'Coho Salmon',
    scientificName: 'Oncorhynchus kisutch',
    description: 'Summer, Fall runs',
    category: 'salmon',
    hasAlgorithm: true,
  },
  {
    id: 'chum-salmon',
    name: 'Chum Salmon',
    scientificName: 'Oncorhynchus keta',
    description: 'Fall runs',
    category: 'salmon',
    hasAlgorithm: true,
  },
  {
    id: 'pink-salmon',
    name: 'Pink Salmon',
    scientificName: 'Oncorhynchus gorbuscha',
    description: 'Summer runs (odd years)',
    category: 'salmon',
    hasAlgorithm: true,
  },
  {
    id: 'sockeye-salmon',
    name: 'Sockeye Salmon',
    scientificName: 'Oncorhynchus nerka',
    description: 'Summer runs',
    category: 'salmon',
    hasAlgorithm: true,
  },
  // Bottomfish species
  {
    id: 'halibut',
    name: 'Pacific Halibut',
    scientificName: 'Hippoglossus stenolepis',
    description: 'Year-round, bottom fishing',
    category: 'bottomfish',
    hasAlgorithm: true,
  },
  {
    id: 'lingcod',
    name: 'Lingcod',
    scientificName: 'Ophiodon elongatus',
    description: 'Year-round, bottom fishing',
    category: 'bottomfish',
    hasAlgorithm: true,
  },
  {
    id: 'rockfish',
    name: 'Rockfish',
    scientificName: 'Sebastes spp.',
    description: 'Various species, year-round',
    category: 'bottomfish',
    hasAlgorithm: true,
  },
  // Shellfish species
  {
    id: 'crab',
    name: 'Dungeness Crab',
    scientificName: 'Metacarcinus magister',
    description: 'Seasonal, trap fishing',
    category: 'shellfish',
    hasAlgorithm: true,
  },
  {
    id: 'spot-prawn',
    name: 'Spot Prawn',
    scientificName: 'Pandalus platyceros',
    description: 'Spring season, trap fishing',
    category: 'shellfish',
    hasAlgorithm: true,
  },
]

/**
 * Species with active fishing algorithms
 * Used in algorithm dropdowns and score calculations
 */
export const SPECIES_WITH_ALGORITHMS = FISH_SPECIES.filter((s) => s.hasAlgorithm)

/**
 * Simplified species list for basic dropdowns
 * (id and name only)
 */
export const SPECIES_OPTIONS = FISH_SPECIES.map((s) => ({
  id: s.id,
  name: s.name,
}))

/**
 * Get a species by its ID
 */
export function getSpeciesById(id: string): FishSpecies | undefined {
  return FISH_SPECIES.find((s) => s.id === id)
}

/**
 * Get a species by its name
 */
export function getSpeciesByName(name: string): FishSpecies | undefined {
  return FISH_SPECIES.find((s) => s.name.toLowerCase() === name.toLowerCase())
}

/**
 * Get all species in a category
 */
export function getSpeciesByCategory(category: SpeciesCategory): FishSpecies[] {
  return FISH_SPECIES.filter((s) => s.category === category)
}

/**
 * Get all salmon species
 */
export function getSalmonSpecies(): FishSpecies[] {
  return getSpeciesByCategory('salmon')
}

/**
 * Get all bottomfish species
 */
export function getBottomfishSpecies(): FishSpecies[] {
  return getSpeciesByCategory('bottomfish')
}

/**
 * Get all shellfish species
 */
export function getShellfishSpecies(): FishSpecies[] {
  return getSpeciesByCategory('shellfish')
}

/**
 * Get all species IDs
 */
export function getAllSpeciesIds(): string[] {
  return FISH_SPECIES.map((s) => s.id)
}

/**
 * Get all species names
 */
export function getAllSpeciesNames(): string[] {
  return FISH_SPECIES.map((s) => s.name)
}

/**
 * Check if a species ID is valid
 */
export function isValidSpeciesId(id: string): boolean {
  return FISH_SPECIES.some((s) => s.id === id)
}
