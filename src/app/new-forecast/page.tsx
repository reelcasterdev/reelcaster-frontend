'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchOpenMeteoWeather, ProcessedOpenMeteoData } from '../utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts, OpenMeteoDailyForecast } from '../utils/fishingCalculations'
import { findNearestTideStation, getCachedTideData, TideData } from '../utils/tideApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Cell } from 'recharts'
import LoadingState from '../components/common/loading-state'
import ErrorState from '../components/common/error-state'
import DataSummary from '../components/forecast/data-summary'

// Real fishing location and species data
interface FishingHotspot {
  name: string
  coordinates: { lat: number; lon: number }
}

interface FishingLocation {
  id: string
  name: string
  coordinates: { lat: number; lon: number }
  hotspots: FishingHotspot[]
}

interface FishSpecies {
  id: string
  name: string
  scientificName: string
  minSize: string
  dailyLimit: string
  status: 'Open' | 'Closed' | 'Non Retention'
  gear: string
  season: string
  description: string
}

const fishingLocations: FishingLocation[] = [
  {
    id: 'victoria-sidney',
    name: 'Victoria, Sidney',
    coordinates: { lat: 48.4113, lon: -123.398 },
    hotspots: [
      { name: 'Breakwater (Shore Fishing)', coordinates: { lat: 48.4113, lon: -123.398 } },
      { name: 'Waterfront', coordinates: { lat: 48.4284, lon: -123.3656 } },
      { name: 'Ten Mile Point (Shore Fishing)', coordinates: { lat: 48.4167, lon: -123.3 } },
      { name: 'Oak Bay', coordinates: { lat: 48.4264, lon: -123.3145 } },
      { name: 'Waterfront Bay', coordinates: { lat: 48.4632, lon: -123.3127 } },
      { name: 'Constance Bank', coordinates: { lat: 48.3833, lon: -123.4167 } },
      { name: 'Sidney', coordinates: { lat: 48.65, lon: -123.4 } },
    ],
  },
  {
    id: 'sooke-port-renfrew',
    name: 'Sooke, Port Renfrew',
    coordinates: { lat: 48.3415, lon: -123.5507 },
    hotspots: [
      { name: 'East Sooke', coordinates: { lat: 48.35, lon: -123.6167 } },
      { name: 'Becher Bay', coordinates: { lat: 48.3167, lon: -123.6333 } },
      { name: 'Pedder Bay', coordinates: { lat: 48.3415, lon: -123.5507 } },
      { name: 'Church Rock', coordinates: { lat: 48.3, lon: -123.6 } },
    ],
  },
]

const fishSpecies: FishSpecies[] = [
  {
    id: 'coho-salmon',
    name: 'Coho Salmon',
    scientificName: 'Oncorhynchus kisutch',
    minSize: '30cm',
    dailyLimit: '2',
    status: 'Open',
    gear: 'Barbless hook and line',
    season: 'June - October',
    description: 'Silver salmon, excellent fighting fish',
  },
  {
    id: 'pink-salmon',
    name: 'Pink Salmon',
    scientificName: 'Oncorhynchus gorbuscha',
    minSize: '30cm',
    dailyLimit: '4',
    status: 'Open',
    gear: 'Barbless hook and line',
    season: 'July - September (odd years)',
    description: 'Humpy salmon, abundant in odd years',
  },
  {
    id: 'lingcod',
    name: 'Lingcod',
    scientificName: 'Ophiodon elongatus',
    minSize: '65cm',
    dailyLimit: '1',
    status: 'Open',
    gear: 'Hook and line',
    season: 'Year-round',
    description: 'Large predatory fish, great eating',
  },
  {
    id: 'halibut',
    name: 'Halibut',
    scientificName: 'Hippoglossus stenolepis',
    minSize: '83cm',
    dailyLimit: '1',
    status: 'Closed',
    gear: 'Hook and line',
    season: 'Year-round',
    description: 'Large flatfish, excellent table fare',
  },
  {
    id: 'chinook-salmon',
    name: 'Chinook Salmon',
    scientificName: 'Oncorhynchus tshawytscha',
    minSize: '62cm',
    dailyLimit: '0',
    status: 'Non Retention',
    gear: 'Barbless hook and line',
    season: 'Year-round (varies by area)',
    description: 'King salmon, largest Pacific salmon species',
  },
  {
    id: 'rockfish',
    name: 'Rockfish',
    scientificName: 'Sebastes spp.',
    minSize: 'Varies by species',
    dailyLimit: '5 combined',
    status: 'Closed',
    gear: 'Hook and line',
    season: 'Year-round (some restrictions)',
    description: 'Bottom dwelling fish, many species',
  },
]

function NewForecastContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // URL parameters (exactly like existing forecast page)
  const location = searchParams.get('location') || 'Unknown Location'
  const hotspot = searchParams.get('hotspot') || 'Unknown Hotspot'
  const species = searchParams.get('species') || null
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lon = parseFloat(searchParams.get('lon') || '0')

  // State variables (matching existing forecast page pattern)
  const [selectedLocation, setSelectedLocation] = useState<string>(
    location !== 'Unknown Location' ? location : 'Victoria, Sidney',
  )
  const [selectedHotspot, setSelectedHotspot] = useState<string>(
    hotspot !== 'Unknown Hotspot' ? hotspot : 'Breakwater (Shore Fishing)',
  )
  const [selectedSpecies, setSelectedSpecies] = useState<string>(species || 'All Species')
  const [openMeteoData, setOpenMeteoData] = useState<ProcessedOpenMeteoData | null>(null)
  const [forecasts, setForecasts] = useState<OpenMeteoDailyForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tideData, setTideData] = useState<TideData | null>(null)

  // Coordinate validation (same as existing forecast page)
  const hasValidCoordinates = lat !== 0 && lon !== 0

  // Get current location data for dropdowns
  const currentLocation = fishingLocations.find(loc => loc.name === selectedLocation)
  const currentHotspot = currentLocation?.hotspots.find(h => h.name === selectedHotspot)
  const currentSpecies = fishSpecies.find(s => s.name === selectedSpecies)

  // Use URL coordinates if valid, otherwise use selected location coordinates
  const coordinates = hasValidCoordinates
    ? { lat, lon }
    : currentHotspot?.coordinates || currentLocation?.coordinates || { lat: 48.4113, lon: -123.398 }

  useEffect(() => {
    if (hasValidCoordinates) {
      fetchForecastData()
    } else if (!hasValidCoordinates && (lat !== 0 || lon !== 0)) {
      setError('Invalid coordinates provided')
      setLoading(false)
    } else {
      // No URL coordinates, use selected location
      fetchForecastData()
    }
  }, [lat, lon, selectedLocation, selectedHotspot, hasValidCoordinates])

  const fetchForecastData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch tide data
      const tideStation = findNearestTideStation(coordinates)
      const tideResult = await getCachedTideData(tideStation)
      setTideData(tideResult)

      // Fetch weather forecast
      const result = await fetchOpenMeteoWeather(coordinates, 14)

      if (!result.success) {
        setError(result.error || 'Failed to fetch weather data')
        return
      }

      console.log('Open-Meteo data received:', result.data)
      setOpenMeteoData(result.data!)

      // Generate daily forecasts with tide data
      const dailyForecasts = generateOpenMeteoDailyForecasts(result.data!, tideResult, species)
      console.log('Generated forecasts:', dailyForecasts)
      setForecasts(dailyForecasts)
    } catch (err) {
      console.error('Error fetching forecast data:', err)
      setError('Failed to fetch weather data')
    } finally {
      setLoading(false)
    }
  }

  const handleLocationChange = (locationName: string) => {
    setSelectedLocation(locationName)
    const newLocation = fishingLocations.find(loc => loc.name === locationName)
    if (newLocation && newLocation.hotspots.length > 0) {
      setSelectedHotspot(newLocation.hotspots[0].name)
    }
  }

  const handleHotspotChange = (hotspotName: string) => {
    setSelectedHotspot(hotspotName)
  }

  const handleSpeciesChange = (speciesName: string) => {
    setSelectedSpecies(speciesName)
  }

  const navigateToOldForecast = () => {
    const params = new URLSearchParams({
      location: selectedLocation,
      hotspot: selectedHotspot,
      lat: coordinates.lat.toString(),
      lon: coordinates.lon.toString(),
    })

    if (selectedSpecies !== 'All Species' && currentSpecies) {
      params.set('species', currentSpecies.name)
    }

    router.push(`/forecast?${params.toString()}`)
  }

  // Get today's forecast data
  const todayForecast = forecasts[0]

  // Calculate today's average score
  const todayScore = todayForecast
    ? Math.round(
        todayForecast.twoHourForecasts.reduce((sum, forecast) => sum + forecast.score.total, 0) /
          todayForecast.twoHourForecasts.length,
      )
    : 0

  // Get hourly data for the chart (every 4th point for 24 hours)
  const hourlyData = todayForecast
    ? todayForecast.minutelyScores
        .filter((_, index) => index % 4 === 0)
        .slice(0, 24)
        .map((score, index) => ({
          hour: `${index.toString().padStart(2, '0')}`,
          score: Math.round(score.score),
          time: score.time,
        }))
    : []

  // Get best time range for today
  const bestHourRange = todayForecast
    ? (() => {
        const bestBlock = todayForecast.twoHourForecasts.reduce((best, current) =>
          current.score.total > best.score.total ? current : best,
        )
        const startHour = new Date(bestBlock.startTime * 1000).getHours()
        const endHour = new Date(bestBlock.endTime * 1000).getHours()
        const formatHour = (hour: number) => {
          const period = hour < 12 ? 'AM' : 'PM'
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
          return `${displayHour} ${period}`
        }
        return `${formatHour(startHour)} and ${formatHour(endHour)}`
      })()
    : '6 AM and 10 AM'

  // Generate tide chart data from real tide data
  const tideChartData = tideData
    ? tideData.dailyTides.map(tide => ({
        time: new Date(tide.time * 1000)
          .toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true,
          })
          .replace(':00 ', ' '),
        height: tide.height,
        fullTime: new Date(tide.time * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      }))
    : [
        { time: '12a', height: 2.1, fullTime: '12:00 AM' },
        { time: '3a', height: 1.8, fullTime: '03:00 AM' },
        { time: '6a', height: 2.8, fullTime: '06:00 AM' },
        { time: '9a', height: 3.2, fullTime: '09:00 AM' },
        { time: '12p', height: 2.9, fullTime: '12:00 PM' },
        { time: '3p', height: 2.2, fullTime: '03:00 PM' },
        { time: '6p', height: 1.9, fullTime: '06:00 PM' },
        { time: '9p', height: 2.4, fullTime: '09:00 PM' },
      ]

  // Get sunrise and sunset for today
  const sunriseTime = todayForecast
    ? new Date(todayForecast.sunrise * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '6:00 AM'

  const sunsetTime = todayForecast
    ? new Date(todayForecast.sunset * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '8:00 PM'

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#22c55e' // green
    if (score >= 6) return '#eab308' // yellow
    if (score >= 4) return '#f97316' // orange
    return '#ef4444' // red
  }

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent'
    if (score >= 6) return 'Good'
    if (score >= 4) return 'Fair'
    return 'Poor'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'default'
      case 'Closed':
        return 'destructive'
      case 'Non Retention':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // Handle invalid coordinates like existing forecast page
  if (!hasValidCoordinates && (lat !== 0 || lon !== 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Location</h1>
          <p className="text-red-600 mb-4">Please provide valid coordinates in the URL</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <LoadingState forecastDays={14} />
  }

  if (error) {
    return <ErrorState error={error} />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Fishing Forecast</h1>
              <p className="text-gray-600 text-lg">Today&apos;s outlook for your favorite spot.</p>
            </div>
            <Button onClick={navigateToOldForecast} variant="outline">
              View Detailed Forecast
            </Button>
          </div>

          {/* Location and Species Selectors */}
          <div className="flex flex-wrap gap-4">
            <Select value={selectedLocation} onValueChange={handleLocationChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {fishingLocations.map(location => (
                  <SelectItem key={location.id} value={location.name}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedHotspot} onValueChange={handleHotspotChange}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select hotspot" />
              </SelectTrigger>
              <SelectContent>
                {currentLocation?.hotspots.map(hotspot => (
                  <SelectItem key={hotspot.name} value={hotspot.name}>
                    {hotspot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSpecies} onValueChange={handleSpeciesChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Species">All Species</SelectItem>
                {fishSpecies.map(species => (
                  <SelectItem key={species.id} value={species.name}>
                    {species.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Summary */}
        {openMeteoData && !loading && <DataSummary openMeteoData={openMeteoData} forecastsCount={forecasts.length} />}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Hourly Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hourly Fishing Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Hourly Fishing Score</CardTitle>
                <CardDescription>
                  The best time to fish today is between {bestHourRange}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm">Score &gt;7</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="text-sm">6</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-sm">&lt;3</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    score: {
                      label: 'Fishing Score',
                    },
                  }}
                  className="h-80"
                >
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={value => `${value}:00`}
                    />
                    <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => [`${value}/10`, `Fishing Score at ${name}:00`]}
                        />
                      }
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {hourlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Tide Height and Sunrise/Sunset */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tide Height */}
              <Card>
                <CardHeader>
                  <CardTitle>Tide Height</CardTitle>
                  <CardDescription>
                    {tideData
                      ? `${tideData.isRising ? 'Rising' : 'Falling'} - Next ${
                          tideData.nextChangeType
                        } tide in ${Math.round(tideData.timeToChange)} minutes`
                      : 'Highest tide at 12 PM'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      height: {
                        label: 'Tide Height (m)',
                        color: 'hsl(var(--chart-1))',
                      },
                    }}
                    className="h-40"
                  >
                    <LineChart data={tideChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={value => `${value}m`} />
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                                <p className="font-medium">{`Tide Height: ${payload[0].value}m`}</p>
                                <p className="text-sm text-muted-foreground">{`Time: ${data.fullTime || data.time}`}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="height"
                        stroke="var(--color-height)"
                        strokeWidth={3}
                        dot={{ fill: 'var(--color-height)', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Sunrise & Sunset */}
              <Card>
                <CardHeader>
                  <CardTitle>Sunrise & Sunset</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative h-24 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 rounded-lg overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent"></div>
                      <div className="absolute bottom-2 left-4 text-white">
                        <div className="text-sm font-medium">{sunriseTime}</div>
                        <div className="text-xs opacity-80">Sunrise</div>
                      </div>
                      <div className="absolute bottom-2 right-4 text-white">
                        <div className="text-sm font-medium">{sunsetTime}</div>
                        <div className="text-xs opacity-80">Sunset</div>
                      </div>
                      <svg
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Daily Fishing Score */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Fishing Score</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  {todayScore}
                  <span className="text-3xl text-gray-400">/10</span>
                </div>
                <div className="text-lg text-gray-600 font-medium">{getScoreLabel(todayScore)}</div>
              </CardContent>
            </Card>

            {/* Species Status */}
            <Card>
              <CardHeader>
                <CardTitle>Species Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fishSpecies.map(species => (
                    <div key={species.id} className="flex justify-between items-center">
                      <span className="text-gray-700">{species.name}</span>
                      <Badge variant={getStatusColor(species.status)}>{species.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fishing Reports */}
            <Card>
              <CardHeader>
                <CardTitle>Fishing Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-gray-600 hover:text-blue-600 cursor-pointer">Report 1: Fishing Hotspots</div>
                  <div className="text-gray-600 hover:text-blue-600 cursor-pointer">Report 2: Best Baits</div>
                  <div className="text-gray-600 hover:text-blue-600 cursor-pointer">Report 3: Tide Strategies</div>
                  <div className="text-gray-600 hover:text-blue-600 cursor-pointer">Report 4: Weather Impact</div>
                  <div className="text-gray-600 hover:text-blue-600 cursor-pointer">Report 5: Conservation Tips</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 14 Day Forecast */}
        <Card>
          <CardHeader>
            <CardTitle>14 Day Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4">
              {forecasts.slice(0, 14).map((forecast, index) => {
                // Calculate max score for the day as requested
                const dayMaxScore =
                  forecast.twoHourForecasts.length > 0
                    ? Math.round(Math.max(...forecast.twoHourForecasts.map(f => f.score.total)))
                    : 0
                const dayName = new Date(forecast.date * 1000).toLocaleDateString('en-US', { weekday: 'short' })
                const dayDate = new Date(forecast.date * 1000).getDate()

                return (
                  <div key={index} className="text-center">
                    <div className="text-sm text-gray-600 mb-1">{dayName}</div>
                    <div className="text-xs text-gray-500 mb-2">{dayDate}</div>
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto"
                      style={{ backgroundColor: getScoreColor(dayMaxScore) }}
                    >
                      {dayMaxScore}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{getScoreLabel(dayMaxScore)}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function NewForecastPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading forecast page...</p>
          </div>
        </div>
      }
    >
      <NewForecastContent />
    </Suspense>
  )
}
