export interface LoadingStep {
  id: string
  title: string
  description: string
  status: 'waiting' | 'loading' | 'completed' | 'error'
  duration?: number
}

export const createLoadingSteps = (hotspot: string, location: string): LoadingStep[] => [
  {
    id: 'location',
    title: 'Analyzing Location',
    description: `Getting coordinates for ${hotspot}, ${location}`,
    status: 'waiting',
    duration: 800,
  },
  {
    id: 'weather',
    title: 'Fetching Weather Data',
    description: 'Connecting to OpenWeatherMap API...',
    status: 'waiting',
    duration: 1500,
  },
  {
    id: 'marine',
    title: 'Processing Marine Conditions',
    description: 'Analyzing wind, pressure, and tide data',
    status: 'waiting',
    duration: 1200,
  },
  {
    id: 'algorithm',
    title: 'Running Fishing Algorithm',
    description: 'Calculating optimal fishing conditions',
    status: 'waiting',
    duration: 1000,
  },
  {
    id: 'score',
    title: 'Generating Score',
    description: 'Finalizing your fishing forecast',
    status: 'waiting',
    duration: 800,
  },
]
