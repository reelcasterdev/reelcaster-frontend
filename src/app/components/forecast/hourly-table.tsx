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
  
  // Get sample hourly data for the table (every 3 hours for 6 rows)
  const hourlyTableData = selectedForecast && openMeteoData
    ? [0, 3, 6, 9, 12, 15].map((hourIndex) => {
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
        
        // Get corresponding tide height (simplified)
        const tideHeight = tideData?.currentHeight || (Math.sin(hourIndex * 0.5) * 2 + 3)
        
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
        { time: '3:00 AM', score: 4, wind: '5 E', temp: '58°', precip: '0', tide: '1.2' },
        { time: '6:00 AM', score: 9, wind: '6 E', temp: '62°', precip: '0', tide: '2.5' },
        { time: '9:00 AM', score: 10, wind: '8 E', temp: '68°', precip: '5', tide: '4.8' },
        { time: '12:00 PM', score: 5, wind: '10 E', temp: '72°', precip: '10', tide: '3.1' },
        { time: '3:00 PM', score: 6, wind: '12 E', temp: '74°', precip: '5', tide: '1.0' },
        { time: '6:00 PM', score: 5, wind: '8 E', temp: '70°', precip: '0', tide: '-0.5' }
      ]

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-yellow-400'  
    if (score >= 4) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-6 gap-4 p-4 bg-slate-700/50 text-slate-400 text-sm font-medium uppercase tracking-wider">
        <div>TIME</div>
        <div>SCORE</div>
        <div>WIND (MPH)</div>
        <div>TEMP (°F)</div>
        <div>PRECIP (%)</div>
        <div>TIDE (FT)</div>
      </div>
      
      {/* Data rows */}
      <div className="divide-y divide-slate-700">
        {hourlyTableData.map((row, index) => (
          <div key={index} className="grid grid-cols-6 gap-4 p-4 text-white hover:bg-slate-700/30 transition-colors">
            <div className="text-slate-300">{row.time}</div>
            <div className={`font-bold ${getScoreColor(row.score)}`}>{row.score}</div>
            <div className="text-slate-300">{row.wind}</div>
            <div className="text-slate-300">{row.temp}</div>
            <div className="text-slate-300">{row.precip}</div>
            <div className="text-slate-300">{row.tide}</div>
          </div>
        ))}
      </div>
    </div>
  )
}