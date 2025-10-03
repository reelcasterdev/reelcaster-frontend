'use client'

import { AlertTriangle, Info } from 'lucide-react'
import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'

interface SeasonalStatusBannerProps {
  forecasts: OpenMeteoDailyForecast[]
  species: string | null
  selectedDay?: number
}

export default function SeasonalStatusBanner({ forecasts, species, selectedDay = 0 }: SeasonalStatusBannerProps) {
  // Only show if species is selected
  if (!species) return null

  const selectedForecast = forecasts[selectedDay]
  if (!selectedForecast || !selectedForecast.minutelyScores.length) return null

  // Check the first score's details to see if we're in season
  const firstScore = selectedForecast.minutelyScores[0]?.scoreDetails
  if (!firstScore) return null

  const isInSeason = firstScore.isInSeason ?? true // Default to true if not set

  // Don't show banner if in season
  if (isInSeason) return null

  // Format species name for display
  const speciesDisplay = species
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <div className="bg-red-900/30 border-2 border-red-500/50 rounded-xl p-4 sm:p-6 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-red-300 font-bold text-lg mb-2">
            Out of Legal Season
          </h3>
          <p className="text-red-200 text-sm sm:text-base mb-3">
            <strong>{speciesDisplay}</strong> fishing is currently outside the legal season or closed.
            Retention is not permitted at this time.
          </p>
          <div className="bg-red-900/50 rounded-lg p-3 border border-red-500/30">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-xs sm:text-sm">
                Scores shown reflect theoretical fishing conditions only. Always check current regulations
                and seasonal closures before planning your trip. Catch and release may still be permitted
                in some areas - verify with local authorities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
