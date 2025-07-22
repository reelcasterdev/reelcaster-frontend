import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'

interface OverallScoreProps {
  forecasts: OpenMeteoDailyForecast[]
  selectedDay?: number
}

const getScoreLabel = (score: number) => {
  if (score >= 8) return 'Excellent'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'Fair'
  return 'Poor'
}

export default function OverallScore({ forecasts, selectedDay = 0 }: OverallScoreProps) {
  // Get selected day's forecast
  const selectedForecast = forecasts[selectedDay]
  
  // Calculate selected day's average score
  const dayScore = selectedForecast
    ? Math.round(
        selectedForecast.twoHourForecasts.reduce((sum, forecast) => sum + forecast.score.total, 0) /
          selectedForecast.twoHourForecasts.length,
      )
    : 8 // Default score for demo

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h2 className="text-slate-400 text-sm font-medium tracking-wider uppercase mb-4">
        OVERALL SCORE
      </h2>
      
      <div className="text-center">
        <div className="text-6xl font-bold text-white mb-1">
          {dayScore}
          <span className="text-3xl text-slate-400 font-normal">/10</span>
        </div>
        
        <div className="text-lg text-slate-300 font-medium">
          {getScoreLabel(dayScore)}
        </div>
      </div>
    </div>
  )
}