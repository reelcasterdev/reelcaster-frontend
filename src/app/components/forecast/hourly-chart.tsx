'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ReferenceLine } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { getScoreColor } from '../../utils/formatters'

interface HourlyChartProps {
  forecasts: OpenMeteoDailyForecast[]
  selectedDay?: number
}

export default function HourlyChart({ forecasts, selectedDay = 0 }: HourlyChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  
  // Get selected day's forecast
  const selectedForecast = forecasts[selectedDay]

  if (!selectedForecast) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <p className="text-slate-400">No data available for selected day</p>
      </div>
    )
  }

  // Helper functions
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const formatTimeShort = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    // Show time every hour or every 4th data point (every hour for 15-min intervals)
    return minutes === 0 ? `${hours.toString().padStart(2, '0')}:00` : ''
  }

  const isPeakTime = (timestamp: number) => {
    const timeDiff = 1.5 * 3600 // 1.5 hours in seconds
    return Math.abs(timestamp - selectedForecast.sunrise) <= timeDiff || 
           Math.abs(timestamp - selectedForecast.sunset) <= timeDiff
  }

  const getBarColor = (score: number, isInBestWindow: boolean) => {
    if (isInBestWindow) return '#3b82f6' // blue-500 for best window

    if (score >= 8) return '#10b981' // green-500
    if (score >= 6) return '#f59e0b' // amber-500
    if (score >= 4) return '#f97316' // orange-500
    return '#ef4444' // red-500
  }

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent'
    if (score >= 6) return 'Good'
    if (score >= 4) return 'Fair'
    return 'Poor'
  }

  // Find the best 2-hour window
  const bestTwoHourWindow = selectedForecast.twoHourForecasts.reduce(
    (best, current) => (current.score.total > best.score.total ? current : best),
    selectedForecast.twoHourForecasts[0],
  )

  // Format data for recharts - use 15-minute intervals
  const chartData = selectedForecast.minutelyScores.map((score, index) => {
    const isInBestWindow =
      score.timestamp >= bestTwoHourWindow.startTime && score.timestamp <= bestTwoHourWindow.endTime
    const isPeak = isPeakTime(score.timestamp)

    return {
      index,
      time: formatTimeShort(score.timestamp),
      fullTime: formatTime(score.timestamp),
      score: score.score,
      timestamp: score.timestamp,
      isInBestWindow,
      isPeak,
      fill: getBarColor(score.score, isInBestWindow),
    }
  })

  const maxScore = Math.max(...selectedForecast.minutelyScores.map(s => s.score))
  const avgScore = selectedForecast.minutelyScores.reduce((sum, s) => sum + s.score, 0) / selectedForecast.minutelyScores.length

  const chartConfig = {
    score: {
      label: 'Fishing Score',
    },
  }

  // Custom tooltip content
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ payload: (typeof chartData)[0] }>
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <div className="text-white font-semibold mb-1">{data.fullTime}</div>
          <div className={`text-lg font-bold mb-2 ${getScoreColor(data.score)}`}>
            Score: {data.score.toFixed(1)}/10 ({getScoreLabel(data.score)})
          </div>
          {data.isInBestWindow && (
            <div className="mt-2 text-blue-300 text-xs font-semibold">⭐ In best 2-hour window</div>
          )}
          {data.isPeak && <div className="mt-1 text-yellow-400 text-xs">🌅 Peak fishing time</div>}
        </div>
      )
    }
    return null
  }

  // Get day name for selected day
  const dayName = new Date(selectedForecast.date * 1000).toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'short', 
    day: 'numeric' 
  })

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              15-Minute Fishing Scores - {dayName}
            </h2>
            <p className="text-slate-300 text-sm">
              {selectedForecast.minutelyScores.length} data points • Best 2-hour window highlighted
            </p>
          </div>

          {bestTwoHourWindow && (
            <div className="text-right">
              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3">
                <p className="text-blue-300 text-sm font-semibold">🏆 Best 2-Hour Window</p>
                <p className="text-white font-bold">
                  {formatTime(bestTwoHourWindow.startTime)} - {formatTime(bestTwoHourWindow.endTime)}
                </p>
                <p className={`text-lg font-bold ${getScoreColor(bestTwoHourWindow.score.total)}`}>
                  Score: {bestTwoHourWindow.score.total}/10
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-[400px] w-full">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[0, 10]}
            label={{
              value: 'Fishing Score',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#94a3b8' },
            }}
          />
          <ChartTooltip content={<CustomTooltip />} />

          {/* Reference lines for score ranges */}
          <ReferenceLine y={8} stroke="#10b981" strokeDasharray="2 2" opacity={0.5} />
          <ReferenceLine y={6} stroke="#f59e0b" strokeDasharray="2 2" opacity={0.5} />
          <ReferenceLine y={4} stroke="#f97316" strokeDasharray="2 2" opacity={0.5} />

          <Bar
            dataKey="score"
            radius={[2, 2, 0, 0]}
            onMouseEnter={(data, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill}
                stroke={entry.isInBestWindow ? '#3b82f6' : 'transparent'}
                strokeWidth={entry.isInBestWindow ? 2 : 0}
                opacity={activeIndex === undefined || activeIndex === index ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Peak time indicators */}
      <div className="mt-4 flex flex-wrap gap-2">
        {chartData
          .filter(d => d.isPeak)
          .map((peak, index) => (
            <div key={index} className="flex items-center gap-1 text-xs text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span>{peak.fullTime} (Peak)</span>
            </div>
          ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-slate-300">Excellent (8-10)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded"></div>
          <span className="text-slate-300">Good (6-7.9)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-slate-300">Fair (4-5.9)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-slate-300">Poor (&lt;4)</span>
        </div>
      </div>

      {/* Additional Legend for Special Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded border-2 border-blue-500"></div>
          <span className="text-blue-300">Best 2-Hour Window</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-yellow-400">Peak Times (Dawn/Dusk)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-slate-600 rounded"></div>
          <span className="text-slate-300">Reference Lines (Score Thresholds)</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-slate-400 text-sm">Average Score</p>
          <p className="text-white font-bold text-lg">{avgScore.toFixed(1)}</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-slate-400 text-sm">Best Score</p>
          <p className={`font-bold text-lg ${getScoreColor(maxScore)}`}>{maxScore.toFixed(1)}</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-slate-400 text-sm">Peak Periods</p>
          <p className="text-yellow-400 font-bold text-lg">{chartData.filter(d => d.isPeak).length}</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-slate-400 text-sm">Data Points</p>
          <p className="text-white font-bold text-lg">{selectedForecast.minutelyScores.length}</p>
        </div>
      </div>
    </div>
  )
}