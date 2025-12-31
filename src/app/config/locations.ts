/**
 * Fishing location configuration
 */

export interface Coordinates {
  lat: number
  lon: number
}

export interface Hotspot {
  name: string
  coordinates: Coordinates
}

export interface FishingLocation {
  name: string
  hotspots: Hotspot[]
  available: boolean
  /** DFO fishing area numbers for this location */
  dfoAreas: number[]
}

/**
 * All available fishing locations
 */
export const FISHING_LOCATIONS: FishingLocation[] = [
  {
    name: 'Victoria, Sidney',
    available: true,
    dfoAreas: [19],
    hotspots: [
      { name: 'Breakwater', coordinates: { lat: 48.4128, lon: -123.3875 } },
      { name: 'Waterfront', coordinates: { lat: 48.4284, lon: -123.3656 } },
      { name: 'Oak Bay', coordinates: { lat: 48.4264, lon: -123.3017 } },
      { name: 'Waterfront Bay', coordinates: { lat: 48.4200, lon: -123.3500 } },
      { name: 'Constance Bank', coordinates: { lat: 48.3667, lon: -123.3333 } },
      { name: 'Sidney', coordinates: { lat: 48.6500, lon: -123.4000 } },
      { name: 'Trial Island', coordinates: { lat: 48.3936, lon: -123.3056 } },
    ],
  },
  {
    name: 'Sooke, Port Renfrew',
    available: true,
    dfoAreas: [20],
    hotspots: [
      { name: 'Sooke Harbor', coordinates: { lat: 48.3722, lon: -123.7356 } },
      { name: 'Secretary Island', coordinates: { lat: 48.3500, lon: -123.7833 } },
      { name: 'Becher Bay', coordinates: { lat: 48.3333, lon: -123.6333 } },
    ],
  },
  {
    name: 'Newport, Outer Banks',
    available: false,
    dfoAreas: [],
    hotspots: [],
  },
]

/**
 * Get location by name
 */
export function getLocationByName(name: string): FishingLocation | undefined {
  return FISHING_LOCATIONS.find(loc => loc.name === name)
}

/**
 * Get default location
 */
export function getDefaultLocation(): FishingLocation {
  return FISHING_LOCATIONS[0]
}

/**
 * Get DFO areas for a location name
 */
export function getDFOAreasForLocation(locationName: string): number[] {
  const location = getLocationByName(locationName)
  return location?.dfoAreas || [19, 20] // Default to both areas if unknown
}
