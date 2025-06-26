'use client'

import { getScoreColor } from '../utils/formatters'

interface HourlyScore {
  hour: number
  timestamp: number
  score: number
  temp: number
  conditions: string
  icon: string
  windSpeed: number
  pop: number
}

interface HourlyBarChartProps {
  hourlyScores: HourlyScore[]
  sunrise: number
  sunset: number
}

export default function HourlyBarChart({ hourlyScores, sunrise, sunset }: HourlyBarChartProps) {
  const maxScore = 10
  const sunriseHour = new Date(sunrise * 1000).getHours()
  const sunsetHour = new Date(sunset * 1000).getHours()

  // Debug: Log data to console
  console.log('HourlyBarChart received:', {
    hourlyScoresLength: hourlyScores.length,
    sampleScore: hourlyScores[0]?.score,
    sunriseHour,
    sunsetHour,
  })

  if (!hourlyScores || hourlyScores.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">24-Hour Fishing Scores</h3>
        <div className="text-gray-400 text-center py-8">No hourly data available</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">24-Hour Fishing Scores ({hourlyScores.length} hours)</h3>

      <div className="relative">
        {/* Chart container */}
        <div className="flex items-end justify-between h-40 mb-2 gap-1">
          {hourlyScores.map((hourData, index) => {
            const barHeight = Math.max((hourData.score / maxScore) * 100, 5) // Minimum 5% height
            const isPeakTime =
              Math.abs(hourData.hour - sunriseHour) <= 1.5 || Math.abs(hourData.hour - sunsetHour) <= 1.5

            return (
              <div
                key={index}
                className="flex flex-col items-center relative group"
                style={{ width: `${100 / hourlyScores.length}%` }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg min-w-max border border-gray-600">
                    <div className="font-semibold">{hourData.hour}:00</div>
                    <div className={getScoreColor(hourData.score)}>Score: {hourData.score.toFixed(1)}</div>
                    <div>{Math.round(hourData.temp)}°C</div>
                    <div>{Math.round(hourData.pop * 100)}% rain</div>
                    <div className="capitalize text-xs">{hourData.conditions}</div>
                  </div>
                </div>

                {/* Bar */}
                <div
                  className={`w-full max-w-8 mx-auto rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer ${
                    isPeakTime ? 'ring-2 ring-yellow-400' : ''
                  }`}
                  style={{
                    height: `${barHeight}%`,
                    minHeight: '8px',
                    backgroundColor:
                      hourData.score >= 8
                        ? '#22c55e'
                        : hourData.score >= 6
                        ? '#eab308'
                        : hourData.score >= 4
                        ? '#f97316'
                        : '#ef4444',
                  }}
                />

                {/* Peak time indicator */}
                {isPeakTime && <div className="absolute -top-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
              </div>
            )
          })}
        </div>

        {/* Hour labels */}
        <div className="flex justify-between text-xs text-gray-400">
          {hourlyScores.map((hourData, index) => (
            <div key={index} className="flex-1 text-center" style={{ width: `${100 / hourlyScores.length}%` }}>
              {index % 3 === 0 ? `${hourData.hour}:00` : ''}
            </div>
          ))}
        </div>

        {/* Debug Info */}
        <div className="mt-2 text-xs text-gray-500">
          Data points: {hourlyScores.length} | Scores:{' '}
          {hourlyScores
            .slice(0, 3)
            .map(h => h.score.toFixed(1))
            .join(', ')}
          ...
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-300">Excellent (8+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-gray-300">Good (6-7.9)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-gray-300">Fair (4-5.9)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-300">Poor {`(<4)`}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300">Peak Times</span>
          </div>
        </div>
      </div>
    </div>
  )
}
