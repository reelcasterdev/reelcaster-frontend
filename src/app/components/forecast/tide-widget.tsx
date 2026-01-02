'use client'

import { useMemo } from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell } from 'recharts'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useUnitPreferences } from '@/contexts/unit-preferences-context'
import { convertHeight, convertWind } from '@/app/utils/unit-conversions'

interface TideWidgetProps {
  tideData?: CHSWaterData | null
  className?: string
}

export default function TideWidget({ tideData, className }: TideWidgetProps) {
  const { heightUnit, windUnit, cycleUnit } = useUnitPreferences()

  // Prepare chart data - actual tide heights
  const chartData = useMemo(() => {
    if (!tideData?.waterLevels) return []

    const now = Date.now() / 1000
    const twelveHoursLater = now + 12 * 3600

    return tideData.waterLevels
      .filter(level => level.timestamp >= now && level.timestamp <= twelveHoursLater)
      .filter((_, index) => index % 4 === 0)
      .slice(0, 13)
      .map(level => ({
        time: format(new Date(level.timestamp * 1000), 'HH:mm'),
        height: convertHeight(level.height, 'm', heightUnit),
      }))
  }, [tideData, heightUnit])

  // Get fishing quality based on time to next tide
  const getFishingQuality = () => {
    if (!tideData) return { label: 'Unknown', color: 'text-rc-text-muted', dotColor: 'bg-gray-500' }

    const timeToChangeHours = tideData.timeToNextTide / 60

    if (timeToChangeHours <= 1) return { label: 'Excellent', color: 'text-green-400', dotColor: 'bg-green-500' }
    if (timeToChangeHours <= 2) return { label: 'Good', color: 'text-lime-400', dotColor: 'bg-lime-500' }
    if (timeToChangeHours <= 3) return { label: 'Moderate', color: 'text-yellow-400', dotColor: 'bg-yellow-500' }
    return { label: 'Poor', color: 'text-red-400', dotColor: 'bg-red-500' }
  }

  const quality = getFishingQuality()

  // Calculate Y-axis domain
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 10]
    const heights = chartData.map(d => d.height)
    const min = Math.floor(Math.min(...heights) - 0.5)
    const max = Math.ceil(Math.max(...heights) + 0.5)
    return [Math.max(0, min), max]
  }, [chartData])

  if (!tideData) {
    return (
      <div className={cn('bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4', className)}>
        <div className="flex items-center gap-2 text-rc-text-muted">
          <span className="text-sm">No tide data available</span>
        </div>
      </div>
    )
  }

  // Convert values for display
  const currentHeightDisplay = convertHeight(tideData.currentHeight, 'm', heightUnit)
  const changeRateDisplay = convertHeight(tideData.changeRate, 'm', heightUnit)
  const tidalRangeDisplay = convertHeight(tideData.tidalRange || 0, 'm', heightUnit)
  const currentSpeedDisplay = tideData.currentSpeed !== undefined
    ? convertWind(tideData.currentSpeed, 'knots', windUnit)
    : undefined

  // Unit toggle button component
  const UnitToggle = ({
    type,
    options
  }: {
    type: 'height' | 'wind'
    options: string[]
  }) => {
    const currentUnit = type === 'height' ? heightUnit : windUnit
    return (
      <div className="flex bg-rc-bg-dark rounded-lg overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => cycleUnit(type)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors',
              currentUnit === opt
                ? 'bg-rc-bg-light text-rc-text'
                : 'text-rc-text-muted hover:text-rc-text'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-rc-text">Tide Status</h3>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rc-bg-dark rounded-md">
          <div className={cn('h-1.5 w-1.5 rounded-full', quality.dotColor)} />
          <span className={cn('text-xs font-medium', quality.color)}>{quality.label}</span>
        </div>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="h-40 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <XAxis
                dataKey="time"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={40}
              />
              <YAxis
                domain={yAxisDomain}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickCount={5}
                width={30}
              />
              <Bar dataKey="height" radius={[4, 4, 4, 4]} barSize={16}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill="#22c55e" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Metrics */}
      <div className="space-y-2">
        {/* Current Height */}
        <div className="flex items-center justify-between py-2 border-t border-rc-bg-light">
          <span className="text-sm text-rc-text-light">Current Height</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-rc-text">{currentHeightDisplay.toFixed(1)}</span>
            <UnitToggle type="height" options={['m', 'ft']} />
          </div>
        </div>

        {/* Change Rate */}
        <div className="flex items-center justify-between py-2 border-t border-rc-bg-light">
          <span className="text-sm text-rc-text-light">
            Change Rate <span className="text-rc-text-muted text-xs">Hourly</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-rc-text">{Math.abs(changeRateDisplay).toFixed(2)}</span>
            <UnitToggle type="height" options={['m', 'ft']} />
          </div>
        </div>

        {/* Current Speed */}
        {currentSpeedDisplay !== undefined && (
          <div className="flex items-center justify-between py-2 border-t border-rc-bg-light">
            <span className="text-sm text-rc-text-light">Current Speed</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-rc-text">{currentSpeedDisplay.toFixed(1)}</span>
              <UnitToggle type="wind" options={['kph', 'knots']} />
            </div>
          </div>
        )}

        {/* Tidal Range */}
        <div className="flex items-center justify-between py-2 border-t border-rc-bg-light">
          <span className="text-sm text-rc-text-light">Tidal Range</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-rc-text">{tidalRangeDisplay.toFixed(1)}</span>
            <UnitToggle type="height" options={['m', 'ft']} />
          </div>
        </div>

        {/* Direction */}
        {tideData.currentDirection !== undefined && (
          <div className="flex items-center justify-between py-2 border-t border-rc-bg-light">
            <span className="text-sm text-rc-text-light">Direction</span>
            <span className="text-sm font-semibold text-rc-text">{Math.round(tideData.currentDirection)}°</span>
          </div>
        )}
      </div>
    </div>
  )
}
