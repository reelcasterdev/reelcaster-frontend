'use client'

import React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { TideData } from '@/app/utils/tideApi'
import { Waves, TrendingUp, TrendingDown, Activity, Droplets } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface TideChartProps {
  tideData: CHSWaterData | TideData
  currentTime?: Date
  className?: string
}

export function TideChart({ tideData, currentTime = new Date(), className }: TideChartProps) {
  // Check if it's CHS data or fallback TideData
  const isChsData = 'waterLevels' in tideData
  
  // Prepare chart data based on data type
  let chartData: { time: number; height: number; timeLabel: string }[] = []
  
  if (isChsData) {
    // CHS data format
    chartData = (tideData as CHSWaterData).waterLevels.map(level => ({
      time: level.timestamp,
      height: level.height,
      timeLabel: format(new Date(level.timestamp * 1000), 'HH:mm'),
    }))
  } else {
    // Fallback TideData format - create interpolated data points
    const fallbackData = tideData as TideData
    if (fallbackData.dailyTides && fallbackData.dailyTides.length > 0) {
      // Generate hourly points by interpolating between tide events
      const startTime = Math.min(...fallbackData.dailyTides.map(t => t.time))
      const endTime = Math.max(...fallbackData.dailyTides.map(t => t.time))
      
      // Create hourly data points
      for (let time = startTime; time <= endTime; time += 3600) { // Every hour
        const height = interpolateTideHeight(time, fallbackData.dailyTides)
        chartData.push({
          time,
          height,
          timeLabel: format(new Date(time * 1000), 'HH:mm'),
        })
      }
    }
  }
  
  // Helper function to interpolate tide height
  function interpolateTideHeight(timestamp: number, tides: { time: number; height: number }[]) {
    // Find surrounding tide events
    const sortedTides = [...tides].sort((a, b) => a.time - b.time)
    
    for (let i = 0; i < sortedTides.length - 1; i++) {
      if (sortedTides[i].time <= timestamp && sortedTides[i + 1].time >= timestamp) {
        const before = sortedTides[i]
        const after = sortedTides[i + 1]
        const progress = (timestamp - before.time) / (after.time - before.time)
        
        // Use cosine interpolation for smoother tide curves
        const cosineProgress = (1 - Math.cos(progress * Math.PI)) / 2
        return before.height + (after.height - before.height) * cosineProgress
      }
    }
    
    // If outside range, return nearest
    if (timestamp < sortedTides[0].time) return sortedTides[0].height
    return sortedTides[sortedTides.length - 1].height
  }

  // Find min and max for Y-axis
  const heights = chartData.map(d => d.height)
  const minHeight = Math.min(...heights) - 0.5
  const maxHeight = Math.max(...heights) + 0.5

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white">{data.timeLabel}</p>
          <p className="text-sm text-slate-400">
            Height: <span className="font-medium text-white">{data.height.toFixed(2)}m</span>
          </p>
        </div>
      )
    }
    return null
  }

  // Custom dot for tide events
  const TideEventDot = (props: any) => {
    const { cx, cy, payload } = props
    
    let tideEvent: any = null
    
    if (isChsData) {
      const chsData = tideData as CHSWaterData
      tideEvent = chsData.tideEvents.find(
        event => Math.abs(event.timestamp - payload.time) < 300 // Within 5 minutes
      )
    } else {
      const fallbackData = tideData as TideData
      const tide = fallbackData.dailyTides?.find(
        t => Math.abs(t.time - payload.time) < 300 // Within 5 minutes
      )
      if (tide) {
        tideEvent = {
          type: tide.type,
          timestamp: tide.time,
          height: tide.height
        }
      }
    }
    
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
            {(isChsData ? (tideData as CHSWaterData).isRising : (tideData as TideData).isRising) ? (
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
              {(isChsData ? (tideData as CHSWaterData).changeRate : (tideData as TideData).changeRate || 0).toFixed(2)}m/hr
            </span>
          </div>
          {isChsData && (tideData as CHSWaterData).waterTemperature && (
            <div className="flex items-center gap-1">
              <Droplets className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400">
                {(tideData as CHSWaterData).waterTemperature!.toFixed(1)}°C
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
              label={{ value: 'Height (m)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="height"
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
              const nextType = isChsData 
                ? (tideData as CHSWaterData).nextTide.type 
                : (tideData as TideData).nextChangeType
              const nextTime = isChsData
                ? (tideData as CHSWaterData).nextTide.timestamp
                : (tideData as TideData).nextChangeTime
              const nextHeight = isChsData
                ? (tideData as CHSWaterData).nextTide.height
                : (tideData as TideData).nextChangeHeight || 0
                
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
                    ({nextHeight.toFixed(2)}m)
                  </span>
                </>
              )
            })()}
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-400">Tidal Range</p>
          <p className="text-sm font-medium text-white mt-1">
            {(isChsData ? (tideData as CHSWaterData).tidalRange : (tideData as TideData).tidalRange || 0).toFixed(2)}m
          </p>
        </div>
      </div>

      {/* Fishing quality indicator */}
      <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Fishing Quality</span>
          <div className="flex items-center gap-2">
            {(() => {
              const timeToChange = isChsData 
                ? (tideData as CHSWaterData).timeToNextTide / 60 // hours
                : (tideData as TideData).timeToChange / 60 // hours
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
          {Math.floor(isChsData 
            ? (tideData as CHSWaterData).timeToNextTide 
            : (tideData as TideData).timeToChange
          )} minutes until {isChsData 
            ? (tideData as CHSWaterData).nextTide.type 
            : (tideData as TideData).nextChangeType
          } tide
        </p>
      </div>

      {/* Current information if available */}
      {isChsData && (tideData as CHSWaterData).currentSpeed !== undefined && (
        <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700">
          <span className="text-sm text-slate-400">Current</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">
              {(tideData as CHSWaterData).currentSpeed!.toFixed(1)} knots
            </span>
            {(tideData as CHSWaterData).currentDirection !== undefined && (
              <span className="text-sm text-slate-400">
                {Math.round((tideData as CHSWaterData).currentDirection!)}°
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}