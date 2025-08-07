'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { ChartTooltip } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getScoreColor } from '../../utils/formatters'
import { cn } from '@/lib/utils'

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

interface MobileFriendlyChartProps {
  minutelyScores: MinutelyScore[]
  twoHourForecasts: TwoHourForecast[]
  sunrise: number
  sunset: number
  dayName: string
  isMobile?: boolean
}

export default function MobileFriendlyChart({
  minutelyScores,
  twoHourForecasts,
  sunrise,
  sunset,
  dayName,
  isMobile = false,
}: MobileFriendlyChartProps) {

  // Helper functions
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
    })
  }

  const formatTimeDetailed = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const isPeakTime = useMemo(() => (timestamp: number) => {
    const timeDiff = 1.5 * 3600 // 1.5 hours in seconds
    return Math.abs(timestamp - sunrise) <= timeDiff || Math.abs(timestamp - sunset) <= timeDiff
  }, [sunrise, sunset])

  const getGradientColor = (score: number) => {
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

  // Simplify data for mobile - show every 30 minutes instead of 15
  const chartData = useMemo(() => {
    const data = minutelyScores
      .filter((_, index) => !isMobile || index % 2 === 0) // Show every 30 min on mobile
      .map((score, index) => {
        const isInBestWindow =
          score.timestamp >= bestTwoHourWindow.startTime && score.timestamp <= bestTwoHourWindow.endTime
        const isPeak = isPeakTime(score.timestamp)

        return {
          index,
          time: formatTime(score.timestamp),
          fullTime: formatTimeDetailed(score.timestamp),
          score: score.score,
          temp: score.temp,
          windSpeed: score.windSpeed,
          precipitation: score.precipitation,
          conditions: score.conditions,
          isInBestWindow,
          isPeak,
          color: getGradientColor(score.score),
        }
      })
    return data
  }, [minutelyScores, isMobile, bestTwoHourWindow.startTime, bestTwoHourWindow.endTime, isPeakTime])

  const maxScore = Math.max(...minutelyScores.map(s => s.score))
  const avgScore = minutelyScores.reduce((sum, s) => sum + s.score, 0) / minutelyScores.length


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
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <div className="text-white font-semibold text-sm mb-1">{data.fullTime}</div>
          <div className={cn("text-base font-bold mb-2", getScoreColor(data.score))}>
            {data.score.toFixed(1)}/10 • {getScoreLabel(data.score)}
          </div>
          <div className="space-y-0.5 text-xs text-gray-300">
            <div>🌡️ {Math.round(data.temp)}°C</div>
            <div>💨 {Math.round(data.windSpeed)} km/h</div>
            {data.precipitation > 0 && <div>🌧️ {data.precipitation.toFixed(1)}mm</div>}
          </div>
          {data.isInBestWindow && (
            <div className="mt-2 text-blue-300 text-xs font-semibold">⭐ Best window</div>
          )}
          {data.isPeak && <div className="mt-1 text-yellow-400 text-xs">🌅 Peak time</div>}
        </div>
      )
    }
    return null
  }

  // Simple dot to mark peak times
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (payload.isPeak) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill="#fbbf24"
          stroke="#fbbf24"
          strokeWidth={2}
          className="animate-pulse"
        />
      )
    }
    return null
  }

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-lg sm:text-xl font-semibold text-white">
          Fishing Forecast • {dayName}
        </CardTitle>
        <CardDescription className="text-gray-300 text-sm">
          Tap chart for details • Yellow dots = Peak times
        </CardDescription>
      </CardHeader>

      <CardContent className="p-2 sm:p-6">
        {/* Best Time Banner */}
        {bestTwoHourWindow && (
          <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/40 border border-blue-500/50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-blue-300 text-xs sm:text-sm font-semibold mb-0.5">
                  🏆 Best Time Today
                </p>
                <p className="text-white font-bold text-sm sm:text-base">
                  {formatTime(bestTwoHourWindow.startTime)} - {formatTime(bestTwoHourWindow.endTime)}
                </p>
              </div>
              <div className={cn("text-2xl font-bold", getScoreColor(bestTwoHourWindow.score.total))}>
                {bestTwoHourWindow.score.total}/10
              </div>
            </div>
          </div>
        )}

        {/* Chart - Responsive height */}
        <div className="h-[200px] sm:h-[300px] w-full -mx-2 sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 5,
                right: isMobile ? 5 : 20,
                left: isMobile ? -20 : 0,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="time"
                stroke="#9CA3AF"
                fontSize={isMobile ? 10 : 12}
                tickLine={false}
                axisLine={false}
                interval={isMobile ? 'preserveStartEnd' : 'preserveStart'}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={isMobile ? 10 : 12}
                tickLine={false}
                axisLine={false}
                domain={[0, 10]}
                ticks={[0, 5, 10]}
                width={isMobile ? 20 : 40}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#scoreGradient)"
                dot={<CustomDot />}
                activeDot={{ r: 6, fill: '#3b82f6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats - Mobile optimized */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-gray-400 text-xs">Average</p>
            <p className="text-white font-bold text-sm sm:text-lg">{avgScore.toFixed(1)}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-gray-400 text-xs">Best</p>
            <p className={cn("font-bold text-sm sm:text-lg", getScoreColor(maxScore))}>
              {maxScore.toFixed(1)}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-gray-400 text-xs">Peak Times</p>
            <p className="text-yellow-400 font-bold text-sm sm:text-lg">
              {chartData.filter(d => d.isPeak).length}
            </p>
          </div>
        </div>

        {/* Simplified Legend - Mobile */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-300">Excellent (8+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-gray-300">Good (6-8)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-gray-300">Fair (4-6)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">Poor (&lt;4)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}