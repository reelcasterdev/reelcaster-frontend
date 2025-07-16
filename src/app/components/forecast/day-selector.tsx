import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'

interface DaySelectorProps {
  forecasts: OpenMeteoDailyForecast[]
  selectedDay: number
  onDaySelect: (index: number) => void
}

export default function DaySelector({ forecasts, selectedDay, onDaySelect }: DaySelectorProps) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">📅 Select Day</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {forecasts.map((forecast, index) => {
          const date = new Date(forecast.date * 1000)
          const isToday = index === 0
          const dayLabel = isToday ? 'Today' : forecast.dayName

          return (
            <button
              key={index}
              onClick={() => onDaySelect(index)}
              className={`p-3 rounded-lg font-semibold transition-all text-center ${
                selectedDay === index
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="text-sm">{dayLabel}</div>
              <div className="text-xs opacity-75">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
