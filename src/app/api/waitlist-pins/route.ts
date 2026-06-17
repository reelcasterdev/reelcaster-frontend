/**
 * POST /api/waitlist-pins
 *
 * Public — no auth required. Captures demand for uncovered regions.
 * Body: { email, lat, lon, species?, source }
 * source ∈ { anon_pin, plus_upgrade_attempt, tier3_alert_attempt }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const VALID_SOURCES = new Set(['anon_pin', 'plus_upgrade_attempt', 'tier3_alert_attempt']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: {
    email?: unknown;
    lat?: unknown;
    lon?: unknown;
    species?: unknown;
    source?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const lat = typeof body.lat === 'number' ? body.lat : NaN;
  const lon = typeof body.lon === 'number' ? body.lon : NaN;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json({ error: 'Valid lat is required' }, { status: 400 });
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Valid lon is required' }, { status: 400 });
  }

  const source = typeof body.source === 'string' ? body.source : 'anon_pin';
  if (!VALID_SOURCES.has(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
  }

  const speciesInput = body.species;
  const species = Array.isArray(speciesInput)
    ? speciesInput.filter((s): s is string => typeof s === 'string').slice(0, 20)
    : null;

  const { data, error } = await supabaseAdmin
    .from('waitlist_pins')
    .insert({ email, lat, lon, species, source })
    .select('id')
    .single();

  if (error) {
    console.error('waitlist_pins insert failed:', error);
    return NextResponse.json({ error: 'Failed to save pin' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, success: true }, { status: 201 });
}
