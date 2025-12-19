/**
 * Lures CRUD API
 *
 * GET    /api/lures         - List predefined + user's custom lures
 * POST   /api/lures         - Create custom lure
 * PUT    /api/lures         - Update custom lure
 * DELETE /api/lures?id=xxx  - Delete custom lure
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
// Types
// =============================================================================

const VALID_CATEGORIES = ['spoon', 'hoochie', 'plug', 'fly', 'jig', 'bait', 'other']

interface CreateLureInput {
  name: string
  category?: string
  brand?: string
  color?: string
  size?: string
}

interface UpdateLureInput extends Partial<CreateLureInput> {
  id: string
}

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
// GET - List lures (predefined + user's custom)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    // Build query for predefined lures
    let predefinedQuery = supabaseAdmin
      .from('lures')
      .select('*')
      .eq('is_predefined', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    // Build query for user's custom lures
    let customQuery = supabaseAdmin
      .from('lures')
      .select('*')
      .eq('user_id', userId)
      .order('usage_count', { ascending: false })
      .order('name', { ascending: true })

    // Apply category filter
    if (category && VALID_CATEGORIES.includes(category)) {
      predefinedQuery = predefinedQuery.eq('category', category)
      customQuery = customQuery.eq('category', category)
    }

    // Apply search filter
    if (search) {
      const searchPattern = `%${search}%`
      predefinedQuery = predefinedQuery.or(
        `name.ilike.${searchPattern},brand.ilike.${searchPattern},color.ilike.${searchPattern}`
      )
      customQuery = customQuery.or(
        `name.ilike.${searchPattern},brand.ilike.${searchPattern},color.ilike.${searchPattern}`
      )
    }

    // Execute both queries
    const [predefinedResult, customResult] = await Promise.all([predefinedQuery, customQuery])

    if (predefinedResult.error) {
      console.error('Error fetching predefined lures:', predefinedResult.error)
      return NextResponse.json({ error: 'Failed to fetch lures' }, { status: 500 })
    }

    if (customResult.error) {
      console.error('Error fetching custom lures:', customResult.error)
      return NextResponse.json({ error: 'Failed to fetch lures' }, { status: 500 })
    }

    // Combine and return, with custom lures first (frequently used)
    return NextResponse.json({
      lures: [...(customResult.data || []), ...(predefinedResult.data || [])],
      categories: VALID_CATEGORIES,
    })
  } catch (error) {
    console.error('Error in GET /api/lures:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// POST - Create custom lure
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateLureInput = await request.json()

    // Validate name
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (body.name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 })
    }

    // Validate category
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Check for duplicate (same name for this user)
    const { data: existing } = await supabaseAdmin
      .from('lures')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', body.name.trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A lure with this name already exists' }, { status: 400 })
    }

    // Create lure
    const { data: lure, error } = await supabaseAdmin
      .from('lures')
      .insert({
        user_id: userId,
        name: body.name.trim(),
        category: body.category || null,
        brand: body.brand?.trim() || null,
        color: body.color?.trim() || null,
        size: body.size?.trim() || null,
        is_predefined: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating lure:', error)
      return NextResponse.json({ error: 'Failed to create lure' }, { status: 500 })
    }

    return NextResponse.json({ lure }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/lures:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// PUT - Update custom lure
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateLureInput = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Lure ID is required' }, { status: 400 })
    }

    // Verify ownership and that it's not predefined
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('lures')
      .select('user_id, is_predefined')
      .eq('id', body.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Lure not found' }, { status: 404 })
    }

    if (existing.is_predefined) {
      return NextResponse.json({ error: 'Cannot modify predefined lures' }, { status: 403 })
    }

    if (existing.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      updates.name = body.name.trim()
    }

    if (body.category !== undefined) {
      if (body.category && !VALID_CATEGORIES.includes(body.category)) {
        return NextResponse.json(
          { error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` },
          { status: 400 }
        )
      }
      updates.category = body.category
    }

    if (body.brand !== undefined) {
      updates.brand = body.brand?.trim() || null
    }

    if (body.color !== undefined) {
      updates.color = body.color?.trim() || null
    }

    if (body.size !== undefined) {
      updates.size = body.size?.trim() || null
    }

    // Update lure
    const { data: lure, error } = await supabaseAdmin
      .from('lures')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating lure:', error)
      return NextResponse.json({ error: 'Failed to update lure' }, { status: 500 })
    }

    return NextResponse.json({ lure })
  } catch (error) {
    console.error('Error in PUT /api/lures:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Delete custom lure
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lureId = searchParams.get('id')

    if (!lureId) {
      return NextResponse.json({ error: 'Lure ID is required' }, { status: 400 })
    }

    // Verify ownership and that it's not predefined
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('lures')
      .select('user_id, is_predefined')
      .eq('id', lureId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Lure not found' }, { status: 404 })
    }

    if (existing.is_predefined) {
      return NextResponse.json({ error: 'Cannot delete predefined lures' }, { status: 403 })
    }

    if (existing.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete lure
    const { error } = await supabaseAdmin.from('lures').delete().eq('id', lureId)

    if (error) {
      console.error('Error deleting lure:', error)
      return NextResponse.json({ error: 'Failed to delete lure' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/lures:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
