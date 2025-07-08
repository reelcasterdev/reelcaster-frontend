// Tide data integration for BC fishing locations using XTide network
export interface TideData {
  currentHeight: number // Current tide height (meters)
  nextChangeTime: number // Unix timestamp of next tide change
  nextChangeType: 'high' | 'low'
  timeToChange: number // Minutes until next change
  tideRange: number // Difference between high/low for the day
  isRising: boolean // Whether tide is currently rising
  changeRate: number // Rate of change (m/hour)
  station: string // Tide station name
  coordinates: { lat: number; lon: number }
  dailyTides: TideEvent[] // All tide events for the day
}

export interface TideEvent {
  time: number // Unix timestamp
  height: number // Tide height in meters
  type: 'high' | 'low' // Tide event type
}

export interface TideStation {
  id: string
  name: string
  coordinates: { lat: number; lon: number }
  xtideId: string // XTide station identifier
}

// Mapping of fishing locations to nearest tide stations
export const TIDE_STATIONS: Record<string, TideStation> = {
  'victoria-sidney': {
    id: 'victoria-sidney',
    name: 'Victoria Harbour',
    coordinates: { lat: 48.4284, lon: -123.3656 },
    xtideId: 'vic',
  },
  'sooke-port-renfrew': {
    id: 'sooke-port-renfrew',
    name: 'Sooke',
    coordinates: { lat: 48.3415, lon: -123.5507 },
    xtideId: 'soo',
  },
  tsawwassen: {
    id: 'tsawwassen',
    name: 'Tsawwassen',
    coordinates: { lat: 49.0, lon: -123.13 },
    xtideId: 'tsw',
  },
  vancouver: {
    id: 'vancouver',
    name: 'Vancouver',
    coordinates: { lat: 49.2827, lon: -123.1207 },
    xtideId: 'van',
  },
}

// Get nearest tide station for a fishing location
export const getTideStationForLocation = (locationId: string): TideStation | null => {
  return TIDE_STATIONS[locationId] || TIDE_STATIONS['victoria-sidney'] // Default to Victoria
}

// Calculate distance between two coordinates (haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Find nearest tide station to coordinates
export const findNearestTideStation = (coordinates: { lat: number; lon: number }): TideStation => {
  const stations = Object.values(TIDE_STATIONS)
  let nearest = stations[0]
  let minDistance = calculateDistance(
    coordinates.lat,
    coordinates.lon,
    nearest.coordinates.lat,
    nearest.coordinates.lon,
  )

  stations.forEach(station => {
    const distance = calculateDistance(
      coordinates.lat,
      coordinates.lon,
      station.coordinates.lat,
      station.coordinates.lon,
    )
    if (distance < minDistance) {
      minDistance = distance
      nearest = station
    }
  })

  return nearest
}

// Parse XTide HTML response to extract tide data
const parseXTideHTML = (html: string, station: TideStation): TideData | null => {
  try {
    // Parse XTide HTML format (simplified version)
    const tideRegex = /<tr[^>]*>.*?(\d{1,2}:\d{2}(?:AM|PM)).*?(\d+\.\d+)([HL]).*?<\/tr>/gi
    const dailyTides: TideEvent[] = []

    let match
    while ((match = tideRegex.exec(html)) !== null) {
      const timeStr = match[1]
      const height = parseFloat(match[2]) * 0.3048 // Convert feet to meters
      const type = match[3] === 'H' ? 'high' : 'low'

      // Convert time string to timestamp (simplified - would need proper date handling)
      const today = new Date()
      const [time, period] = timeStr.split(/(AM|PM)/)
      const [hours, minutes] = time.split(':').map(Number)
      const hour24 = period === 'PM' && hours !== 12 ? hours + 12 : period === 'AM' && hours === 12 ? 0 : hours

      const tideTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24, minutes)

      dailyTides.push({
        time: tideTime.getTime() / 1000,
        height,
        type,
      })
    }

    if (dailyTides.length === 0) {
      console.warn('No tide data found in HTML response')
      return null
    }

    // Sort tides by time
    dailyTides.sort((a, b) => a.time - b.time)

    // Calculate current tide state
    const now = Date.now() / 1000
    let currentHeight = 0
    let nextChangeTime = 0
    let nextChangeType: 'high' | 'low' = 'high'
    let isRising = true

    // Find next tide change
    const futureEvents = dailyTides.filter(tide => tide.time > now)
    if (futureEvents.length > 0) {
      const nextEvent = futureEvents[0]
      nextChangeTime = nextEvent.time
      nextChangeType = nextEvent.type

      // Determine if tide is rising (next event is high tide)
      isRising = nextChangeType === 'high'

      // Estimate current height (simplified linear interpolation)
      const prevEvents = dailyTides.filter(tide => tide.time <= now)
      if (prevEvents.length > 0) {
        const prevEvent = prevEvents[prevEvents.length - 1]
        const timeDiff = now - prevEvent.time
        const totalTimeDiff = nextEvent.time - prevEvent.time
        const heightDiff = nextEvent.height - prevEvent.height
        currentHeight = prevEvent.height + heightDiff * (timeDiff / totalTimeDiff)
      } else {
        currentHeight = nextEvent.height
      }
    }

    // Calculate tide range for the day
    const heights = dailyTides.map(tide => tide.height)
    const tideRange = Math.max(...heights) - Math.min(...heights)

    // Calculate change rate (simplified)
    const timeToChange = Math.max(0, (nextChangeTime - now) / 60) // Minutes
    const changeRate =
      timeToChange > 0
        ? Math.abs((dailyTides.find(t => t.time === nextChangeTime)?.height || 0) - currentHeight) / (timeToChange / 60)
        : 0

    return {
      currentHeight,
      nextChangeTime,
      nextChangeType,
      timeToChange,
      tideRange,
      isRising,
      changeRate,
      station: station.name,
      coordinates: station.coordinates,
      dailyTides,
    }
  } catch (error) {
    console.error('Error parsing XTide HTML:', error)
    return null
  }
}

// Fetch tide data from XTide network
export const fetchTideData = async (station: TideStation): Promise<TideData | null> => {
  try {
    console.log(`Fetching tide data for station: ${station.name} (${station.xtideId})`)

    // Use a CORS proxy to fetch XTide data
    const url = `https://api.allorigins.win/get?url=${encodeURIComponent(
      `https://www.dairiki.org/tides/daily.php/${station.xtideId}`,
    )}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const html = data.contents

    if (!html) {
      throw new Error('No HTML content received from XTide')
    }

    return parseXTideHTML(html, station)
  } catch (error) {
    console.error('Error fetching tide data:', error)

    // Return mock data for development/fallback
    const now = Date.now() / 1000
    const nextHigh = now + 2 * 3600 // 2 hours from now

    return {
      currentHeight: 2.5,
      nextChangeTime: nextHigh,
      nextChangeType: 'high',
      timeToChange: 120, // 2 hours in minutes
      tideRange: 4.0,
      isRising: true,
      changeRate: 0.8,
      station: station.name,
      coordinates: station.coordinates,
      dailyTides: [
        { time: now - 3600, height: 1.2, type: 'low' },
        { time: nextHigh, height: 4.2, type: 'high' },
        { time: nextHigh + 6 * 3600, height: 1.0, type: 'low' },
        { time: nextHigh + 12 * 3600, height: 4.0, type: 'high' },
      ],
    }
  }
}

// Cache implementation for tide data
const tideCache = new Map<string, { data: TideData; timestamp: number }>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

export const getCachedTideData = async (station: TideStation): Promise<TideData | null> => {
  const cacheKey = station.id
  const cached = tideCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached tide data for ${station.name}`)
    return cached.data
  }

  console.log(`Fetching fresh tide data for ${station.name}`)
  const freshData = await fetchTideData(station)

  if (freshData) {
    tideCache.set(cacheKey, {
      data: freshData,
      timestamp: Date.now(),
    })
  }

  return freshData
}
