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
  // Return only local/default reports without iNaturalist data
  return getDefaultReports(locationName).slice(0, limit)
}

function getDefaultReports(locationName: string): FishingReport[] {
  const isSooke = locationName.includes('Sooke')
  const isVictoria = locationName.includes('Victoria')

  const defaultReports = [
    {
      id: 'default-1',
      title: `Check current ${locationName} fishing regulations`,
      source: 'DFO Advisory',
      time: 'Important',
      location: locationName,
      description: 'Always verify size limits, bag limits, and seasonal closures'
    },
    {
      id: 'default-2',
      title: isSooke
        ? 'Sooke area: Excellent for Chinook and Coho salmon'
        : 'Victoria waterfront: Good for salmon and rockfish',
      source: 'Local Reports',
      time: 'This week',
      location: locationName,
      description: isSooke
        ? 'Best spots: Becher Bay, Pedder Bay, Church Rock'
        : 'Best spots: Breakwater, Oak Bay, Constance Bank'
    },
    {
      id: 'default-3',
      title: 'Peak fishing 2 hours before and after tide changes',
      source: 'Fishing Tips',
      time: 'Tip',
      description: 'Fish are most active during moving water. Check tide charts for optimal times.'
    },
    {
      id: 'default-4',
      title: isVictoria
        ? 'Herring spawn attracting salmon in area'
        : 'Bait fish schools spotted near shoreline',
      source: 'Recent Activity',
      time: '2 days ago',
      location: locationName,
      description: 'Good signs for predator fish activity'
    },
    {
      id: 'default-5',
      title: 'Dawn and dusk producing best results',
      source: 'Local Anglers',
      time: 'This week',
      description: 'Early morning and evening bite has been consistent'
    },
    {
      id: 'default-6',
      title: 'Calm conditions forecasted for weekend',
      source: 'Weather Report',
      time: 'Upcoming',
      description: 'Light winds expected, good for small boat fishing'
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