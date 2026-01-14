'use client'

import { useState, useMemo } from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell } from 'recharts'
import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { CHSWaterData } from '../../utils/chsTideApi'
import { useUnitPreferences } from '@/contexts/unit-preferences-context'
import { convertHeight } from '@/app/utils/unit-conversions'

interface HourlyChartNewProps {
  forecasts: OpenMeteoDailyForecast[]
  selectedDay?: number
  species?: string | null
  tideData?: CHSWaterData | null
}

type LayerType = 'score' | 'wind' | 'temp' | 'wave' | 'tide'

const LAYER_TABS: { id: LayerType; label: string }[] = [
  { id: 'score', label: 'Score' },
  { id: 'wind', label: 'Wind' },
  { id: 'temp', label: 'Temp' },
  { id: 'wave', label: 'Wave' },
  { id: 'tide', label: 'Tide' },
]

export default function HourlyChartNew({ forecasts, selectedDay = 0, tideData }: HourlyChartNewProps) {
  const [activeLayer, setActiveLayer] = useState<LayerType>('score')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const { heightUnit } = useUnitPreferences()

  const selectedForecast = forecasts[selectedDay]

  // Helper to find closest tide height for a given timestamp
  const getTideHeightForTimestamp = (timestamp: number): number | null => {
    if (!tideData?.waterLevels?.length) return null

    const closestLevel = tideData.waterLevels.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.timestamp - timestamp)
      const currDiff = Math.abs(curr.timestamp - timestamp)
      return currDiff < prevDiff ? curr : prev
    })

    // Only use if within 1 hour (3600 seconds)
    if (Math.abs(closestLevel.timestamp - timestamp) > 3600) return null
    return closestLevel.height
  }

  // Get max value for the background track
  const getMaxValue = (layer: LayerType): number => {
    switch (layer) {
      case 'score':
        return 10
      case 'wind':
        return 30
      case 'temp':
        return 30
      case 'wave':
        return heightUnit === 'ft' ? 7 : 2 // 2m ≈ 6.5ft
      case 'tide':
        return heightUnit === 'ft' ? 13 : 4 // 4m ≈ 13ft typical max tide
      default:
        return 10
    }
  }

  // Format chart data with background track
  const chartData = useMemo(() => {
    if (!selectedForecast) return []

    const maxValue = getMaxValue('score') // Always use score max for background

    return selectedForecast.minutelyScores
      .filter((_, index) => index % 4 === 0) // Every hour
      .map(score => {
        const hour = new Date(score.timestamp * 1000).getHours()
        const displayHour = hour.toString().padStart(2, '0') + ':00'

        // Use actual wave height from marine API, fallback to estimate from wind
        const windSpeed = score.windSpeed || 10
        const waveHeightMeters = score.waveHeight ?? Math.min((windSpeed / 3.6) * 0.1, 5.0)
        // Convert to user's preferred unit
        const waveHeight = convertHeight(waveHeightMeters, 'm', heightUnit)

        // Get tide height for this hour
        const tideHeightMeters = getTideHeightForTimestamp(score.timestamp)
        const tideHeight = tideHeightMeters !== null
          ? convertHeight(tideHeightMeters, 'm', heightUnit)
          : null

        return {
          time: displayHour,
          score: score.score,
          wind: windSpeed,
          temp: score.temp || 15,
          wave: Math.round(waveHeight * 100) / 100, // Round to 2 decimals for better precision
          tide: tideHeight !== null ? Math.round(tideHeight * 100) / 100 : 0,
          timestamp: score.timestamp,
          background: maxValue, // Full height track
        }
      })
  }, [selectedForecast, heightUnit, tideData])

  // Calculate Y-axis max: 20% higher than the highest value
  const yAxisMax = useMemo(() => {
    if (!chartData.length) return 10

    const maxValue = Math.max(...chartData.map(d => d[activeLayer] as number))
    // Add 20% headroom, but ensure minimum values for readability
    const withHeadroom = maxValue * 1.2

    // For score, cap at 10 since that's the max possible
    if (activeLayer === 'score') return Math.min(10, Math.ceil(withHeadroom))

    // Round up to nice numbers
    if (activeLayer === 'wave') return Math.ceil(withHeadroom * 10) / 10 // Round to 0.1
    return Math.ceil(withHeadroom / 5) * 5 // Round to nearest 5
  }, [chartData, activeLayer])

  if (!selectedForecast) {
    return (
      <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4">
        <p className="text-rc-text-muted">No data available for selected day</p>
      </div>
    )
  }

  // Get bar color based on value and layer
  const getBarColor = (value: number, layer: LayerType) => {
    if (layer === 'score') {
      if (value >= 7) return '#22c55e' // green-500 (Good)
      if (value >= 4) return '#a3a322' // olive/yellow (Average)
      return '#b45454' // muted red (Bad)
    }
    if (layer === 'wind') {
      if (value <= 10) return '#22c55e'
      if (value <= 20) return '#a3a322'
      return '#b45454'
    }
    if (layer === 'temp') {
      if (value >= 15 && value <= 22) return '#22c55e'
      if (value >= 10 && value <= 25) return '#a3a322'
      return '#3b82f6'
    }
    if (layer === 'wave') {
      // Thresholds in user's unit (ft: 1.6/3.3, m: 0.5/1.0)
      const goodThreshold = heightUnit === 'ft' ? 1.6 : 0.5
      const avgThreshold = heightUnit === 'ft' ? 3.3 : 1.0
      if (value <= goodThreshold) return '#22c55e'
      if (value <= avgThreshold) return '#a3a322'
      return '#b45454'
    }
    if (layer === 'tide') {
      // Use blue gradient for tide - darker blue for lower, lighter for higher
      return '#3b82f6' // Blue for all tide values
    }
    return '#3b82f6'
  }

  // Get formatted value for the hovered bar
  const getHoveredValueText = () => {
    if (hoveredIndex === null || !chartData[hoveredIndex]) return null

    const data = chartData[hoveredIndex]
    const value = data[activeLayer]
    const time = data.time.replace(':00', '') // Show as "11" instead of "11:00"

    const layerLabel = LAYER_TABS.find(t => t.id === activeLayer)?.label || ''

    let formattedValue = ''
    if (activeLayer === 'score') {
      formattedValue = `${(value as number).toFixed(1)}/10`
    } else if (activeLayer === 'wind') {
      formattedValue = `${Math.round(value as number)} km/h`
    } else if (activeLayer === 'temp') {
      formattedValue = `${Math.round(value as number)}°C`
    } else if (activeLayer === 'wave' || activeLayer === 'tide') {
      formattedValue = `${(value as number).toFixed(1)} ${heightUnit}`
    }

    return `${layerLabel} ${time}:00 ${formattedValue}`
  }

  // Custom bar shape with rounded corners, background track, and hover effect
  const CustomBar = (props: any) => {
    const { x, y, width, height, fill, background, index } = props
    const isHovered = hoveredIndex === index
    const barWidth = width * 0.7 // Bar width
    const xOffset = (width - barWidth) / 2
    const radius = 6 // Rounded corners
    const bgColor = isHovered ? '#3d3d48' : '#2d2d38' // Lighter on hover

    // Use background props from Recharts for proper positioning
    const bgY = background?.y ?? y
    const bgHeight = background?.height ?? height

    return (
      <g style={{ cursor: 'pointer' }}>
        {/* Background track - full height rounded rectangle */}
        <rect
          x={x + xOffset}
          y={bgY}
          width={barWidth}
          height={bgHeight}
          fill={bgColor}
          rx={radius}
          ry={radius}
          style={{ transition: 'fill 0.15s ease' }}
        />
        {/* Foreground colored bar */}
        <rect
          x={x + xOffset}
          y={y}
          width={barWidth}
          height={height}
          fill={fill}
          rx={radius}
          ry={radius}
          opacity={isHovered ? 1 : 0.85}
          style={{ transition: 'opacity 0.15s ease' }}
        />
        {/* Hover glow effect */}
        {isHovered && (
          <rect
            x={x + xOffset - 2}
            y={bgY - 2}
            width={barWidth + 4}
            height={bgHeight + 4}
            fill="none"
            stroke={fill}
            strokeWidth={2}
            rx={radius + 2}
            ry={radius + 2}
            opacity={0.5}
          />
        )}
      </g>
    )
  }

  return (
    <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div>
          <h2 className="text-xl font-semibold text-rc-text">24H Overall Score</h2>
          <p className="text-sm text-rc-text-muted mt-1">Best fishing periods and outlook for the next two weeks.</p>
        </div>

        {/* Layer Toggle Tabs */}
        <div className="flex items-center gap-1 bg-rc-bg-dark rounded-lg p-1">
          {LAYER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveLayer(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeLayer === tab.id
                  ? 'bg-rc-bg-light text-rc-text'
                  : 'text-rc-text-muted hover:text-rc-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[320px] mt-4 flex">
        {/* Y-axis label */}
        <div className="flex flex-col justify-center pr-2 text-xs text-rc-text-muted" style={{ minWidth: '50px' }}>
          <span className="font-medium text-rc-text-light">
            {activeLayer === 'score' && 'Score'}
            {activeLayer === 'wind' && 'km/h'}
            {activeLayer === 'temp' && '°C'}
            {activeLayer === 'wave' && heightUnit}
            {activeLayer === 'tide' && heightUnit}
          </span>
        </div>

        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 5, left: 0, bottom: 5 }}
              barCategoryGap="2%"
            >
              <XAxis
                dataKey="time"
                stroke="transparent"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={45}
              />
              <YAxis
                domain={[0, yAxisMax]}
                stroke="transparent"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280' }}
                tickCount={5}
                tickFormatter={(value) => {
                  if (activeLayer === 'score') return `${Math.round(value)}`
                  if (activeLayer === 'wind') return `${Math.round(value)}`
                  if (activeLayer === 'temp') return `${Math.round(value)}`
                  if (activeLayer === 'wave') return `${value.toFixed(1)}`
                  if (activeLayer === 'tide') return `${value.toFixed(1)}`
                  return `${Math.round(value)}`
                }}
                width={30}
              />
            <Bar
              dataKey={activeLayer}
              shape={<CustomBar />}
              activeBar={false}
              background={{ fill: '#1a1a1f' }}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry[activeLayer], activeLayer)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Hover Info Display */}
      <div className="h-8 mt-4 flex items-center justify-center">
        {hoveredIndex !== null ? (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-rc-bg-dark rounded-lg">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getBarColor(chartData[hoveredIndex]?.[activeLayer] ?? 0, activeLayer) }}
            />
            <span className="text-sm font-medium text-rc-text">
              {getHoveredValueText()}
            </span>
          </div>
        ) : (
          <span className="text-sm text-rc-text-muted">
            Hover over a bar to see details
          </span>
        )}
      </div>
    </div>
  )
}
