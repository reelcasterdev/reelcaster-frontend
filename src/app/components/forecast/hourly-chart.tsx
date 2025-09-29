'use client'

import { useState, useEffect } from 'react'
import { Bar, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Area, ComposedChart, Cell } from 'recharts'
import { ChartTooltip } from '@/components/ui/chart'
import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { getScoreColor } from '../../utils/formatters'
import MobileFriendlyChart from '../charts/mobile-friendly-chart'
import ScoreDetailsModal from './score-details-modal'
import { Info } from 'lucide-react'

interface HourlyChartProps {
  forecasts: OpenMeteoDailyForecast[]
  selectedDay?: number
  species?: string | null
}

export default function HourlyChart({ forecasts, selectedDay = 0, species }: HourlyChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const [isMobile, setIsMobile] = useState(false)
  const [chartType, setChartType] = useState<'bar' | 'line'>('line')
  const [selectedScore, setSelectedScore] = useState<{
    score: any
    timestamp: number
    index: number
    rawData?: any
  } | null>(null)
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640) // sm breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Get selected day's forecast
  const selectedForecast = forecasts[selectedDay]

  if (!selectedForecast) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <p className="text-slate-400">No data available for selected day</p>
      </div>
    )
  }

  // Get day name for selected day
  const dayName = new Date(selectedForecast.date * 1000).toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'short', 
    day: 'numeric' 
  })

  // Use mobile-friendly chart on small screens
  if (isMobile) {
    return (
      <MobileFriendlyChart
        minutelyScores={selectedForecast.minutelyScores}
        twoHourForecasts={selectedForecast.twoHourForecasts}
        sunrise={selectedForecast.sunrise}
        sunset={selectedForecast.sunset}
        dayName={dayName}
        isMobile={true}
      />
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

  return (
    <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-4">
          {/* Title and Toggle Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                15-Minute Fishing Scores - {dayName}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm">
                {selectedForecast.minutelyScores.length} data points • Best 2-hour window highlighted
              </p>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  chartType === 'line'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  chartType === 'bar'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Bar
              </button>
            </div>
          </div>

          {/* Best Window Info */}
          {bestTwoHourWindow && (
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 inline-block">
              <p className="text-blue-300 text-xs sm:text-sm font-semibold">🏆 Best 2-Hour Window</p>
              <p className="text-white font-bold text-sm sm:text-base">
                {formatTime(bestTwoHourWindow.startTime)} - {formatTime(bestTwoHourWindow.endTime)}
              </p>
              <p className={`text-base sm:text-lg font-bold ${getScoreColor(bestTwoHourWindow.score.total)}`}>
                Score: {bestTwoHourWindow.score.total.toFixed(1)}/10
              </p>
              <button
                onClick={() => setSelectedScore({
                  score: bestTwoHourWindow.score,
                  timestamp: bestTwoHourWindow.startTime,
                  index: -1,
                  rawData: {
                    temperature: bestTwoHourWindow.avgTemp,
                    wind: bestTwoHourWindow.windSpeed,
                    precipitation: bestTwoHourWindow.precipitation,
                  }
                })}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                View Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px] sm:h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 20,
              right: 20,
              left: 0,
              bottom: 60,
            }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const index = chartData.findIndex(d => d === e.activePayload[0].payload)
                const scoreData = selectedForecast.minutelyScores[index]
                if (scoreData && scoreData.scoreDetails) {
                  // Get raw data for this time point
                  const rawData = {
                    temperature: scoreData.temp,
                    wind: scoreData.windSpeed,
                    precipitation: scoreData.precipitation,
                    pressure: e.activePayload[0].payload.pressure,
                    // Add more raw values as available
                  }
                  setSelectedScore({
                    score: scoreData.scoreDetails,
                    timestamp: scoreData.timestamp,
                    index,
                    rawData
                  })
                }
              }
            }}
          >
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>

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
                value: 'Score',
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

            {chartType === 'line' ? (
              <>
                {/* Area under the line */}
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="none"
                  fill="url(#colorScore)"
                />

                {/* Main line with clickable dots */}
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: '#3b82f6',
                    style: { cursor: 'pointer' }
                  }}
                  activeDot={{
                    r: 6,
                    style: { cursor: 'pointer' }
                  }}
                />
              </>
            ) : (
              /* Bar chart */
              <Bar
                dataKey="score"
                radius={[2, 2, 0, 0]}
                onMouseEnter={(data: any, index: number) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    stroke={entry.isInBestWindow ? '#3b82f6' : 'transparent'}
                    strokeWidth={entry.isInBestWindow ? 2 : 0}
                    opacity={activeIndex === undefined || activeIndex === index ? 1 : 0.7}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Peak time indicators */}
      <div className="mt-4 flex flex-wrap gap-2">
        {chartData
          .filter(d => d.isPeak)
          .slice(0, 4) // Limit to 4 on mobile
          .map((peak, index) => (
            <div key={index} className="flex items-center gap-1 text-xs text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span>{peak.fullTime} (Peak)</span>
            </div>
          ))}
      </div>

      {/* Legend - Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm mt-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded"></div>
          <span className="text-slate-300">Excellent (8-10)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-amber-500 rounded"></div>
          <span className="text-slate-300">Good (6-7.9)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded"></div>
          <span className="text-slate-300">Fair (4-5.9)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded"></div>
          <span className="text-slate-300">Poor (&lt;4)</span>
        </div>
      </div>

      {/* Additional Legend for Special Indicators - Hidden on mobile */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-slate-700">
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

      {/* Summary Stats - Responsive */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-slate-700/50 rounded-lg p-2 sm:p-3 text-center">
          <p className="text-slate-400 text-xs sm:text-sm">Average Score</p>
          <p className="text-white font-bold text-base sm:text-lg">{avgScore.toFixed(1)}</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-2 sm:p-3 text-center">
          <p className="text-slate-400 text-xs sm:text-sm">Best Score</p>
          <p className={`font-bold text-base sm:text-lg ${getScoreColor(maxScore)}`}>{maxScore.toFixed(1)}</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-2 sm:p-3 text-center">
          <p className="text-slate-400 text-xs sm:text-sm">Peak Periods</p>
          <p className="text-yellow-400 font-bold text-base sm:text-lg">{chartData.filter(d => d.isPeak).length}</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-2 sm:p-3 text-center">
          <p className="text-slate-400 text-xs sm:text-sm">Data Points</p>
          <p className="text-white font-bold text-base sm:text-lg">{selectedForecast.minutelyScores.length}</p>
        </div>
      </div>

      {/* Info message about clicking bars */}
      <div className="mt-4 flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <p className="text-xs text-blue-300">
          Click on any bar to see detailed score breakdown with all factors, weights, and values
        </p>
      </div>

      {/* Score Details Modal */}
      <ScoreDetailsModal
        isOpen={selectedScore !== null}
        onClose={() => setSelectedScore(null)}
        score={selectedScore?.score || null}
        timestamp={selectedScore?.timestamp}
        species={species}
        rawData={selectedScore?.rawData}
      />
    </div>
  )
}