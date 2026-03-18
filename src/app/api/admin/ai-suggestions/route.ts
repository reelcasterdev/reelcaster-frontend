import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// =============================================================================
// GET — List + filter + stats
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'list'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const version = searchParams.get('version')
    const location = searchParams.get('location')
    const species = searchParams.get('species')
    const rated = searchParams.get('rated')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const sort = searchParams.get('sort') || 'newest'

    // ── Stats view ──
    if (view === 'stats') {
      const { data: all, error } = await supabaseAdmin
        .from('ai_suggestions')
        .select('version, pm_rating, user_rating, location_name, species')

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
      }

      const scoreBased = all.filter(r => r.version === 'score_based')
      const rawData = all.filter(r => r.version === 'raw_data')

      const avgRating = (rows: typeof all) => {
        const rated = rows.filter(r => r.pm_rating != null)
        return rated.length > 0 ? rated.reduce((s, r) => s + r.pm_rating, 0) / rated.length : null
      }

      const thumbs = (rows: typeof all) => ({
        thumbsUp: rows.filter(r => r.user_rating === 1).length,
        thumbsDown: rows.filter(r => r.user_rating === -1).length,
      })

      // Top locations
      const locCounts: Record<string, number> = {}
      all.forEach(r => { locCounts[r.location_name] = (locCounts[r.location_name] || 0) + 1 })
      const topLocations = Object.entries(locCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([location, count]) => ({ location, count }))

      // Top species
      const specCounts: Record<string, number> = {}
      all.filter(r => r.species).forEach(r => { specCounts[r.species] = (specCounts[r.species] || 0) + 1 })
      const topSpecies = Object.entries(specCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([species, count]) => ({ species, count }))

      return NextResponse.json({
        totalSuggestions: all.length,
        unrated: all.filter(r => r.pm_rating == null).length,
        byVersion: {
          score_based: { count: scoreBased.length, avgPmRating: avgRating(scoreBased), ...thumbs(scoreBased) },
          raw_data: { count: rawData.length, avgPmRating: avgRating(rawData), ...thumbs(rawData) },
        },
        topLocations,
        topSpecies,
      })
    }

    // ── Build filtered query ──
    let query = supabaseAdmin
      .from('ai_suggestions')
      .select('*', { count: 'exact' })

    if (version) query = query.eq('version', version)
    if (location) query = query.eq('location_name', location)
    if (species) query = query.eq('species', species)
    if (rated === 'true') query = query.not('pm_rating', 'is', null)
    if (rated === 'false') query = query.is('pm_rating', null)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    // Sort
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'best':
        query = query.order('pm_rating', { ascending: false, nullsFirst: false })
        break
      case 'worst':
        query = query.order('pm_rating', { ascending: true, nullsFirst: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    // ── Pairs view ──
    if (view === 'pairs') {
      // Fetch all with pair_id, then group client-side
      const pairsLimit = limit * 2 // each pair has 2 rows
      const offset = (page - 1) * pairsLimit

      const { data, count, error } = await query.range(offset, offset + pairsLimit - 1)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
      }

      // Group by pair_id
      const pairMap = new Map<string, { scoreBased: any; rawData: any; createdAt: string; location: string; species: string | null }>()

      for (const row of data || []) {
        const pairId = row.pair_id || row.id
        if (!pairMap.has(pairId)) {
          pairMap.set(pairId, {
            scoreBased: null,
            rawData: null,
            createdAt: row.created_at,
            location: row.location_name,
            species: row.species,
          })
        }
        const pair = pairMap.get(pairId)!
        const entry = {
          id: row.id,
          suggestion: row.suggestion,
          user_rating: row.user_rating,
          pm_rating: row.pm_rating,
          pm_notes: row.pm_notes,
          latency_ms: row.latency_ms,
          input_tokens: row.input_tokens,
          output_tokens: row.output_tokens,
        }
        if (row.version === 'score_based') pair.scoreBased = entry
        else pair.rawData = entry
      }

      const pairs = Array.from(pairMap.entries()).map(([pairId, pair]) => ({
        pairId,
        ...pair,
      }))

      return NextResponse.json({
        pairs,
        total: count ? Math.ceil(count / 2) : 0,
        page,
        totalPages: count ? Math.ceil(count / 2 / limit) : 0,
      })
    }

    // ── List view ──
    const offset = (page - 1) * limit
    const { data, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
    }

    return NextResponse.json({
      suggestions: data,
      total: count,
      page,
      totalPages: count ? Math.ceil(count / limit) : 0,
    })
  } catch (error) {
    console.error('Error in GET /api/admin/ai-suggestions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// PATCH — PM rating
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const { id, pm_rating, pm_notes } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Suggestion ID required' }, { status: 400 })
    }
    if (pm_rating != null && (pm_rating < 1 || pm_rating > 5)) {
      return NextResponse.json({ error: 'pm_rating must be 1-5' }, { status: 400 })
    }

    const updates: Record<string, any> = {}
    if (pm_rating !== undefined) updates.pm_rating = pm_rating
    if (pm_notes !== undefined) updates.pm_notes = pm_notes

    const { error } = await supabaseAdmin
      .from('ai_suggestions')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating PM rating:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/admin/ai-suggestions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
