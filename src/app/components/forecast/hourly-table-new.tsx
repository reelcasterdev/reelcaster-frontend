'use client'

import { useState, useMemo } from 'react'
import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '../../utils/openMeteoApi'
import { CHSWaterData } from '../../utils/chsTideApi'
import { ChevronUp, ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface HourlyTableNewProps {
  forecasts: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: CHSWaterData | null
  selectedDay?: number
}

type SortField = 'time' | 'score' | 'wind' | 'tide' | 'temp'
type SortDirection = 'asc' | 'desc' | null

export default function HourlyTableNew({
  forecasts,
  openMeteoData,
  tideData,
  selectedDay = 0,
}: HourlyTableNewProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const selectedForecast = forecasts[selectedDay]

  // Get wind direction abbreviation
  const getWindDir = (direction: number) => {
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(direction / 45) % 8]
  }

  // Build table data - hourly intervals
  const tableData = useMemo(() => {
    if (!selectedForecast || !openMeteoData) return []

    // Helper to get tide height at specific time
    const getTideHeightAtTime = (timestamp: number) => {
      if (!tideData?.waterLevels?.length) return null

      const closestWaterLevel = tideData.waterLevels.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.timestamp - timestamp)
        const currDiff = Math.abs(curr.timestamp - timestamp)
        return currDiff < prevDiff ? curr : prev
      })

      return closestWaterLevel
    }

    // Get data for each hour (every 4th 15-min interval)
    return Array.from({ length: 24 }, (_, hourIndex) => {
      const baseIndex = selectedDay * 96
      const dataIndex = Math.min(baseIndex + hourIndex * 4, openMeteoData.minutely15.length - 1)
      const data = openMeteoData.minutely15[dataIndex]

      const scoreIndex = Math.min(hourIndex * 4, selectedForecast.minutelyScores.length - 1)
      const score = selectedForecast.minutelyScores[scoreIndex]

      const hour = new Date(data.timestamp * 1000).getHours()
      const displayHour =
        hour === 0
          ? '12:00 AM'
          : hour < 12
          ? `${hour}:00 AM`
          : hour === 12
          ? '12:00 PM'
          : `${hour - 12}:00 PM`

      const tideWaterLevel = getTideHeightAtTime(data.timestamp)

      // Determine if tide is rising at this specific time
      const prevTide = hourIndex > 0 ? getTideHeightAtTime(data.timestamp - 3600) : null
      const isRising = tideWaterLevel && prevTide
        ? tideWaterLevel.height > prevTide.height
        : tideData?.isRising

      return {
        time: displayHour,
        timestamp: data.timestamp,
        hourIndex,
        score: Math.round(score?.score || 5),
        windSpeed: data.windSpeed,
        windDir: getWindDir(data.windDirection),
        windDirection: data.windDirection,
        temp: data.temp,
        tideHeight: tideWaterLevel?.height ?? null,
        tideRising: isRising,
      }
    })
  }, [selectedForecast, openMeteoData, tideData, selectedDay])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortField || !sortDirection) return tableData

    return [...tableData].sort((a, b) => {
      let aVal: number
      let bVal: number

      switch (sortField) {
        case 'time':
          aVal = a.hourIndex
          bVal = b.hourIndex
          break
        case 'score':
          aVal = a.score
          bVal = b.score
          break
        case 'wind':
          aVal = a.windSpeed
          bVal = b.windSpeed
          break
        case 'tide':
          aVal = a.tideHeight ?? 0
          bVal = b.tideHeight ?? 0
          break
        case 'temp':
          aVal = a.temp
          bVal = b.temp
          break
        default:
          return 0
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [tableData, sortField, sortDirection])

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => (
    <div className="flex flex-col ml-1">
      <ChevronUp
        className={`w-3 h-3 -mb-1 ${
          sortField === field && sortDirection === 'asc'
            ? 'text-rc-text'
            : 'text-rc-text-muted'
        }`}
      />
      <ChevronDown
        className={`w-3 h-3 ${
          sortField === field && sortDirection === 'desc'
            ? 'text-rc-text'
            : 'text-rc-text-muted'
        }`}
      />
    </div>
  )

  // Convert wind speed to knots
  const toKnots = (kph: number) => (kph / 1.852).toFixed(0)

  return (
    <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rc-bg-light">
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('time')}
                  className="flex items-center text-sm text-rc-text-muted hover:text-rc-text transition-colors"
                >
                  Time
                  <SortIcon field="time" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('score')}
                  className="flex items-center text-sm text-rc-text-muted hover:text-rc-text transition-colors"
                >
                  Score
                  <SortIcon field="score" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('wind')}
                  className="flex items-center text-sm text-rc-text-muted hover:text-rc-text transition-colors"
                >
                  Wind
                  <SortIcon field="wind" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('tide')}
                  className="flex items-center text-sm text-rc-text-muted hover:text-rc-text transition-colors"
                >
                  Tide
                  <SortIcon field="tide" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('temp')}
                  className="flex items-center text-sm text-rc-text-muted hover:text-rc-text transition-colors"
                >
                  Temp
                  <SortIcon field="temp" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr
                key={row.hourIndex}
                className="border-b border-rc-bg-dark hover:bg-rc-bg-dark/50 transition-colors"
              >
                {/* Time */}
                <td className="px-4 py-3">
                  <span className="text-sm text-rc-text">{row.time}</span>
                </td>

                {/* Score */}
                <td className="px-4 py-3">
                  <span className="text-sm text-rc-text">
                    {row.score}
                    <span className="text-rc-text-muted">/10</span>
                  </span>
                </td>

                {/* Wind */}
                <td className="px-4 py-3">
                  <span className="text-sm text-rc-text">
                    {toKnots(row.windSpeed)}knots{' '}
                    <span className="text-rc-text-muted">{row.windDir}</span>
                  </span>
                </td>

                {/* Tide */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {row.tideHeight !== null ? (
                      <>
                        <span className="text-sm text-rc-text">
                          {row.tideHeight.toFixed(1)}
                        </span>
                        {row.tideRising ? (
                          <ArrowUpRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-green-500" />
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-rc-text-muted">--</span>
                    )}
                  </div>
                </td>

                {/* Temp */}
                <td className="px-4 py-3">
                  <span className="text-sm text-rc-text">
                    {Math.round(row.temp)}°
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
