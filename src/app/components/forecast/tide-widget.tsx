'use client'

import { useMemo } from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell } from 'recharts'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { TrendingUp, TrendingDown, Activity, Compass, Gauge, Waves } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { ConvertibleValue } from '../common/convertible-value'

interface TideWidgetProps {
  tideData?: CHSWaterData | null
  className?: string
}

export default function TideWidget({ tideData, className }: TideWidgetProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    if (!tideData?.waterLevels) return []

    // Get next 12 hours of data, sampling every hour
    const now = Date.now() / 1000
    const twelveHoursLater = now + 12 * 3600

    return tideData.waterLevels
      .filter(level => level.timestamp >= now && level.timestamp <= twelveHoursLater)
      .filter((_, index) => index % 4 === 0) // Sample every ~hour for 15-min data
      .slice(0, 12)
      .map(level => ({
        time: format(new Date(level.timestamp * 1000), 'HH:mm'),
        height: level.height,
        heightFeet: level.height * 3.28084,
      }))
  }, [tideData])

  // Get fishing quality based on time to next tide
  const getFishingQuality = () => {
    if (!tideData) return { label: 'Unknown', color: 'text-gray-400', bgColor: 'bg-gray-500' }

    const timeToChangeHours = tideData.timeToNextTide / 60

    if (timeToChangeHours <= 1) return { label: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-500' }
    if (timeToChangeHours <= 2) return { label: 'Good', color: 'text-lime-400', bgColor: 'bg-lime-500' }
    if (timeToChangeHours <= 3) return { label: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500' }
    return { label: 'Poor', color: 'text-red-400', bgColor: 'bg-red-500' }
  }

  const quality = getFishingQuality()

  // Get bar color based on height
  const getBarColor = (height: number) => {
    if (!tideData) return '#6b7280'
    const maxHeight = Math.max(...chartData.map(d => d.height))
    const minHeight = Math.min(...chartData.map(d => d.height))
    const range = maxHeight - minHeight
    const normalizedHeight = (height - minHeight) / range

    if (normalizedHeight > 0.7) return '#3b82f6' // High tide - blue
    if (normalizedHeight > 0.3) return '#22c55e' // Mid tide - green
    return '#f59e0b' // Low tide - amber
  }

  if (!tideData) {
    return (
      <div className={cn('bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4', className)}>
        <div className="flex items-center gap-2 text-rc-text-muted">
          <Waves className="h-4 w-4" />
          <span className="text-sm">No tide data available</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-rc-text">Tide Status</h3>
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', quality.bgColor)} />
          <span className={cn('text-xs font-semibold', quality.color)}>{quality.label}</span>
        </div>
      </div>

      {/* Mini Chart */}
      {chartData.length > 0 && (
        <div className="h-24 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="time"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
              <Bar dataKey="height" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.height)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Current Height */}
        <div className="bg-rc-bg-light rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <Waves className="w-3 h-3 text-rc-text-muted" />
            <span className="text-xs text-rc-text-muted">Height</span>
          </div>
          <div className="flex items-center gap-1">
            <ConvertibleValue
              value={tideData.currentHeight}
              type="height"
              sourceUnit="m"
              className="text-rc-text text-sm font-semibold"
            />
            {tideData.isRising ? (
              <TrendingUp className="w-3 h-3 text-green-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
          </div>
        </div>

        {/* Change Rate */}
        <div className="bg-rc-bg-light rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-rc-text-muted" />
            <span className="text-xs text-rc-text-muted">Rate</span>
          </div>
          <div className="flex items-center gap-1">
            <ConvertibleValue
              value={tideData.changeRate}
              type="height"
              sourceUnit="m"
              precision={2}
              className="text-rc-text text-sm font-semibold"
            />
            <span className="text-xs text-rc-text-muted">/hr</span>
          </div>
        </div>

        {/* Current Speed */}
        {tideData.currentSpeed !== undefined && (
          <div className="bg-rc-bg-light rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <Gauge className="w-3 h-3 text-rc-text-muted" />
              <span className="text-xs text-rc-text-muted">Speed</span>
            </div>
            <ConvertibleValue
              value={tideData.currentSpeed}
              type="wind"
              sourceUnit="knots"
              precision={1}
              className="text-rc-text text-sm font-semibold"
            />
          </div>
        )}

        {/* Tidal Range */}
        <div className="bg-rc-bg-light rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <Compass className="w-3 h-3 text-rc-text-muted" />
            <span className="text-xs text-rc-text-muted">Range</span>
          </div>
          <ConvertibleValue
            value={tideData.tidalRange}
            type="height"
            sourceUnit="m"
            className="text-rc-text text-sm font-semibold"
          />
        </div>

        {/* Direction */}
        {tideData.currentDirection !== undefined && (
          <div className="bg-rc-bg-light rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <Compass className="w-3 h-3 text-rc-text-muted" />
              <span className="text-xs text-rc-text-muted">Direction</span>
            </div>
            <span className="text-rc-text text-sm font-semibold">
              {Math.round(tideData.currentDirection)}°
            </span>
          </div>
        )}
      </div>

      {/* Next Tide Info */}
      <div className="mt-3 p-2 bg-rc-bg-light rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs text-rc-text-muted">Next {tideData.nextTide.type}</span>
          <span className="text-xs text-rc-text font-medium">
            {format(new Date(tideData.nextTide.timestamp * 1000), 'HH:mm')}
          </span>
        </div>
        <div className="mt-1 h-1.5 bg-rc-bg-dark rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all', quality.bgColor)}
            style={{ width: `${Math.max(5, 100 - (tideData.timeToNextTide / 240) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-rc-text-muted mt-1">
          {Math.floor(tideData.timeToNextTide)} min remaining
        </p>
      </div>
    </div>
  )
}
