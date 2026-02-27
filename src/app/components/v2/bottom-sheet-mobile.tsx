'use client'

import { useState, useRef, useCallback } from 'react'
import { BarChart3, TableProperties } from 'lucide-react'
import { OpenMeteoDailyForecast } from '@/app/utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { DataSourceMetadata } from '@/app/utils/forecastDataProvider'
import HourlyChartNew from '../forecast/hourly-chart-new'
import HourlyTableNew from '../forecast/hourly-table-new'
import V2ScoreDisplay from './v2-score-display'
import V2DetailsGrid from './v2-details-grid'
import V2SpeciesPanel from './v2-species-panel'

interface BottomSheetMobileProps {
  forecastData: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: CHSWaterData | null
  dataMetadata?: DataSourceMetadata | null
  selectedDay: number
  species: string | null
  selectedLocation: string
  hoveredHourIndex: number | null
  onHoverChange: (index: number | null) => void
  mobilePeriod: 'am' | 'pm'
  onPeriodChange: (period: 'am' | 'pm') => void
  onDetailsClick: () => void
}

type SnapPoint = 'collapsed' | 'half' | 'full'
type ViewMode = 'chart' | 'table'

const SNAP_HEIGHTS = {
  collapsed: 60,
  half: 40, // vh
  full: 85, // vh
}

export default function BottomSheetMobile({
  forecastData,
  openMeteoData,
  tideData,
  dataMetadata,
  selectedDay,
  species,
  selectedLocation,
  hoveredHourIndex,
  onHoverChange,
  mobilePeriod,
  onPeriodChange,
  onDetailsClick,
}: BottomSheetMobileProps) {
  const [snapPoint, setSnapPoint] = useState<SnapPoint>('collapsed')
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const touchStartY = useRef(0)
  const touchStartSnap = useRef<SnapPoint>('collapsed')

  const score = forecastData[selectedDay]?.twoHourForecasts.length > 0
    ? Math.max(...forecastData[selectedDay].twoHourForecasts.map(f => f.score.total))
    : 0

  const getHeight = () => {
    switch (snapPoint) {
      case 'collapsed': return `${SNAP_HEIGHTS.collapsed}px`
      case 'half': return `${SNAP_HEIGHTS.half}vh`
      case 'full': return `${SNAP_HEIGHTS.full}vh`
    }
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartSnap.current = snapPoint
  }, [snapPoint])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY
    const velocity = Math.abs(deltaY)

    // Flick detection
    if (velocity > 50) {
      if (deltaY > 0) {
        // Swiped up
        if (touchStartSnap.current === 'collapsed') setSnapPoint('half')
        else if (touchStartSnap.current === 'half') setSnapPoint('full')
      } else {
        // Swiped down
        if (touchStartSnap.current === 'full') setSnapPoint('half')
        else if (touchStartSnap.current === 'half') setSnapPoint('collapsed')
      }
    }
  }, [])

  const handleDragHandleClick = () => {
    if (snapPoint === 'collapsed') setSnapPoint('half')
    else if (snapPoint === 'half') setSnapPoint('full')
    else setSnapPoint('collapsed')
  }

  return (
    <>
      {/* Backdrop */}
      {snapPoint === 'full' && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setSnapPoint('half')}
        />
      )}

      {/* Sheet */}
      <div
        className="fixed bottom-16 left-0 right-0 z-40 bg-rc-bg-dark/95 backdrop-blur-md border-t border-rc-bg-light/30 rounded-t-2xl transition-all duration-300 ease-out"
        style={{ height: getHeight() }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle + header */}
        <div
          className="flex items-center justify-between px-4 h-[60px] cursor-pointer"
          onClick={handleDragHandleClick}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-1 rounded-full bg-rc-bg-light" />
            <div>
              <span className="text-sm font-medium text-rc-text">Score: {score.toFixed(1)}</span>
            </div>
          </div>

          {/* Chart/Table toggle */}
          <div
            className="flex items-center gap-0.5 bg-rc-bg-darkest/80 rounded-lg p-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-rc-bg-light text-rc-text'
                  : 'text-rc-text-muted hover:text-rc-text'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-rc-bg-light text-rc-text'
                  : 'text-rc-text-muted hover:text-rc-text'
              }`}
            >
              <TableProperties className="w-3 h-3" />
              Table
            </button>
          </div>
        </div>

        {/* Content */}
        {snapPoint !== 'collapsed' && (
          <div className="h-[calc(100%-60px)] overflow-y-auto px-2">
            {/* Chart or Table */}
            <div className={snapPoint === 'half' ? 'h-full' : 'mb-4'}>
              {viewMode === 'chart' ? (
                <HourlyChartNew
                  forecasts={forecastData}
                  selectedDay={selectedDay}
                  species={species}
                  tideData={tideData}
                  onHoverChange={onHoverChange}
                  mobilePeriod={mobilePeriod}
                  onPeriodChange={onPeriodChange}
                  compact
                />
              ) : (
                <HourlyTableNew
                  forecasts={forecastData}
                  openMeteoData={openMeteoData}
                  tideData={tideData}
                  dataMetadata={dataMetadata}
                  selectedDay={selectedDay}
                  highlightedIndex={hoveredHourIndex}
                  mobilePeriod={mobilePeriod}
                  onPeriodChange={onPeriodChange}
                  compact
                />
              )}
            </div>

            {/* Full expanded: show sidebar content */}
            {snapPoint === 'full' && (
              <div className="space-y-4 pb-4">
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
            )}
          </div>
        )}
      </div>
    </>
  )
}
