import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(supabaseUrl, supabaseKey)
}

// Species that have scoring algorithms implemented
// Filter to only show these on the species calendar
const SPECIES_WITH_ALGORITHMS = [
  'chinook salmon',
  'coho salmon',
  'pink salmon',
  'sockeye salmon',
  'chum salmon',
  'halibut',
  'lingcod',
  'rockfish',
  'crab',
  'spot prawn',
  'spot prawns',
  'dungeness crab',
  'red rock crab',
]

function hasAlgorithm(speciesName: string): boolean {
  const normalizedName = speciesName.toLowerCase().trim()
  return SPECIES_WITH_ALGORITHMS.some(algo =>
    normalizedName.includes(algo) || algo.includes(normalizedName)
  )
}

export interface SpeciesCalendarData {
  location: string
  areaId: string
  lastVerified?: string
  nextReviewDate?: string
  officialUrl?: string
  speciesByStatus: {
    Open: SpeciesInfo[]
    Closed: SpeciesInfo[]
    'Non Retention': SpeciesInfo[]
    Restricted: SpeciesInfo[]
  }
  totalSpecies: number
}

export interface SpeciesInfo {
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

/**
 * GET /api/species-calendar
 * Fetch species data grouped by status for a specific location
 * Query params:
 *   - location: Location name (e.g., "Victoria, Sidney", "Sooke, Port Renfrew")
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const location = searchParams.get('location') || 'Victoria, Sidney'

    // Fetch regulations for the specified location
    const { data, error } = await supabase
      .from('fishing_regulations')
      .select(`
        area_id,
        area_name,
        official_url,
        last_verified,
        next_review_date,
        species:species_regulations(*)
      `)
      .eq('is_active', true)
      .eq('area_name', location)
      .single()

    if (error) {
      console.error('Error fetching species calendar data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch species calendar data' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Transform and group species by status
    const speciesByStatus: SpeciesCalendarData['speciesByStatus'] = {
      Open: [],
      Closed: [],
      'Non Retention': [],
      Restricted: [],
    }

    // Track unique species (some might have duplicate entries for different regulations)
    const uniqueSpecies = new Map<string, SpeciesInfo>()

    data.species.forEach((s: any) => {
      // Only include species that have scoring algorithms
      if (!hasAlgorithm(s.species_name)) {
        return
      }

      const speciesKey = `${s.species_name}-${s.status}`

      // Skip if we've already processed this species with this status
      if (!uniqueSpecies.has(speciesKey)) {
        const speciesInfo: SpeciesInfo = {
          id: s.id,
          name: s.species_name,
          scientificName: s.scientific_name,
          dailyLimit: s.daily_limit,
          annualLimit: s.annual_limit,
          minSize: s.min_size,
          maxSize: s.max_size,
          status: s.status,
          gear: s.gear,
          season: s.season,
          notes: s.notes || [],
        }

        uniqueSpecies.set(speciesKey, speciesInfo)

        // Add to appropriate status group
        if (s.status in speciesByStatus) {
          speciesByStatus[s.status as keyof typeof speciesByStatus].push(speciesInfo)
        }
      }
    })

    // Sort species within each status group alphabetically
    Object.keys(speciesByStatus).forEach((status) => {
      speciesByStatus[status as keyof typeof speciesByStatus].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    })

    const calendarData: SpeciesCalendarData = {
      location: data.area_name,
      areaId: data.area_id,
      lastVerified: data.last_verified,
      nextReviewDate: data.next_review_date,
      officialUrl: data.official_url,
      speciesByStatus,
      totalSpecies: uniqueSpecies.size,
    }

    // Cache for 1 hour
    return NextResponse.json(calendarData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
