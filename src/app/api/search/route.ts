/**
 * GET /api/search?q=<query>&type=spot|city|species|all
 *
 * Server proxy that wraps BlueCaster's /api/v1/search so the API key
 * stays server-side. Returns raw BlueCaster shape unchanged.
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchBlueCaster } from '@/lib/bluecaster';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const typeRaw = request.nextUrl.searchParams.get('type') ?? 'all';
  const type = (['spot', 'city', 'species', 'all'] as const).includes(
    typeRaw as 'spot' | 'city' | 'species' | 'all',
  )
    ? (typeRaw as 'spot' | 'city' | 'species' | 'all')
    : 'all';

  if (!q || q.length < 2) {
    return NextResponse.json({ query: q, results: [], counts: { spots: 0, cities: 0, species: 0 } });
  }

  const data = await searchBlueCaster(q, type);
  if (!data) {
    return NextResponse.json(
      { query: q, results: [], counts: { spots: 0, cities: 0, species: 0 } },
      { status: 200 },
    );
  }
  return NextResponse.json(data);
}
