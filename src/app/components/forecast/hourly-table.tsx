import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '../../utils/openMeteoApi'
import { CHSWaterData } from '../../utils/chsTideApi'
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Wind, ArrowUp, ArrowUpRight, ArrowRight, ArrowDownRight, ArrowDown, ArrowDownLeft, ArrowLeft, ArrowUpLeft, TrendingUp, TrendingDown } from 'lucide-react'

interface HourlyTableProps {
  forecasts: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: CHSWaterData | null
  selectedDay?: number
}

export default function HourlyTable({ forecasts, openMeteoData, tideData, selectedDay = 0 }: HourlyTableProps) {
  // Get selected day's forecast
  const selectedForecast = forecasts[selectedDay]

  // Helper function to get weather icon based on weather code
  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return <Sun className="w-5 h-5 text-yellow-400" />
    if (code === 2) return <Cloud className="w-5 h-5 text-gray-400" />
    if (code === 3) return <Cloud className="w-5 h-5 text-gray-500" />
    if (code >= 51 && code <= 57) return <CloudDrizzle className="w-5 h-5 text-blue-400" />
    if (code >= 61 && code <= 67) return <CloudRain className="w-5 h-5 text-blue-500" />
    if (code >= 71 && code <= 77) return <CloudSnow className="w-5 h-5 text-blue-300" />
    if (code >= 80 && code <= 82) return <CloudRain className="w-5 h-5 text-blue-600" />
    return <Cloud className="w-5 h-5 text-gray-400" />
  }

  // Helper function to get wind direction arrow
  const getWindArrow = (direction: number) => {
    const arrows = [
      <ArrowUp className="w-4 h-4" />,      // N
      <ArrowUpRight className="w-4 h-4" />, // NE
      <ArrowRight className="w-4 h-4" />,   // E
      <ArrowDownRight className="w-4 h-4" />, // SE
      <ArrowDown className="w-4 h-4" />,    // S
      <ArrowDownLeft className="w-4 h-4" />, // SW
      <ArrowLeft className="w-4 h-4" />,    // W
      <ArrowUpLeft className="w-4 h-4" />   // NW
    ]
    return arrows[Math.round(direction / 45) % 8]
  }

  // Helper to get tide height at specific time
  const getTideHeightAtTime = (timestamp: number) => {
    if (!tideData || !tideData.predictions) return null

    // Find the closest tide prediction
    const closestPrediction = tideData.predictions.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.time - timestamp)
      const currDiff = Math.abs(curr.time - timestamp)
      return currDiff < prevDiff ? curr : prev
    })

    return closestPrediction
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

        // Get tide info for this time
        const tidePrediction = getTideHeightAtTime(data.timestamp)
        const tideHeight = tidePrediction ? tidePrediction.height.toFixed(1) : '--'
        const tideRising = tidePrediction ?
          (tidePrediction.time > data.timestamp ?
            (tidePrediction.type === 'high') :
            !(tidePrediction.type === 'high')
          ) : undefined

        return {
          time: displayHour,
          timestamp: data.timestamp,
          score: Math.round(score?.score || 5),
          windSpeed: Math.round(data.windSpeed),
          windDir: windDir,
          windDirection: data.windDirection,
          temp: Math.round(data.temp),
          precip: Math.round(data.precipitation),
          weatherCode: data.weatherCode,
          pressure: Math.round(data.pressure),
          tideHeight: tideHeight,
          tideRising: tideRising
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

          {/* Weather Icon Row */}
          <div className="flex border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span>☁️</span>
              <span>Weather</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => (
                <div key={index} className="flex-1 p-3 flex justify-center items-center border-l border-slate-700">
                  {getWeatherIcon(row.weatherCode)}
                </div>
              ))}
            </div>
          </div>

          {/* Wind Row with Direction Arrows */}
          <div className="flex border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <Wind className="w-4 h-4" />
              <span>Wind</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => (
                <div key={index} className="flex-1 p-3 border-l border-slate-700">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-slate-300 text-sm font-medium">{row.windSpeed}</span>
                    <span className="text-slate-500 text-xs">km/h</span>
                    {getWindArrow(row.windDirection)}
                    <span className="text-slate-500 text-xs">{row.windDir}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tide Height Row */}
          <div className="flex border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span>🌊</span>
              <span>Tide</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => (
                <div key={index} className="flex-1 p-3 border-l border-slate-700">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-slate-300 text-sm font-medium">{row.tideHeight}</span>
                    <span className="text-slate-500 text-xs">m</span>
                    {row.tideRising !== undefined && (
                      row.tideRising ?
                      <TrendingUp className="w-4 h-4 text-blue-400" /> :
                      <TrendingDown className="w-4 h-4 text-orange-400" />
                    )}
                  </div>
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
                  {row.temp}°C
                </div>
              ))}
            </div>
          </div>

          {/* Precipitation Row */}
          <div className="flex border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <CloudRain className="w-4 h-4" />
              <span>Precip</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => (
                <div key={index} className="flex-1 p-3 text-center border-l border-slate-700">
                  <span className={`text-sm ${row.precip > 50 ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}>
                    {row.precip}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pressure Row */}
          <div className="flex border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
            <div className="w-24 flex-shrink-0 p-3 text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span>🔵</span>
              <span>Pressure</span>
            </div>
            <div className="flex flex-1">
              {hourlyTableData.map((row, index) => (
                <div key={index} className="flex-1 p-3 text-center text-slate-300 text-sm border-l border-slate-700">
                  {row.pressure}
                  <span className="text-slate-500 text-xs ml-1">hPa</span>
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