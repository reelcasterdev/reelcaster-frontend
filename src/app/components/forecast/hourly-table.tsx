import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '../../utils/openMeteoApi'
import { TideData } from '../../utils/tideApi'

interface HourlyTableProps {
  forecasts: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: TideData | null
  selectedDay?: number
}

export default function HourlyTable({ forecasts, openMeteoData, tideData, selectedDay = 0 }: HourlyTableProps) {
  // Get selected day's forecast
  const selectedForecast = forecasts[selectedDay]
  
  // Function to interpolate tide height for a given timestamp
  const getTideHeightAtTime = (timestamp: number) => {
    if (!tideData?.dailyTides || tideData.dailyTides.length === 0) {
      // Fallback to simplified calculation if no tide data
      const hours = new Date(timestamp * 1000).getHours()
      return Math.sin((hours / 24) * Math.PI * 2) * 2 + 3
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
        
        // Get real tide height for this timestamp
        const tideHeight = getTideHeightAtTime(data.timestamp)
        
        return {
          time: displayHour,
          score: Math.round(score?.score || 5),
          wind: `${Math.round(data.windSpeed)} ${windDir}`,
          temp: `${Math.round(data.temp)}°`,
          precip: `${Math.round(data.precipitation)}`,
          tide: `${tideHeight.toFixed(1)}`
        }
      })
    : [
        { time: '12:00 AM', score: 4, wind: '5 E', temp: '58°', precip: '0', tide: '1.2' },
        { time: '3:00 AM', score: 6, wind: '6 E', temp: '56°', precip: '0', tide: '2.1' },
        { time: '6:00 AM', score: 9, wind: '6 E', temp: '62°', precip: '0', tide: '2.8' },
        { time: '9:00 AM', score: 10, wind: '8 E', temp: '68°', precip: '5', tide: '3.2' },
        { time: '12:00 PM', score: 5, wind: '10 E', temp: '72°', precip: '10', tide: '2.9' },
        { time: '3:00 PM', score: 6, wind: '12 E', temp: '74°', precip: '5', tide: '2.2' },
        { time: '6:00 PM', score: 5, wind: '8 E', temp: '70°', precip: '0', tide: '1.9' },
        { time: '9:00 PM', score: 7, wind: '6 E', temp: '65°', precip: '0', tide: '2.4' }
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

      {/* Header */}
      <div className="grid grid-cols-6 gap-4 p-4 bg-slate-700/50 text-slate-400 text-sm font-medium uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span>⏰</span>
          <span>TIME</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🎣</span>
          <span>SCORE</span>
        </div>
        <div className="flex items-center gap-2">
          <span>💨</span>
          <span>WIND</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🌡️</span>
          <span>TEMP</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🌧️</span>
          <span>PRECIP</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🌊</span>
          <span>TIDE</span>
        </div>
      </div>
      
      {/* Data rows */}
      <div className="divide-y divide-slate-700">
        {hourlyTableData.map((row, index) => {
          const isNightTime = row.time.includes('AM') && (row.time.startsWith('12') || parseInt(row.time.split(':')[0]) <= 6)
          const isGoldenHour = row.time.includes('6:00 AM') || row.time.includes('6:00 PM')
          
          return (
            <div 
              key={index} 
              className={`
                grid grid-cols-6 gap-4 p-4 text-white transition-colors
                ${isGoldenHour ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20' :
                  isNightTime ? 'bg-slate-900/30 hover:bg-slate-800/50' :
                  'hover:bg-slate-700/30'
                }
              `}
            >
              <div className={`${isGoldenHour ? 'text-amber-300 font-medium' : 'text-slate-300'}`}>
                {row.time}
              </div>
              <div className={`font-bold ${getScoreColor(row.score)}`}>
                {row.score}
                <span className="text-slate-500 text-xs ml-1">/10</span>
              </div>
              <div className="text-slate-300">{row.wind}</div>
              <div className="text-slate-300">{row.temp}</div>
              <div className="text-slate-300">{row.precip}%</div>
              <div className="text-slate-300 font-mono">
                {row.tide} <span className="text-xs text-slate-500">ft</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer with tide info */}
      {tideData && (
        <div className="p-4 bg-slate-700/30 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-400">
              Tide Station: <span className="text-white font-medium">{tideData.station}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-slate-400">
                Current: <span className={`font-medium ${tideData.isRising ? 'text-blue-400' : 'text-orange-400'}`}>
                  {tideData.isRising ? '↗️ Rising' : '↘️ Falling'}
                </span>
              </div>
              <div className="text-slate-400">
                Next {tideData.nextChangeType}: <span className="text-white font-medium">
                  {Math.round(tideData.timeToChange)}min
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}