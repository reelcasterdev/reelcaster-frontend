'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { format, addDays, startOfDay, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { useUnitPreferences } from '@/contexts/unit-preferences-context'
import { convertHeight } from '@/app/utils/unit-conversions'
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Waves } from 'lucide-react'

interface TideForecastChartProps {
  tideData?: CHSWaterData | null
  className?: string
}

export default function TideForecastChart({ tideData, className }: TideForecastChartProps) {
  const { heightUnit, cycleUnit } = useUnitPreferences()
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')
  const [detailedDayOffset, setDetailedDayOffset] = useState(0)

  // Process tide data for chart
  const chartData = useMemo(() => {
    if (!tideData?.waterLevels) return []

    const now = Date.now()
    const nowTs = now / 1000
    const startTs = nowTs - 6 * 3600 // 6 hours before current time
    const endTs = nowTs + 14 * 24 * 3600 // 14 days ahead

    // Create a map of high/low tide timestamps for quick lookup
    const tideEventMap = new Map<number, 'high' | 'low'>()
    tideData.tideEvents?.forEach(event => {
      // Round to nearest 15 minutes for matching
      const roundedTs = Math.round(event.timestamp / 900) * 900
      tideEventMap.set(roundedTs, event.type)
    })

    // Sample rate based on view mode
    const sampleRate = viewMode === 'overview' ? 6 : 2 // Every 1.5 hours or 30 min

    const data = tideData.waterLevels
      .filter(level => level.timestamp >= startTs && level.timestamp <= endTs)
      .filter((_, index) => index % sampleRate === 0)
      .map(level => {
        const date = new Date(level.timestamp * 1000)
        const dayStart = startOfDay(new Date())
        const dayIndex = Math.floor((level.timestamp * 1000 - dayStart.getTime()) / (24 * 60 * 60 * 1000))

        // Check if this point is near a high/low tide event
        const roundedTs = Math.round(level.timestamp / 900) * 900
        const eventType = tideEventMap.get(roundedTs)

        return {
          timestamp: level.timestamp,
          time: format(date, 'HH:mm'),
          date: format(date, 'MMM d'),
          dayLabel: format(date, 'EEE'),
          height: convertHeight(level.height, 'm', heightUnit),
          isHigh: eventType === 'high',
          isLow: eventType === 'low',
          isCurrent: false,
          dayIndex,
        }
      })

    // Find and mark the data point closest to current time
    if (data.length > 0) {
      let closestIdx = 0
      let closestDiff = Math.abs(data[0].timestamp - nowTs)
      for (let i = 1; i < data.length; i++) {
        const diff = Math.abs(data[i].timestamp - nowTs)
        if (diff < closestDiff) {
          closestDiff = diff
          closestIdx = i
        }
      }
      data[closestIdx].isCurrent = true
    }

    return data
  }, [tideData, heightUnit, viewMode])

  // Get tide events for the table view
  const tideEventsForDisplay = useMemo(() => {
    if (!tideData?.tideEvents) return []

    const now = Date.now() / 1000
    return tideData.tideEvents
      .filter(event => event.timestamp >= now)
      .slice(0, 56) // ~4 events per day × 14 days
      .map(event => ({
        ...event,
        date: new Date(event.timestamp * 1000),
        heightDisplay: convertHeight(event.height, 'm', heightUnit),
      }))
  }, [tideData, heightUnit])

  // Group tide events by day
  const tideEventsByDay = useMemo(() => {
    const grouped: Record<string, typeof tideEventsForDisplay> = {}
    tideEventsForDisplay.forEach(event => {
      const dayKey = format(event.date, 'yyyy-MM-dd')
      if (!grouped[dayKey]) grouped[dayKey] = []
      grouped[dayKey].push(event)
    })
    return grouped
  }, [tideEventsForDisplay])

  // Calculate Y-axis domain with some padding
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [-1, 4]
    const heights = chartData.map(d => d.height)
    const min = Math.min(...heights)
    const max = Math.max(...heights)
    const padding = (max - min) * 0.1
    return [Math.floor((min - padding) * 10) / 10, Math.ceil((max + padding) * 10) / 10]
  }, [chartData])

  // Get data for detailed view (single day)
  const detailedDayData = useMemo(() => {
    if (viewMode !== 'detailed' || !tideData?.waterLevels) return []

    const nowTs = Date.now() / 1000
    const targetDay = addDays(new Date(), detailedDayOffset)
    const isToday = detailedDayOffset === 0

    // For today, start from 6 hours ago; for future days, start from midnight
    const dayStart = isToday
      ? nowTs - 6 * 3600 // 6 hours before current time
      : startOfDay(targetDay).getTime() / 1000
    const dayEnd = startOfDay(targetDay).getTime() / 1000 + 24 * 3600

    const tideEventMap = new Map<number, 'high' | 'low'>()
    tideData.tideEvents?.forEach(event => {
      const roundedTs = Math.round(event.timestamp / 900) * 900
      tideEventMap.set(roundedTs, event.type)
    })

    const data = tideData.waterLevels
      .filter(level => level.timestamp >= dayStart && level.timestamp <= dayEnd)
      .filter((_, index) => index % 2 === 0) // Every 30 min
      .map(level => {
        const date = new Date(level.timestamp * 1000)
        const roundedTs = Math.round(level.timestamp / 900) * 900
        const eventType = tideEventMap.get(roundedTs)

        return {
          timestamp: level.timestamp,
          time: format(date, 'HH:mm'),
          height: convertHeight(level.height, 'm', heightUnit),
          isHigh: eventType === 'high',
          isLow: eventType === 'low',
          isCurrent: false,
        }
      })

    // Mark current time point if viewing today
    if (isToday && data.length > 0) {
      let closestIdx = 0
      let closestDiff = Math.abs(data[0].timestamp - nowTs)
      for (let i = 1; i < data.length; i++) {
        const diff = Math.abs(data[i].timestamp - nowTs)
        if (diff < closestDiff) {
          closestDiff = diff
          closestIdx = i
        }
      }
      data[closestIdx].isCurrent = true
    }

    return data
  }, [tideData, heightUnit, viewMode, detailedDayOffset])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-rc-bg-dark border border-rc-bg-light rounded-lg px-3 py-2 shadow-xl">
          <div className="flex items-center gap-2 text-xs text-rc-text-muted mb-1">
            {data.isCurrent && (
              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded font-medium">
                NOW
              </span>
            )}
            <span>{data.date ? `${data.date} • ` : ''}{data.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-rc-text">
              {data.height.toFixed(2)} {heightUnit}
            </span>
            {data.isHigh && (
              <span className="flex items-center gap-1 text-xs text-blue-400 font-medium">
                <ArrowUp className="w-3 h-3" /> High
              </span>
            )}
            {data.isLow && (
              <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                <ArrowDown className="w-3 h-3" /> Low
              </span>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  // Unit toggle component
  const UnitToggle = () => (
    <div className="flex bg-rc-bg-dark rounded-lg overflow-hidden">
      {['m', 'ft'].map((opt) => (
        <button
          key={opt}
          onClick={() => cycleUnit('height')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            heightUnit === opt
              ? 'bg-rc-bg-light text-rc-text'
              : 'text-rc-text-muted hover:text-rc-text'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )

  if (!tideData) {
    return (
      <div className={cn('bg-rc-bg-dark rounded-xl border border-rc-bg-light p-6', className)}>
        <div className="flex flex-col items-center justify-center py-8 text-rc-text-muted">
          <Waves className="w-12 h-12 mb-3 opacity-50" />
          <span className="text-sm">No tide data available</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-rc-bg-dark rounded-xl border border-rc-bg-light overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-rc-bg-light">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-semibold text-rc-text">14-Day Tide Forecast</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-rc-bg-darkest rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'overview'
                  ? 'bg-rc-bg-light text-rc-text'
                  : 'text-rc-text-muted hover:text-rc-text'
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'detailed'
                  ? 'bg-rc-bg-light text-rc-text'
                  : 'text-rc-text-muted hover:text-rc-text'
              )}
            >
              Daily
            </button>
          </div>
          <UnitToggle />
        </div>
      </div>

      {/* Station Info */}
      <div className="px-4 py-2 bg-rc-bg-darkest/50 border-b border-rc-bg-light flex items-center gap-2">
        <span className="text-xs text-rc-text-muted">
          {tideData.dataSource === 'stormglass'
            ? 'Source: Stormglass (estimated)'
            : (
              <>
                Station: <span className="text-rc-text-light">
                  {tideData.station?.name || 'Unknown'}
                  {tideData.stationCode && ` (${tideData.stationCode})`}
                </span>
                {tideData.stationDistanceKm != null && (
                  <span className="text-rc-text-muted"> — {tideData.stationDistanceKm}km</span>
                )}
              </>
            )}
        </span>
      </div>

      {/* Chart */}
      <div className="p-4">
        {viewMode === 'detailed' && (
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setDetailedDayOffset(Math.max(0, detailedDayOffset - 1))}
              disabled={detailedDayOffset === 0}
              className="p-2 rounded-lg bg-rc-bg-darkest text-rc-text-muted hover:text-rc-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="text-sm font-semibold text-rc-text">
                {format(addDays(new Date(), detailedDayOffset), 'EEEE, MMMM d')}
              </div>
              {detailedDayOffset === 0 && (
                <span className="text-xs text-blue-400">Today</span>
              )}
            </div>
            <button
              onClick={() => setDetailedDayOffset(Math.min(13, detailedDayOffset + 1))}
              disabled={detailedDayOffset === 13}
              className="p-2 rounded-lg bg-rc-bg-darkest text-rc-text-muted hover:text-rc-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="h-[200px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={viewMode === 'overview' ? chartData : detailedDayData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#333"
                opacity={0.3}
                vertical={false}
              />
              <XAxis
                dataKey={viewMode === 'overview' ? 'date' : 'time'}
                stroke="#666"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={viewMode === 'overview' ? 'preserveStartEnd' : 3}
                tick={{ fill: '#888' }}
              />
              <YAxis
                domain={yAxisDomain}
                stroke="#666"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickCount={5}
                width={35}
                tick={{ fill: '#888' }}
                tickFormatter={(value) => `${value.toFixed(1)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Zero reference line */}
              <ReferenceLine y={0} stroke="#444" strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="height"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#tideGradient)"
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  // Current time marker - most prominent
                  if (payload.isCurrent) {
                    return (
                      <g key={`current-${payload.timestamp}`}>
                        {/* Pulsing outer ring */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={12}
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth={2}
                          opacity={0.4}
                          className="animate-ping"
                        />
                        {/* Solid outer ring */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={8}
                          fill="#22c55e"
                          stroke="#fff"
                          strokeWidth={2}
                        />
                        {/* Inner dot */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill="#fff"
                        />
                      </g>
                    )
                  }
                  if (payload.isHigh) {
                    return (
                      <circle
                        key={`high-${payload.timestamp}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#3b82f6"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )
                  }
                  if (payload.isLow) {
                    return (
                      <circle
                        key={`low-${payload.timestamp}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#f59e0b"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )
                  }
                  // Return invisible element for regular points
                  return <g key={`empty-${payload.timestamp}`} />
                }}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 pt-4 border-t border-rc-bg-light flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full bg-green-500 border-2 border-white" />
              <div className="absolute inset-[5px] rounded-full bg-white" />
            </div>
            <span className="text-xs text-rc-text-muted">Now</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
            <span className="text-xs text-rc-text-muted">High Tide</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white" />
            <span className="text-xs text-rc-text-muted">Low Tide</span>
          </div>
        </div>
      </div>

      {/* Tide Events Table */}
      <div className="border-t border-rc-bg-light">
        <div className="px-4 py-3 bg-rc-bg-darkest/50">
          <h4 className="text-sm font-medium text-rc-text">Upcoming Tide Events</h4>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {Object.entries(tideEventsByDay).slice(0, 7).map(([dayKey, events]) => {
            const dayDate = new Date(dayKey)
            const isCurrentDay = isToday(dayDate)

            return (
              <div key={dayKey} className="border-b border-rc-bg-light last:border-0">
                <div className={cn(
                  'px-4 py-2 text-xs font-medium',
                  isCurrentDay ? 'bg-blue-500/10 text-blue-400' : 'bg-rc-bg-darkest/30 text-rc-text-muted'
                )}>
                  {format(dayDate, 'EEEE, MMM d')}
                  {isCurrentDay && <span className="ml-2">(Today)</span>}
                </div>
                <div className="divide-y divide-rc-bg-light/50">
                  {events.map((event, idx) => (
                    <div
                      key={`${dayKey}-${idx}`}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-rc-bg-light/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-1.5 rounded-lg',
                          event.type === 'high' ? 'bg-blue-500/20' : 'bg-amber-500/20'
                        )}>
                          {event.type === 'high' ? (
                            <ArrowUp className="w-4 h-4 text-blue-400" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <span className={cn(
                            'text-sm font-medium',
                            event.type === 'high' ? 'text-blue-400' : 'text-amber-400'
                          )}>
                            {event.type === 'high' ? 'High' : 'Low'} Tide
                          </span>
                          <div className="text-xs text-rc-text-muted">
                            {format(event.date, 'h:mm a')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-rc-text">
                          {event.heightDisplay.toFixed(2)} {heightUnit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
