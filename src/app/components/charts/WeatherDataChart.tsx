'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MinutelyScore {
  time: string
  timestamp: number
  score: number
  temp: number
  conditions: string
  icon: string
  windSpeed: number
  precipitation: number
}

interface TwoHourForecast {
  startTime: number
  endTime: number
  score: {
    total: number
  }
  avgTemp: number
  conditions: string
  icon: string
  windSpeed: number
  precipitation: number
  pressure: number
}

interface WeatherDataChartProps {
  minutelyScores: MinutelyScore[]
  twoHourForecasts: TwoHourForecast[]
  sunrise: number
  sunset: number
  dayName: string
}

export default function WeatherDataChart({
  minutelyScores,
  twoHourForecasts,
  sunrise,
  sunset,
  dayName,
}: WeatherDataChartProps) {
  const [activeTab, setActiveTab] = useState('overview')

  // Helper functions
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const formatTimeShort = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return minutes === 0 || minutes === 30
      ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      : ''
  }

  // Sample every 4th data point to reduce chart clutter
  const sampledMinutelyScores = minutelyScores.filter((_, index) => index % 4 === 0)

  // Format data for weather overview chart
  const overviewChartData = sampledMinutelyScores.map(score => ({
    time: formatTimeShort(score.timestamp),
    fullTime: formatTime(score.timestamp),
    temp: score.temp,
    windSpeed: score.windSpeed,
    precipitation: score.precipitation * 10, // Scale precipitation for visibility
    timestamp: score.timestamp,
  }))

  // Format data for 2-hour pressure chart
  const pressureChartData = twoHourForecasts.map(forecast => ({
    time: formatTime(forecast.startTime),
    fullTime: `${formatTime(forecast.startTime)} - ${formatTime(forecast.endTime)}`,
    pressure: forecast.pressure,
    temp: forecast.avgTemp,
    score: forecast.score.total,
    timestamp: forecast.startTime,
  }))

  const chartConfig = {
    temp: {
      label: 'Temperature',
      color: '#ef4444',
    },
    windSpeed: {
      label: 'Wind Speed',
      color: '#3b82f6',
    },
    precipitation: {
      label: 'Precipitation',
      color: '#06b6d4',
    },
    pressure: {
      label: 'Pressure',
      color: '#8b5cf6',
    },
  }

  // Custom tooltip for overview chart
  const OverviewTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ value: number; dataKey: string; color: string; payload: any }>
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl">
          <div className="text-white font-semibold mb-2">{data.fullTime}</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">Temperature: {data.temp.toFixed(1)}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-300">Wind Speed: {data.windSpeed.toFixed(1)} km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
              <span className="text-gray-300">Precipitation: {(data.precipitation / 10).toFixed(1)} mm</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom tooltip for pressure chart
  const PressureTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ value: number; dataKey: string; color: string; payload: any }>
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl">
          <div className="text-white font-semibold mb-2">{data.fullTime}</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-gray-300">Pressure: {data.pressure.toFixed(0)} hPa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">Temperature: {data.temp.toFixed(1)}°C</span>
            </div>
            <div className="text-gray-300">Fishing Score: {data.score.toFixed(1)}/10</div>
          </div>
        </div>
      )
    }
    return null
  }

  // Calculate statistics
  const tempStats = {
    min: Math.min(...minutelyScores.map(s => s.temp)),
    max: Math.max(...minutelyScores.map(s => s.temp)),
    avg: minutelyScores.reduce((sum, s) => sum + s.temp, 0) / minutelyScores.length,
  }

  const windStats = {
    min: Math.min(...minutelyScores.map(s => s.windSpeed)),
    max: Math.max(...minutelyScores.map(s => s.windSpeed)),
    avg: minutelyScores.reduce((sum, s) => sum + s.windSpeed, 0) / minutelyScores.length,
  }

  const precipitationStats = {
    total: minutelyScores.reduce((sum, s) => sum + s.precipitation, 0),
    max: Math.max(...minutelyScores.map(s => s.precipitation)),
  }

  const pressureStats =
    twoHourForecasts.length > 0
      ? {
          min: Math.min(...twoHourForecasts.map(f => f.pressure)),
          max: Math.max(...twoHourForecasts.map(f => f.pressure)),
          avg: twoHourForecasts.reduce((sum, f) => sum + f.pressure, 0) / twoHourForecasts.length,
        }
      : { min: 0, max: 0, avg: 0 }

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-white mb-2">🌤️ Weather Data Analysis - {dayName}</CardTitle>
        <CardDescription className="text-gray-300">
          Detailed weather conditions used for fishing score calculations
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="pressure" className="data-[state=active]:bg-purple-600">
              Pressure & Trends
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-green-600">
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="h-[400px] w-full">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={overviewChartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="time"
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: 'Temperature (°C) / Wind (km/h)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#9CA3AF' },
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: 'Precipitation (mm x10)',
                        angle: 90,
                        position: 'insideRight',
                        style: { textAnchor: 'middle', fill: '#9CA3AF' },
                      }}
                    />
                    <ChartTooltip content={<OverviewTooltip />} />
                    <Legend />

                    {/* Reference lines for sunrise/sunset */}
                    <ReferenceLine
                      x={formatTimeShort(sunrise)}
                      stroke="#fbbf24"
                      strokeDasharray="2 2"
                      label={{ value: 'Sunrise', position: 'top' }}
                    />
                    <ReferenceLine
                      x={formatTimeShort(sunset)}
                      stroke="#f59e0b"
                      strokeDasharray="2 2"
                      label={{ value: 'Sunset', position: 'top' }}
                    />

                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="temp"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      name="Temperature (°C)"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="windSpeed"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      name="Wind Speed (km/h)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="precipitation"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                      name="Precipitation (mm x10)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="text-sm text-gray-400 text-center">
              * Precipitation values are multiplied by 10 for chart visibility
            </div>
          </TabsContent>

          <TabsContent value="pressure" className="space-y-4">
            <div className="h-[400px] w-full">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={pressureChartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="time"
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={['dataMin - 5', 'dataMax + 5']}
                      label={{
                        value: 'Pressure (hPa)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#9CA3AF' },
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: 'Temperature (°C)',
                        angle: 90,
                        position: 'insideRight',
                        style: { textAnchor: 'middle', fill: '#9CA3AF' },
                      }}
                    />
                    <ChartTooltip content={<PressureTooltip />} />
                    <Legend />

                    {/* Reference lines for optimal pressure */}
                    <ReferenceLine
                      yAxisId="left"
                      y={1013}
                      stroke="#10b981"
                      strokeDasharray="2 2"
                      label="Standard Pressure"
                    />
                    <ReferenceLine
                      yAxisId="left"
                      y={1020}
                      stroke="#f59e0b"
                      strokeDasharray="2 2"
                      label="High Pressure"
                    />
                    <ReferenceLine
                      yAxisId="left"
                      y={1006}
                      stroke="#f97316"
                      strokeDasharray="2 2"
                      label="Low Pressure"
                    />

                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="pressure"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                      name="Pressure (hPa)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="temp"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      name="Temperature (°C)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2">🎯 Pressure Impact on Fishing</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="text-green-300">
                  <strong>High Pressure (1020+ hPa):</strong> Clear skies, stable conditions, fish may be less active
                </div>
                <div className="text-yellow-300">
                  <strong>Normal Pressure (1006-1020 hPa):</strong> Optimal conditions, stable weather patterns
                </div>
                <div className="text-orange-300">
                  <strong>Low Pressure (&lt;1006 hPa):</strong> Storm approaching, fish often feed actively before
                  weather change
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Temperature Stats */}
              <div className="bg-gradient-to-br from-red-900/50 to-red-800/50 rounded-lg p-4 border border-red-600/30">
                <h4 className="text-red-300 font-semibold mb-3 flex items-center gap-2">🌡️ Temperature</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Min:</span>
                    <span className="text-white font-semibold">{tempStats.min.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Max:</span>
                    <span className="text-white font-semibold">{tempStats.max.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Avg:</span>
                    <span className="text-white font-semibold">{tempStats.avg.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Range:</span>
                    <span className="text-red-300 font-semibold">{(tempStats.max - tempStats.min).toFixed(1)}°C</span>
                  </div>
                </div>
              </div>

              {/* Wind Stats */}
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-lg p-4 border border-blue-600/30">
                <h4 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">💨 Wind Speed</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Min:</span>
                    <span className="text-white font-semibold">{windStats.min.toFixed(1)} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Max:</span>
                    <span className="text-white font-semibold">{windStats.max.toFixed(1)} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Avg:</span>
                    <span className="text-white font-semibold">{windStats.avg.toFixed(1)} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Condition:</span>
                    <span
                      className={`font-semibold ${
                        windStats.avg < 15 ? 'text-green-300' : windStats.avg < 25 ? 'text-yellow-300' : 'text-red-300'
                      }`}
                    >
                      {windStats.avg < 15 ? 'Calm' : windStats.avg < 25 ? 'Moderate' : 'Strong'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Precipitation Stats */}
              <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/50 rounded-lg p-4 border border-cyan-600/30">
                <h4 className="text-cyan-300 font-semibold mb-3 flex items-center gap-2">🌧️ Precipitation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total:</span>
                    <span className="text-white font-semibold">{precipitationStats.total.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Max/hr:</span>
                    <span className="text-white font-semibold">{precipitationStats.max.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Periods:</span>
                    <span className="text-white font-semibold">
                      {minutelyScores.filter(s => s.precipitation > 0.1).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Condition:</span>
                    <span
                      className={`font-semibold ${
                        precipitationStats.total < 1
                          ? 'text-green-300'
                          : precipitationStats.total < 5
                          ? 'text-yellow-300'
                          : 'text-red-300'
                      }`}
                    >
                      {precipitationStats.total < 1
                        ? 'Dry'
                        : precipitationStats.total < 5
                        ? 'Light Rain'
                        : 'Heavy Rain'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pressure Stats */}
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-lg p-4 border border-purple-600/30">
                <h4 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">🌀 Pressure</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Min:</span>
                    <span className="text-white font-semibold">{pressureStats.min.toFixed(0)} hPa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Max:</span>
                    <span className="text-white font-semibold">{pressureStats.max.toFixed(0)} hPa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Avg:</span>
                    <span className="text-white font-semibold">{pressureStats.avg.toFixed(0)} hPa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Stability:</span>
                    <span
                      className={`font-semibold ${
                        Math.abs(pressureStats.max - pressureStats.min) < 5
                          ? 'text-green-300'
                          : Math.abs(pressureStats.max - pressureStats.min) < 10
                          ? 'text-yellow-300'
                          : 'text-red-300'
                      }`}
                    >
                      {Math.abs(pressureStats.max - pressureStats.min) < 5
                        ? 'Stable'
                        : Math.abs(pressureStats.max - pressureStats.min) < 10
                        ? 'Changing'
                        : 'Unstable'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Quality Assessment */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">📊 Weather Quality Assessment</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-green-300 font-medium mb-2">✅ Favorable Conditions</h5>
                  <ul className="space-y-1 text-sm text-gray-300">
                    {tempStats.avg >= 10 && tempStats.avg <= 25 && <li>• Optimal temperature range</li>}
                    {windStats.avg < 20 && <li>• Manageable wind conditions</li>}
                    {precipitationStats.total < 2 && <li>• Minimal precipitation</li>}
                    {pressureStats.avg >= 1010 && pressureStats.avg <= 1020 && <li>• Stable barometric pressure</li>}
                    {Math.abs(pressureStats.max - pressureStats.min) < 5 && (
                      <li>• Consistent pressure (stable weather)</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h5 className="text-orange-300 font-medium mb-2">⚠️ Challenging Conditions</h5>
                  <ul className="space-y-1 text-sm text-gray-300">
                    {(tempStats.avg < 5 || tempStats.avg > 30) && <li>• Extreme temperatures</li>}
                    {windStats.avg >= 25 && <li>• Strong wind conditions</li>}
                    {precipitationStats.total >= 5 && <li>• Heavy precipitation expected</li>}
                    {(pressureStats.avg < 1006 || pressureStats.avg > 1025) && <li>• Extreme pressure conditions</li>}
                    {Math.abs(pressureStats.max - pressureStats.min) >= 10 && <li>• Rapidly changing weather</li>}
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
