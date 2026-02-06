/**
 * Favorite Spots CRUD API
 *
 * GET    /api/favorite-spots         - List user's spots
 * POST   /api/favorite-spots         - Create new spot
 * PUT    /api/favorite-spots         - Update spot (requires id in body)
 * DELETE /api/favorite-spots?id=xxx  - Delete spot
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// =============================================================================
// Auth Helper
// =============================================================================

async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user.id
}

// =============================================================================
// GET - List user's favorite spots
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: spots, error } = await supabaseAdmin
      .from('favorite_spots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching favorite spots:', error)
      return NextResponse.json({ error: 'Failed to fetch favorite spots' }, { status: 500 })
    }

    return NextResponse.json({ spots })
  } catch (error) {
    console.error('Error in GET /api/favorite-spots:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// POST - Create new favorite spot
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (typeof body.lat !== 'number' || body.lat < -90 || body.lat > 90) {
      return NextResponse.json({ error: 'Valid lat is required' }, { status: 400 })
    }

    if (typeof body.lon !== 'number' || body.lon < -180 || body.lon > 180) {
      return NextResponse.json({ error: 'Valid lon is required' }, { status: 400 })
    }

    const { data: spot, error } = await supabaseAdmin
      .from('favorite_spots')
      .insert({
        user_id: userId,
        name: body.name.trim(),
        location: body.location || null,
        lat: body.lat,
        lon: body.lon,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating favorite spot:', error)
      return NextResponse.json({ error: 'Failed to create favorite spot' }, { status: 500 })
    }

    return NextResponse.json({ spot }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/favorite-spots:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// PUT - Update favorite spot
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Spot ID is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('favorite_spots')
      .select('user_id')
      .eq('id', body.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Spot not found' }, { status: 404 })
    }

    if (existing.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
      }
      updates.name = body.name.trim()
    }

    if (body.location !== undefined) updates.location = body.location
    if (body.notes !== undefined) updates.notes = body.notes

    if (body.lat !== undefined) {
      if (typeof body.lat !== 'number' || body.lat < -90 || body.lat > 90) {
        return NextResponse.json({ error: 'Invalid lat' }, { status: 400 })
      }
      updates.lat = body.lat
    }

    if (body.lon !== undefined) {
      if (typeof body.lon !== 'number' || body.lon < -180 || body.lon > 180) {
        return NextResponse.json({ error: 'Invalid lon' }, { status: 400 })
      }
      updates.lon = body.lon
    }

    const { data: spot, error } = await supabaseAdmin
      .from('favorite_spots')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating favorite spot:', error)
      return NextResponse.json({ error: 'Failed to update favorite spot' }, { status: 500 })
    }

    return NextResponse.json({ spot })
  } catch (error) {
    console.error('Error in PUT /api/favorite-spots:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Delete favorite spot
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const spotId = searchParams.get('id')

    if (!spotId) {
      return NextResponse.json({ error: 'Spot ID is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('favorite_spots')
      .select('user_id')
      .eq('id', spotId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Spot not found' }, { status: 404 })
    }

    if (existing.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabaseAdmin.from('favorite_spots').delete().eq('id', spotId)

    if (error) {
      console.error('Error deleting favorite spot:', error)
      return NextResponse.json({ error: 'Failed to delete favorite spot' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/favorite-spots:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
