'use client'

import { useState, useEffect } from 'react'
import { AreaRegulations, regulationsService } from '@/app/services/regulations'

// In-memory cache for regulations by location (persists across re-renders)
const regulationsCache = new Map<string, { data: AreaRegulations | null; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface UseRegulationsOptions {
  areaId?: string
  enableApi?: boolean // Default to true now for dynamic data
}

export function useRegulations(options: UseRegulationsOptions = {}) {
  const { areaId, enableApi = true } = options // Changed default to true
  const [regulations, setRegulations] = useState<AreaRegulations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRegulations = async () => {
      try {
        setLoading(true)
        setError(null)

        if (enableApi) {
          // Fetch from API (now the default)
          let data: AreaRegulations[]

          if (areaId) {
            const areaReg = await regulationsService.getRegulationsByAreaId(areaId)
            data = areaReg ? [areaReg] : []
          } else {
            data = await regulationsService.getAllRegulations()
          }

          setRegulations(data)
        } else {
          // Fallback to empty array if API is disabled and no static files
          // This allows for dynamic loading without hardcoded dependencies
          console.warn('API disabled and no static fallback configured')
          setRegulations([])
        }
      } catch (err) {
        console.error('Error fetching regulations:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setRegulations([])
      } finally {
        setLoading(false)
      }
    }

    fetchRegulations()
  }, [areaId, enableApi])

  return { regulations, loading, error }
}

/**
 * Hook to fetch regulations for a specific location
 * Uses in-memory caching to avoid redundant API calls
 */
export function useLocationRegulations(locationName: string | null) {
  const [regulations, setRegulations] = useState<AreaRegulations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationName) {
      setRegulations(null)
      setLoading(false)
      return
    }

    const fetchRegulations = async () => {
      // Check cache first
      const cached = regulationsCache.get(locationName)
      const now = Date.now()

      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        // Cache hit - use cached data immediately
        setRegulations(cached.data)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await regulationsService.getRegulationsByLocation(locationName)
        // Store in cache
        regulationsCache.set(locationName, { data, timestamp: now })
        setRegulations(data)
      } catch (err) {
        console.error('Error fetching regulations:', err)
        setError(err instanceof Error ? err.message : 'Failed to load regulations')
        setRegulations(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRegulations()
  }, [locationName])

  return { regulations, loading, error }
}

/**
 * Get regulations for a location from already-fetched data
 * This is now more dynamic and doesn't rely on hardcoded mappings
 */
export function getRegulationsByLocationClient(
  locationName: string,
  regulations: AreaRegulations[],
): AreaRegulations | null {
  // First try exact match on areaName
  const exactMatch = regulations.find(r => r.areaName === locationName)
  if (exactMatch) return exactMatch

  // If no exact match, could implement fuzzy matching or other logic here
  // For now, return null if no match found
  return null
}

/**
 * Hook to get all available locations with regulations
 */
export function useAvailableLocations() {
  const [locations, setLocations] = useState<Array<{ areaId: string; areaName: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await regulationsService.getAvailableLocations()
        setLocations(data)
      } catch (err) {
        console.error('Error fetching available locations:', err)
        setError('Failed to load available locations')
        setLocations([])
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [])

  return { locations, loading, error }
}
