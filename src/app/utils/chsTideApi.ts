// Canadian Hydrographic Service (CHS) IWLS API Integration
// Documentation: https://api.iwls-sine.azure.cloud-nuage.dfo-mpo.gc.ca/swagger-ui/index.html

export interface CHSStation {
  id: string
  code: string
  name: string
  latitude: number
  longitude: number
  type: string
  timezone: string
  datum?: string
}

export interface CHSWaterLevel {
  timestamp: number
  height: number // meters relative to chart datum
  type: 'observed' | 'predicted' | 'forecast'
  quality?: 'good' | 'fair' | 'poor'
}

export interface CHSTideEvent {
  timestamp: number
  height: number
  type: 'high' | 'low'
  level?: 'higher_high' | 'lower_high' | 'higher_low' | 'lower_low'
}

export interface CHSCurrent {
  timestamp: number
  speed: number // knots
  direction: number // degrees true
  type: 'flood' | 'ebb' | 'slack'
}

export interface CHSWaterData {
  station: CHSStation
  waterLevels: CHSWaterLevel[]
  tideEvents: CHSTideEvent[]
  currents?: CHSCurrent[]
  waterTemperature?: number // celsius
  currentHeight: number
  nextTide: CHSTideEvent
  previousTide: CHSTideEvent
  tidalRange: number
  isRising: boolean
  changeRate: number // meters per hour
  timeToNextTide: number // minutes
  currentSpeed?: number
  currentDirection?: number
}

// BC Fishing locations mapped to CHS station IDs
// Note: These are the actual MongoDB ObjectIDs from the CHS API, not the station codes
// Updated December 9, 2025 - All stations verified against CHS IWLS API
export const CHS_STATIONS: Record<string, { id: string; code: string; name: string }> = {
  'victoria-sidney': {
    id: '5cebf1df3d0f4a073c4bbd1e', // Victoria Harbour
    code: '07120',
    name: 'Victoria Harbour',
  },
  'sooke-port-renfrew': {
    id: '5cebf1df3d0f4a073c4bbd11', // Sooke Basin (VERIFIED)
    code: '07024',
    name: 'Sooke Basin',
  },
  tsawwassen: {
    id: '5cebf1e13d0f4a073c4bbf85', // Roberts Bank (nearest station)
    code: '07592',
    name: 'Roberts Bank',
  },
  vancouver: {
    id: '5cebf1e43d0f4a073c4bc404', // Kitsilano station
    code: '07707',
    name: 'Kitsilano',
  },
  'barkley-sound': {
    id: '5cebf1e23d0f4a073c4bc062', // Bamfield (VERIFIED)
    code: '08545',
    name: 'Bamfield',
  },
  'port-hardy': {
    id: '5cebf1de3d0f4a073c4bb9c7', // Port Hardy (VERIFIED)
    code: '08408',
    name: 'Port Hardy',
  },
  'campbell-river': {
    id: '5cebf1de3d0f4a073c4bb996', // Campbell River (VERIFIED - PERMANENT)
    code: '08074',
    name: 'Campbell River',
  },
  nanaimo: {
    id: '5cebf1de3d0f4a073c4bb96d', // Nanaimo Harbour (VERIFIED - PERMANENT)
    code: '07917',
    name: 'Nanaimo Harbour',
  },
  tofino: {
    id: '5cebf1e23d0f4a073c4bc07c', // Tofino (VERIFIED - PERMANENT)
    code: '08615',
    name: 'Tofino',
  },
  'prince-rupert': {
    id: '5cebf1e43d0f4a073c4bc469', // Prince Rupert RoRo
    code: '09346',
    name: 'Prince Rupert RoRo',
  },
  'haida-gwaii': {
    id: '5cebf1de3d0f4a073c4bba2d', // Rose Harbour
    code: '09713',
    name: 'Rose Harbour',
  },
  squamish: {
    id: '5cebf1e43d0f4a073c4bc404', // Kitsilano Vancouver (nearest)
    code: '07707',
    name: 'Kitsilano',
  },
  sechelt: {
    id: '5dd3064ee0fdc4b9b4be670a', // Roberts Creek (nearest to Sechelt)
    code: '07824',
    name: 'Roberts Creek',
  },
  'bella-bella': {
    id: '5cebf1e23d0f4a073c4bc0b7', // Bella Coola (nearest major station)
    code: '08937',
    name: 'Bella Coola',
  },
}

// CHS API configuration
const CHS_API_BASE = typeof window !== 'undefined' 
  ? '/api/chs-tide' // Use proxy in browser
  : 'https://api.iwls-sine.azure.cloud-nuage.dfo-mpo.gc.ca/api/v1' // Direct in SSR
const RATE_LIMIT_DELAY = 350 // ms between requests (respecting 3 req/sec limit)

// Cache for API responses
const responseCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Rate limiting queue
let lastRequestTime = 0

const rateLimitedFetch = async (url: string): Promise<Response> => {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest))
  }
  
  lastRequestTime = Date.now()
  
  // If using proxy, encode the endpoint path
  if (typeof window !== 'undefined' && url.includes('/api/chs-tide')) {
    return fetch(url)
  }
  
  return fetch(url)
}

// Fetch station metadata
export const fetchStationMetadata = async (stationId: string): Promise<CHSStation | null> => {
  const cacheKey = `station-${stationId}`
  const cached = responseCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    const endpoint = typeof window !== 'undefined' 
      ? `/api/chs-tide/stations/${stationId}`
      : `${CHS_API_BASE}/stations/${stationId}`
    const response = await rateLimitedFetch(endpoint)
    if (!response.ok) throw new Error(`Failed to fetch station: ${response.status}`)
    
    const data = await response.json()
    const station: CHSStation = {
      id: data.id,
      code: data.code,
      name: data.officialName || data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      type: data.type,
      timezone: data.timeZone,
      datum: data.verticalDatum,
    }
    
    responseCache.set(cacheKey, { data: station, timestamp: Date.now() })
    return station
  } catch (error) {
    console.error('Error fetching CHS station metadata:', error)
    return null
  }
}

// Fetch water level predictions
export const fetchWaterLevels = async (
  stationId: string,
  startTime: Date,
  endTime: Date
): Promise<CHSWaterLevel[]> => {
  const cacheKey = `levels-${stationId}-${startTime.toISOString()}-${endTime.toISOString()}`
  const cached = responseCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // Use the data endpoint with wlp time series for water level predictions
    const params = new URLSearchParams({
      'time-series-code': 'wlp',
      from: startTime.toISOString(),
      to: endTime.toISOString(),
    })
    
    const endpoint = typeof window !== 'undefined'
      ? `${CHS_API_BASE}/stations/${stationId}/data?${params}`
      : `${CHS_API_BASE}/stations/${stationId}/data?${params}`
    
    const response = await rateLimitedFetch(endpoint)
    
    if (!response.ok) throw new Error(`Failed to fetch water levels: ${response.status}`)
    
    const data = await response.json()
    const waterLevels: CHSWaterLevel[] = data.map((item: any) => ({
      timestamp: new Date(item.eventDate).getTime() / 1000,
      height: item.value,
      type: 'predicted',
      quality: item.qcFlagCode === '2' ? 'good' : 'fair',
    }))
    
    responseCache.set(cacheKey, { data: waterLevels, timestamp: Date.now() })
    return waterLevels
  } catch (error) {
    console.error('Error fetching CHS water levels:', error)
    return []
  }
}

// Fetch tide events (high/low tides)
export const fetchTideEvents = async (
  stationId: string,
  date: Date
): Promise<CHSTideEvent[]> => {
  const cacheKey = `tides-${stationId}-${date.toDateString()}`
  const cached = responseCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // Use the data endpoint with wlp-hilo time series for high/low tide predictions
    const startTime = new Date(date)
    startTime.setHours(0, 0, 0, 0)
    const endTime = new Date(date)
    endTime.setHours(23, 59, 59, 999)
    
    const params = new URLSearchParams({
      'time-series-code': 'wlp-hilo',
      from: startTime.toISOString(),
      to: endTime.toISOString(),
    })
    
    const endpoint = typeof window !== 'undefined'
      ? `${CHS_API_BASE}/stations/${stationId}/data?${params}`
      : `${CHS_API_BASE}/stations/${stationId}/data?${params}`
    
    const response = await rateLimitedFetch(endpoint)
    
    if (!response.ok) throw new Error(`Failed to fetch tide events: ${response.status}`)
    
    const data = await response.json()
    const tideEvents: CHSTideEvent[] = []
    
    // Process the tide data - wlp-hilo returns high and low tides
    // The API returns multiple values, we need to determine which are highs and lows
    // based on the pattern of values
    
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      const currentValue = item.value
      const currentTime = new Date(item.eventDate)
      
      if (i > 0 && i < data.length - 1) {
        const nextValue = data[i + 1].value
        const prevValue = data[i - 1].value
        
        // Determine if this is a high or low tide based on neighboring values
        const isHigh = currentValue > prevValue && currentValue > nextValue
        const isLow = currentValue < prevValue && currentValue < nextValue
        
        if (isHigh || isLow) {
          tideEvents.push({
            timestamp: currentTime.getTime() / 1000,
            height: currentValue,
            type: isHigh ? 'high' : 'low',
          })
        }
      } else if (i === 0 || i === data.length - 1) {
        // For first and last points, determine based on adjacent value
        const adjacentValue = i === 0 ? data[1].value : data[data.length - 2].value
        const isHigh = currentValue > adjacentValue
        
        tideEvents.push({
          timestamp: currentTime.getTime() / 1000,
          height: currentValue,
          type: isHigh ? 'high' : 'low',
        })
      }
    }
    
    responseCache.set(cacheKey, { data: tideEvents, timestamp: Date.now() })
    return tideEvents.sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching CHS tide events:', error)
    return []
  }
}

// Calculate current speeds from water level changes
const calculateCurrentFromWaterLevels = (
  waterLevels: CHSWaterLevel[],
  currentTime: number
): { speed: number; direction: number; type: 'flood' | 'ebb' | 'slack' } => {
  // Find water levels around current time
  const currentIndex = waterLevels.findIndex(wl => wl.timestamp >= currentTime)
  if (currentIndex <= 0 || currentIndex >= waterLevels.length - 1) {
    return { speed: 0, direction: 0, type: 'slack' }
  }

  const prev = waterLevels[currentIndex - 1]
  const next = waterLevels[currentIndex]
  const rate = (next.height - prev.height) / ((next.timestamp - prev.timestamp) / 3600) // m/hr

  // Convert to approximate current speed (rough estimation)
  // This is simplified - actual current depends on local bathymetry
  const speed = Math.abs(rate) * 2.5 // Convert to knots (approximate)
  const direction = rate > 0 ? 45 : 225 // Flood = NE, Ebb = SW (simplified)
  const type = Math.abs(rate) < 0.05 ? 'slack' : rate > 0 ? 'flood' : 'ebb'

  return { speed, direction, type }
}

// Main function to fetch comprehensive tide data
export const fetchCHSTideData = async (
  locationId: string,
  targetTime?: Date
): Promise<CHSWaterData | null> => {
  const stationInfo = CHS_STATIONS[locationId]
  if (!stationInfo) {
    console.warn(`No CHS station mapping for location: ${locationId}`)
    return null
  }

  try {
    const now = targetTime || new Date()
    const startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000) // 6 hours ago
    const endTime = new Date(now.getTime() + 18 * 60 * 60 * 1000) // 18 hours ahead

    // Fetch all data in parallel
    const [station, waterLevels, todayTides, tomorrowTides] = await Promise.all([
      fetchStationMetadata(stationInfo.id),
      fetchWaterLevels(stationInfo.id, startTime, endTime),
      fetchTideEvents(stationInfo.id, now),
      fetchTideEvents(stationInfo.id, new Date(now.getTime() + 24 * 60 * 60 * 1000)),
    ])

    if (!station || waterLevels.length === 0) {
      return null
    }

    // Combine tide events
    const allTides = [...todayTides, ...tomorrowTides].sort((a, b) => a.timestamp - b.timestamp)
    const nowTimestamp = now.getTime() / 1000

    // Find current water level
    const currentWaterLevel = waterLevels.find(wl => wl.timestamp >= nowTimestamp) || waterLevels[waterLevels.length - 1]
    const currentHeight = currentWaterLevel.height

    // Find next and previous tides
    const nextTideIndex = allTides.findIndex(tide => tide.timestamp > nowTimestamp)
    const nextTide = allTides[nextTideIndex] || allTides[0]
    const previousTide = nextTideIndex > 0 ? allTides[nextTideIndex - 1] : allTides[allTides.length - 1]

    // Calculate tidal range
    const dayHighs = todayTides.filter(t => t.type === 'high').map(t => t.height)
    const dayLows = todayTides.filter(t => t.type === 'low').map(t => t.height)
    const tidalRange = dayHighs.length && dayLows.length 
      ? Math.max(...dayHighs) - Math.min(...dayLows)
      : nextTide.height - previousTide.height

    // Determine if rising or falling
    const isRising = nextTide.type === 'high'

    // Calculate rate of change
    const timeDiff = (nextTide.timestamp - previousTide.timestamp) / 3600 // hours
    const heightDiff = Math.abs(nextTide.height - previousTide.height)
    const changeRate = heightDiff / timeDiff

    // Time to next tide
    const timeToNextTide = (nextTide.timestamp - nowTimestamp) / 60 // minutes

    // Calculate current speed and direction
    const current = calculateCurrentFromWaterLevels(waterLevels, nowTimestamp)

    return {
      station,
      waterLevels,
      tideEvents: allTides,
      currentHeight,
      nextTide,
      previousTide,
      tidalRange,
      isRising,
      changeRate,
      timeToNextTide,
      currentSpeed: current.speed,
      currentDirection: current.direction,
      // Note: Water temperature would need to come from a different endpoint
      // or sensor data - not typically available from tide stations
    }
  } catch (error) {
    console.error('Error fetching CHS tide data:', error)
    return null
  }
}

// Fallback to old tide API if CHS fails
export const fetchTideDataWithFallback = async (
  locationId: string,
  targetTime?: Date
): Promise<CHSWaterData | null> => {
  // Try CHS first
  const chsData = await fetchCHSTideData(locationId, targetTime)
  if (chsData) return chsData

  // If CHS fails, we could fall back to the old XTide API
  // For now, return null - the old API can be used as backup
  console.warn('CHS API failed, consider falling back to XTide')
  return null
}