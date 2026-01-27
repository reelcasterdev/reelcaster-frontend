'use client'

import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '../../utils/openMeteoApi'
import { useUnitPreferences } from '@/contexts/unit-preferences-context'
import { convertWind, convertTemp, convertHeight, formatWind, formatTemp, formatHeight } from '@/app/utils/unit-conversions'

interface WeatherWidgetProps {
  forecasts: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  selectedDay?: number
}

export default function WeatherWidget({
  forecasts,
  openMeteoData,
  selectedDay = 0,
}: WeatherWidgetProps) {
  const { windUnit, tempUnit, heightUnit, cycleUnit } = useUnitPreferences()

  const selectedForecast = forecasts[selectedDay]
  const baseIndex = selectedDay * 96
  const selectedWeather = openMeteoData?.minutely15[Math.min(baseIndex, (openMeteoData?.minutely15.length || 1) - 1)]

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

  const windSpeed = selectedWeather?.windSpeed ?? 10
  const temperature = selectedWeather?.temp ?? 20
  const precipitationProbability = selectedWeather?.precipitationProbability ?? 5
  const waveHeight = selectedWeather?.waveHeight ?? 0.5
  const currentSpeed = selectedWeather?.oceanCurrentSpeed ?? 0.2

  // Format values with conversions
  const formatWindValue = (kph: number) => {
    const converted = convertWind(kph, 'kph', windUnit)
    return formatWind(converted, windUnit, windUnit === 'knots' ? 1 : 0)
  }

  const formatHeightValue = (meters: number) => {
    const converted = convertHeight(meters, 'm', heightUnit)
    return formatHeight(converted, heightUnit, 1)
  }

  const formatTempValue = (celsius: number) => {
    const converted = convertTemp(celsius, 'C', tempUnit)
    return formatTemp(converted, tempUnit, 0)
  }

  // Moon phase calculation
  const getMoonPhase = () => {
    const phases = [
      'New Moon',
      'Waxing Crescent',
      'First Quarter',
      'Waxing Gibbous',
      'Full Moon',
      'Waning Gibbous',
      'Last Quarter',
      'Waning Crescent',
    ]
    const now = new Date()
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    )
    return phases[Math.floor((dayOfYear / 29.5) % phases.length)]
  }

  // Toggle button component
  const UnitToggle = ({
    options,
    value,
    onCycle,
  }: {
    options: string[]
    value: string
    onCycle: () => void
  }) => (
    <div className="flex items-center bg-rc-bg-dark rounded-lg p-0.5">
      {options.map(option => (
        <button
          key={option}
          onClick={onCycle}
          className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            value.toLowerCase() === option.toLowerCase()
              ? 'bg-rc-bg-light text-rc-text'
              : 'text-rc-text-muted hover:text-rc-text'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )

  // Metric row component
  const MetricRow = ({
    label,
    value,
    toggle,
  }: {
    label: string
    value: string | number
    toggle?: React.ReactNode
  }) => (
    <div className="bg-rc-bg-light rounded-xl p-3 flex items-center justify-between">
      <div>
        <p className="text-xs text-rc-text-muted mb-0.5">{label}</p>
        <p className="text-base font-semibold text-rc-text">{value}</p>
      </div>
      {toggle}
    </div>
  )

  // Info card component for bottom section
  const InfoCard = ({
    label,
    value,
  }: {
    label: string
    value: string
  }) => (
    <div className="bg-rc-bg-light rounded-xl p-3">
      <p className="text-xs text-rc-text-muted mb-0.5">{label}</p>
      <p className="text-base font-semibold text-rc-text">{value}</p>
    </div>
  )

  return (
    <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-5">
      <h3 className="text-lg font-semibold text-rc-text mb-1">Weather and Conditions</h3>
      <p className="text-sm text-rc-text-muted mb-5">Current conditions for selected day</p>

      <div className="space-y-3">
        {/* Wind */}
        <MetricRow
          label="Wind"
          value={formatWindValue(windSpeed)}
          toggle={
            <UnitToggle
              options={['Kph', 'Mph', 'Knots']}
              value={windUnit}
              onCycle={() => cycleUnit('wind')}
            />
          }
        />

        {/* Wave Height */}
        <MetricRow
          label="Wave Height"
          value={formatHeightValue(waveHeight)}
          toggle={
            <UnitToggle
              options={['m', 'ft']}
              value={heightUnit}
              onCycle={() => cycleUnit('height')}
            />
          }
        />

        {/* Temperature */}
        <MetricRow
          label="Temperature"
          value={formatTempValue(temperature)}
          toggle={
            <UnitToggle
              options={['C', 'F']}
              value={tempUnit}
              onCycle={() => cycleUnit('temp')}
            />
          }
        />

        {/* Current */}
        <MetricRow
          label="Current"
          value={formatWindValue(currentSpeed)}
          toggle={
            <UnitToggle
              options={['Kph', 'Mph', 'Knots']}
              value={windUnit}
              onCycle={() => cycleUnit('wind')}
            />
          }
        />

        {/* Sunrise & Sunset */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <InfoCard label="Sunrise" value={sunriseTime} />
          <InfoCard label="Sunset" value={sunsetTime} />
        </div>

        {/* Moon Phase & Precipitation */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard label="Moon Phase" value={getMoonPhase()} />
          <InfoCard label="Precipitation" value={`${precipitationProbability}%`} />
        </div>
      </div>
    </div>
  )
}
