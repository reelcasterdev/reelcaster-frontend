'use client'

import { useState } from 'react'
import { AppShell } from '../components/layout'
import DashboardHeader from '../components/forecast/dashboard-header'
import { Calendar, Download, Share2, ChevronDown, Sun, Cloud, CloudRain } from 'lucide-react'

interface DayForecast {
  date: Date
  dayName: string
  score: number
  highTemp: number
  lowTemp: number
  windSpeed: number
  windDir: string
  precip: number
  tideEvents: { type: 'high' | 'low'; time: string }[]
  conditions: 'sunny' | 'cloudy' | 'rainy'
}

// Generate mock 14-day forecast
const generateMockForecast = (): DayForecast[] => {
  const forecasts: DayForecast[] = []
  const conditions: ('sunny' | 'cloudy' | 'rainy')[] = ['sunny', 'cloudy', 'rainy']
  const windDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

  for (let i = 0; i < 14; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)

    forecasts.push({
      date,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      score: Math.round((Math.random() * 5 + 5) * 10) / 10,
      highTemp: Math.round(15 + Math.random() * 10),
      lowTemp: Math.round(8 + Math.random() * 5),
      windSpeed: Math.round(5 + Math.random() * 20),
      windDir: windDirs[Math.floor(Math.random() * windDirs.length)],
      precip: Math.round(Math.random() * 100),
      tideEvents: [
        { type: 'high', time: `${Math.floor(Math.random() * 12)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')} AM` },
        { type: 'low', time: `${Math.floor(Math.random() * 12)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')} PM` },
      ],
      conditions: conditions[Math.floor(Math.random() * conditions.length)],
    })
  }

  return forecasts
}

export default function FourteenDayReportPage() {
  const [forecasts] = useState<DayForecast[]>(generateMockForecast)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-blue-400'
    if (score >= 4) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-blue-500'
    if (score >= 4) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getConditionIcon = (condition: DayForecast['conditions']) => {
    switch (condition) {
      case 'sunny':
        return <Sun className="w-5 h-5 text-yellow-400" />
      case 'cloudy':
        return <Cloud className="w-5 h-5 text-rc-text-muted" />
      case 'rainy':
        return <CloudRain className="w-5 h-5 text-blue-400" />
    }
  }

  const handleExport = () => {
    // Export functionality would be implemented here
    alert('Export feature coming soon!')
  }

  const handleShare = () => {
    // Share functionality would be implemented here
    alert('Share feature coming soon!')
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6">
        <DashboardHeader
          title="14-Day Report"
          showTimeframe={false}
          showSetLocation={true}
          showCustomize={false}
        />

        <div className="space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-rc-text-muted text-sm">
            Extended forecast for Victoria, Sidney
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-rc-bg-dark hover:bg-rc-bg-light border border-rc-bg-light rounded-lg text-sm text-rc-text-light transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 bg-rc-bg-dark hover:bg-rc-bg-light border border-rc-bg-light rounded-lg text-sm text-rc-text-light transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        {/* Forecast Table */}
        <div className="bg-rc-bg-dark rounded-xl border border-rc-bg-light overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-rc-bg-darkest border-b border-rc-bg-light text-xs font-medium text-rc-text-muted uppercase tracking-wider">
            <div className="col-span-2">Date</div>
            <div className="col-span-2 text-center">Score</div>
            <div className="col-span-2 text-center">Weather</div>
            <div className="col-span-2 text-center">Temp</div>
            <div className="col-span-2 text-center">Wind</div>
            <div className="col-span-2 text-center">Precip</div>
          </div>

          {/* Rows */}
          {forecasts.map((day, index) => (
            <div key={index}>
              <button
                onClick={() => setExpandedDay(expandedDay === index ? null : index)}
                className={`w-full grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-rc-bg-light/20 transition-colors ${
                  index !== forecasts.length - 1 ? 'border-b border-rc-bg-light/50' : ''
                }`}
              >
                {/* Date */}
                <div className="col-span-2 text-left">
                  <div className="font-medium text-rc-text">
                    {index === 0 ? 'Today' : day.dayName}
                  </div>
                  <div className="text-sm text-rc-text-muted">
                    {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {/* Score */}
                <div className="col-span-2 flex justify-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getScoreBg(day.score)}`} />
                    <span className={`text-lg font-bold ${getScoreColor(day.score)}`}>
                      {day.score.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Weather */}
                <div className="col-span-2 flex justify-center">
                  {getConditionIcon(day.conditions)}
                </div>

                {/* Temp */}
                <div className="col-span-2 text-center">
                  <span className="text-rc-text">{day.highTemp}°</span>
                  <span className="text-rc-text-muted"> / {day.lowTemp}°</span>
                </div>

                {/* Wind */}
                <div className="col-span-2 text-center">
                  <span className="text-rc-text">{day.windSpeed}</span>
                  <span className="text-rc-text-muted"> km/h {day.windDir}</span>
                </div>

                {/* Precip */}
                <div className="col-span-2 flex items-center justify-center gap-2">
                  <span className={day.precip > 50 ? 'text-blue-400' : 'text-rc-text-light'}>
                    {day.precip}%
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-rc-text-muted transition-transform ${
                      expandedDay === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Details */}
              {expandedDay === index && (
                <div className="px-4 py-4 bg-rc-bg-darkest/50 border-b border-rc-bg-light/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-rc-bg-dark rounded-lg p-3 border border-rc-bg-light">
                      <p className="text-xs text-rc-text-muted mb-1">Best Time</p>
                      <p className="text-rc-text font-medium">6:00 AM - 9:00 AM</p>
                    </div>
                    <div className="bg-rc-bg-dark rounded-lg p-3 border border-rc-bg-light">
                      <p className="text-xs text-rc-text-muted mb-1">High Tide</p>
                      <p className="text-rc-text font-medium">{day.tideEvents[0].time}</p>
                    </div>
                    <div className="bg-rc-bg-dark rounded-lg p-3 border border-rc-bg-light">
                      <p className="text-xs text-rc-text-muted mb-1">Low Tide</p>
                      <p className="text-rc-text font-medium">{day.tideEvents[1].time}</p>
                    </div>
                    <div className="bg-rc-bg-dark rounded-lg p-3 border border-rc-bg-light">
                      <p className="text-xs text-rc-text-muted mb-1">Visibility</p>
                      <p className="text-rc-text font-medium">Good</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-rc-bg-dark rounded-xl border border-rc-bg-light p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-rc-text-light" />
            <h3 className="font-semibold text-rc-text">14-Day Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-rc-text-muted">Best Days</p>
              <p className="text-xl font-bold text-green-400">
                {forecasts.filter(d => d.score >= 8).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-rc-text-muted">Good Days</p>
              <p className="text-xl font-bold text-blue-400">
                {forecasts.filter(d => d.score >= 6 && d.score < 8).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-rc-text-muted">Avg Score</p>
              <p className="text-xl font-bold text-rc-text">
                {(forecasts.reduce((sum, d) => sum + d.score, 0) / forecasts.length).toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-rc-text-muted">Best Day</p>
              <p className="text-xl font-bold text-green-400">
                {forecasts.reduce((best, d) => d.score > best.score ? d : best).dayName}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </AppShell>
  )
}
