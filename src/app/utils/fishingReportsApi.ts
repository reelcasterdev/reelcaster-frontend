import { fishingLocations } from '../data/locations'

interface iNaturalistObservation {
  id: number
  species_guess: string
  observed_on_string: string
  place_guess: string
  description: string
  user: {
    login: string
    name: string
  }
  photos: Array<{
    url: string
  }>
  location: string
  created_at: string
  taxon?: {
    preferred_common_name: string
    name: string
  }
}

interface FishingReport {
  id: string | number
  title: string
  source: string
  time: string
  location?: string
  species?: string
  description?: string
  imageUrl?: string
}

// Convert iNaturalist observation to fishing report format
function observationToReport(obs: iNaturalistObservation): FishingReport {
  const speciesName = obs.taxon?.preferred_common_name || obs.species_guess || 'Unknown species'
  const location = obs.place_guess || 'Unknown location'
  const userName = obs.user.name || obs.user.login
  
  // Calculate time ago
  const timeAgo = getTimeAgo(new Date(obs.created_at))
  
  return {
    id: obs.id,
    title: `${speciesName} observed in ${location}`,
    source: `iNaturalist - ${userName}`,
    time: timeAgo,
    location: location,
    species: speciesName,
    description: obs.description || '',
    imageUrl: obs.photos?.[0]?.url.replace('square', 'medium')
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Get bounding box for a location
function getLocationBounds(locationName: string) {
  // Find location in our data
  const location = fishingLocations.find(loc => loc.name === locationName)
  
  if (!location) {
    // Default to Victoria area
    return {
      nelat: 48.6,
      nelng: -123.2,
      swlat: 48.3,
      swlng: -123.6
    }
  }
  
  // Create a bounding box around the location (approximately 20km radius)
  const latOffset = 0.18 // ~20km
  const lngOffset = 0.25 // ~20km at this latitude
  
  return {
    nelat: location.coordinates.lat + latOffset,
    nelng: location.coordinates.lon + lngOffset,
    swlat: location.coordinates.lat - latOffset,
    swlng: location.coordinates.lon - lngOffset
  }
}

export async function fetchFishingReports(
  locationName: string,
  limit: number = 10
): Promise<FishingReport[]> {
  try {
    const bounds = getLocationBounds(locationName)
    
    // Fish-related taxon IDs in iNaturalist
    // 47178 = Actinopterygii (ray-finned fishes)
    // 47273 = Chondrichthyes (cartilaginous fishes)
    const fishTaxonIds = '47178,47273'
    
    const params = new URLSearchParams({
      nelat: bounds.nelat.toString(),
      nelng: bounds.nelng.toString(),
      swlat: bounds.swlat.toString(),
      swlng: bounds.swlng.toString(),
      taxon_id: fishTaxonIds,
      order: 'desc',
      order_by: 'created_at',
      per_page: limit.toString(),
      has: 'photos',
      quality_grade: 'research,needs_id'
    })
    
    const response = await fetch(
      `https://api.inaturalist.org/v1/observations?${params.toString()}`
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch observations')
    }
    
    const data = await response.json()
    const observations = data.results || []
    
    // Convert observations to reports
    const reports = observations.map(observationToReport)
    
    // If we don't have enough reports, add some helpful static reports
    if (reports.length < 3) {
      reports.push(...getDefaultReports(locationName))
    }
    
    return reports.slice(0, limit)
  } catch (error) {
    console.error('Error fetching fishing reports:', error)
    // Return default reports on error
    return getDefaultReports(locationName)
  }
}

function getDefaultReports(locationName: string): FishingReport[] {
  const isSooke = locationName.includes('Sooke')
  
  const defaultReports = [
    {
      id: 'default-1',
      title: `Check current ${locationName} fishing regulations`,
      source: 'DFO Advisory',
      time: 'Pinned',
      location: locationName,
      description: 'Always check current regulations before fishing'
    },
    {
      id: 'default-2',
      title: isSooke 
        ? 'Sooke area known for excellent salmon fishing' 
        : 'Victoria waterfront producing good results for salmon',
      source: 'Local Knowledge',
      time: 'Recent',
      location: locationName
    },
    {
      id: 'default-3',
      title: 'Best fishing during tide changes',
      source: 'Fishing Tip',
      time: 'Always',
      description: 'Fish are most active during incoming and outgoing tides'
    }
  ]
  
  return defaultReports
}

// Export a function to check if iNaturalist is available
export async function checkiNaturalistAvailability(): Promise<boolean> {
  try {
    const response = await fetch('https://api.inaturalist.org/v1/observations?per_page=1')
    return response.ok
  } catch {
    return false
  }
}