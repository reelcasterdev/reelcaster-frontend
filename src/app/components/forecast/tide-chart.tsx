'use client'

import React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { Waves, TrendingUp, TrendingDown, Activity, Droplets } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface TideChartProps {
  tideData: CHSWaterData
  currentTime?: Date
  className?: string
}

export function TideChart({ tideData, currentTime = new Date(), className }: TideChartProps) {
  // Prepare chart data from CHS data (convert to feet for display)
  let chartData: { time: number; height: number; heightFeet: number; timeLabel: string }[] = []
  
  // CHS data format
  chartData = tideData.waterLevels.map(level => ({
    time: level.timestamp,
    height: level.height,
    heightFeet: level.height * 3.28084,
    timeLabel: format(new Date(level.timestamp * 1000), 'HH:mm'),
  }))

  // Find min and max for Y-axis (in feet)
  const heightsFeet = chartData.map(d => d.heightFeet)
  const minHeight = Math.min(...heightsFeet) - 1.5
  const maxHeight = Math.max(...heightsFeet) + 1.5

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white">{data.timeLabel}</p>
          <p className="text-sm text-slate-400">
            Height: <span className="font-medium text-white">{data.heightFeet.toFixed(1)}ft</span>
          </p>
        </div>
      )
    }
    return null
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
          <circle cx={cx} cy={cy} r={6} fill={tideEvent.type === 'high' ? '#3b82f6' : '#ef4444'} />
          <text x={cx} y={cy - 10} textAnchor="middle" fill="currentColor" className="text-xs font-medium">
            {tideEvent.type === 'high' ? 'H' : 'L'}
          </text>
        </g>
      )
    }
    return null
  }

  return (
    <div className={cn("bg-slate-800 rounded-xl p-6 border border-slate-700", className)}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Waves className="h-5 w-5 text-slate-400" />
          Tide Forecast
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            {tideData.isRising ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-slate-400">Rising</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-slate-400">Falling</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400">
              {(tideData.changeRate || 0).toFixed(2)}m/hr
            </span>
          </div>
          {tideData.waterTemperature && (
            <div className="flex items-center gap-1">
              <Droplets className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400">
                {tideData.waterTemperature.toFixed(1)}°C
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="excellentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="goodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#84cc16" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#84cc16" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="moderateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="poorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis
              dataKey="timeLabel"
              className="text-xs"
              tick={{ fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[minHeight, maxHeight]}
              className="text-xs"
              tick={{ fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Height (ft)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="heightFeet"
              stroke="#3b82f6"
              fill="url(#tideGradient)"
              strokeWidth={2}
              dot={<TideEventDot />}
            />
            <ReferenceLine
              x={format(currentTime, 'HH:mm')}
              stroke="#94a3b8"
              strokeDasharray="5 5"
              label={{ value: 'Now', position: 'top', fill: '#94a3b8', fontSize: 12 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tide events summary */}
      <div className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-slate-400">Next Tide</p>
          <div className="flex items-center gap-2 mt-1">
            {(() => {
              const nextType = tideData.nextTide.type
              const nextTime = tideData.nextTide.timestamp
              const nextHeight = tideData.nextTide.height
                
              return (
                <>
                  {nextType === 'high' ? (
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                  )}
                  <span className="text-sm font-medium text-white">
                    {nextType === 'high' ? 'High' : 'Low'} at{' '}
                    {nextTime ? format(new Date(nextTime * 1000), 'HH:mm') : 'N/A'}
                  </span>
                  <span className="text-sm text-slate-400">
                    ({(nextHeight * 3.28084).toFixed(1)}ft)
                  </span>
                </>
              )
            })()}
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-400">Tidal Range</p>
          <p className="text-sm font-medium text-white mt-1">
            {((tideData.tidalRange || 0) * 3.28084).toFixed(1)}ft
          </p>
        </div>
      </div>

      {/* Fishing quality indicator */}
      <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Fishing Quality</span>
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
        <p className="text-xs text-slate-400 mt-1">
          {Math.floor(tideData.timeToNextTide)} minutes until {tideData.nextTide.type} tide
        </p>
      </div>

      {/* Current information if available */}
      {tideData.currentSpeed !== undefined && (
        <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700">
          <span className="text-sm text-slate-400">Current</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">
              {tideData.currentSpeed!.toFixed(1)} knots
            </span>
            {tideData.currentDirection !== undefined && (
              <span className="text-sm text-slate-400">
                {Math.round(tideData.currentDirection!)}°
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}