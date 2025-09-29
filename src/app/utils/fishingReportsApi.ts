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

// Removed unused iNaturalist functions since we're not fetching from that API anymore
// These were: observationToReport, getTimeAgo, getLocationBounds

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