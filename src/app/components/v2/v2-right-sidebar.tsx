'use client'

import { OpenMeteoDailyForecast } from '@/app/utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import V2ScoreDisplay from './v2-score-display'
import V2DetailsGrid from './v2-details-grid'
import V2SpeciesPanel from './v2-species-panel'

interface V2RightSidebarProps {
  forecastData: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: CHSWaterData | null
  selectedDay: number
  species: string | null
  selectedLocation: string
  onDetailsClick: () => void
}

export default function V2RightSidebar({
  forecastData,
  openMeteoData,
  tideData,
  selectedDay,
  species,
  selectedLocation,
  onDetailsClick,
}: V2RightSidebarProps) {
  const score = forecastData[selectedDay]?.twoHourForecasts.length > 0
    ? Math.max(...forecastData[selectedDay].twoHourForecasts.map(f => f.score.total))
    : 0

  return (
    <div className="p-4 space-y-4">
      <V2ScoreDisplay score={score} onDetailsClick={onDetailsClick} />
      <V2DetailsGrid
        forecasts={forecastData}
        openMeteoData={openMeteoData}
        tideData={tideData}
        selectedDay={selectedDay}
      />
      <V2SpeciesPanel
        selectedLocation={selectedLocation}
        species={species}
      />
    </div>
  )
}
