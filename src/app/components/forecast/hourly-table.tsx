import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '../../utils/openMeteoApi'
import { CHSWaterData } from '../../utils/chsTideApi'

interface HourlyTableProps {
  forecasts: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: CHSWaterData | null
  selectedDay?: number
}

export default function HourlyTable({ forecasts, openMeteoData, tideData, selectedDay = 0 }: HourlyTableProps) {
  // Get selected day's forecast
  const selectedForecast = forecasts[selectedDay]

  // Get hourly data for the table (every 3 hours for full day - 8 rows)
  const hourlyTableData = selectedForecast && openMeteoData
    ? [0, 3, 6, 9, 12, 15, 18, 21].map((hourIndex) => {
        const baseIndex = selectedDay * 96 // 96 = 24 hours * 4 (15-minute intervals)
        const dataIndex = Math.min(baseIndex + hourIndex * 4, openMeteoData.minutely15.length - 1)
        const data = openMeteoData.minutely15[dataIndex]
        
        const scoreIndex = Math.min(hourIndex * 4, selectedForecast.minutelyScores.length - 1)
        const score = selectedForecast.minutelyScores[scoreIndex]
        
        const hour = new Date(data.timestamp * 1000).getHours()
        const displayHour = hour === 0 ? '12:00 AM' : 
          hour < 12 ? `${hour}:00 AM` :
          hour === 12 ? '12:00 PM' :
          `${hour - 12}:00 PM`
        
        const windDir = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(data.windDirection / 45) % 8]
        
        return {
          time: displayHour,
          score: Math.round(score?.score || 5),
          wind: `${Math.round(data.windSpeed)} ${windDir}`,
          temp: `${Math.round(data.temp)}°`,
          precip: `${Math.round(data.precipitation)}`
        }
      })
    : [
        { time: '12:00 AM', score: 4, wind: '5 E', temp: '58°', precip: '0' },
        { time: '3:00 AM', score: 6, wind: '6 E', temp: '56°', precip: '0' },
        { time: '6:00 AM', score: 9, wind: '6 E', temp: '62°', precip: '0' },
        { time: '9:00 AM', score: 10, wind: '8 E', temp: '68°', precip: '5' },
        { time: '12:00 PM', score: 5, wind: '10 E', temp: '72°', precip: '10' },
        { time: '3:00 PM', score: 6, wind: '12 E', temp: '74°', precip: '5' },
        { time: '6:00 PM', score: 5, wind: '8 E', temp: '70°', precip: '0' },
        { time: '9:00 PM', score: 7, wind: '6 E', temp: '65°', precip: '0' }
      ]

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-yellow-400'  
    if (score >= 4) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Table Title */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-1">24-Hour Detailed Breakdown</h3>
        <p className="text-slate-400 text-sm">
          Every 3 hours • {hourlyTableData.length} time periods
        </p>
      </div>

      {/* Horizontal Table Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[768px]">
          {/* Time Row - Header */}
          <div className="flex bg-slate-700/50 border-b border-slate-700">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span>⏰</span>
              <span>Time</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => {
                const isNightTime = row.time.includes('AM') && (row.time.startsWith('12') || parseInt(row.time.split(':')[0]) <= 6)
                const isGoldenHour = row.time.includes('6:00 AM') || row.time.includes('6:00 PM')
                
                return (
                  <div 
                    key={index} 
                    className={`
                      flex-1 p-3 text-center text-sm font-medium border-l border-slate-700
                      ${isGoldenHour ? 'text-amber-300 bg-gradient-to-b from-amber-500/10 to-transparent' :
                        isNightTime ? 'text-slate-400 bg-slate-900/30' :
                        'text-white'
                      }
                    `}
                  >
                    {row.time}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Score Row */}
          <div className="flex border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span>🎣</span>
              <span>Score</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => (
                <div key={index} className="flex-1 p-3 text-center border-l border-slate-700">
                  <span className={`font-bold text-lg ${getScoreColor(row.score)}`}>
                    {row.score}
                  </span>
                  <span className="text-slate-500 text-xs ml-1">/10</span>
                </div>
              ))}
            </div>
          </div>

          {/* Wind Row */}
          <div className="flex border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span>💨</span>
              <span>Wind</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => (
                <div key={index} className="flex-1 p-3 text-center text-slate-300 text-sm border-l border-slate-700">
                  {row.wind}
                </div>
              ))}
            </div>
          </div>

          {/* Temperature Row */}
          <div className="flex border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span>🌡️</span>
              <span>Temp</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => (
                <div key={index} className="flex-1 p-3 text-center text-slate-300 text-sm border-l border-slate-700">
                  {row.temp}
                </div>
              ))}
            </div>
          </div>

          {/* Precipitation Row */}
          <div className="flex border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span>🌧️</span>
              <span>Precip</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => (
                <div key={index} className="flex-1 p-3 text-center text-slate-300 text-sm border-l border-slate-700">
                  {row.precip}%
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Footer with tide info */}
      {tideData && (
        <div className="p-4 bg-slate-700/30 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-400">
              Tide Station: <span className="text-white font-medium">
                {typeof tideData.station === 'string' ? tideData.station : tideData.station?.name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-slate-400">
                Current: <span className={`font-medium ${tideData.isRising ? 'text-blue-400' : 'text-orange-400'}`}>
                  {tideData.isRising ? '↗️ Rising' : '↘️ Falling'}
                </span>
              </div>
              <div className="text-slate-400">
                Next {tideData.nextTide.type}: <span className="text-white font-medium">
                  {Math.round(tideData.timeToNextTide)}min
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}