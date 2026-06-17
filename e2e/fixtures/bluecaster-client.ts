import { APIRequestContext } from '@playwright/test';
import { env } from './env';

/**
 * Helper to hit bluecaster's `/api/v1/*` directly with the public API key
 * automatically attached. Used by `e2e/api/bluecaster.spec.ts`.
 */
export function bcRequest(request: APIRequestContext) {
  const baseUrl = env.bluecasterUrl.replace(/\/$/, '');
  const apiKey = env.bluecasterApiKey;

  return {
    async get(path: string, init?: { headers?: Record<string, string>; skipAuth?: boolean }) {
      const headers: Record<string, string> = { ...(init?.headers ?? {}) };
      if (!init?.skipAuth && apiKey) headers['x-api-key'] = apiKey;
      return request.get(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, { headers });
    },
    async post(path: string, body: unknown, init?: { headers?: Record<string, string>; skipAuth?: boolean }) {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      };
      if (!init?.skipAuth && apiKey) headers['x-api-key'] = apiKey;
      return request.post(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
        headers,
        data: body,
      });
    },
  };
}
