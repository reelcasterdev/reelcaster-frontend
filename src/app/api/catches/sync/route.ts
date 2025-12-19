/**
 * Catch Sync API
 *
 * POST /api/catches/sync - Batch sync offline catches
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

interface SyncCatchInput {
  client_id: string
  caught_at: string
  location_lat: number
  location_lng: number
  location_accuracy_m?: number
  location_heading?: number
  location_speed_kph?: number
  location_name?: string
  outcome: 'bite' | 'landed'
  species_id?: string
  species_name?: string
  retention_status?: 'released' | 'kept'
  length_cm?: number
  weight_kg?: number
  depth_m?: number
  lure_id?: string
  lure_name?: string
  notes?: string
  photos?: string[]
}

interface SyncResult {
  client_id: string
  server_id: string | null
  success: boolean
  error?: string
  deduplicated?: boolean
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
// POST - Batch sync catches
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const catches: SyncCatchInput[] = body.catches

    if (!Array.isArray(catches)) {
      return NextResponse.json({ error: 'catches must be an array' }, { status: 400 })
    }

    if (catches.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 catches per sync' }, { status: 400 })
    }

    const results: SyncResult[] = []

    for (const catchData of catches) {
      try {
        // Validate required fields
        if (!catchData.client_id || !catchData.caught_at ||
            typeof catchData.location_lat !== 'number' ||
            typeof catchData.location_lng !== 'number' ||
            !catchData.outcome) {
          results.push({
            client_id: catchData.client_id || 'unknown',
            server_id: null,
            success: false,
            error: 'Missing required fields',
          })
          continue
        }

        // Check for existing catch with same client_id (deduplication)
        const { data: existing } = await supabaseAdmin
          .from('catch_logs')
          .select('id')
          .eq('user_id', userId)
          .eq('client_id', catchData.client_id)
          .single()

        if (existing) {
          results.push({
            client_id: catchData.client_id,
            server_id: existing.id,
            success: true,
            deduplicated: true,
          })
          continue
        }

        // Insert new catch
        const { data: newCatch, error } = await supabaseAdmin
          .from('catch_logs')
          .insert({
            user_id: userId,
            client_id: catchData.client_id,
            caught_at: catchData.caught_at,
            location_lat: catchData.location_lat,
            location_lng: catchData.location_lng,
            location_accuracy_m: catchData.location_accuracy_m || null,
            location_heading: catchData.location_heading || null,
            location_speed_kph: catchData.location_speed_kph || null,
            location_name: catchData.location_name || null,
            outcome: catchData.outcome,
            species_id: catchData.species_id || null,
            species_name: catchData.species_name || null,
            retention_status: catchData.retention_status || null,
            length_cm: catchData.length_cm || null,
            weight_kg: catchData.weight_kg || null,
            depth_m: catchData.depth_m || null,
            lure_id: catchData.lure_id || null,
            lure_name: catchData.lure_name || null,
            notes: catchData.notes || null,
            photos: catchData.photos || [],
            synced_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (error) {
          results.push({
            client_id: catchData.client_id,
            server_id: null,
            success: false,
            error: error.message,
          })
        } else {
          results.push({
            client_id: catchData.client_id,
            server_id: newCatch.id,
            success: true,
          })
        }
      } catch (err) {
        results.push({
          client_id: catchData.client_id || 'unknown',
          server_id: null,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      results,
      summary: {
        total: catches.length,
        success: successCount,
        failed: failedCount,
        deduplicated: results.filter((r) => r.deduplicated).length,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/catches/sync:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
