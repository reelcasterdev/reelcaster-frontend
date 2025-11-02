/**
 * Regulations Service
 * Handles fetching fishing regulations from the API
 */

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
  pageModifiedDate?: string
  mostRecentUpdateDate?: string
  species: SpeciesRegulation[]
  generalRules: string[]
  protectedAreas?: string[]
}

class RegulationsService {
  private cache: Map<string, { data: AreaRegulations | AreaRegulations[] | null; timestamp: number }> = new Map()
  private cacheTimeout = 60 * 60 * 1000 // 1 hour cache
  private apiUrl: string

  constructor() {
    // Use relative URL for API endpoint
    this.apiUrl = '/api/regulations'
  }

  /**
   * Get regulations for a specific location
   * @param locationName - The location name (e.g., "Victoria, Sidney")
   * @returns The area regulations or null if not found
   */
  async getRegulationsByLocation(locationName: string): Promise<AreaRegulations | null> {
    // First, try to get from cache
    const cacheKey = `location:${locationName}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`Returning cached regulations for ${locationName}`)
      return !Array.isArray(cached.data) ? cached.data : null
    }

    try {
      // Fetch all regulations (could be optimized to fetch by area if mapping exists)
      const response = await fetch(this.apiUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch regulations: ${response.status}`)
      }

      const regulations: AreaRegulations[] = await response.json()

      // Find regulations for the requested location
      const locationRegulations = regulations.find(
        reg => reg.areaName === locationName
      )

      // Cache the result
      this.cache.set(cacheKey, {
        data: locationRegulations || null,
        timestamp: Date.now()
      })

      return locationRegulations || null
    } catch (error) {
      console.error(`Error fetching regulations for ${locationName}:`, error)

      // Try to return cached data even if expired
      if (cached && !Array.isArray(cached.data)) {
        console.log(`Returning stale cached data for ${locationName} due to error`)
        return cached.data
      }

      return null
    }
  }

  /**
   * Get regulations by area ID
   * @param areaId - The area ID (e.g., "19", "20")
   * @returns The area regulations or null if not found
   */
  async getRegulationsByAreaId(areaId: string): Promise<AreaRegulations | null> {
    // Check cache first
    const cacheKey = `area:${areaId}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`Returning cached regulations for area ${areaId}`)
      return !Array.isArray(cached.data) ? cached.data : null
    }

    try {
      const response = await fetch(`${this.apiUrl}?area_id=${areaId}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch regulations: ${response.status}`)
      }

      const regulations: AreaRegulations[] = await response.json()
      const areaRegulations = regulations.length > 0 ? regulations[0] : null

      // Cache the result
      this.cache.set(cacheKey, {
        data: areaRegulations,
        timestamp: Date.now()
      })

      return areaRegulations
    } catch (error) {
      console.error(`Error fetching regulations for area ${areaId}:`, error)

      // Try to return cached data even if expired
      if (cached && !Array.isArray(cached.data)) {
        console.log(`Returning stale cached data for area ${areaId} due to error`)
        return cached.data
      }

      return null
    }
  }

  /**
   * Get all available regulations
   * @returns Array of all area regulations
   */
  async getAllRegulations(): Promise<AreaRegulations[]> {
    const cacheKey = 'all'
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('Returning cached all regulations')
      return Array.isArray(cached.data) ? cached.data : []
    }

    try {
      const response = await fetch(this.apiUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch regulations: ${response.status}`)
      }

      const regulations: AreaRegulations[] = await response.json()

      // Cache the result
      this.cache.set(cacheKey, {
        data: regulations,
        timestamp: Date.now()
      })

      return regulations
    } catch (error) {
      console.error('Error fetching all regulations:', error)

      // Try to return cached data even if expired
      if (cached && Array.isArray(cached.data)) {
        console.log('Returning stale cached data for all regulations due to error')
        return cached.data
      }

      return []
    }
  }

  /**
   * Get species regulation for a specific species in a location
   * @param locationName - The location name
   * @param speciesId - The species ID
   * @returns The species regulation or null if not found
   */
  async getSpeciesRegulation(
    locationName: string,
    speciesId: string
  ): Promise<SpeciesRegulation | null> {
    const regulations = await this.getRegulationsByLocation(locationName)

    if (!regulations) return null

    return regulations.species.find(species => species.id === speciesId) || null
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
    console.log('Regulations cache cleared')
  }

  /**
   * Get available locations from the API
   * @returns Array of location names with area IDs
   */
  async getAvailableLocations(): Promise<Array<{ areaId: string; areaName: string }>> {
    try {
      const regulations = await this.getAllRegulations()
      return regulations.map(reg => ({
        areaId: reg.areaId,
        areaName: reg.areaName
      }))
    } catch (error) {
      console.error('Error fetching available locations:', error)
      return []
    }
  }
}

// Export a singleton instance
export const regulationsService = new RegulationsService()

// Export convenience functions that maintain backward compatibility
export async function getRegulationsByLocation(locationName: string): Promise<AreaRegulations | null> {
  return regulationsService.getRegulationsByLocation(locationName)
}

export async function getSpeciesRegulation(
  locationName: string,
  speciesId: string
): Promise<SpeciesRegulation | null> {
  return regulationsService.getSpeciesRegulation(locationName, speciesId)
}

export async function getAllRegulations(): Promise<AreaRegulations[]> {
  return regulationsService.getAllRegulations()
}