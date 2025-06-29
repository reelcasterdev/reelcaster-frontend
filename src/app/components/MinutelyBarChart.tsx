'use client'

import { useState } from 'react'
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

interface MinutelyBarChartProps {
  minutelyScores: MinutelyScore[]
  twoHourForecasts: TwoHourForecast[]
  sunrise: number
  sunset: number
  dayName: string
}

export default function MinutelyBarChart({
  minutelyScores,
  twoHourForecasts,
  sunrise,
  sunset,
  dayName,
}: MinutelyBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Find the best 2-hour window
  const bestTwoHourWindow = twoHourForecasts.reduce(
    (best, current) => (current.score.total > best.score.total ? current : best),
    twoHourForecasts[0],
  )

  // Find which 15-minute segments fall within the best 2-hour window
  const getBestWindowIndices = () => {
    if (!bestTwoHourWindow) return []

    const indices: number[] = []
    minutelyScores.forEach((score, index) => {
      if (score.timestamp >= bestTwoHourWindow.startTime && score.timestamp <= bestTwoHourWindow.endTime) {
        indices.push(index)
      }
    })
    return indices
  }

  const bestWindowIndices = getBestWindowIndices()

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
    return `${hours.toString().padStart(2, '0')}`
  }

  const isPeakTime = (timestamp: number) => {
    const timeDiff = 1.5 * 3600 // 1.5 hours in seconds
    return Math.abs(timestamp - sunrise) <= timeDiff || Math.abs(timestamp - sunset) <= timeDiff
  }

  const maxScore = Math.max(...minutelyScores.map(s => s.score))

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-xl font-semibold text-white mb-2">📊 15-Minute Fishing Scores - {dayName}</h4>
          <p className="text-gray-300 text-sm">{minutelyScores.length} data points • Best 2-hour window highlighted</p>
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

      {/* Chart Container */}
      <div className="relative">
        {/* Chart */}
        <div className="flex items-end justify-between gap-1 h-80 mb-4 overflow-x-auto">
          {minutelyScores.map((score, index) => {
            // Normalize scores to 0-10 range and ensure good visibility
            const normalizedScore = Math.max(score.score, 0)
            // Scale up the height calculation for better visibility
            const heightPercentage = Math.max((normalizedScore / 10) * 85 + 15, 25) // Scale to 15-100% range with minimum 25%
            const barHeight = heightPercentage

            const isInBestWindow = bestWindowIndices.includes(index)
            const isPeak = isPeakTime(score.timestamp)
            const isHovered = hoveredIndex === index

            return (
              <div
                key={index}
                className="relative flex flex-col items-center group cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ minWidth: '12px', flex: '1' }}
              >
                {/* Peak time indicator */}
                {isPeak && (
                  <div className="absolute -top-3 w-2 h-2 bg-yellow-400 rounded-full animate-pulse z-10"></div>
                )}

                {/* Bar */}
                <div
                  className={`w-full rounded-t transition-all duration-200 border ${
                    isInBestWindow
                      ? 'bg-gradient-to-t from-yellow-600 to-yellow-400 border-yellow-300 shadow-lg shadow-yellow-500/30'
                      : getScoreColor(score.score).includes('green')
                      ? 'bg-gradient-to-t from-green-700 to-green-500 border-green-600'
                      : getScoreColor(score.score).includes('yellow')
                      ? 'bg-gradient-to-t from-yellow-700 to-yellow-500 border-yellow-600'
                      : getScoreColor(score.score).includes('orange')
                      ? 'bg-gradient-to-t from-orange-700 to-orange-500 border-orange-600'
                      : 'bg-gradient-to-t from-red-700 to-red-500 border-red-600'
                  } ${isHovered ? 'brightness-125 scale-x-125 z-20' : ''}`}
                  style={{ height: `${barHeight}%` }}
                ></div>

                {/* Time label (show every 4th for readability) */}
                {index % 4 === 0 && (
                  <div className="text-xs text-gray-400 mt-1 transform -rotate-45 origin-top-left">
                    {formatTimeShort(score.timestamp)}
                  </div>
                )}

                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl min-w-48">
                      <div className="text-white font-semibold mb-1">{formatTime(score.timestamp)}</div>
                      <div className={`text-lg font-bold mb-2 ${getScoreColor(score.score)}`}>
                        Score: {score.score.toFixed(1)}/10
                      </div>
                      <div className="space-y-1 text-sm text-gray-300">
                        <div>🌡️ {Math.round(score.temp)}°C</div>
                        <div>💨 {Math.round(score.windSpeed)} km/h</div>
                        <div>🌧️ {score.precipitation.toFixed(1)}mm</div>
                        <div className="capitalize">☁️ {score.conditions}</div>
                      </div>
                      {isInBestWindow && (
                        <div className="mt-2 text-yellow-300 text-xs font-semibold">⭐ In best 2-hour window</div>
                      )}
                      {isPeak && <div className="mt-1 text-yellow-400 text-xs">🌅 Peak fishing time</div>}
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                      <div className="border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Time axis labels */}
        <div className="flex justify-between text-xs text-gray-400 mb-4">
          <span>{formatTime(minutelyScores[0]?.timestamp)}</span>
          <span>{formatTime(minutelyScores[Math.floor(minutelyScores.length / 2)]?.timestamp)}</span>
          <span>{formatTime(minutelyScores[minutelyScores.length - 1]?.timestamp)}</span>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-t from-green-700 to-green-500 rounded"></div>
            <span className="text-gray-300">Excellent (8-10)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-t from-yellow-700 to-yellow-500 rounded"></div>
            <span className="text-gray-300">Good (6-7.9)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-t from-orange-700 to-orange-500 rounded"></div>
            <span className="text-gray-300">Fair (4-5.9)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-t from-red-700 to-red-500 rounded"></div>
            <span className="text-gray-300">Poor (&lt;4)</span>
          </div>
        </div>

        {/* Additional Legend for Special Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded border border-yellow-300"></div>
            <span className="text-yellow-300">Best 2-Hour Window</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-400">Peak Times (Dawn/Dusk)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-gray-600 rounded"></div>
            <span className="text-gray-300">Hover for details</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-gray-400 text-sm">Average Score</p>
          <p className="text-white font-bold text-lg">
            {(minutelyScores.reduce((sum, s) => sum + s.score, 0) / minutelyScores.length).toFixed(1)}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-gray-400 text-sm">Best Score</p>
          <p className={`font-bold text-lg ${getScoreColor(maxScore)}`}>{maxScore.toFixed(1)}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-gray-400 text-sm">Peak Periods</p>
          <p className="text-yellow-400 font-bold text-lg">
            {minutelyScores.filter(s => isPeakTime(s.timestamp)).length}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-gray-400 text-sm">Data Points</p>
          <p className="text-white font-bold text-lg">{minutelyScores.length}</p>
        </div>
      </div>
    </div>
  )
}
