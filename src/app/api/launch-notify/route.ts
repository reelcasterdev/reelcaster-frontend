/**
 * POST /api/launch-notify
 *
 * Public — no auth. Captures an email from the coming-soon page so we can
 * notify the visitor when ReelCaster launches.
 * Body: { email }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('launch_signups')
    .insert({ email, region: 'BC', source: 'coming_soon' });

  // 23505 = unique violation — already signed up, treat as success.
  if (error && error.code !== '23505') {
    console.error('launch_signups insert failed:', error);
    return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
