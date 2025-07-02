import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { formatDate } from '../../utils/formatters'

interface DayOverviewProps {
  forecast: OpenMeteoDailyForecast
}

export default function DayOverview({ forecast }: DayOverviewProps) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-white">
          {forecast.dayName} - {formatDate(forecast.date)}
        </h3>
        <div className="text-right">
          <p className="text-gray-400 text-sm">{forecast.twoHourForecasts.length} forecast periods</p>
          <p className="text-gray-400 text-sm">{forecast.minutelyScores.length} data points</p>
        </div>
      </div>
    </div>
  )
}
