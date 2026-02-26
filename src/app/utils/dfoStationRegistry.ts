/**
 * DFO Station Registry with GPS-Based Lookup
 *
 * Fetches all Pacific region stations from the CHS IWLS API and provides
 * GPS-based nearest-station lookup using Haversine distance.
 * Falls back to a hardcoded seed list if the API is unavailable.
 */

export interface DFOStation {
  id: string       // MongoDB ObjectID from IWLS API
  code: string     // Station code (e.g. '07080')
  name: string     // Official name
  latitude: number
  longitude: number
  type?: string
  timezone?: string
}

// ─── Seed stations (fallback when API is unreachable) ───────────────────────
// These are key BC fishing-area stations verified against the CHS IWLS API.
const SEED_STATIONS: DFOStation[] = [
  { id: '5cebf1df3d0f4a073c4bbd15', code: '07080', name: 'Pedder Bay', latitude: 48.3333, longitude: -123.5500 },
  { id: '5cebf1df3d0f4a073c4bbd11', code: '07024', name: 'Sooke Basin', latitude: 48.3711, longitude: -123.7256 },
  { id: '5cebf1df3d0f4a073c4bbd1e', code: '07120', name: 'Victoria Harbour', latitude: 48.4236, longitude: -123.3711 },
  { id: '5cebf1e13d0f4a073c4bbf85', code: '07592', name: 'Roberts Bank', latitude: 49.0167, longitude: -123.2333 },
  { id: '5cebf1e43d0f4a073c4bc404', code: '07707', name: 'Kitsilano', latitude: 49.2750, longitude: -123.1550 },
  { id: '5cebf1e23d0f4a073c4bc062', code: '08545', name: 'Bamfield', latitude: 48.8333, longitude: -125.1333 },
  { id: '5cebf1de3d0f4a073c4bb9c7', code: '08408', name: 'Port Hardy', latitude: 50.7217, longitude: -127.4883 },
  { id: '5cebf1de3d0f4a073c4bb996', code: '08074', name: 'Campbell River', latitude: 50.0422, longitude: -125.2472 },
  { id: '5cebf1de3d0f4a073c4bb96d', code: '07917', name: 'Nanaimo Harbour', latitude: 49.1667, longitude: -123.9333 },
  { id: '5cebf1e23d0f4a073c4bc07c', code: '08615', name: 'Tofino', latitude: 49.1542, longitude: -125.9111 },
  { id: '5cebf1e43d0f4a073c4bc469', code: '09346', name: 'Prince Rupert RoRo', latitude: 54.3167, longitude: -130.3333 },
  { id: '5cebf1de3d0f4a073c4bba2d', code: '09713', name: 'Rose Harbour', latitude: 52.0889, longitude: -131.0667 },
  { id: '5dd3064ee0fdc4b9b4be670a', code: '07824', name: 'Roberts Creek', latitude: 49.4167, longitude: -123.6333 },
  { id: '5cebf1e23d0f4a073c4bc0b7', code: '08937', name: 'Bella Coola', latitude: 52.3833, longitude: -126.7500 },
  { id: '5cebf1df3d0f4a073c4bbd08', code: '07010', name: 'Sooke', latitude: 48.3703, longitude: -123.7264 },
  { id: '5cebf1df3d0f4a073c4bbd0f', code: '07020', name: 'Otter Point', latitude: 48.3581, longitude: -123.8094 },
  { id: '5cebf1df3d0f4a073c4bbd12', code: '07030', name: 'Becher Bay', latitude: 48.3200, longitude: -123.6283 },
  { id: '5cebf1df3d0f4a073c4bbd17', code: '07090', name: 'Esquimalt', latitude: 48.4322, longitude: -123.4389 },
  { id: '5cebf1df3d0f4a073c4bbd1a', code: '07108', name: 'Patricia Bay', latitude: 48.6539, longitude: -123.4517 },
  { id: '5cebf1df3d0f4a073c4bbd1c', code: '07110', name: 'Fulford Harbour', latitude: 48.7728, longitude: -123.4494 },
  { id: '5cebf1df3d0f4a073c4bbd21', code: '07160', name: 'Cowichan Bay', latitude: 48.7361, longitude: -123.6250 },
  { id: '5cebf1e03d0f4a073c4bbe37', code: '07277', name: 'Point Atkinson', latitude: 49.3306, longitude: -123.2631 },
  { id: '5cebf1de3d0f4a073c4bb995', code: '08070', name: 'Comox', latitude: 49.6742, longitude: -124.9231 },
  { id: '5cebf1de3d0f4a073c4bb990', code: '08050', name: 'Nanoose Bay', latitude: 49.2667, longitude: -124.1667 },
  { id: '5cebf1de3d0f4a073c4bb9a7', code: '08300', name: 'Alert Bay', latitude: 50.5900, longitude: -126.9300 },
  { id: '5cebf1e23d0f4a073c4bc08a', code: '08640', name: 'Ucluelet', latitude: 48.9422, longitude: -125.5464 },
  { id: '5cebf1e33d0f4a073c4bc10a', code: '09020', name: 'Queen Charlotte City', latitude: 53.2500, longitude: -132.0700 },
]

// ─── Haversine distance (km) ────────────────────────────────────────────────
const EARTH_RADIUS_KM = 6371

export function haversineDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── In-memory station cache ────────────────────────────────────────────────
let cachedStations: DFOStation[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const CHS_API_BASE = typeof window !== 'undefined'
  ? '/api/chs-tide'
  : 'https://api.iwls-sine.azure.cloud-nuage.dfo-mpo.gc.ca/api/v1'

/**
 * Fetch all Pacific stations from IWLS API and merge with seed list.
 * Result is cached in memory for 24 hours.
 */
export async function loadStationRegistry(): Promise<DFOStation[]> {
  // Return cache if fresh
  if (cachedStations && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedStations
  }

  try {
    const url = `${CHS_API_BASE}/stations?chs-region-code=PAC`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`IWLS station list returned ${response.status}`)
    }

    const rawStations: any[] = await response.json()

    const apiStations: DFOStation[] = rawStations.map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.officialName || s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      type: s.type,
      timezone: s.timeZone,
    }))

    // Merge seed stations that might not appear in the PAC region filter
    const apiIds = new Set(apiStations.map(s => s.id))
    for (const seed of SEED_STATIONS) {
      if (!apiIds.has(seed.id)) {
        apiStations.push(seed)
      }
    }

    cachedStations = apiStations
    cacheTimestamp = Date.now()
    console.log(`DFO Station Registry loaded: ${cachedStations.length} stations`)
    return cachedStations
  } catch (error) {
    console.warn('Failed to fetch IWLS station list, using seed stations:', error)
    cachedStations = [...SEED_STATIONS]
    cacheTimestamp = Date.now()
    return cachedStations
  }
}

/**
 * Find the nearest DFO station to the given coordinates.
 * Returns the station and distance, or null if no station is within maxRadiusKm.
 */
export async function findNearestStation(
  lat: number,
  lon: number,
  maxRadiusKm = 20,
): Promise<{ station: DFOStation; distanceKm: number } | null> {
  const stations = await loadStationRegistry()

  let bestStation: DFOStation | null = null
  let bestDistance = Infinity

  for (const station of stations) {
    const d = haversineDistanceKm(lat, lon, station.latitude, station.longitude)
    if (d < bestDistance) {
      bestDistance = d
      bestStation = station
    }
  }

  if (!bestStation || bestDistance > maxRadiusKm) {
    return null
  }

  return {
    station: bestStation,
    distanceKm: Math.round(bestDistance * 100) / 100,
  }
}

/**
 * Resolve the best station for a location.
 * If a station code override is provided, look up that specific station first.
 * Otherwise fall back to GPS nearest-station lookup.
 */
export async function resolveStationForLocation(
  lat: number,
  lon: number,
  stationCodeOverride?: string,
  maxRadiusKm = 20,
): Promise<{ station: DFOStation; distanceKm: number } | null> {
  // If an explicit station code override is given, use it
  if (stationCodeOverride) {
    const stations = await loadStationRegistry()
    const match = stations.find(s => s.code === stationCodeOverride)

    if (match) {
      const d = haversineDistanceKm(lat, lon, match.latitude, match.longitude)
      return { station: match, distanceKm: Math.round(d * 100) / 100 }
    }

    // If not found in registry, try fetching by code from API
    try {
      const url = `${CHS_API_BASE}/stations?code=${stationCodeOverride}`
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        // The API returns an array when searching by code
        const raw = Array.isArray(data) ? data[0] : data
        if (raw && raw.id) {
          const station: DFOStation = {
            id: raw.id,
            code: raw.code,
            name: raw.officialName || raw.name,
            latitude: raw.latitude,
            longitude: raw.longitude,
            type: raw.type,
            timezone: raw.timeZone,
          }
          const d = haversineDistanceKm(lat, lon, station.latitude, station.longitude)
          return { station, distanceKm: Math.round(d * 100) / 100 }
        }
      }
    } catch (error) {
      console.warn(`Failed to resolve station code ${stationCodeOverride}:`, error)
    }
  }

  // Fall back to GPS-based lookup
  return findNearestStation(lat, lon, maxRadiusKm)
}
