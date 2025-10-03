import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * GET /api/regulations
 * Fetch all active fishing regulations
 * Query params:
 *   - area_id: Filter by area ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const areaId = searchParams.get('area_id')

    // Build query
    let query = supabase
      .from('fishing_regulations')
      .select(`
        *,
        species:species_regulations(*),
        general_rules:regulation_general_rules(*),
        protected_areas:regulation_protected_areas(*)
      `)
      .eq('is_active', true)
      .order('area_id')

    // Filter by area if provided
    if (areaId) {
      query = query.eq('area_id', areaId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching regulations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch regulations' },
        { status: 500 }
      )
    }

    // Transform data to match frontend interface
    const regulations = data.map((reg) => ({
      areaId: reg.area_id,
      areaName: reg.area_name,
      url: reg.official_url,
      lastUpdated: reg.last_updated,
      lastVerified: reg.last_verified,
      nextReviewDate: reg.next_review_date,
      dataSource: reg.data_source,
      species: reg.species.map((s: any) => ({
        id: s.species_id,
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
      })),
      generalRules: reg.general_rules
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((r: any) => r.rule_text),
      protectedAreas: reg.protected_areas?.map((a: any) => a.area_name) || [],
    }))

    // Cache for 1 hour
    return NextResponse.json(regulations, {
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
