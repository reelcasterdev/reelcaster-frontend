'use client'

import React from 'react'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import {
  Waves,
  TrendingUp,
  TrendingDown,
  Activity,
  Droplets,
  Clock,
  Compass,
  Gauge
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { ConvertibleValue } from '../common/convertible-value'

interface TideStatusWidgetProps {
  tideData?: CHSWaterData | null
  className?: string
  compact?: boolean
}

export function TideStatusWidget({ tideData, className, compact = false }: TideStatusWidgetProps) {
  if (!tideData) {
    return (
      <div className={cn("bg-rc-bg-darkest rounded-xl p-6 border border-rc-bg-light", className)}>
        <div className="flex items-center gap-2 text-rc-text-muted">
          <Waves className="h-4 w-4" />
          <span className="text-sm">No tide data available</span>
        </div>
      </div>
    )
  }

  // Helper function to get fishing quality
  const getFishingQuality = () => {
    const timeToChangeHours = tideData.timeToNextTide / 60
    
    if (timeToChangeHours <= 1) return { label: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-500' }
    if (timeToChangeHours <= 2) return { label: 'Good', color: 'text-lime-400', bgColor: 'bg-lime-500' }
    if (timeToChangeHours <= 3) return { label: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500' }
    return { label: 'Poor', color: 'text-red-400', bgColor: 'bg-red-500' }
  }

  const quality = getFishingQuality()
  const currentHeight = tideData.currentHeight
  const isRising = tideData.isRising
  const changeRate = tideData.changeRate
  const tidalRange = tideData.tidalRange
  const timeToNextTide = tideData.timeToNextTide
  const nextTide = tideData.nextTide
  const currentSpeed = tideData.currentSpeed
  const currentDirection = tideData.currentDirection
  const waterTemp = tideData.waterTemperature

  if (compact) {
    return (
      <div className={cn("bg-rc-bg-darkest rounded-xl p-3 border border-rc-bg-light", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-rc-text-muted" />
            <ConvertibleValue value={currentHeight} type="height" sourceUnit="m" className="text-sm font-medium text-rc-text" />
            {isRising ? (
              <TrendingUp className="h-3 w-3 text-green-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-400" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", quality.bgColor)} />
            <span className={cn("text-xs font-semibold", quality.color)}>{quality.label}</span>
          </div>
        </div>
        <p className="text-xs text-rc-text-muted mt-1">
          {nextTide.type === 'high' ? 'High' : 'Low'} in {Math.floor(timeToNextTide)}min
        </p>
      </div>
    )
  }

  return (
    <div className={cn("bg-rc-bg-darkest rounded-xl p-4 sm:p-6 border border-rc-bg-light", className)}>
      <div className="space-y-4">
        {/* Header with current status */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-rc-text">Tide Status</h2>
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", quality.bgColor)} />
            <span className={cn("text-sm font-semibold", quality.color)}>{quality.label}</span>
          </div>
        </div>

        {/* Current height and direction */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <div>
            <div className="text-rc-text-muted text-sm mb-1">Current Height</div>
            <div className="flex items-center gap-2">
              <ConvertibleValue value={currentHeight} type="height" sourceUnit="m" className="text-rc-text text-2xl font-bold" />
              {isRising ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
            </div>
          </div>
          <div>
            <div className="text-rc-text-muted text-sm mb-1">Change Rate</div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-rc-text-muted" />
              <ConvertibleValue value={changeRate} type="height" sourceUnit="m" precision={2} className="text-rc-text text-xl font-semibold" />
              <span className="text-rc-text-muted text-sm">/hr</span>
            </div>
          </div>
        </div>

        {/* Next tide information */}
        <div className="p-3 rounded-lg bg-rc-bg-dark/50 border border-rc-bg-light">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-rc-text-muted" />
              <span className="text-sm text-rc-text-muted">Next Tide</span>
            </div>
            <span className="text-sm font-medium text-rc-text">
              {nextTide.type === 'high' ? 'High' : 'Low'} Tide
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-rc-text">
              {format(new Date(nextTide.timestamp * 1000), 'HH:mm')}
            </span>
            {nextTide.height > 0 && (
              <ConvertibleValue value={nextTide.height} type="height" sourceUnit="m" className="text-sm text-rc-text-muted" />
            )}
          </div>
          <div className="mt-2">
            <div className="h-2 bg-rc-bg-light rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all", quality.bgColor)}
                style={{ width: `${Math.max(5, 100 - (timeToNextTide / 240) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-rc-text-muted mt-1">
              {Math.floor(timeToNextTide)} minutes remaining
            </p>
          </div>
        </div>

        {/* Current speed and direction (if available) */}
        {currentSpeed !== undefined && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="h-4 w-4 text-rc-text-muted" />
                <p className="text-sm text-rc-text-muted">Current Speed</p>
              </div>
              <ConvertibleValue value={currentSpeed} type="wind" sourceUnit="knots" precision={1} className="text-rc-text text-xl font-semibold" />
            </div>
            {currentDirection !== undefined && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Compass className="h-4 w-4 text-rc-text-muted" />
                  <p className="text-sm text-rc-text-muted">Direction</p>
                </div>
                <p className="text-rc-text text-xl font-semibold">{Math.round(currentDirection)}°</p>
              </div>
            )}
          </div>
        )}

        {/* Additional information */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <div>
            <div className="text-rc-text-muted text-sm mb-1">Tidal Range</div>
            <ConvertibleValue value={tidalRange} type="height" sourceUnit="m" className="text-rc-text text-xl font-semibold" />
          </div>
          {waterTemp !== undefined && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="h-4 w-4 text-rc-text-muted" />
                <p className="text-sm text-rc-text-muted">Water Temp</p>
              </div>
              <ConvertibleValue value={waterTemp} type="temp" sourceUnit="C" precision={1} className="text-rc-text text-xl font-semibold" />
            </div>
          )}
        </div>

        {/* Station information */}
        {tideData.station && (
          <div className="pt-3 border-t border-rc-bg-light">
            <p className="text-xs text-rc-text-muted">
              Station: {tideData.station.name}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}