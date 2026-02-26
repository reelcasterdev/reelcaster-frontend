import { NextRequest, NextResponse } from 'next/server'

/**
 * Stormglass API Proxy
 *
 * Server-side proxy to protect STORMGLASS_API_KEY.
 * Routes:
 *   /api/stormglass/weather      → https://api.stormglass.io/v2/weather/point
 *   /api/stormglass/tide/extremes → https://api.stormglass.io/v2/tide/extremes/point
 *   /api/stormglass/tide/sea-level → https://api.stormglass.io/v2/tide/sea-level/point
 *   /api/stormglass/astronomy     → https://api.stormglass.io/v2/astronomy/point
 *
 * GPS rounding: lat/lng rounded to 0.01° (~1 km) for cache-key sharing.
 * In-memory cache: 6 h for weather, 24 h for tide/astronomy.
 */

const SG_BASE = 'https://api.stormglass.io/v2'
const CACHE_TTL_WEATHER_MS = 6 * 60 * 60 * 1000     // 6 hours
const CACHE_TTL_STATIC_MS = 24 * 60 * 60 * 1000      // 24 hours (tide/astronomy)

// In-memory response cache
const responseCache = new Map<string, { data: any; expiry: number }>()

// Daily request counter (resets at midnight UTC)
let dailyRequests = 0
let counterDate = new Date().toISOString().slice(0, 10)
const DAILY_LIMIT = 490 // safety margin under 500

function resetCounterIfNewDay() {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== counterDate) {
    dailyRequests = 0
    counterDate = today
  }
}

function roundCoord(val: number): number {
  return Math.round(val * 100) / 100
}

// Map proxy path segments to Stormglass endpoints
function resolveEndpoint(pathSegments: string[]): string | null {
  const joined = pathSegments.join('/')
  const map: Record<string, string> = {
    weather: '/weather/point',
    'tide/extremes': '/tide/extremes/point',
    'tide/sea-level': '/tide/sea-level/point',
    astronomy: '/astronomy/point',
  }
  return map[joined] ?? null
}

function cacheTtlForPath(pathSegments: string[]): number {
  return pathSegments[0] === 'weather' ? CACHE_TTL_WEATHER_MS : CACHE_TTL_STATIC_MS
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const apiKey = process.env.STORMGLASS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'STORMGLASS_API_KEY not configured' },
      { status: 503 },
    )
  }

  const { path: pathSegments } = await params
  const endpoint = resolveEndpoint(pathSegments)
  if (!endpoint) {
    return NextResponse.json({ error: 'Unknown Stormglass endpoint' }, { status: 404 })
  }

  // Round GPS for cache sharing
  const { searchParams } = new URL(request.url)
  const rawLat = parseFloat(searchParams.get('lat') ?? '0')
  const rawLng = parseFloat(searchParams.get('lng') ?? '0')
  const lat = roundCoord(rawLat)
  const lng = roundCoord(rawLng)

  // Build upstream query string
  searchParams.set('lat', lat.toString())
  searchParams.set('lng', lng.toString())

  const cacheKey = `sg:${endpoint}:${searchParams.toString()}`
  const ttl = cacheTtlForPath(pathSegments)

  // Check cache
  const cached = responseCache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json(cached.data, {
      headers: { 'X-Stormglass-Cache': 'HIT' },
    })
  }

  // Budget check
  resetCounterIfNewDay()
  if (dailyRequests >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: 'Stormglass daily request limit reached' },
      { status: 429 },
    )
  }

  try {
    const sgUrl = `${SG_BASE}${endpoint}?${searchParams.toString()}`
    const response = await fetch(sgUrl, {
      headers: { Authorization: apiKey },
    })

    if (!response.ok) {
      const text = await response.text()
      console.warn(`Stormglass ${endpoint} returned ${response.status}: ${text}`)
      return NextResponse.json(
        { error: `Stormglass API error: ${response.status}` },
        { status: response.status },
      )
    }

    dailyRequests++
    const data = await response.json()

    // Store in cache
    responseCache.set(cacheKey, { data, expiry: Date.now() + ttl })

    // Evict stale entries periodically (max 500 entries)
    if (responseCache.size > 500) {
      const now = Date.now()
      for (const [k, v] of responseCache) {
        if (now >= v.expiry) responseCache.delete(k)
      }
    }

    return NextResponse.json(data, {
      headers: {
        'X-Stormglass-Cache': 'MISS',
        'X-Stormglass-Daily-Remaining': String(DAILY_LIMIT - dailyRequests),
      },
    })
  } catch (error) {
    console.error('Error proxying Stormglass request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Stormglass data' },
      { status: 500 },
    )
  }
}
