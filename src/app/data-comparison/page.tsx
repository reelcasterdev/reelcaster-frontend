'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { fetchOpenMeteoHistoricalWeather } from '../utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts, OpenMeteoDailyForecast } from '../utils/fishingCalculations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Info } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
} from 'recharts'
import LoadingState from '../components/common/loading-state'
import ErrorState from '../components/common/error-state'
import DateRangeSelector from '../components/common/date-range-selector'
import {
  processDFODataForComparison,
  getFishingPressureIndicator,
  generateMockDFOData,
  DFOCatchRecord,
} from '../utils/dfoApi'

// Location coordinates for data comparison
const LOCATIONS = {
  Victoria: { lat: 48.4284, lon: -123.3656 },
  'Oak Bay': { lat: 48.4264, lon: -123.3145 },
  Sooke: { lat: 48.3415, lon: -123.5507 },
  Sidney: { lat: 48.65, lon: -123.4 },
  'Becher Bay': { lat: 48.3167, lon: -123.6333 },
  'Pedder Bay': { lat: 48.3415, lon: -123.5507 },
}

interface INaturalistObservation {
  id: number
  observed_on: string
  latitude: number
  longitude: number
  taxon: {
    id: number
    name: string
    preferred_common_name?: string
    iconic_taxon_name: string
  }
  quality_grade: 'research' | 'needs_id' | 'casual'
  location: string
  user: {
    login: string
  }
}

interface ComparisonData {
  date: string
  location: string
  species: string
  algorithmScore: number
  realObservations: number
  qualityScore: number
  commercialScore: number
  difference: number
}

interface DateRange {
  startDate: string
  endDate: string
}

function DataComparisonContent() {
  const router = useRouter()
  const [selectedLocation, setSelectedLocation] = useState<string>('Victoria')
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [dateRangeSelected, setDateRangeSelected] = useState(false)
  const [rawINaturalistData, setRawINaturalistData] = useState<INaturalistObservation[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all')
  const [availableSpecies, setAvailableSpecies] = useState<
    { id: string; name: string; commonName?: string; count: number }[]
  >([])
  const [dfoData, setDfoData] = useState<DFOCatchRecord[]>([])
  const [fishingPressure, setFishingPressure] = useState<any>(null)

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate })
    setDateRangeSelected(true)
  }

  const handleSpeciesChange = (speciesId: string) => {
    setSelectedSpecies(speciesId)
    if (rawINaturalistData.length > 0) {
      // Reprocess comparison data with new species filter
      const algData =
        comparisonData.length > 0
          ? (comparisonData.map(item => ({
              date: typeof item.date === 'string' ? new Date(item.date).getTime() / 1000 : item.date,
              minutelyScores: [{ score: item.algorithmScore }],
            })) as OpenMeteoDailyForecast[])
          : []

      const comparison = processComparisonData(rawINaturalistData, algData, speciesId, dfoData)
      setComparisonData(comparison)
    }
  }

  const fetchINaturalistData = async (
    location: string,
    startDate: string,
    endDate: string,
  ): Promise<INaturalistObservation[]> => {
    const coords = LOCATIONS[location as keyof typeof LOCATIONS]
    if (!coords) throw new Error(`Unknown location: ${location}`)

    // Search within 5km radius of the location
    const radius = 5 // km
    const latDelta = radius / 111 // rough conversion
    const lonDelta = radius / (111 * Math.cos((coords.lat * Math.PI) / 180))

    const params = new URLSearchParams({
      nelat: (coords.lat + latDelta).toString(),
      nelng: (coords.lon + lonDelta).toString(),
      swlat: (coords.lat - latDelta).toString(),
      swlng: (coords.lon - lonDelta).toString(),
      d1: startDate,
      d2: endDate,
      taxon_id: '47178', // Actinopterygii (ray-finned fishes)
      quality_grade: 'research,needs_id',
      per_page: '200',
      order_by: 'observed_on',
      order: 'desc',
    })

    const response = await fetch(`https://api.inaturalist.org/v1/observations?${params}`)
    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status}`)
    }

    const data = await response.json()
    return data.results.map((obs: any) => ({
      id: obs.id,
      observed_on: obs.observed_on,
      latitude: obs.latitude,
      longitude: obs.longitude,
      taxon: {
        id: obs.taxon?.id,
        name: obs.taxon?.name || 'Unknown',
        preferred_common_name: obs.taxon?.preferred_common_name,
        iconic_taxon_name: obs.taxon?.iconic_taxon_name || 'Fish',
      },
      quality_grade: obs.quality_grade,
      location: location,
      user: {
        login: obs.user?.login || 'Unknown',
      },
    }))
  }

  const fetchAlgorithmData = async (
    location: string,
    startDate: string,
    endDate: string,
  ): Promise<OpenMeteoDailyForecast[]> => {
    const coords = LOCATIONS[location as keyof typeof LOCATIONS]
    if (!coords) throw new Error(`Unknown location: ${location}`)

    console.log(`Fetching algorithm data for ${location} from ${startDate} to ${endDate}`)

    // For very large date ranges (like full years), generate data month by month to avoid API limits
    const start = new Date(startDate)
    const end = new Date(endDate)
    const allForecasts: OpenMeteoDailyForecast[] = []

    // Calculate total days to determine if we need to chunk the requests
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (totalDays > 90) {
      // For large date ranges, fetch month by month
      const current = new Date(start)

      while (current <= end) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1)
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)

        // Don't go beyond the requested end date
        if (monthEnd > end) monthEnd.setTime(end.getTime())
        if (monthStart < start) monthStart.setTime(start.getTime())

        const monthStartStr = monthStart.toISOString().split('T')[0]
        const monthEndStr = monthEnd.toISOString().split('T')[0]

        console.log(`Fetching month: ${monthStartStr} to ${monthEndStr}`)

        try {
          const result = await fetchOpenMeteoHistoricalWeather(coords, monthStartStr, monthEndStr)
          if (result.success && result.data) {
            const monthlyForecasts = generateOpenMeteoDailyForecasts(result.data, null, null)
            allForecasts.push(...monthlyForecasts)
          }
        } catch (error) {
          console.warn(`Failed to fetch data for month ${monthStartStr}:`, error)
        }

        // Move to next month
        current.setMonth(current.getMonth() + 1)
      }

      console.log(`Generated ${allForecasts.length} daily forecasts across ${totalDays} days`)
      return allForecasts
    } else {
      // For smaller date ranges, fetch all at once
      const result = await fetchOpenMeteoHistoricalWeather(coords, startDate, endDate)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch weather data')
      }
      return generateOpenMeteoDailyForecasts(result.data, null, null)
    }
  }

  const extractSpeciesData = (iNatData: INaturalistObservation[]) => {
    const speciesCounts: { [key: string]: { name: string; commonName?: string; count: number } } = {}

    iNatData.forEach(obs => {
      const speciesId = obs.taxon.id?.toString() || 'unknown'
      if (speciesCounts[speciesId]) {
        speciesCounts[speciesId].count++
      } else {
        speciesCounts[speciesId] = {
          name: obs.taxon.name,
          commonName: obs.taxon.preferred_common_name,
          count: 1,
        }
      }
    })

    return Object.entries(speciesCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
  }

  const filterDataBySpecies = (iNatData: INaturalistObservation[], speciesId: string): INaturalistObservation[] => {
    if (speciesId === 'all') return iNatData
    return iNatData.filter(obs => obs.taxon.id?.toString() === speciesId)
  }

  const formatMonthDisplay = (monthKey: string): string => {
    const [year, month] = monthKey.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  const calculateCommercialActivityScore = (dfoData: any[], targetDate: string): number => {
    // Convert target date to year and month for DFO data matching
    const date = new Date(targetDate)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    // Filter DFO records for the specific month and year
    const monthlyRecords = dfoData.filter(record => record.year === year && record.month === month)

    if (monthlyRecords.length === 0) return 0

    // Calculate commercial activity score based on multiple factors:
    // 1. Trip density (number of fishing trips)
    // 2. Vessel activity (number of active vessels)
    // 3. Catch volume (total landed weight)

    const totalTrips = monthlyRecords.reduce((sum, record) => sum + record.trip_count, 0)
    const totalVessels = monthlyRecords.reduce((sum, record) => sum + record.vessel_count, 0)
    const totalWeight = monthlyRecords.reduce((sum, record) => sum + record.landed_weight_kg, 0)

    // Normalize scores to 0-10 scale (similar to algorithm score)
    // These thresholds are based on typical BC commercial fishing patterns
    const tripScore = Math.min((totalTrips / 100) * 10, 10) // 100+ trips = max score
    const vesselScore = Math.min((totalVessels / 50) * 10, 10) // 50+ vessels = max score
    const weightScore = Math.min((totalWeight / 10000) * 10, 10) // 10,000kg+ = max score

    // Weighted average: trips and vessels matter more for fishing "activity"
    const activityScore = tripScore * 0.4 + vesselScore * 0.4 + weightScore * 0.2

    return Math.round(activityScore * 10) / 10
  }

  const processComparisonData = (
    iNatData: INaturalistObservation[],
    algData: OpenMeteoDailyForecast[],
    speciesFilter: string = 'all',
    dfoCommercialData: any[] = [],
  ): ComparisonData[] => {
    const filteredINatData = filterDataBySpecies(iNatData, speciesFilter)
    const dataByMonth: {
      [monthKey: string]: {
        dates: string[]
        algorithmScores: number[]
        observations: INaturalistObservation[]
        year: number
        month: number
      }
    } = {}

    // Process algorithm data by month
    algData.forEach(dayForecast => {
      const date =
        typeof dayForecast.date === 'number'
          ? new Date(dayForecast.date * 1000).toISOString().split('T')[0]
          : dayForecast.date

      const dateObj = new Date(date)
      const year = dateObj.getFullYear()
      const month = dateObj.getMonth() + 1
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`

      if (!dataByMonth[monthKey]) {
        dataByMonth[monthKey] = {
          dates: [],
          algorithmScores: [],
          observations: [],
          year,
          month,
        }
      }

      const avgScore =
        dayForecast.minutelyScores.reduce((sum, score) => sum + score.score, 0) / dayForecast.minutelyScores.length

      dataByMonth[monthKey].dates.push(date)
      dataByMonth[monthKey].algorithmScores.push(avgScore)
    })

    // Process iNaturalist observations by month (filtered by species)
    filteredINatData.forEach(obs => {
      const dateObj = new Date(obs.observed_on)
      const year = dateObj.getFullYear()
      const month = dateObj.getMonth() + 1
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`

      if (dataByMonth[monthKey]) {
        dataByMonth[monthKey].observations.push(obs)
      }
    })

    // Calculate monthly averages and scores
    console.log(`Processing ${Object.keys(dataByMonth).length} months of data:`, Object.keys(dataByMonth).sort())

    const monthlyData: ComparisonData[] = Object.entries(dataByMonth).map(([monthKey, monthData]) => {
      // Calculate average algorithm score for the month
      const avgAlgorithmScore =
        monthData.algorithmScores.length > 0
          ? monthData.algorithmScores.reduce((sum, score) => sum + score, 0) / monthData.algorithmScores.length
          : 0

      // Calculate quality score from observations
      const qualityScore =
        monthData.observations.length > 0
          ? (monthData.observations.filter(obs => obs.quality_grade === 'research').length /
              monthData.observations.length) *
            10
          : 0

      // Calculate commercial activity score for the month
      const commercialScore = calculateCommercialActivityScore(
        dfoCommercialData,
        `${monthData.year}-${monthData.month.toString().padStart(2, '0')}-01`,
      )

      const finalAlgorithmScore = Math.round(avgAlgorithmScore * 10) / 10
      const finalQualityScore = Math.round(qualityScore * 10) / 10

      console.log(
        `Month ${monthKey}: ${monthData.algorithmScores.length} algo scores, ${monthData.observations.length} observations, avg algo: ${finalAlgorithmScore}, quality: ${finalQualityScore}, commercial: ${commercialScore}`,
      )

      return {
        date: monthKey, // Using YYYY-MM format for months
        location: selectedLocation,
        species: speciesFilter === 'all' ? 'All Fish' : 'Selected Species',
        algorithmScore: finalAlgorithmScore,
        realObservations: monthData.observations.length,
        qualityScore: finalQualityScore,
        commercialScore,
        difference: Math.round((finalQualityScore - finalAlgorithmScore) * 10) / 10,
      }
    })

    return monthlyData.sort((a, b) => a.date.localeCompare(b.date))
  }

  const calculateSummary = (data: ComparisonData[]) => {
    if (data.length === 0) return null

    const avgAlgorithm = data.reduce((sum, d) => sum + d.algorithmScore, 0) / data.length
    const avgReal = data.reduce((sum, d) => sum + d.qualityScore, 0) / data.length
    const avgCommercial = data.reduce((sum, d) => sum + d.commercialScore, 0) / data.length
    const avgDifference = data.reduce((sum, d) => sum + Math.abs(d.difference), 0) / data.length
    const totalObservations = data.reduce((sum, d) => sum + d.realObservations, 0)

    const correlation = calculateCorrelation(
      data.map(d => d.algorithmScore),
      data.map(d => d.qualityScore),
    )

    const commercialCorrelation = calculateCorrelation(
      data.map(d => d.algorithmScore),
      data.map(d => d.commercialScore),
    )

    return {
      avgAlgorithm: Math.round(avgAlgorithm * 10) / 10,
      avgReal: Math.round(avgReal * 10) / 10,
      avgCommercial: Math.round(avgCommercial * 10) / 10,
      avgDifference: Math.round(avgDifference * 10) / 10,
      totalObservations,
      correlation: Math.round(correlation * 100) / 100,
      commercialCorrelation: Math.round(commercialCorrelation * 100) / 100,
      dataPoints: data.length,
    }
  }

  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length
    if (n === 0) return 0

    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }

  const handleCompareData = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setError('Please select both start and end dates')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`Fetching data for ${selectedLocation} from ${dateRange.startDate} to ${dateRange.endDate}`)

      // Fetch both data sources in parallel
      // Parallel fetch from all data sources
      const startYear = new Date(dateRange.startDate).getFullYear()
      const endYear = new Date(dateRange.endDate).getFullYear()

      const [iNatData, algData, dfoCommercialData, pressureData] = await Promise.all([
        fetchINaturalistData(selectedLocation, dateRange.startDate, dateRange.endDate),
        fetchAlgorithmData(selectedLocation, dateRange.startDate, dateRange.endDate),
        // Use mock data for now, replace with real API when available
        Promise.resolve(generateMockDFOData(selectedLocation, startYear, endYear)),
        getFishingPressureIndicator(selectedLocation, endYear),
      ])

      console.log(`Found ${iNatData.length} iNaturalist observations`)
      console.log(`Generated ${algData.length} algorithm forecasts`)
      console.log(`Found ${dfoCommercialData.length} DFO commercial records`)

      // Store raw data and extract species information
      setRawINaturalistData(iNatData)
      setDfoData(dfoCommercialData)
      setFishingPressure(pressureData)

      const species = extractSpeciesData(iNatData)
      setAvailableSpecies(species)

      const comparison = processComparisonData(iNatData, algData, selectedSpecies, dfoCommercialData)
      setComparisonData(comparison)

      const summaryStats = calculateSummary(comparison)
      setSummary(summaryStats)
    } catch (err) {
      console.error('Error fetching comparison data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch comparison data')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    router.back()
  }

  if (loading) {
    return <LoadingState forecastDays={1} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={goBack}
            variant="outline"
            size="sm"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Algorithm vs Real Data Comparison</h1>
            <p className="text-gray-400">
              Monthly analysis comparing fishing algorithm predictions with real iNaturalist fishing observations and
              DFO commercial activity
            </p>
          </div>
        </div>

        {/* Controls */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Comparison Settings</CardTitle>
            <CardDescription className="text-gray-400">
              Select location and date range to compare algorithm predictions with real fishing data from iNaturalist
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                <select
                  value={selectedLocation}
                  onChange={e => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                >
                  {Object.keys(LOCATIONS).map(location => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Species Filter</label>
                <select
                  value={selectedSpecies}
                  onChange={e => handleSpeciesChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                  disabled={availableSpecies.length === 0}
                >
                  <option value="all">All Fish Species ({rawINaturalistData.length} observations)</option>
                  {availableSpecies.map(species => (
                    <option key={species.id} value={species.id}>
                      {species.commonName || species.name} ({species.count} observations)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DateRangeSelector onDateRangeChange={handleDateRangeChange} loading={loading} maxDaysRange={400} />

            <Button
              onClick={handleCompareData}
              disabled={loading || !dateRange.startDate || !dateRange.endDate || !dateRangeSelected}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
            >
              Compare Data
            </Button>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && <ErrorState error={error} />}

        {/* Results */}
        {comparisonData.length > 0 && summary && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Monthly Comparison Summary
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Data aggregated by month for seasonal pattern analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{summary.avgAlgorithm}</div>
                    <div className="text-sm text-gray-400">Avg Algorithm Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{summary.avgReal}</div>
                    <div className="text-sm text-gray-400">Avg Real Data Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{summary.avgCommercial}</div>
                    <div className="text-sm text-gray-400">Avg Commercial Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{summary.avgDifference}</div>
                    <div className="text-sm text-gray-400">Avg Difference</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-300">
                    <div>
                      Algorithm-Real Correlation:{' '}
                      <span className="font-semibold text-white">{summary.correlation}</span>
                    </div>
                    <div>
                      Algorithm-Commercial Correlation:{' '}
                      <span className="font-semibold text-white">{summary.commercialCorrelation}</span>
                    </div>
                    <div>
                      Total Observations: <span className="font-semibold text-white">{summary.totalObservations}</span>
                    </div>
                    <div>
                      Data Points: <span className="font-semibold text-white">{summary.dataPoints}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-gray-800">
                <TabsTrigger value="timeline" className="data-[state=active]:bg-gray-700">
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="correlation" className="data-[state=active]:bg-gray-700">
                  Correlation
                </TabsTrigger>
                <TabsTrigger value="difference" className="data-[state=active]:bg-gray-700">
                  Differences
                </TabsTrigger>
                <TabsTrigger value="rawdata" className="data-[state=active]:bg-gray-700">
                  Citizen Science
                </TabsTrigger>
                <TabsTrigger value="commercial" className="data-[state=active]:bg-gray-700">
                  Government Data
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="space-y-4">
                <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Monthly Analysis: Algorithm vs Real Data vs Commercial Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" tickFormatter={formatMonthDisplay} />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff',
                          }}
                          labelFormatter={value => formatMonthDisplay(value as string)}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="algorithmScore"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          name="Algorithm Score"
                        />
                        <Line
                          type="monotone"
                          dataKey="qualityScore"
                          stroke="#10B981"
                          strokeWidth={2}
                          name="Real Data Score"
                        />
                        <Line
                          type="monotone"
                          dataKey="commercialScore"
                          stroke="#F59E0B"
                          strokeWidth={2}
                          name="Commercial Activity Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="correlation" className="space-y-4">
                <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Monthly Correlation Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <ScatterChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="algorithmScore"
                          name="Algorithm Score"
                          stroke="#9CA3AF"
                          label={{ value: 'Algorithm Score', position: 'insideBottom', offset: -10 }}
                        />
                        <YAxis
                          dataKey="qualityScore"
                          name="Real Data Score"
                          stroke="#9CA3AF"
                          label={{ value: 'Real Data Score', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff',
                          }}
                          formatter={(value, name) => [
                            value,
                            name === 'qualityScore' ? 'Real Data Score' : 'Algorithm Score',
                          ]}
                        />
                        <Scatter fill="#8B5CF6" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="difference" className="space-y-4">
                <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Monthly Score Differences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" tickFormatter={formatMonthDisplay} />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff',
                          }}
                          labelFormatter={value => formatMonthDisplay(value as string)}
                        />
                        <Bar dataKey="difference" fill="#F59E0B" name="Difference (Real - Algorithm)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rawdata" className="space-y-4">
                <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Citizen Science Observations</CardTitle>
                    <CardDescription className="text-gray-400">
                      Real fishing data from iNaturalist citizen science observations
                      {selectedSpecies !== 'all' &&
                        ` - Filtered for: ${
                          availableSpecies.find(s => s.id === selectedSpecies)?.commonName ||
                          availableSpecies.find(s => s.id === selectedSpecies)?.name
                        }`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {filterDataBySpecies(rawINaturalistData, selectedSpecies).length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          No fishing observations found for the selected criteria.
                        </div>
                      ) : (
                        filterDataBySpecies(rawINaturalistData, selectedSpecies).map(observation => (
                          <div key={observation.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="font-semibold text-white">
                                  {observation.taxon.preferred_common_name || observation.taxon.name}
                                </h4>
                                <p className="text-sm text-gray-400">{observation.taxon.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      observation.quality_grade === 'research'
                                        ? 'bg-green-900 text-green-200'
                                        : observation.quality_grade === 'needs_id'
                                        ? 'bg-yellow-900 text-yellow-200'
                                        : 'bg-gray-700 text-gray-300'
                                    }`}
                                  >
                                    {observation.quality_grade === 'research'
                                      ? 'Research Grade'
                                      : observation.quality_grade === 'needs_id'
                                      ? 'Needs ID'
                                      : 'Casual'}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-gray-400">Observed</p>
                                <p className="text-white">{new Date(observation.observed_on).toLocaleDateString()}</p>
                                <p className="text-sm text-gray-400 mt-1">By: {observation.user.login}</p>
                              </div>

                              <div>
                                <p className="text-sm text-gray-400">Location</p>
                                <p className="text-white">{observation.location}</p>
                                <p className="text-xs text-gray-500">
                                  {observation.latitude?.toFixed(4)}, {observation.longitude?.toFixed(4)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {filterDataBySpecies(rawINaturalistData, selectedSpecies).length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        <div className="text-sm text-gray-400 text-center">
                          Showing {filterDataBySpecies(rawINaturalistData, selectedSpecies).length} observation(s)
                          {selectedSpecies !== 'all' && ` of ${rawINaturalistData.length} total observations`}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="commercial" className="space-y-4">
                <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Government Fisheries Data</CardTitle>
                    <CardDescription className="text-gray-400">
                      Official DFO (Fisheries and Oceans Canada) commercial fishing statistics and pressure indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Fishing Pressure Summary */}
                    {fishingPressure && (
                      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                        <h4 className="font-semibold text-white mb-3">
                          Commercial Fishing Pressure - {selectedLocation}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Pressure Level:</span>
                            <div
                              className={`font-semibold ${
                                fishingPressure.pressure_level === 'high'
                                  ? 'text-red-400'
                                  : fishingPressure.pressure_level === 'medium'
                                  ? 'text-yellow-400'
                                  : 'text-green-400'
                              }`}
                            >
                              {fishingPressure.pressure_level.toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400">Total Vessels:</span>
                            <div className="font-semibold text-white">{fishingPressure.total_vessels}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Total Trips:</span>
                            <div className="font-semibold text-white">{fishingPressure.total_trips}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Concerns:</span>
                            <div className="font-semibold text-orange-400">
                              {fishingPressure.sustainability_concerns.length} species
                            </div>
                          </div>
                        </div>

                        {fishingPressure.primary_species.length > 0 && (
                          <div className="mt-3">
                            <span className="text-gray-400 text-sm">Primary Commercial Species: </span>
                            <span className="text-white text-sm">{fishingPressure.primary_species.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DFO Commercial Records */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white">Commercial Catch Records</h4>
                      {dfoData.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          No DFO commercial data available for the selected period.
                        </div>
                      ) : (
                        <>
                          {/* Commercial Activity Chart */}
                          {(() => {
                            const commercialActivity = processDFODataForComparison(dfoData, dateRange)
                            return commercialActivity.length > 0 ? (
                              <Card className="bg-gray-800/50">
                                <CardHeader>
                                  <CardTitle className="text-white text-lg">Commercial Activity Over Time</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={commercialActivity}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                      <XAxis dataKey="date" stroke="#9CA3AF" />
                                      <YAxis stroke="#9CA3AF" />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: '#1F2937',
                                          border: '1px solid #374151',
                                          borderRadius: '8px',
                                          color: '#fff',
                                        }}
                                      />
                                      <Legend />
                                      <Line
                                        type="monotone"
                                        dataKey="commercialActivity"
                                        stroke="#F59E0B"
                                        strokeWidth={2}
                                        name="Commercial Activity Score"
                                      />
                                      <Line
                                        type="monotone"
                                        dataKey="speciesCount"
                                        stroke="#10B981"
                                        strokeWidth={2}
                                        name="Species Diversity"
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </CardContent>
                              </Card>
                            ) : null
                          })()}

                          {/* DFO Records Table */}
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-800 sticky top-0">
                                <tr>
                                  <th className="text-left p-3 text-gray-300">Year/Month</th>
                                  <th className="text-left p-3 text-gray-300">Species</th>
                                  <th className="text-left p-3 text-gray-300">Area</th>
                                  <th className="text-left p-3 text-gray-300">Weight (kg)</th>
                                  <th className="text-left p-3 text-gray-300">Value (CAD)</th>
                                  <th className="text-left p-3 text-gray-300">Trips</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dfoData.slice(0, 50).map((record, index) => (
                                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-800/30">
                                    <td className="p-3 text-white">
                                      {record.year}-{record.month.toString().padStart(2, '0')}
                                    </td>
                                    <td className="p-3 text-white">{record.species_name}</td>
                                    <td className="p-3 text-gray-400">{record.area_name}</td>
                                    <td className="p-3 text-white">{record.landed_weight_kg.toLocaleString()}</td>
                                    <td className="p-3 text-green-400">${record.landed_value_cad.toLocaleString()}</td>
                                    <td className="p-3 text-blue-400">{record.trip_count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {dfoData.length > 50 && (
                              <div className="text-center py-2 text-gray-400 text-xs">
                                Showing first 50 of {dfoData.length} records
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Data Source Info */}
            <Alert className="bg-blue-900/20 border-blue-700">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-blue-200">
                <strong>Data Sources:</strong> Algorithm predictions from Open-Meteo weather data processed through our
                fishing algorithm. Real fishing data from iNaturalist citizen science observations within 5km of{' '}
                {selectedLocation}. Quality scores based on the ratio of research-grade observations to total
                observations.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DataComparisonPage() {
  return (
    <Suspense fallback={<LoadingState forecastDays={1} />}>
      <DataComparisonContent />
    </Suspense>
  )
}
