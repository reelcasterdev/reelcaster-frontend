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

  // Build table data - hourly intervals (matching the chart)
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
      const displayHour = hour.toString().padStart(2, '0') + ':00'

      // Use score.timestamp for tide lookup (same as chart)
      const tideWaterLevel = getTideHeightAtTime(score.timestamp)

      // Determine if tide is rising at this specific time
      const prevTide = hourIndex > 0 ? getTideHeightAtTime(score.timestamp - 3600) : null
      const isRising = tideWaterLevel && prevTide
        ? tideWaterLevel.height > prevTide.height
        : tideData?.isRising

      // Get wave height - use actual data if available, otherwise estimate from wind
      const windSpeed = data.windSpeed || 10
      const waveHeight = score?.waveHeight ?? Math.min((windSpeed / 3.6) * 0.1, 5.0)

      return {
        time: displayHour,
        timestamp: data.timestamp,
        hourIndex,
        score: Math.round(score?.score || 5),
        windSpeed: data.windSpeed,
        windDir: getWindDir(data.windDirection),
        windDirection: data.windDirection,
        temp: data.temp,
        waveHeight,
        tideHeight: tideWaterLevel?.height ?? null,
        tideRising: isRising,
      }
    })
  }, [selectedForecast, openMeteoData, tideData, selectedDay])

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
