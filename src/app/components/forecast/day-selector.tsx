import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { ForecastSectionOverlay } from '../auth/forecast-section-overlay'

interface DaySelectorProps {
  forecasts: OpenMeteoDailyForecast[]
  selectedDay: number
  onDaySelect: (index: number) => void
  shouldBlurAfterDay?: number | null
}

export default function DaySelector({ forecasts, selectedDay, onDaySelect, shouldBlurAfterDay }: DaySelectorProps) {
  const hasBlurredCards = shouldBlurAfterDay !== null

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">📅 Select Day</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 relative">
        {forecasts.map((forecast, index) => {
          const date = new Date(forecast.date * 1000)
          const isToday = index === 0
          const dayLabel = isToday ? 'Today' : forecast.dayName
          const shouldBlur = shouldBlurAfterDay && index > shouldBlurAfterDay
          const isClickable = !shouldBlur

          return (
            <button
              key={index}
              onClick={() => isClickable && onDaySelect(index)}
              disabled={!isClickable}
              className={`p-3 rounded-lg font-semibold transition-all text-center w-full ${
                shouldBlur ? 'blur-sm' : ''
              } ${
                selectedDay === index
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${!isClickable ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="text-sm">{dayLabel}</div>
              <div className="text-xs opacity-75">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </button>
          )
        })}

        {/* Section overlay for all blurred cards */}
        {hasBlurredCards && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <ForecastSectionOverlay />
          </div>
        )}
      </div>
    </div>
  )
}
