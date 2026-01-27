'use client'

import { useMemo, useState, useEffect } from 'react'
import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '../../utils/openMeteoApi'
import { CHSWaterData } from '../../utils/chsTideApi'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useUnitPreferences } from '@/contexts/unit-preferences-context'
import { convertWind, convertTemp, convertHeight } from '@/app/utils/unit-conversions'

interface HourlyTableNewProps {
  forecasts: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: CHSWaterData | null
  selectedDay?: number
  highlightedIndex?: number | null
  mobilePeriod?: 'am' | 'pm'
  onPeriodChange?: (period: 'am' | 'pm') => void
}

export default function HourlyTableNew({
  forecasts,
  openMeteoData,
  tideData,
  selectedDay = 0,
  highlightedIndex = null,
  mobilePeriod = 'am',
  onPeriodChange,
}: HourlyTableNewProps) {
  const { windUnit, tempUnit, heightUnit, cycleUnit } = useUnitPreferences()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const selectedForecast = forecasts[selectedDay]

  // Get wind direction abbreviation
  const getWindDir = (direction: number) => {
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(direction / 45) % 8]
  }

  // Build table data - hourly intervals (matching the chart exactly)
  const tableData = useMemo(() => {
    if (!selectedForecast) return []

    // Helper function INSIDE useMemo to ensure it uses current tideData
    const getTideHeight = (timestamp: number): number | null => {
      if (!tideData?.waterLevels?.length) return null

      const closestLevel = tideData.waterLevels.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.timestamp - timestamp)
        const currDiff = Math.abs(curr.timestamp - timestamp)
        return currDiff < prevDiff ? curr : prev
      })

      // Only use if within 1 hour (3600 seconds) - same as chart
      if (Math.abs(closestLevel.timestamp - timestamp) > 3600) return null
      return closestLevel.height
    }

    // Build timestamp lookup map for meteo data (works correctly for all days)
    const meteoByTimestamp = new Map(
      openMeteoData?.minutely15.map(m => [m.timestamp, m]) ?? []
    )
    const findMeteoData = (timestamp: number) => {
      // Try exact match first, then find closest within 15 minutes
      const exact = meteoByTimestamp.get(timestamp)
      if (exact) return exact
      let closest = null
      let closestDiff = Infinity
      for (const [ts, data] of meteoByTimestamp) {
        const diff = Math.abs(ts - timestamp)
        if (diff < closestDiff) {
          closestDiff = diff
          closest = data
        }
      }
      return closestDiff <= 900 ? closest : null // within 15 min
    }

    // Use exact same data source as chart - filter minutelyScores every 4th item
    return selectedForecast.minutelyScores
      .filter((_, index) => index % 4 === 0) // Every hour (same as chart)
      .map((score, hourIndex) => {
        const hour = new Date(score.timestamp * 1000).getHours()
        const displayHour = hour.toString().padStart(2, '0') + ':00'

        // Get tide height using score.timestamp (same as chart)
        const tideHeightMeters = getTideHeight(score.timestamp)

        // Determine if tide is rising at this specific time
        const prevTideHeight = hourIndex > 0 ? getTideHeight(score.timestamp - 3600) : null
        const isRising = tideHeightMeters !== null && prevTideHeight !== null
          ? tideHeightMeters > prevTideHeight
          : tideData?.isRising

        // Get wave height - use actual data if available, otherwise estimate from wind
        const windSpeed = score.windSpeed || 10
        const waveHeight = score.waveHeight ?? Math.min((windSpeed / 3.6) * 0.1, 5.0)

        // Get additional weather data from openMeteoData (timestamp-based for correct day)
        const meteoData = findMeteoData(score.timestamp)

        return {
          time: displayHour,
          timestamp: score.timestamp,
          hourIndex,
          score: Math.round(score.score || 5),
          windSpeed: score.windSpeed,
          windGusts: meteoData?.windGusts ?? 0,
          windDir: getWindDir(meteoData?.windDirection ?? 0),
          windDirection: meteoData?.windDirection ?? 0,
          temp: score.temp,
          precipProbability: meteoData?.precipitationProbability ?? 0,
          cloudCover: meteoData?.cloudCover ?? 0,
          waveHeight,
          tideHeight: tideHeightMeters,
          tideRising: isRising,
          // New fields
          pressure: meteoData?.pressure ?? 0,
          seaSurfaceTemp: meteoData?.seaSurfaceTemp ?? null,
          visibility: meteoData?.visibility ?? 0,
          swellHeight: meteoData?.swellHeight ?? null,
          humidity: meteoData?.humidity ?? 0,
        }
      })
  }, [selectedForecast, openMeteoData, tideData])

  // Format values
  const formatScore = (score: number) => score.toString()

  const formatWindValue = (kph: number) => {
    const converted = convertWind(kph, 'kph', windUnit)
    return Math.round(converted).toString()
  }

  const formatTempValue = (celsius: number) => {
    const converted = convertTemp(celsius, 'C', tempUnit)
    return Math.round(converted).toString()
  }

  const formatHeightValue = (meters: number) => {
    const converted = convertHeight(meters, 'm', heightUnit)
    return converted.toFixed(1)
  }

  // Row definitions - most important at top, secondary at bottom
  const rows = [
    // --- Core fishing data ---
    {
      id: 'score',
      label: 'Score',
      unit: '/10',
      getValue: (d: typeof tableData[0]) => formatScore(d.score),
      onClick: undefined,
    },
    {
      id: 'wind',
      label: 'Wind',
      unit: windUnit,
      getValue: (d: typeof tableData[0]) => formatWindValue(d.windSpeed),
      getExtra: (d: typeof tableData[0]) => d.windDir,
      onClick: () => cycleUnit('wind'),
    },
    {
      id: 'gusts',
      label: 'Gusts',
      unit: windUnit,
      getValue: (d: typeof tableData[0]) => formatWindValue(d.windGusts),
      onClick: () => cycleUnit('wind'),
    },
    {
      id: 'temp',
      label: 'Temp',
      unit: tempUnit === 'C' ? '°C' : '°F',
      getValue: (d: typeof tableData[0]) => formatTempValue(d.temp),
      onClick: () => cycleUnit('temp'),
    },
    {
      id: 'wave',
      label: 'Wave',
      unit: heightUnit,
      getValue: (d: typeof tableData[0]) => formatHeightValue(d.waveHeight),
      onClick: () => cycleUnit('height'),
    },
    {
      id: 'tide',
      label: 'Tide',
      unit: heightUnit,
      getValue: (d: typeof tableData[0]) => d.tideHeight !== null ? formatHeightValue(d.tideHeight) : '--',
      getExtra: (d: typeof tableData[0]) => d.tideHeight !== null ? (d.tideRising ? 'up' : 'down') : null,
      onClick: () => cycleUnit('height'),
    },
    {
      id: 'pressure',
      label: 'Pressure',
      unit: 'hPa',
      getValue: (d: typeof tableData[0]) => d.pressure ? Math.round(d.pressure).toString() : '--',
      onClick: undefined,
    },
    // --- Secondary data ---
    {
      id: 'sst',
      label: 'Sea Temp',
      unit: tempUnit === 'C' ? '°C' : '°F',
      getValue: (d: typeof tableData[0]) => d.seaSurfaceTemp !== null ? formatTempValue(d.seaSurfaceTemp) : '--',
      onClick: () => cycleUnit('temp'),
    },
    {
      id: 'swell',
      label: 'Swell',
      unit: heightUnit,
      getValue: (d: typeof tableData[0]) => d.swellHeight !== null ? formatHeightValue(d.swellHeight) : '--',
      onClick: () => cycleUnit('height'),
    },
    {
      id: 'rain',
      label: 'Rain',
      unit: '%',
      getValue: (d: typeof tableData[0]) => d.precipProbability.toString(),
      onClick: undefined,
    },
    {
      id: 'clouds',
      label: 'Clouds',
      unit: '%',
      getValue: (d: typeof tableData[0]) => d.cloudCover.toString(),
      onClick: undefined,
    },
    {
      id: 'humidity',
      label: 'Humidity',
      unit: '%',
      getValue: (d: typeof tableData[0]) => d.humidity.toString(),
      onClick: undefined,
    },
    {
      id: 'visibility',
      label: 'Visibility',
      unit: 'km',
      getValue: (d: typeof tableData[0]) => d.visibility ? (d.visibility / 1000).toFixed(0) : '--',
      onClick: undefined,
    },
  ]

  // On mobile, split into AM/PM halves; on desktop show all
  const visibleData = useMemo(() => {
    if (!isMobile) return tableData.map((d, i) => ({ ...d, originalIndex: i }))
    const half = Math.ceil(tableData.length / 2)
    const slice = mobilePeriod === 'am' ? tableData.slice(0, half) : tableData.slice(half)
    const offset = mobilePeriod === 'am' ? 0 : half
    return slice.map((d, i) => ({ ...d, originalIndex: offset + i }))
  }, [tableData, isMobile, mobilePeriod])

  if (!tableData.length) {
    return (
      <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4">
        <p className="text-rc-text-muted">No data available</p>
      </div>
    )
  }


  return (
    <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light overflow-hidden">
      {/* AM/PM toggle - mobile only */}
      {isMobile && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-rc-bg-light bg-rc-bg-dark/50">
          <span className="text-xs text-rc-text-muted">Hourly Data</span>
          <div className="flex bg-rc-bg-darkest rounded-lg overflow-hidden border border-rc-bg-light">
            <button
              onClick={() => onPeriodChange?.('am')}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                mobilePeriod === 'am'
                  ? 'bg-blue-600 text-rc-text'
                  : 'text-rc-text-muted hover:text-rc-text'
              }`}
            >
              AM
            </button>
            <button
              onClick={() => onPeriodChange?.('pm')}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                mobilePeriod === 'pm'
                  ? 'bg-blue-600 text-rc-text'
                  : 'text-rc-text-muted hover:text-rc-text'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      )}

      {/* Table aligned with chart above */}
      <div className="flex">
        {/* Left label column - matches chart Y-axis width */}
        <div className="flex-shrink-0" style={{ width: '55px' }}>
          {/* Time header */}
          <div className="px-1.5 py-2 border-b border-rc-bg-light bg-rc-bg-dark/50 h-[32px] flex items-center">
            <span className="text-[10px] text-rc-text-muted">Time</span>
          </div>
          {/* Row labels */}
          {rows.map((row) => (
            <div
              key={row.id}
              className={`px-1.5 py-2 border-b border-rc-bg-dark bg-rc-bg-dark/30 h-[44px] flex flex-col justify-center ${
                row.onClick ? 'cursor-pointer hover:bg-rc-bg-dark/50' : ''
              }`}
              onClick={row.onClick}
              title={row.onClick ? 'Click to change unit' : undefined}
            >
              <div className="text-[10px] font-medium text-rc-text">{row.label}</div>
              <div className="text-[10px] text-rc-text-muted">{row.unit}</div>
            </div>
          ))}
        </div>

        {/* Data columns - flex to fill remaining space */}
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max">
            {visibleData.map((d, i) => {
              const isHighlighted = highlightedIndex === d.originalIndex
              return (
                <div key={i} className={`flex-1 min-w-[40px] transition-colors ${isHighlighted ? 'bg-blue-500/15' : ''}`}>
                  {/* Time header */}
                  <div className={`px-1 py-2 text-center border-b border-rc-bg-light border-l border-rc-bg-light/50 h-[32px] flex items-center justify-center ${isHighlighted ? 'bg-blue-500/20' : ''}`}>
                    <span className={`text-xs ${isHighlighted ? 'text-rc-text font-medium' : 'text-rc-text-muted'}`}>{d.time.replace(':00', '')}</span>
                  </div>
                  {/* Data cells */}
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className={`px-1 py-2 text-center border-b border-rc-bg-dark border-l border-rc-bg-light/30 h-[44px] flex flex-col items-center justify-center`}
                    >
                      <span className="text-xs text-rc-text">{row.getValue(d)}</span>
                      {row.getExtra && row.getExtra(d) && (
                        row.id === 'tide' ? (
                          row.getExtra(d) === 'up' ? (
                            <ArrowUpRight className="w-3 h-3 text-green-500" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-red-500" />
                          )
                        ) : (
                          <span className="text-[10px] text-rc-text-muted">{row.getExtra(d)}</span>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
