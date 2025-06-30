'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ReferenceLine } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getScoreColor } from '../utils/formatters'

interface MinutelyScore {
  time: string
  timestamp: number
  score: number
  temp: number
  conditions: string
  icon: string
  windSpeed: number
  precipitation: number
}

interface TwoHourForecast {
  startTime: number
  endTime: number
  score: {
    total: number
  }
  avgTemp: number
  conditions: string
  icon: string
  windSpeed: number
  precipitation: number
  pressure: number
}

interface ShadcnMinutelyBarChartProps {
  minutelyScores: MinutelyScore[]
  twoHourForecasts: TwoHourForecast[]
  sunrise: number
  sunset: number
  dayName: string
}

export default function ShadcnMinutelyBarChart({
  minutelyScores,
  twoHourForecasts,
  sunrise,
  sunset,
  dayName,
}: ShadcnMinutelyBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

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
    // Show time every hour or every 4th data point
    return minutes === 0 ? `${hours.toString().padStart(2, '0')}:00` : ''
  }

  const isPeakTime = (timestamp: number) => {
    const timeDiff = 1.5 * 3600 // 1.5 hours in seconds
    return Math.abs(timestamp - sunrise) <= timeDiff || Math.abs(timestamp - sunset) <= timeDiff
  }

  const getBarColor = (score: number, isInBestWindow: boolean) => {
    if (isInBestWindow) return '#fbbf24' // yellow-400

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
  const bestTwoHourWindow = twoHourForecasts.reduce(
    (best, current) => (current.score.total > best.score.total ? current : best),
    twoHourForecasts[0],
  )

  // Format data for recharts
  const chartData = minutelyScores.map((score, index) => {
    const isInBestWindow =
      score.timestamp >= bestTwoHourWindow.startTime && score.timestamp <= bestTwoHourWindow.endTime
    const isPeak = isPeakTime(score.timestamp)

    return {
      index,
      time: formatTimeShort(score.timestamp),
      fullTime: formatTime(score.timestamp),
      score: score.score,
      temp: score.temp,
      windSpeed: score.windSpeed,
      precipitation: score.precipitation,
      conditions: score.conditions,
      isInBestWindow,
      isPeak,
      fill: getBarColor(score.score, isInBestWindow),
    }
  })

  const maxScore = Math.max(...minutelyScores.map(s => s.score))
  const avgScore = minutelyScores.reduce((sum, s) => sum + s.score, 0) / minutelyScores.length

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
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl">
          <div className="text-white font-semibold mb-1">{data.fullTime}</div>
          <div className={`text-lg font-bold mb-2 ${getScoreColor(data.score)}`}>
            Score: {data.score.toFixed(1)}/10 ({getScoreLabel(data.score)})
          </div>
          <div className="space-y-1 text-sm text-gray-300">
            <div>🌡️ {Math.round(data.temp)}°C</div>
            <div>💨 {Math.round(data.windSpeed)} km/h</div>
            <div>🌧️ {data.precipitation.toFixed(1)}mm</div>
            <div className="capitalize">☁️ {data.conditions}</div>
          </div>
          {data.isInBestWindow && (
            <div className="mt-2 text-yellow-300 text-xs font-semibold">⭐ In best 2-hour window</div>
          )}
          {data.isPeak && <div className="mt-1 text-yellow-400 text-xs">🌅 Peak fishing time</div>}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-white mb-2">
              📊 15-Minute Fishing Scores - {dayName}
            </CardTitle>
            <CardDescription className="text-gray-300">
              {minutelyScores.length} data points • Best 2-hour window highlighted
            </CardDescription>
          </div>

          {bestTwoHourWindow && (
            <div className="text-right">
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
                <p className="text-yellow-300 text-sm font-semibold">🏆 Best 2-Hour Window</p>
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
      </CardHeader>

      <CardContent>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 10]}
              label={{
                value: 'Fishing Score',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#9CA3AF' },
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
                  stroke={entry.isInBestWindow ? '#fbbf24' : 'transparent'}
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
            <span className="text-gray-300">Excellent (8-10)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span className="text-gray-300">Good (6-7.9)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-gray-300">Fair (4-5.9)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-300">Poor (&lt;4)</span>
          </div>
        </div>

        {/* Additional Legend for Special Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded border-2 border-yellow-400"></div>
            <span className="text-yellow-300">Best 2-Hour Window</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-400">Peak Times (Dawn/Dusk)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-gray-600 rounded"></div>
            <span className="text-gray-300">Reference Lines (Score Thresholds)</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-sm">Average Score</p>
            <p className="text-white font-bold text-lg">{avgScore.toFixed(1)}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-sm">Best Score</p>
            <p className={`font-bold text-lg ${getScoreColor(maxScore)}`}>{maxScore.toFixed(1)}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-sm">Peak Periods</p>
            <p className="text-yellow-400 font-bold text-lg">{chartData.filter(d => d.isPeak).length}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-sm">Data Points</p>
            <p className="text-white font-bold text-lg">{minutelyScores.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
