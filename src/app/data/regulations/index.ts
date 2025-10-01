// Import regulation data
import area19Regulations from './area-19-victoria-sidney.json'
import area20Regulations from './area-20-sooke.json'

export interface SpeciesRegulation {
  id: string
  name: string
  scientificName?: string
  dailyLimit: string
  annualLimit?: string
  minSize?: string
  maxSize?: string
  status: 'Open' | 'Closed' | 'Non Retention' | 'Restricted'
  gear: string
  season: string
  notes?: string[]
}

export interface AreaRegulations {
  areaId: string
  areaName: string
  url: string
  lastUpdated: string
  lastVerified: string
  nextReviewDate: string
  dataSource: string
  species: SpeciesRegulation[]
  generalRules: string[]
  protectedAreas?: string[]
}

// Map of location names to their regulation area
const locationToAreaMap: Record<string, string> = {
  'Victoria, Sidney': '19',
  'Sooke, Port Renfrew': '20',
  // Add more mappings as needed
}

// Map of area IDs to their regulations
const areaRegulations: Record<string, AreaRegulations> = {
  '19': area19Regulations as AreaRegulations,
  '20': area20Regulations as AreaRegulations,
}

export function getRegulationsByLocation(locationName: string): AreaRegulations | null {
  const areaId = locationToAreaMap[locationName]
  if (!areaId) {
    console.warn(`No regulations found for location: ${locationName}`)
    return null
  }
  
  return areaRegulations[areaId] || null
}

export function getSpeciesRegulation(
  locationName: string, 
  speciesId: string
): SpeciesRegulation | null {
  const regulations = getRegulationsByLocation(locationName)
  if (!regulations) return null
  
  return regulations.species.find(species => species.id === speciesId) || null
}

export function getAllRegulations(): Record<string, AreaRegulations> {
  return areaRegulations
}

export { area19Regulations, area20Regulations }