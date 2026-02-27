'use client'

import { useState } from 'react'
import { BarChart3, TableProperties } from 'lucide-react'
import { OpenMeteoDailyForecast } from '@/app/utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { DataSourceMetadata } from '@/app/utils/forecastDataProvider'
import HourlyChartNew from '../forecast/hourly-chart-new'
import HourlyTableNew from '../forecast/hourly-table-new'

interface BottomDataPanelProps {
  forecasts: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: CHSWaterData | null
  dataMetadata?: DataSourceMetadata | null
  selectedDay: number
  species: string | null
  hoveredHourIndex: number | null
  onHoverChange: (index: number | null) => void
  mobilePeriod: 'am' | 'pm'
  onPeriodChange: (period: 'am' | 'pm') => void
}

type ViewMode = 'chart' | 'table'

export default function BottomDataPanel({
  forecasts,
  openMeteoData,
  tideData,
  dataMetadata,
  selectedDay,
  species,
  hoveredHourIndex,
  onHoverChange,
  mobilePeriod,
  onPeriodChange,
}: BottomDataPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!forecasts.length) return null

  return (
    <div className="pointer-events-auto">
      <div
        className={`bg-rc-bg-dark border-t border-rc-bg-light rounded-t-2xl transition-all duration-300 ${
          isCollapsed ? 'h-12' : 'h-[280px]'
        }`}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-4 h-12 cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {/* Drag handle */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-1 rounded-full bg-rc-bg-light" />
            <span className="text-sm font-medium text-rc-text">24H Overview</span>
          </div>

          {/* Chart/Table toggle */}
          <div
            className="flex items-center gap-0.5 bg-rc-bg-darkest/80 rounded-lg p-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
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
        {!isCollapsed && (
          <div className="h-[calc(100%-48px)] overflow-hidden px-2">
            {viewMode === 'chart' ? (
              <HourlyChartNew
                forecasts={forecasts}
                selectedDay={selectedDay}
                species={species}
                tideData={tideData}
                onHoverChange={onHoverChange}
                mobilePeriod={mobilePeriod}
                onPeriodChange={onPeriodChange}
                compact
              />
            ) : (
              <div className="h-full overflow-auto">
                <HourlyTableNew
                  forecasts={forecasts}
                  openMeteoData={openMeteoData}
                  tideData={tideData}
                  dataMetadata={dataMetadata}
                  selectedDay={selectedDay}
                  highlightedIndex={hoveredHourIndex}
                  mobilePeriod={mobilePeriod}
                  onPeriodChange={onPeriodChange}
                  compact
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
