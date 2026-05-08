import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';

// Load .env.test if it exists; harmless no-op otherwise.
dotenvConfig({ path: path.resolve(__dirname, '../../.env.test') });

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing env var ${name}. Copy .env.test.example to .env.test and fill it in.`,
    );
  }
  return v;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  baseUrl: optional('PLAYWRIGHT_BASE_URL', 'http://localhost:3004'),
  bluecasterUrl: optional('BLUECASTER_URL', 'http://localhost:3001'),
  bluecasterApiKey: optional('BLUECASTER_PUBLIC_API_KEY'),
  supabaseUrl: optional('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: optional('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
  freeUser: {
    email: optional('TEST_FREE_USER_EMAIL'),
    password: optional('TEST_FREE_USER_PASSWORD'),
  },
  proUser: {
    email: optional('TEST_PRO_USER_EMAIL'),
    password: optional('TEST_PRO_USER_PASSWORD'),
  },
  stripeSecretKey: optional('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
};

export { required };
