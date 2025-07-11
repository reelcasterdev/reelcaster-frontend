'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchOpenMeteoHistoricalWeather } from '../utils/openMeteoApi'
import { generateOpenMeteoDailyForecasts } from '../utils/fishingCalculations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Info, Calendar } from 'lucide-react'
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
} from 'recharts'

// Victoria coordinates (approximately)
const VICTORIA_COORDS = { lat: 48.4284, lon: -123.3656 }

interface WeekComparison {
  weekStart: string
  weekEnd: string
  realScore: number
  algorithmScore: number
  difference: number
  activeSpecies: number
}

export default function VictoriaAnalysisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeklyComparisons, setWeeklyComparisons] = useState<WeekComparison[]>([])
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    loadVictoriaDataAndCalculate()
  }, [])

  const loadVictoriaDataAndCalculate = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load Victoria weekly data
      const response = await fetch('/victoria-weekly-scores.json')
      const victoriaWeeklyData = await response.json()

      console.log('Victoria weekly data loaded:', victoriaWeeklyData)

      // Calculate algorithm predictions for each week
      const comparisons: WeekComparison[] = []

      for (const week of victoriaWeeklyData.weeklyScores) {
        try {
          console.log(`Processing week: ${week.weekStart} to ${week.weekEnd}`)

          // Convert dates to proper format (YYYY-MM-DD)
          const startDate = convertDateFormat(week.weekStart)
          const endDate = convertDateFormat(week.weekEnd)

          console.log(`Fetching weather data for ${startDate} to ${endDate}`)

          // Fetch historical weather data for this week
          const weatherResult = await fetchOpenMeteoHistoricalWeather(VICTORIA_COORDS, startDate, endDate)

          if (weatherResult.success && weatherResult.data) {
            // Generate algorithm predictions
            const forecasts = generateOpenMeteoDailyForecasts(weatherResult.data, null, null)

            // Calculate average algorithm score for the week
            let totalAlgorithmScore = 0
            let totalDataPoints = 0

            forecasts.forEach(dayForecast => {
              dayForecast.minutelyScores.forEach(minuteScore => {
                totalAlgorithmScore += minuteScore.score
                totalDataPoints++
              })
            })

            const algorithmScore =
              totalDataPoints > 0 ? Math.round((totalAlgorithmScore / totalDataPoints) * 10) / 10 : 0

            const comparison: WeekComparison = {
              weekStart: week.weekStart,
              weekEnd: week.weekEnd,
              realScore: week.averageScore,
              algorithmScore: algorithmScore,
              difference: Math.round((week.averageScore - algorithmScore) * 10) / 10,
              activeSpecies: week.activeSpecies,
            }

            comparisons.push(comparison)
            console.log(`Week ${week.weekStart}: Real=${week.averageScore}, Algorithm=${algorithmScore}`)
          } else {
            console.error(`Failed to fetch weather data for week ${week.weekStart}:`, weatherResult.error)
          }
        } catch (weekError) {
          console.error(`Error processing week ${week.weekStart}:`, weekError)
        }
      }

      setWeeklyComparisons(comparisons)

      // Calculate summary statistics
      if (comparisons.length > 0) {
        const realAvg = comparisons.reduce((sum, w) => sum + w.realScore, 0) / comparisons.length
        const algorithmAvg = comparisons.reduce((sum, w) => sum + w.algorithmScore, 0) / comparisons.length
        const avgDifference = comparisons.reduce((sum, w) => sum + Math.abs(w.difference), 0) / comparisons.length

        setSummary({
          realAverage: Math.round(realAvg * 10) / 10,
          algorithmAverage: Math.round(algorithmAvg * 10) / 10,
          averageDifference: Math.round(avgDifference * 10) / 10,
          correlation: calculateCorrelation(comparisons),
          weeksProcessed: comparisons.length,
        })
      }
    } catch (err) {
      console.error('Error loading Victoria data:', err)
      setError('Failed to load Victoria analysis data')
    } finally {
      setLoading(false)
    }
  }

  const convertDateFormat = (dateStr: string): string => {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const calculateCorrelation = (comparisons: WeekComparison[]): number => {
    const n = comparisons.length
    if (n < 2) return 0

    const realScores = comparisons.map(w => w.realScore)
    const algorithmScores = comparisons.map(w => w.algorithmScore)

    const realMean = realScores.reduce((sum, score) => sum + score, 0) / n
    const algorithmMean = algorithmScores.reduce((sum, score) => sum + score, 0) / n

    let numerator = 0
    let realSumSquares = 0
    let algorithmSumSquares = 0

    for (let i = 0; i < n; i++) {
      const realDiff = realScores[i] - realMean
      const algorithmDiff = algorithmScores[i] - algorithmMean

      numerator += realDiff * algorithmDiff
      realSumSquares += realDiff * realDiff
      algorithmSumSquares += algorithmDiff * algorithmDiff
    }

    const denominator = Math.sqrt(realSumSquares * algorithmSumSquares)
    return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100) / 100
  }

  const formatDateForChart = (dateStr: string): string => {
    const [day, month] = dateStr.split('/')
    return `${day}/${month}`
  }

  const chartData = weeklyComparisons.map(week => ({
    week: `${formatDateForChart(week.weekStart)}`,
    real: week.realScore,
    algorithm: week.algorithmScore,
    difference: week.difference,
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Analyzing Victoria Fishing Data...</p>
          <p className="text-gray-400 text-sm">Calculating algorithm predictions for 5 weeks</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Analysis Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
              <Button onClick={() => router.back()} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-2xl">Victoria Fishing Analysis</CardTitle>
                  <CardDescription>Real fishing scores vs weather algorithm predictions (5 weeks)</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <BarChart3 className="h-4 w-4 mr-2" />
                Data Science
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Real Average</CardDescription>
                <CardTitle className="text-2xl text-green-500">{summary.realAverage}/10</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Algorithm Average</CardDescription>
                <CardTitle className="text-2xl text-blue-500">{summary.algorithmAverage}/10</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average Difference</CardDescription>
                <CardTitle className="text-2xl text-orange-500">±{summary.averageDifference}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Correlation</CardDescription>
                <CardTitle className="text-2xl text-purple-500">
                  {summary.correlation > 0 ? '+' : ''}
                  {summary.correlation}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Charts */}
        <Tabs defaultValue="line" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="line">Line Chart</TabsTrigger>
            <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          </TabsList>

          <TabsContent value="line">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Score Comparison</CardTitle>
                <CardDescription>Real fishing performance vs weather algorithm predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="week" stroke="#9CA3AF" fontSize={12} />
                      <YAxis domain={[0, 10]} stroke="#9CA3AF" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="real"
                        stroke="#10B981"
                        strokeWidth={3}
                        name="Real Scores"
                        dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="algorithm"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        name="Algorithm Predictions"
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bar">
            <Card>
              <CardHeader>
                <CardTitle>Score Differences by Week</CardTitle>
                <CardDescription>Positive = Real scores higher, Negative = Algorithm scores higher</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="week" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="difference" name="Difference (Real - Algorithm)" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detailed Week Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Breakdown</CardTitle>
            <CardDescription>Detailed comparison for each week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyComparisons.map((week, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {week.weekStart} to {week.weekEnd}
                      </p>
                      <p className="text-sm text-muted-foreground">{week.activeSpecies} active species</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Real</p>
                      <p className="font-bold text-green-500">{week.realScore}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Algorithm</p>
                      <p className="font-bold text-blue-500">{week.algorithmScore}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Difference</p>
                      <div className="flex items-center gap-1">
                        {week.difference > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : week.difference < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : null}
                        <p
                          className={`font-bold ${
                            week.difference > 0
                              ? 'text-green-500'
                              : week.difference < 0
                              ? 'text-red-500'
                              : 'text-gray-500'
                          }`}
                        >
                          {week.difference > 0 ? '+' : ''}
                          {week.difference}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This analysis compares real fishing performance in Victoria with predictions from our weather-based
            algorithm. A high correlation indicates the algorithm accurately predicts fishing conditions based on
            weather data.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
