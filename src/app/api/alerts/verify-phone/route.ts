/**
 * Phone-number verification for SMS alert delivery.
 *
 * POST /api/alerts/verify-phone   { phone: '+15551234567' }   -> sends SMS code
 * PUT  /api/alerts/verify-phone   { phone, code }              -> confirms code, sets phone_verified
 *
 * Returns 503 with reason='not-configured' until Twilio Verify creds drop.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  startPhoneVerification,
  checkPhoneVerification,
  isVerifyConfigured,
  isE164,
} from '@/lib/twilio';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isVerifyConfigured()) {
    return NextResponse.json(
      { error: 'SMS verification is not yet enabled', reason: 'not-configured' },
      { status: 503 },
    );
  }

  const { phone } = await request.json().catch(() => ({}));
  if (!phone || typeof phone !== 'string' || !isE164(phone)) {
    return NextResponse.json(
      { error: 'phone must be in E.164 format (e.g. +15551234567)' },
      { status: 400 },
    );
  }

  const result = await startPhoneVerification(phone);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Failed to send code' }, { status: 502 });
  }

  await supabaseAdmin
    .from('user_settings')
    .upsert({ user_id: userId, phone_e164: phone, phone_verified: false }, { onConflict: 'user_id' });

  return NextResponse.json({ ok: true, status: result.status });
}

export async function PUT(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isVerifyConfigured()) {
    return NextResponse.json(
      { error: 'SMS verification is not yet enabled', reason: 'not-configured' },
      { status: 503 },
    );
  }

  const { phone, code } = await request.json().catch(() => ({}));
  if (!phone || !isE164(phone) || !code || typeof code !== 'string') {
    return NextResponse.json({ error: 'phone (E.164) and code are required' }, { status: 400 });
  }

  const result = await checkPhoneVerification(phone, code);
  if (!result.ok || !result.approved) {
    return NextResponse.json(
      { error: 'Invalid or expired code', approved: false },
      { status: 400 },
    );
  }

  await supabaseAdmin
    .from('user_settings')
    .upsert(
      { user_id: userId, phone_e164: phone, phone_verified: true },
      { onConflict: 'user_id' },
    );

  return NextResponse.json({ ok: true, approved: true });
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'alerts/verify-phone',
    configured: isVerifyConfigured(),
  });
}
