/**
 * Twilio wrapper — sends SMS + drives phone-number verification.
 *
 * Configuration:
 *   - TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN are always required.
 *   - For sending SMS, supply EITHER TWILIO_MESSAGING_SERVICE_SID (preferred —
 *     Twilio routes through a number pool) OR TWILIO_FROM_NUMBER (a single
 *     E.164 sender).
 *   - For phone verification, set TWILIO_VERIFY_SID (Twilio Verify service).
 *
 * Inert until creds are set — callers can always invoke; we return
 * { ok: false, reason: 'not-configured' } when they're missing.
 */

import 'server-only';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const verifySid = process.env.TWILIO_VERIFY_SID;

export function isTwilioConfigured(): boolean {
  return Boolean(accountSid && authToken && (messagingServiceSid || fromNumber));
}

export function isVerifyConfigured(): boolean {
  return Boolean(accountSid && authToken && verifySid);
}

type TwilioResult =
  | { ok: true; sid?: string; status?: string }
  | { ok: false; reason: 'not-configured' | 'http-error' | 'unknown'; error?: string };

function basicAuthHeader(): string {
  const token = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  return `Basic ${token}`;
}

export async function sendSms(to: string, body: string): Promise<TwilioResult> {
  if (!isTwilioConfigured()) return { ok: false, reason: 'not-configured' };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, Body: body });
  if (messagingServiceSid) {
    params.set('MessagingServiceSid', messagingServiceSid);
  } else {
    params.set('From', fromNumber!);
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, reason: 'http-error', error: errText };
    }
    const data = (await res.json()) as { sid?: string; status?: string };
    return { ok: true, sid: data.sid, status: data.status };
  } catch (err) {
    return { ok: false, reason: 'unknown', error: err instanceof Error ? err.message : String(err) };
  }
}

export async function startPhoneVerification(toE164: string): Promise<TwilioResult> {
  if (!isVerifyConfigured()) return { ok: false, reason: 'not-configured' };

  const url = `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`;
  const params = new URLSearchParams({ To: toE164, Channel: 'sms' });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, reason: 'http-error', error: errText };
    }
    const data = (await res.json()) as { sid?: string; status?: string };
    return { ok: true, sid: data.sid, status: data.status };
  } catch (err) {
    return { ok: false, reason: 'unknown', error: err instanceof Error ? err.message : String(err) };
  }
}

export async function checkPhoneVerification(
  toE164: string,
  code: string,
): Promise<TwilioResult & { approved?: boolean }> {
  if (!isVerifyConfigured()) return { ok: false, reason: 'not-configured' };

  const url = `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`;
  const params = new URLSearchParams({ To: toE164, Code: code });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, reason: 'http-error', error: errText };
    }
    const data = (await res.json()) as { sid?: string; status?: string };
    return { ok: true, sid: data.sid, status: data.status, approved: data.status === 'approved' };
  } catch (err) {
    return { ok: false, reason: 'unknown', error: err instanceof Error ? err.message : String(err) };
  }
}

const E164_RE = /^\+[1-9]\d{7,14}$/;
export function isE164(phone: string): boolean {
  return E164_RE.test(phone);
}
