'use client'

import { useMemo } from 'react'
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
}

export default function HourlyTableNew({
  forecasts,
  openMeteoData,
  tideData,
  selectedDay = 0,
}: HourlyTableNewProps) {
  const { windUnit, tempUnit, heightUnit, cycleUnit } = useUnitPreferences()

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

        return {
          time: displayHour,
          timestamp: score.timestamp,
          hourIndex,
          score: Math.round(score.score || 5),
          windSpeed: score.windSpeed,
          windDir: getWindDir(openMeteoData?.minutely15[hourIndex * 4]?.windDirection ?? 0),
          windDirection: openMeteoData?.minutely15[hourIndex * 4]?.windDirection ?? 0,
          temp: score.temp,
          waveHeight,
          tideHeight: tideHeightMeters,
          tideRising: isRising,
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Row definitions matching the chart tabs order
  const rows = [
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
      getExtra: (d: typeof tableData[0]) => d.tideRising !== undefined ? (d.tideRising ? 'up' : 'down') : null,
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
  ]

  if (!tableData.length) {
    return (
      <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4">
        <p className="text-rc-text-muted">No data available</p>
      </div>
    )
  }

  return (
    <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light overflow-hidden">
      {/* Table aligned with chart above */}
      <div className="flex">
        {/* Left label column - matches chart Y-axis width */}
        <div className="flex-shrink-0" style={{ width: '55px' }}>
          {/* Time header */}
          <div className="px-1.5 py-2 border-b border-rc-bg-light bg-rc-bg-dark/50">
            <span className="text-[10px] text-rc-text-muted">Time</span>
          </div>
          {/* Row labels */}
          {rows.map((row) => (
            <div
              key={row.id}
              className={`px-1.5 py-2 border-b border-rc-bg-dark bg-rc-bg-dark/30 ${
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
            {tableData.map((d, i) => (
              <div key={i} className="flex-1 min-w-[40px]">
                {/* Time header */}
                <div className="px-1 py-2 text-center border-b border-rc-bg-light border-l border-rc-bg-light/50">
                  <span className="text-xs text-rc-text-muted">{d.time.replace(':00', '')}</span>
                </div>
                {/* Data cells */}
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="px-1 py-2 text-center border-b border-rc-bg-dark border-l border-rc-bg-light/30 flex flex-col items-center justify-center"
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
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
