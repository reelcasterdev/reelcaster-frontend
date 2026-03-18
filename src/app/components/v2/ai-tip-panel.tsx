'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RotateCw, LogIn, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { OpenMeteoDailyForecast } from '@/app/utils/fishingCalculations'
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi'
import { CHSWaterData } from '@/app/utils/chsTideApi'
import { format } from 'date-fns'

interface AITipPanelProps {
  forecastData: OpenMeteoDailyForecast[]
  openMeteoData: ProcessedOpenMeteoData | null
  tideData: CHSWaterData | null
  selectedDay: number
  species: string | null
  selectedLocation: string
  coordinates: { lat: number; lon: number }
}

interface SuggestionState {
  status: 'idle' | 'loading' | 'success' | 'error'
  id: string | null
  text: string | null
  error: string | null
  userRating: 1 | -1 | null
}

const initialState: SuggestionState = {
  status: 'idle',
  id: null,
  text: null,
  error: null,
  userRating: null,
}

function getMoonPhase(date: Date): string {
  // Simple moon phase approximation
  const knownNewMoon = new Date(2024, 0, 11).getTime()
  const lunarCycle = 29.53059
  const daysSince = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24)
  const phase = ((daysSince % lunarCycle) + lunarCycle) % lunarCycle
  if (phase < 1.85) return 'New Moon'
  if (phase < 7.38) return 'Waxing Crescent'
  if (phase < 9.23) return 'First Quarter'
  if (phase < 14.77) return 'Waxing Gibbous'
  if (phase < 16.61) return 'Full Moon'
  if (phase < 22.15) return 'Waning Gibbous'
  if (phase < 23.99) return 'Last Quarter'
  return 'Waning Crescent'
}

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return 'Spring'
  if (month >= 6 && month <= 8) return 'Summer'
  if (month >= 9 && month <= 11) return 'Fall'
  return 'Winter'
}

export default function AITipPanel({
  forecastData,
  openMeteoData,
  tideData,
  selectedDay,
  species,
  selectedLocation,
  coordinates,
}: AITipPanelProps) {
  const { user, session } = useAuth()
  const [scoreBased, setScoreBased] = useState<SuggestionState>(initialState)
  const [rawData, setRawData] = useState<SuggestionState>(initialState)

  // Reset when context changes
  useEffect(() => {
    setScoreBased(initialState)
    setRawData(initialState)
  }, [selectedLocation, species, selectedDay])

  const buildScorePayload = useCallback(() => {
    const dayData = forecastData[selectedDay]
    if (!dayData || dayData.twoHourForecasts.length === 0) return null

    const blocks = dayData.twoHourForecasts
    const bestBlock = blocks.reduce((best, b) => b.score.total > best.score.total ? b : best, blocks[0])
    const overallScore = Math.max(...blocks.map(b => b.score.total))

    const bestStart = new Date(bestBlock.startTime * 1000)
    const bestEnd = new Date(bestBlock.endTime * 1000)

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      bestTimeWindow: {
        start: format(bestStart, 'h:mm a'),
        end: format(bestEnd, 'h:mm a'),
        score: Math.round(bestBlock.score.total * 10) / 10,
      },
      breakdown: Object.fromEntries(
        Object.entries(bestBlock.score.breakdown).map(([k, v]) => [k, Math.round(v * 10) / 10])
      ),
      speciesFactors: bestBlock.score.speciesFactors
        ? Object.fromEntries(
            Object.entries(bestBlock.score.speciesFactors).map(([k, v]) => [
              k,
              { value: v.value, score: Math.round(v.score * 10) / 10, description: v.description },
            ])
          )
        : undefined,
      isSafe: bestBlock.score.isSafe ?? true,
      safetyWarnings: bestBlock.score.safetyWarnings ?? [],
      isInSeason: bestBlock.score.isInSeason ?? true,
    }
  }, [forecastData, selectedDay])

  const buildRawPayload = useCallback(() => {
    const dayData = forecastData[selectedDay]
    if (!dayData) return null

    // Get midday data from minutely scores
    const middayScores = dayData.minutelyScores
    const middayIndex = Math.min(Math.floor(middayScores.length / 2), middayScores.length - 1)
    const midday = middayScores[middayIndex]
    if (!midday) return null

    // Extract weather from openMeteoData if available
    const weather = {
      temperature: midday.temp,
      apparentTemperature: midday.temp, // fallback
      humidity: 70, // fallback if not in minutely
      pressure: midday.precipitation > 0 ? 1008 : 1015, // rough estimate
      windSpeed: midday.windSpeed,
      windDirection: 0,
      windGusts: midday.windSpeed * 1.5,
      cloudCover: midday.conditions.includes('Cloud') ? 70 : midday.conditions.includes('Clear') ? 10 : 40,
      precipitation: midday.precipitation,
      precipitationProbability: midday.precipitation > 0 ? 80 : 20,
      visibility: 10000,
    }

    // Try to get better weather data from openMeteoData if available
    if (openMeteoData) {
      const raw = openMeteoData as any
      if (raw.minutely15?.time) {
        // Find index closest to selected day midday
        const targetDate = new Date(dayData.date * 1000)
        targetDate.setHours(12, 0, 0, 0)
        const targetTimestamp = targetDate.getTime() / 1000

        let closestIdx = 0
        let minDiff = Infinity
        for (let i = 0; i < raw.minutely15.time.length; i++) {
          const diff = Math.abs(raw.minutely15.time[i] - targetTimestamp)
          if (diff < minDiff) {
            minDiff = diff
            closestIdx = i
          }
        }

        if (raw.minutely15.temperature_2m) weather.temperature = raw.minutely15.temperature_2m[closestIdx]
        if (raw.minutely15.apparent_temperature) weather.apparentTemperature = raw.minutely15.apparent_temperature[closestIdx]
        if (raw.minutely15.relative_humidity_2m) weather.humidity = raw.minutely15.relative_humidity_2m[closestIdx]
        if (raw.minutely15.surface_pressure) weather.pressure = raw.minutely15.surface_pressure[closestIdx]
        if (raw.minutely15.wind_speed_10m) weather.windSpeed = raw.minutely15.wind_speed_10m[closestIdx]
        if (raw.minutely15.wind_direction_10m) weather.windDirection = raw.minutely15.wind_direction_10m[closestIdx]
        if (raw.minutely15.wind_gusts_10m) weather.windGusts = raw.minutely15.wind_gusts_10m[closestIdx]
        if (raw.minutely15.cloud_cover) weather.cloudCover = raw.minutely15.cloud_cover[closestIdx]
        if (raw.minutely15.precipitation) weather.precipitation = raw.minutely15.precipitation[closestIdx]
        if (raw.minutely15.precipitation_probability) weather.precipitationProbability = raw.minutely15.precipitation_probability[closestIdx]
        if (raw.minutely15.visibility) weather.visibility = raw.minutely15.visibility[closestIdx]
      }
    }

    // Tide info
    let tide: any = null
    if (tideData) {
      const td = tideData as any
      // Use tide events to build context
      if (td.predictions && td.predictions.length > 0) {
        const dayStart = new Date(dayData.date * 1000)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayData.date * 1000)
        dayEnd.setHours(23, 59, 59, 999)

        const dayPredictions = td.predictions.filter((p: any) => {
          const t = new Date(p.time || p.eventDate)
          return t >= dayStart && t <= dayEnd
        })

        if (dayPredictions.length > 0) {
          const firstPred = dayPredictions[0]
          tide = {
            currentHeight: firstPred.value || firstPred.height || 0,
            isRising: dayPredictions.length > 1
              ? (dayPredictions[1].value || dayPredictions[1].height || 0) > (firstPred.value || firstPred.height || 0)
              : true,
            changeRate: 0.5,
            tidalRange: td.tidalRange || 3.0,
            nextTide: dayPredictions.length > 0
              ? `${dayPredictions[0].type || 'tide'} at ${format(new Date(dayPredictions[0].time || dayPredictions[0].eventDate), 'h:mm a')}`
              : null,
            waterTemperature: td.waterTemperature || null,
            currentSpeed: null,
            currentDirection: null,
          }
        }
      }
    }

    const dateObj = new Date(dayData.date * 1000)
    return {
      weather,
      tide,
      sun: {
        sunrise: format(new Date(dayData.sunrise * 1000), 'h:mm a'),
        sunset: format(new Date(dayData.sunset * 1000), 'h:mm a'),
      },
      moonPhase: getMoonPhase(dateObj),
      season: getSeason(dateObj.getMonth()),
      date: format(dateObj, 'EEEE, MMMM d, yyyy'),
    }
  }, [forecastData, openMeteoData, tideData, selectedDay])

  const generateTips = useCallback(async () => {
    if (!session?.access_token) return

    const pairId = crypto.randomUUID()
    const dayData = forecastData[selectedDay]
    if (!dayData) return

    const forecastDate = format(new Date(dayData.date), 'yyyy-MM-dd')
    const commonPayload = {
      pairId,
      location: selectedLocation,
      species,
      dayIndex: selectedDay,
      forecastDate,
      latitude: coordinates.lat,
      longitude: coordinates.lon,
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    }

    // Start loading
    setScoreBased(prev => ({ ...prev, status: 'loading', text: null, error: null, id: null, userRating: null }))
    setRawData(prev => ({ ...prev, status: 'loading', text: null, error: null, id: null, userRating: null }))

    // Build payloads
    const scorePayload = buildScorePayload()
    const rawPayload = buildRawPayload()

    // Fire both in parallel
    const results = await Promise.allSettled([
      scorePayload
        ? fetch('/api/ai-recommendation', {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...commonPayload, version: 'score_based', scoreData: scorePayload }),
          }).then(r => r.json())
        : Promise.reject('No score data available'),

      rawPayload
        ? fetch('/api/ai-recommendation', {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...commonPayload, version: 'raw_data', rawData: rawPayload }),
          }).then(r => r.json())
        : Promise.reject('No raw data available'),
    ])

    // Handle score-based result
    if (results[0].status === 'fulfilled' && !results[0].value.error) {
      setScoreBased({
        status: 'success',
        id: results[0].value.id,
        text: results[0].value.suggestion,
        error: null,
        userRating: null,
      })
    } else {
      setScoreBased({
        status: 'error',
        id: null,
        text: null,
        error: results[0].status === 'rejected' ? String(results[0].reason) : results[0].value.error,
        userRating: null,
      })
    }

    // Handle raw data result
    if (results[1].status === 'fulfilled' && !results[1].value.error) {
      setRawData({
        status: 'success',
        id: results[1].value.id,
        text: results[1].value.suggestion,
        error: null,
        userRating: null,
      })
    } else {
      setRawData({
        status: 'error',
        id: null,
        text: null,
        error: results[1].status === 'rejected' ? String(results[1].reason) : results[1].value.error,
        userRating: null,
      })
    }
  }, [session, forecastData, selectedDay, selectedLocation, species, coordinates, buildScorePayload, buildRawPayload])

  const [favorite, setFavorite] = useState<'score_based' | 'raw_data' | null>(null)

  // Also reset favorite when context changes (already resetting states above, add favorite)
  useEffect(() => {
    setFavorite(null)
  }, [selectedLocation, species, selectedDay])

  const handlePickFavorite = useCallback(async (pick: 'score_based' | 'raw_data') => {
    if (!session?.access_token) return

    // Toggle: clicking the same one again deselects
    const newFavorite = favorite === pick ? null : pick

    // Optimistic update
    setFavorite(newFavorite)

    const scoreId = scoreBased.id
    const rawId = rawData.id

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    }

    try {
      if (newFavorite === null) {
        // Deselect: clear both ratings
        const calls = []
        if (scoreId) calls.push(fetch('/api/ai-recommendation', { method: 'PATCH', headers, body: JSON.stringify({ id: scoreId, user_rating: null }) }))
        if (rawId) calls.push(fetch('/api/ai-recommendation', { method: 'PATCH', headers, body: JSON.stringify({ id: rawId, user_rating: null }) }))
        await Promise.allSettled(calls)
        setScoreBased(prev => ({ ...prev, userRating: null }))
        setRawData(prev => ({ ...prev, userRating: null }))
      } else {
        // Pick winner: thumbs up the winner, thumbs down the other
        const winnerId = newFavorite === 'score_based' ? scoreId : rawId
        const loserId = newFavorite === 'score_based' ? rawId : scoreId

        const calls = []
        if (winnerId) calls.push(fetch('/api/ai-recommendation', { method: 'PATCH', headers, body: JSON.stringify({ id: winnerId, user_rating: 1 }) }))
        if (loserId) calls.push(fetch('/api/ai-recommendation', { method: 'PATCH', headers, body: JSON.stringify({ id: loserId, user_rating: -1 }) }))
        await Promise.allSettled(calls)

        setScoreBased(prev => ({ ...prev, userRating: newFavorite === 'score_based' ? 1 : -1 }))
        setRawData(prev => ({ ...prev, userRating: newFavorite === 'raw_data' ? 1 : -1 }))
      }
    } catch {
      // Revert on failure
      setFavorite(favorite)
    }
  }, [favorite, scoreBased.id, rawData.id, session])

  const isLoading = scoreBased.status === 'loading' || rawData.status === 'loading'
  const hasResults = scoreBased.status === 'success' || rawData.status === 'success'
  const bothSucceeded = scoreBased.status === 'success' && rawData.status === 'success'

  // Auth gate
  if (!user) {
    return (
      <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-rc-text">AI Fishing Tips</span>
        </div>
        <p className="text-xs text-rc-text-muted mb-3">Sign in to get personalized AI fishing tips based on current conditions.</p>
        <button
          onClick={() => {
            // Dispatch auth dialog open event (same pattern as other components)
            window.dispatchEvent(new CustomEvent('open-auth-dialog'))
          }}
          className="flex items-center gap-2 w-full justify-center px-3 py-2 bg-rc-bg-light hover:bg-rc-bg-dark rounded-lg text-sm text-rc-text-light transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-rc-text">AI Fishing Tips</span>
        </div>
        {hasResults && (
          <button
            onClick={generateTips}
            disabled={isLoading}
            className="p-1 text-rc-text-muted hover:text-rc-text transition-colors disabled:opacity-50"
            title="Refresh tips"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Idle state */}
      {scoreBased.status === 'idle' && rawData.status === 'idle' && (
        <button
          onClick={generateTips}
          disabled={isLoading}
          className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-rc-text text-sm font-medium rounded-lg transition-all disabled:opacity-50"
        >
          Get AI Tips
        </button>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse [animation-delay:300ms]" />
          </div>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasResults && (
        <div className="space-y-3">
          {/* Score-Based suggestion */}
          <SuggestionCard
            label="Score-Based"
            badgeClass="bg-blue-500/20 text-blue-300"
            state={scoreBased}
            isFavorite={favorite === 'score_based'}
            onRetry={generateTips}
          />

          {/* Separator */}
          <div className="border-t border-rc-bg-light" />

          {/* Raw Data suggestion */}
          <SuggestionCard
            label="Raw Data"
            badgeClass="bg-emerald-500/20 text-emerald-300"
            state={rawData}
            isFavorite={favorite === 'raw_data'}
            onRetry={generateTips}
          />

          {/* Favorite picker */}
          {bothSucceeded && (
            <div className="pt-1">
              <p className="text-xs text-rc-text-muted mb-2">Which tip was better?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePickFavorite('score_based')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    favorite === 'score_based'
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                      : 'bg-rc-bg-light text-rc-text-muted hover:text-rc-text border border-transparent'
                  }`}
                >
                  {favorite === 'score_based' && <Trophy className="w-3 h-3" />}
                  Score-Based
                </button>
                <button
                  onClick={() => handlePickFavorite('raw_data')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    favorite === 'raw_data'
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rc-bg-light text-rc-text-muted hover:text-rc-text border border-transparent'
                  }`}
                >
                  {favorite === 'raw_data' && <Trophy className="w-3 h-3" />}
                  Raw Data
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SuggestionCard({
  label,
  badgeClass,
  state,
  isFavorite,
  onRetry,
}: {
  label: string
  badgeClass: string
  state: SuggestionState
  isFavorite: boolean
  onRetry: () => void
}) {
  if (state.status === 'error') {
    return (
      <div>
        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${badgeClass} mb-1.5`}>
          {label}
        </span>
        <p className="text-xs text-red-400">Failed to generate tip.{' '}
          <button onClick={onRetry} className="underline hover:text-red-300">Retry</button>
        </p>
      </div>
    )
  }

  if (state.status !== 'success' || !state.text) return null

  return (
    <div className={`${isFavorite ? 'ring-1 ring-amber-500/30 rounded-lg p-2 -mx-2 bg-amber-500/5' : ''} transition-all`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${badgeClass}`}>
          {label}
        </span>
        {isFavorite && <Trophy className="w-3 h-3 text-amber-400" />}
      </div>
      <p className="text-xs text-rc-text-light leading-relaxed">{state.text}</p>
    </div>
  )
}
