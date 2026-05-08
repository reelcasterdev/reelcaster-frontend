/**
 * Quick Twilio SMS smoke test.
 *
 * Reads creds from .env.local (no compile step — uses native fetch + URL-encoded body
 * so it matches our production wrapper exactly). Run:
 *
 *   pnpm tsx scripts/test-twilio-sms.ts +8801773089499 "Test from ReelCaster"
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

loadEnvLocal();

const to = process.argv[2];
const body = process.argv[3] ?? 'Test from ReelCaster — SMS pipeline is wired 🎣';

if (!to || !to.startsWith('+')) {
  console.error('Usage: pnpm tsx scripts/test-twilio-sms.ts <+E164_phone> [body]');
  process.exit(1);
}

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

if (!accountSid || !authToken || (!messagingServiceSid && !fromNumber)) {
  console.error(
    'Missing Twilio config. Need TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + (TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER).',
  );
  process.exit(1);
}

async function main() {
  const params = new URLSearchParams({ To: to, Body: body });
  if (messagingServiceSid) params.set('MessagingServiceSid', messagingServiceSid);
  else params.set('From', fromNumber!);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  console.log(`→ POST ${url}`);
  console.log(`  To=${to}`);
  console.log(
    `  ${messagingServiceSid ? `MessagingServiceSid=${messagingServiceSid}` : `From=${fromNumber}`}`,
  );

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const text = await res.text();
  console.log(`\n← HTTP ${res.status}`);
  try {
    const json = JSON.parse(text);
    console.log(JSON.stringify(json, null, 2));
    if (res.ok) {
      console.log(`\n✅ Queued. Status: ${json.status}, SID: ${json.sid}`);
      console.log(
        'If this is a trial account and the recipient is unverified, the message will FAIL silently — check the Twilio Console > Monitor > Messaging logs.',
      );
    } else {
      console.error(`\n❌ Failed (code ${json.code}): ${json.message}`);
      if (json.code === 21408) {
        console.error('  → Geo Permissions block: enable Bangladesh in Console > Messaging > Geo Permissions.');
      }
      if (json.code === 21608 || json.code === 21219) {
        console.error('  → Trial account limit: verify the recipient at Console > Phone Numbers > Verified Caller IDs.');
      }
      process.exit(1);
    }
  } catch {
    console.error(text);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
