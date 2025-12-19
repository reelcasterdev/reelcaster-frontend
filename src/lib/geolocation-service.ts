/**
 * Geolocation Service
 * Handles GPS capture for the Fish On feature
 */

export interface GeoLocationResult {
  latitude: number
  longitude: number
  accuracy: number // meters
  heading: number | null // degrees (0-360), null if not available
  speed: number | null // km/h, null if not available
  timestamp: number
}

export interface GeoLocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED'
  message: string
}

const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000, // 10 seconds
  maximumAge: 0, // Always get fresh position
}

const LOW_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 5000,
  maximumAge: 30000, // Accept positions up to 30 seconds old
}

/**
 * Convert m/s to km/h
 */
function msToKmh(speedMs: number | null): number | null {
  if (speedMs === null || speedMs === undefined) return null
  return speedMs * 3.6
}

/**
 * Get current GPS position with high accuracy
 * Falls back to low accuracy if high accuracy times out
 */
export async function getCurrentPosition(): Promise<GeoLocationResult> {
  if (!navigator.geolocation) {
    throw {
      code: 'NOT_SUPPORTED',
      message: 'Geolocation is not supported by this browser',
    } as GeoLocationError
  }

  try {
    // Try high accuracy first
    const position = await getPositionWithOptions(HIGH_ACCURACY_OPTIONS)
    return formatPosition(position)
  } catch (error) {
    // If high accuracy times out, try low accuracy
    if ((error as GeoLocationError).code === 'TIMEOUT') {
      console.warn('High accuracy GPS timed out, trying low accuracy...')
      const position = await getPositionWithOptions(LOW_ACCURACY_OPTIONS)
      return formatPosition(position)
    }
    throw error
  }
}

/**
 * Get position with specified options
 */
function getPositionWithOptions(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        reject(mapGeolocationError(error))
      },
      options
    )
  })
}

/**
 * Format GeolocationPosition to our GeoLocationResult interface
 */
function formatPosition(position: GeolocationPosition): GeoLocationResult {
  const { coords, timestamp } = position

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    heading: coords.heading, // degrees, null if not moving or not available
    speed: msToKmh(coords.speed), // convert m/s to km/h
    timestamp,
  }
}

/**
 * Map browser geolocation errors to our error format
 */
function mapGeolocationError(error: GeolocationPositionError): GeoLocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: 'PERMISSION_DENIED',
        message: 'Location permission was denied. Please enable location access to log catches.',
      }
    case error.POSITION_UNAVAILABLE:
      return {
        code: 'POSITION_UNAVAILABLE',
        message: 'Location information is unavailable. Please try again.',
      }
    case error.TIMEOUT:
      return {
        code: 'TIMEOUT',
        message: 'Location request timed out. Please try again.',
      }
    default:
      return {
        code: 'POSITION_UNAVAILABLE',
        message: 'An unknown error occurred while getting location.',
      }
  }
}

/**
 * Watch position continuously (for tracking mode)
 * Returns a cleanup function to stop watching
 */
export function watchPosition(
  onUpdate: (position: GeoLocationResult) => void,
  onError: (error: GeoLocationError) => void
): () => void {
  if (!navigator.geolocation) {
    onError({
      code: 'NOT_SUPPORTED',
      message: 'Geolocation is not supported by this browser',
    })
    return () => {}
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate(formatPosition(position))
    },
    (error) => {
      onError(mapGeolocationError(error))
    },
    HIGH_ACCURACY_OPTIONS
  )

  return () => {
    navigator.geolocation.clearWatch(watchId)
  }
}

/**
 * Check if geolocation is available and permission is granted
 */
export async function checkGeolocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!navigator.geolocation) {
    return 'denied'
  }

  // Use Permissions API if available
  if (navigator.permissions) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' })
      return result.state
    } catch {
      // Permissions API not available for geolocation, try direct request
      return 'prompt'
    }
  }

  return 'prompt'
}

/**
 * Request geolocation permission by triggering a position request
 */
export async function requestGeolocationPermission(): Promise<boolean> {
  try {
    await getCurrentPosition()
    return true
  } catch (error) {
    if ((error as GeoLocationError).code === 'PERMISSION_DENIED') {
      return false
    }
    // Other errors (timeout, unavailable) still mean permission was granted
    return true
  }
}

/**
 * Format accuracy for display
 */
export function formatAccuracy(accuracyMeters: number): string {
  if (accuracyMeters < 10) {
    return 'Excellent'
  } else if (accuracyMeters < 30) {
    return 'Good'
  } else if (accuracyMeters < 100) {
    return 'Fair'
  } else {
    return 'Poor'
  }
}

/**
 * Get accuracy color for UI
 */
export function getAccuracyColor(accuracyMeters: number): string {
  if (accuracyMeters < 10) {
    return 'text-green-500'
  } else if (accuracyMeters < 30) {
    return 'text-blue-500'
  } else if (accuracyMeters < 100) {
    return 'text-yellow-500'
  } else {
    return 'text-red-500'
  }
}
