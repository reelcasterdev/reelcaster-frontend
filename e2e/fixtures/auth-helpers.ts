import { APIRequestContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import type { TestUser } from './users';

/**
 * Acquire a Supabase access token for a test user via the public auth flow.
 * Used by API contract specs that need to send Authorization: Bearer <token>
 * without going through the browser login UI.
 */
export async function getAccessToken(user: TestUser): Promise<string> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Supabase URL/anon key missing for getAccessToken()');
  }
  if (!user.email || !user.password) {
    throw new Error('Test user credentials missing for getAccessToken()');
  }
  const sb = createClient(env.supabaseUrl, env.supabaseAnonKey);
  const { data, error } = await sb.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error || !data.session?.access_token) {
    throw new Error(`Failed to acquire access token: ${error?.message ?? 'no session'}`);
  }
  return data.session.access_token;
}

/** Build an authed Playwright request context bound to a token. */
export async function authedFetch(
  request: APIRequestContext,
  token: string,
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
) {
  const url = path.startsWith('http') ? path : `${env.baseUrl}${path}`;
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    ...(init?.headers ?? {}),
  };
  if (init?.body !== undefined) headers['content-type'] = 'application/json';

  const opts: Parameters<APIRequestContext['fetch']>[1] = {
    method,
    headers,
    data: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  };
  return request.fetch(url, opts);
}
