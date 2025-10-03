import { useState, useEffect } from 'react'
import { AreaRegulations } from '@/app/data/regulations'
import area19Regulations from '@/app/data/regulations/area-19-victoria-sidney.json'
import area20Regulations from '@/app/data/regulations/area-20-sooke.json'

interface UseRegulationsOptions {
  areaId?: string
  enableApi?: boolean // Toggle between API and static JSON
}

export function useRegulations(options: UseRegulationsOptions = {}) {
  const { areaId, enableApi = false } = options
  const [regulations, setRegulations] = useState<AreaRegulations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRegulations = async () => {
      try {
        setLoading(true)
        setError(null)

        if (enableApi) {
          // Fetch from API
          const url = areaId
            ? `/api/regulations?area_id=${areaId}`
            : '/api/regulations'

          const response = await fetch(url)

          if (!response.ok) {
            throw new Error('Failed to fetch regulations from API')
          }

          const data = await response.json()
          setRegulations(Array.isArray(data) ? data : [data])
        } else {
          // Use static JSON files as fallback
          const staticData: AreaRegulations[] = [
            area19Regulations as AreaRegulations,
            area20Regulations as AreaRegulations,
          ]

          if (areaId) {
            const filtered = staticData.filter((r) => r.areaId === areaId)
            setRegulations(filtered)
          } else {
            setRegulations(staticData)
          }
        }
      } catch (err) {
        console.error('Error fetching regulations:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')

        // Fallback to static JSON on error
        const staticData: AreaRegulations[] = [
          area19Regulations as AreaRegulations,
          area20Regulations as AreaRegulations,
        ]

        if (areaId) {
          setRegulations(staticData.filter((r) => r.areaId === areaId))
        } else {
          setRegulations(staticData)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchRegulations()
  }, [areaId, enableApi])

  return { regulations, loading, error }
}

export function getRegulationsByLocationClient(
  locationName: string,
  regulations: AreaRegulations[]
): AreaRegulations | null {
  const locationToAreaMap: Record<string, string> = {
    'Victoria, Sidney': '19',
    'Sooke, Port Renfrew': '20',
  }

  const areaId = locationToAreaMap[locationName]
  if (!areaId) {
    return null
  }

  return regulations.find((r) => r.areaId === areaId) || null
}
