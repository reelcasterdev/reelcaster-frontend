'use client'

import React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { Waves, TrendingUp, TrendingDown, Activity, Droplets } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useUnitPreferences } from '@/contexts/unit-preferences-context'
import { convertHeight, formatHeight } from '@/app/utils/unit-conversions'

interface TideChartProps {
  tideData: CHSWaterData
  currentTime?: Date
  className?: string
}

export function TideChart({ tideData, currentTime = new Date(), className }: TideChartProps) {
  const { heightUnit, cycleUnit } = useUnitPreferences()

  // Prepare chart data from CHS data (source is meters)
  const chartData = tideData.waterLevels.map(level => ({
    time: level.timestamp,
    height: level.height, // meters (source)
    displayHeight: convertHeight(level.height, 'm', heightUnit),
    timeLabel: format(new Date(level.timestamp * 1000), 'HH:mm'),
  }))

  // Find min and max for Y-axis (in display unit)
  const displayHeights = chartData.map(d => d.displayHeight)
  const padding = heightUnit === 'ft' ? 1.5 : 0.5
  const minHeight = Math.min(...displayHeights) - padding
  const maxHeight = Math.max(...displayHeights) + padding

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload
      return (
        <div className="bg-rc-bg-darkest/95 backdrop-blur-sm border border-rc-bg-light rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-rc-text">{data.timeLabel}</p>
          <p className="text-sm text-rc-text-muted">
            Height: <span className="font-medium text-rc-text">{formatHeight(data.displayHeight, heightUnit, 1)}</span>
          </p>
        </div>
      )
    }
    return null
  }

  // Theme colors for chart (CSS variables don't work in SVG)
  const CHART_COLORS = {
    gridLine: '#3f3f3f', // rc-bg-light
    textMuted: '#9ca3af', // rc-text-muted
    tideStroke: '#22c55e', // green-500 for tide line
    tideGradientStart: '#22c55e',
    highTide: '#3b82f6', // blue
    lowTide: '#ef4444', // red
  }

  // Custom dot for tide events
  const TideEventDot = (props: any) => {
    const { cx, cy, payload } = props

    const tideEvent = tideData.tideEvents.find(
      event => Math.abs(event.timestamp - payload.time) < 300 // Within 5 minutes
    )

    if (tideEvent) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill={tideEvent.type === 'high' ? CHART_COLORS.highTide : CHART_COLORS.lowTide} />
          <text x={cx} y={cy - 12} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight={500}>
            {tideEvent.type === 'high' ? 'H' : 'L'}
          </text>
        </g>
      )
    }
    return null
  }

  // Format change rate based on height unit
  const formatChangeRate = () => {
    const rateInMeters = tideData.changeRate || 0
    if (heightUnit === 'ft') {
      return `${(rateInMeters * 3.28084).toFixed(2)} ft/hr`
    }
    return `${rateInMeters.toFixed(2)} m/hr`
  }

  return (
    <div className={cn("bg-rc-bg-darkest rounded-xl p-6 border border-rc-bg-light", className)}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-rc-text flex items-center gap-2">
          <Waves className="h-5 w-5 text-rc-text-muted" />
          Tide Forecast
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            {tideData.isRising ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-rc-text-muted">Rising</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-rc-text-muted">Falling</span>
              </>
            )}
          </div>
          <button
            onClick={() => cycleUnit('height')}
            className="flex items-center gap-1 hover:text-blue-400 transition-colors"
            title="Click to change height unit"
          >
            <Activity className="h-4 w-4 text-rc-text-muted" />
            <span className="text-rc-text-muted border-b border-dotted border-rc-text-muted hover:border-blue-400">
              {formatChangeRate()}
            </span>
          </button>
          {tideData.waterTemperature && (
            <div className="flex items-center gap-1">
              <Droplets className="h-4 w-4 text-rc-text-muted" />
              <span className="text-rc-text-muted">
                {tideData.waterTemperature.toFixed(1)}°C
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.tideGradientStart} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={CHART_COLORS.tideGradientStart} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridLine} />
            <XAxis
              dataKey="timeLabel"
              tick={{ fill: CHART_COLORS.textMuted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minHeight, maxHeight]}
              tick={{ fill: CHART_COLORS.textMuted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toFixed(1)}
              label={{
                value: `Height (${heightUnit})`,
                angle: -90,
                position: 'insideLeft',
                fill: CHART_COLORS.textMuted,
                fontSize: 11,
                dx: -5
              }}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="displayHeight"
              stroke={CHART_COLORS.tideStroke}
              fill="url(#tideGradient)"
              strokeWidth={2}
              dot={<TideEventDot />}
            />
            <ReferenceLine
              x={format(currentTime, 'HH:mm')}
              stroke={CHART_COLORS.textMuted}
              strokeDasharray="5 5"
              label={{ value: 'Now', position: 'top', fill: CHART_COLORS.textMuted, fontSize: 11 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tide events summary */}
      <div className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-rc-text-muted">Next Tide</p>
          <div className="flex items-center gap-2 mt-1">
            {(() => {
              const nextType = tideData.nextTide.type
              const nextTime = tideData.nextTide.timestamp
              const nextHeight = tideData.nextTide.height
              const displayHeight = convertHeight(nextHeight, 'm', heightUnit)

              return (
                <>
                  {nextType === 'high' ? (
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                  )}
                  <span className="text-sm font-medium text-rc-text">
                    {nextType === 'high' ? 'High' : 'Low'} at{' '}
                    {nextTime ? format(new Date(nextTime * 1000), 'HH:mm') : 'N/A'}
                  </span>
                  <button
                    onClick={() => cycleUnit('height')}
                    className="text-sm text-rc-text-muted hover:text-blue-400 border-b border-dotted border-rc-text-muted hover:border-blue-400 transition-colors"
                    title="Click to change height unit"
                  >
                    ({formatHeight(displayHeight, heightUnit, 1)})
                  </button>
                </>
              )
            })()}
          </div>
        </div>
        <div>
          <p className="text-sm text-rc-text-muted">Tidal Range</p>
          <button
            onClick={() => cycleUnit('height')}
            className="text-sm font-medium text-rc-text mt-1 hover:text-blue-400 border-b border-dotted border-rc-text-muted hover:border-blue-400 transition-colors"
            title="Click to change height unit"
          >
            {formatHeight(convertHeight(tideData.tidalRange || 0, 'm', heightUnit), heightUnit, 1)}
          </button>
        </div>
      </div>

      {/* Fishing quality indicator */}
      <div className="mt-4 p-3 rounded-lg bg-rc-bg-dark/50 border border-rc-bg-light">
        <div className="flex items-center justify-between">
          <span className="text-sm text-rc-text-muted">Fishing Quality</span>
          <div className="flex items-center gap-2">
            {(() => {
              const timeToChange = tideData.timeToNextTide / 60 // hours
              if (timeToChange <= 1) {
                return (
                  <>
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-400">Excellent</span>
                  </>
                )
              } else if (timeToChange <= 2) {
                return (
                  <>
                    <div className="h-2 w-2 rounded-full bg-lime-500" />
                    <span className="text-sm font-medium text-lime-400">Good</span>
                  </>
                )
              } else if (timeToChange <= 3) {
                return (
                  <>
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-sm font-medium text-yellow-400">Moderate</span>
                  </>
                )
              } else {
                return (
                  <>
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-red-400">Poor (Slack)</span>
                  </>
                )
              }
            })()}
          </div>
        </div>
        <p className="text-xs text-rc-text-muted mt-1">
          {Math.floor(tideData.timeToNextTide)} minutes until {tideData.nextTide.type} tide
        </p>
      </div>

      {/* Current information if available */}
      {tideData.currentSpeed !== undefined && (
        <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-rc-bg-dark/50 border border-rc-bg-light">
          <span className="text-sm text-rc-text-muted">Current</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-rc-text">
              {tideData.currentSpeed!.toFixed(1)} knots
            </span>
            {tideData.currentDirection !== undefined && (
              <span className="text-sm text-rc-text-muted">
                {Math.round(tideData.currentDirection!)}°
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}