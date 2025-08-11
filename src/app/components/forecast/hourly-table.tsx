import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '../../utils/openMeteoApi'
import { TideData } from '../../utils/tideApi'
import { CHSWaterData } from '../../utils/chsTideApi'

interface HourlyTableProps {
  forecasts: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: TideData | CHSWaterData | null
  selectedDay?: number
}

export default function HourlyTable({ forecasts, openMeteoData, tideData, selectedDay = 0 }: HourlyTableProps) {
  // Get selected day's forecast
  const selectedForecast = forecasts[selectedDay]
  
  // Function to interpolate tide height for a given timestamp
  const getTideHeightAtTime = (timestamp: number) => {
    if (!tideData) {
      // Fallback to simplified calculation if no tide data
      // BC tides typically range from 0-4 meters
      // Using a semi-diurnal pattern (2 highs and 2 lows per day)
      const hours = new Date(timestamp * 1000).getHours()
      const tidePattern = Math.sin((hours / 12.42) * Math.PI * 2) // 12.42 hours is typical tidal period
      return tidePattern * 1.5 + 2 // Range from 0.5m to 3.5m (typical BC range)
    }

    // Check if it's CHS data (has waterLevels property)
    if ('waterLevels' in tideData) {
      // CHS data - use water levels directly
      const waterLevels = tideData.waterLevels
      
      // Find the closest water level to the timestamp
      const closestLevel = waterLevels.reduce((prev, curr) => {
        return Math.abs(curr.timestamp - timestamp) < Math.abs(prev.timestamp - timestamp) ? curr : prev
      })
      
      // If we have an exact match or very close (within 5 minutes)
      if (Math.abs(closestLevel.timestamp - timestamp) < 300) {
        return closestLevel.height
      }
      
      // Otherwise, interpolate between two closest points
      const sortedLevels = waterLevels.sort((a, b) => a.timestamp - b.timestamp)
      for (let i = 0; i < sortedLevels.length - 1; i++) {
        if (sortedLevels[i].timestamp <= timestamp && sortedLevels[i + 1].timestamp >= timestamp) {
          const before = sortedLevels[i]
          const after = sortedLevels[i + 1]
          const timeDiff = after.timestamp - before.timestamp
          const heightDiff = after.height - before.height
          const timeProgress = (timestamp - before.timestamp) / timeDiff
          return before.height + (heightDiff * timeProgress)
        }
      }
      
      return closestLevel.height // Fallback to closest
    } else {
      // Old TideData format
      if (!tideData.dailyTides || tideData.dailyTides.length === 0) {
        // Fallback to simplified calculation if no tide data
        // BC tides typically range from 0-4 meters
        const hours = new Date(timestamp * 1000).getHours()
        const tidePattern = Math.sin((hours / 12.42) * Math.PI * 2) // 12.42 hours is typical tidal period
        return tidePattern * 1.5 + 2 // Range from 0.5m to 3.5m (typical BC range)
      }

      const dailyTides = tideData.dailyTides
      
      // Find the tide events before and after the target time
      let beforeTide = dailyTides[0]
      let afterTide = dailyTides[dailyTides.length - 1]
      
      for (let i = 0; i < dailyTides.length - 1; i++) {
        if (dailyTides[i].time <= timestamp && dailyTides[i + 1].time >= timestamp) {
          beforeTide = dailyTides[i]
          afterTide = dailyTides[i + 1]
          break
        }
      }
      
      // If timestamp is before all tides, use first tide
      if (timestamp < dailyTides[0].time) {
        return dailyTides[0].height
      }
      
      // If timestamp is after all tides, use last tide
      if (timestamp > dailyTides[dailyTides.length - 1].time) {
        return dailyTides[dailyTides.length - 1].height
      }
      
      // Interpolate between before and after tide heights
      const timeDiff = afterTide.time - beforeTide.time
      const heightDiff = afterTide.height - beforeTide.height
      const timeProgress = (timestamp - beforeTide.time) / timeDiff
      
      return beforeTide.height + (heightDiff * timeProgress)
    }
  }

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
        
        // Get real tide height for this timestamp (in meters)
        const tideHeightMeters = getTideHeightAtTime(data.timestamp)
        // Convert meters to feet for display
        const tideHeightFeet = tideHeightMeters * 3.28084
        
        return {
          time: displayHour,
          score: Math.round(score?.score || 5),
          wind: `${Math.round(data.windSpeed)} ${windDir}`,
          temp: `${Math.round(data.temp)}°`,
          precip: `${Math.round(data.precipitation)}`,
          tide: `${tideHeightFeet.toFixed(1)}`
        }
      })
    : [
        { time: '12:00 AM', score: 4, wind: '5 E', temp: '58°', precip: '0', tide: '4.2' },
        { time: '3:00 AM', score: 6, wind: '6 E', temp: '56°', precip: '0', tide: '6.9' },
        { time: '6:00 AM', score: 9, wind: '6 E', temp: '62°', precip: '0', tide: '9.2' },
        { time: '9:00 AM', score: 10, wind: '8 E', temp: '68°', precip: '5', tide: '10.5' },
        { time: '12:00 PM', score: 5, wind: '10 E', temp: '72°', precip: '10', tide: '8.2' },
        { time: '3:00 PM', score: 6, wind: '12 E', temp: '74°', precip: '5', tide: '5.6' },
        { time: '6:00 PM', score: 5, wind: '8 E', temp: '70°', precip: '0', tide: '3.9' },
        { time: '9:00 PM', score: 7, wind: '6 E', temp: '65°', precip: '0', tide: '6.2' }
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
          Real-time tide data • Every 3 hours • {hourlyTableData.length} time periods
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

          {/* Tide Row */}
          <div className="flex border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span>🌊</span>
              <span>Tide</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => (
                <div key={index} className="flex-1 p-3 text-center text-slate-300 font-mono text-sm border-l border-slate-700">
                  {row.tide}
                  <span className="text-xs text-slate-500 ml-1">ft</span>
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
                Next {'nextTide' in tideData ? tideData.nextTide.type : tideData.nextChangeType}: <span className="text-white font-medium">
                  {Math.round('timeToNextTide' in tideData ? tideData.timeToNextTide : tideData.timeToChange)}min
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}