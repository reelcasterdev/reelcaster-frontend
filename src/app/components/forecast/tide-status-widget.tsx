'use client'

import React from 'react'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { TideData } from '@/app/utils/tideApi'
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

interface TideStatusWidgetProps {
  tideData?: CHSWaterData | TideData | null
  className?: string
  compact?: boolean
}

export function TideStatusWidget({ tideData, className, compact = false }: TideStatusWidgetProps) {
  if (!tideData) {
    return (
      <div className={cn("bg-slate-800 rounded-xl p-6 border border-slate-700", className)}>
        <div className="flex items-center gap-2 text-slate-400">
          <Waves className="h-4 w-4" />
          <span className="text-sm">No tide data available</span>
        </div>
      </div>
    )
  }

  // Check if it's CHS data (has waterLevels property) or old TideData
  const isCHSData = 'waterLevels' in tideData

  // Helper function to get fishing quality
  const getFishingQuality = () => {
    const timeToChangeHours = isCHSData 
      ? (tideData as CHSWaterData).timeToNextTide / 60
      : tideData.timeToChange / 60
    
    if (timeToChangeHours <= 1) return { label: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-500' }
    if (timeToChangeHours <= 2) return { label: 'Good', color: 'text-lime-400', bgColor: 'bg-lime-500' }
    if (timeToChangeHours <= 3) return { label: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500' }
    return { label: 'Poor', color: 'text-red-400', bgColor: 'bg-red-500' }
  }

  const quality = getFishingQuality()
  const currentHeight = isCHSData ? (tideData as CHSWaterData).currentHeight : tideData.currentHeight
  const isRising = tideData.isRising
  const changeRate = tideData.changeRate
  const tidalRange = isCHSData ? (tideData as CHSWaterData).tidalRange : tideData.tideRange
  const timeToNextTide = isCHSData 
    ? (tideData as CHSWaterData).timeToNextTide 
    : tideData.timeToChange
  const nextTide = isCHSData 
    ? (tideData as CHSWaterData).nextTide
    : { 
        type: tideData.nextChangeType,
        timestamp: tideData.nextChangeTime,
        height: 0 // Old API doesn't provide height
      }
  const currentSpeed = isCHSData ? (tideData as CHSWaterData).currentSpeed : undefined
  const currentDirection = isCHSData ? (tideData as CHSWaterData).currentDirection : undefined
  const waterTemp = isCHSData ? (tideData as CHSWaterData).waterTemperature : undefined

  if (compact) {
    return (
      <div className={cn("bg-slate-800 rounded-xl p-3 border border-slate-700", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-white">{currentHeight.toFixed(1)}m</span>
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
        <p className="text-xs text-slate-400 mt-1">
          {nextTide.type === 'high' ? 'High' : 'Low'} in {Math.floor(timeToNextTide)}min
        </p>
      </div>
    )
  }

  return (
    <div className={cn("bg-slate-800 rounded-xl p-6 border border-slate-700", className)}>
      <div className="space-y-4">
        {/* Header with current status */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Tide Status</h2>
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", quality.bgColor)} />
            <span className={cn("text-sm font-semibold", quality.color)}>{quality.label}</span>
          </div>
        </div>

        {/* Current height and direction */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-slate-400 text-sm mb-1">Current Height</div>
            <div className="flex items-center gap-2">
              <span className="text-white text-2xl font-bold">{currentHeight.toFixed(2)}m</span>
              {isRising ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1">Change Rate</div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" />
              <span className="text-white text-xl font-semibold">{changeRate.toFixed(2)}m/hr</span>
            </div>
          </div>
        </div>

        {/* Next tide information */}
        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">Next Tide</span>
            </div>
            <span className="text-sm font-medium text-white">
              {nextTide.type === 'high' ? 'High' : 'Low'} Tide
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-white">
              {format(new Date(nextTide.timestamp * 1000), 'HH:mm')}
            </span>
            {isCHSData && nextTide.height > 0 && (
              <span className="text-sm text-slate-400">
                {nextTide.height.toFixed(2)}m
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all", quality.bgColor)}
                style={{ width: `${Math.max(5, 100 - (timeToNextTide / 240) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {Math.floor(timeToNextTide)} minutes remaining
            </p>
          </div>
        </div>

        {/* Current speed and direction (if available) */}
        {currentSpeed !== undefined && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="h-4 w-4 text-slate-400" />
                <p className="text-sm text-slate-400">Current Speed</p>
              </div>
              <p className="text-white text-xl font-semibold">{currentSpeed.toFixed(1)} knots</p>
            </div>
            {currentDirection !== undefined && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Compass className="h-4 w-4 text-slate-400" />
                  <p className="text-sm text-slate-400">Direction</p>
                </div>
                <p className="text-white text-xl font-semibold">{Math.round(currentDirection)}°</p>
              </div>
            )}
          </div>
        )}

        {/* Additional information */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-slate-400 text-sm mb-1">Tidal Range</div>
            <div className="text-white text-xl font-semibold">{tidalRange.toFixed(2)}m</div>
          </div>
          {waterTemp !== undefined && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="h-4 w-4 text-slate-400" />
                <p className="text-sm text-slate-400">Water Temp</p>
              </div>
              <p className="text-white text-xl font-semibold">{waterTemp.toFixed(1)}°C</p>
            </div>
          )}
        </div>

        {/* Station information */}
        {isCHSData && (tideData as CHSWaterData).station && (
          <div className="pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              Station: {(tideData as CHSWaterData).station.name}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}