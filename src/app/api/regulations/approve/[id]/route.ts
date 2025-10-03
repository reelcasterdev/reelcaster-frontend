import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * POST /api/regulations/approve/[id]
 * Approve a scraped regulation and make it active
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient()
    const { id } = await params

    // Get the scraped regulation
    const { data: scraped, error: fetchError } = await supabase
      .from('scraped_regulations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !scraped) {
      return NextResponse.json(
        { error: 'Scraped regulation not found' },
        { status: 404 }
      )
    }

    // Start a transaction
    // 1. Deactivate old regulation for this area
    await supabase
      .from('fishing_regulations')
      .update({ is_active: false })
      .eq('area_id', scraped.area_id)

    // 2. Create new regulation entry
    const { data: newReg, error: insertError } = await supabase
      .from('fishing_regulations')
      .insert({
        area_id: scraped.area_id,
        area_name: scraped.area_id === '19' ? 'Victoria, Sidney' : 'Sooke',
        official_url: `https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s${scraped.area_id}-eng.html`,
        last_updated: new Date().toISOString(),
        last_verified: new Date().toISOString(),
        next_review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        data_source: 'DFO Pacific Region',
        is_active: true,
      })
      .select()
      .single()

    if (insertError || !newReg) {
      return NextResponse.json(
        { error: 'Failed to create regulation' },
        { status: 500 }
      )
    }

    // 3. Insert species data from scraped data
    const speciesInserts = []
    for (const [key, value] of Object.entries(scraped.scraped_data)) {
      if (typeof value === 'object' && value !== null) {
        speciesInserts.push({
          regulation_id: newReg.id,
          species_id: key,
          species_name: formatSpeciesName(key),
          daily_limit: (value as any).dailyLimit || '0',
          min_size: (value as any).minSize,
          max_size: (value as any).maxSize,
          status: (value as any).status || 'Open',
          gear: (value as any).gear || 'Hook and line',
          season: (value as any).season || 'Year-round',
          notes: (value as any).notes || [],
        })
      }
    }

    if (speciesInserts.length > 0) {
      await supabase.from('species_regulations').insert(speciesInserts)
    }

    // 4. Update scraped regulation status
    await supabase
      .from('scraped_regulations')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      regulation: newReg,
    })

  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json(
      { error: 'Failed to approve regulation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/regulations/approve/[id]
 * Reject a scraped regulation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient()
    const { id } = await params

    const { error } = await supabase
      .from('scraped_regulations')
      .update({
        approval_status: 'rejected',
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to reject regulation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Rejection error:', error)
    return NextResponse.json(
      { error: 'Failed to reject regulation' },
      { status: 500 }
    )
  }
}

function formatSpeciesName(key: string): string {
  return key
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
