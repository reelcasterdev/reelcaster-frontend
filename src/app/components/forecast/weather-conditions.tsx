import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '../../utils/openMeteoApi'
import { CHSWaterData } from '../../utils/chsTideApi'
import { ConvertibleValue } from '../common/convertible-value'

interface WeatherConditionsProps {
  forecasts: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: CHSWaterData | null
  selectedDay?: number
}

export default function WeatherConditions({ forecasts, openMeteoData, selectedDay = 0 }: WeatherConditionsProps) {
  // Get selected day's forecast and weather
  const selectedForecast = forecasts[selectedDay]
  const baseIndex = selectedDay * 96 // 96 = 24 hours * 4 (15-minute intervals)
  const selectedWeather = openMeteoData?.minutely15[Math.min(baseIndex, openMeteoData.minutely15.length - 1)]

  // Get sunrise and sunset times
  const sunriseTime = selectedForecast
    ? new Date(selectedForecast.sunrise * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '6:03 AM'

  const sunsetTime = selectedForecast
    ? new Date(selectedForecast.sunset * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '8:45 PM'

  // Get wind direction
  const windDir = selectedWeather
    ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(selectedWeather.windDirection / 45) % 8]
    : 'E'

  const windSpeed = selectedWeather ? selectedWeather.windSpeed : 10
  const temperature = selectedWeather ? selectedWeather.temp : 20
  const precipitationProbability = selectedWeather ? selectedWeather.precipitationProbability : 5
  const precipitation = selectedWeather ? selectedWeather.precipitation : 0
  const waveHeight = 0.5 // Simplified - would need marine API
  const current = 0.2 // Simplified ocean current data

  // Mock moon phase data
  const getMoonPhase = () => {
    const phases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent']
    const now = new Date()
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    return phases[Math.floor((dayOfYear / 29.5) % phases.length)]
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-6">Weather and Conditions</h2>
      
      <div className="space-y-6">
        {/* Wind and Wave */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-slate-400 text-sm mb-1">Wind</div>
            <div className="text-white text-2xl font-bold">
              <ConvertibleValue value={windSpeed} type="wind" sourceUnit="kph" className="text-white" />{' '}
              <span className="text-base font-normal">{windDir}</span>
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1">Wave Height</div>
            <div className="text-white text-2xl font-bold">
              <ConvertibleValue value={waveHeight} type="height" sourceUnit="ft" className="text-white" />
            </div>
          </div>
        </div>

        {/* Sunrise and Sunset */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-slate-400 text-sm mb-1">Sunrise</div>
            <div className="text-white text-xl font-semibold">{sunriseTime}</div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1">Sunset</div>
            <div className="text-white text-xl font-semibold">{sunsetTime}</div>
          </div>
        </div>

        {/* Temperature and Precipitation */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-slate-400 text-sm mb-1">Temperature</div>
            <div className="text-white text-2xl font-bold">
              <ConvertibleValue value={temperature} type="temp" sourceUnit="C" className="text-white" />
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1">Precipitation</div>
            <div className="text-white text-2xl font-bold">
              {precipitationProbability}
              <span className="text-base font-normal">%</span>
              {precipitation > 0 && (
                <div className="text-sm font-normal text-slate-400 mt-1">
                  <ConvertibleValue value={precipitation} type="precip" sourceUnit="mm" precision={1} className="text-slate-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current and Moon Phase */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-slate-400 text-sm mb-1">Current</div>
            <div className="text-white text-xl font-semibold">
              <ConvertibleValue value={current} type="wind" sourceUnit="knots" precision={1} className="text-white" />{' '}
              <span className="text-sm font-normal">NW</span>
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1">Moon Phase</div>
            <div className="text-white text-lg font-semibold">{getMoonPhase()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}