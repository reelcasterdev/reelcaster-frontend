'use client'

import { useState } from 'react'
import { Info, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react'
import { OpenMeteoDailyForecast } from '../../utils/fishingCalculations'
import { getSpeciesExplanations } from '../../utils/speciesExplanations'
import { generateOverallRecommendation, FactorScore } from '../../utils/generateRecommendations'

interface OverallScoreProps {
  forecasts: OpenMeteoDailyForecast[]
  selectedDay?: number
  species?: string | null
  onLearnMore?: () => void
}

const getScoreLabel = (score: number) => {
  if (score >= 8) return 'Excellent'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'Fair'
  return 'Poor'
}

const getScoreColor = (score: number) => {
  if (score >= 8) return 'text-green-400'
  if (score >= 6) return 'text-blue-400'
  if (score >= 4) return 'text-yellow-400'
  return 'text-red-400'
}

const getScoreBgColor = (score: number) => {
  if (score >= 8) return 'bg-green-500/10 border-green-500/30'
  if (score >= 6) return 'bg-blue-500/10 border-blue-500/30'
  if (score >= 4) return 'bg-yellow-500/10 border-yellow-500/30'
  return 'bg-red-500/10 border-red-500/30'
}

export default function OverallScore({
  forecasts,
  selectedDay = 0,
  species,
  onLearnMore
}: OverallScoreProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Get selected day's forecast
  const selectedForecast = forecasts[selectedDay]

  // Calculate selected day's average score
  const dayScore = selectedForecast
    ? Math.round(
        selectedForecast.twoHourForecasts.reduce((sum, forecast) => sum + forecast.score.total, 0) /
          selectedForecast.twoHourForecasts.length,
      )
    : 8 // Default score for demo

  // Get species data
  const speciesName = species || 'chinook'
  const speciesData = getSpeciesExplanations(speciesName)

  // Build factor scores from first 2-hour forecast (as representative)
  const representativeForecast = selectedForecast?.twoHourForecasts[0]
  const factorScores: FactorScore[] = representativeForecast?.score.speciesFactors
    ? Object.entries(representativeForecast.score.speciesFactors).map(([key, data]) => ({
        key,
        label: formatFactorLabel(key),
        score: data.score * 10,
        maxScore: 10,
        value: data.value,
        contribution: data.score * data.weight * 10,
      }))
    : []

  // Generate overall recommendation
  const recommendation = factorScores.length > 0
    ? generateOverallRecommendation(dayScore, factorScores, speciesName)
    : null

  // Get top and limiting factors
  const sortedFactors = [...factorScores].sort((a, b) => b.score - a.score)
  const topFactors = sortedFactors.slice(0, 2).filter(f => f.score >= 6)
  const limitingFactors = sortedFactors.slice(-2).reverse().filter(f => f.score < 6)

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-400 text-sm font-medium tracking-wider uppercase">
            OVERALL SCORE
          </h2>
          {species && (
            <span className="text-xs text-pink-400 bg-pink-400/10 px-2 py-1 rounded-full">
              {speciesData.displayName}
            </span>
          )}
        </div>

        <div className="text-center">
          <div className={`text-6xl font-bold mb-1 ${getScoreColor(dayScore)}`}>
            {dayScore}
            <span className="text-3xl text-slate-400 font-normal">/10</span>
          </div>

          <div className="text-lg text-slate-300 font-medium mb-3">
            {getScoreLabel(dayScore)} Conditions
          </div>

          {/* Species-specific summary */}
          {recommendation ? (
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              {recommendation.summary.split('.')[0]}.
            </p>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              Takes into account tides, wind, weather, current and local intel
            </p>
          )}
        </div>
      </div>

      {/* Expandable Details Section */}
      {recommendation && (
        <>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-4 sm:px-6 py-3 bg-slate-700/30 border-t border-slate-700 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
          >
            <span className="text-sm text-slate-300 font-medium">
              {showDetails ? 'Hide Details' : 'What This Means'}
            </span>
            {showDetails ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showDetails && (
            <div className="px-4 sm:px-6 py-4 space-y-4 bg-slate-800/50 border-t border-slate-700/50">
              {/* Top Factors */}
              {topFactors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-semibold text-green-400">Working in Your Favor</span>
                  </div>
                  <ul className="space-y-1.5">
                    {topFactors.map((factor) => (
                      <li key={factor.key} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="text-green-400 font-bold">+{factor.score.toFixed(0)}</span>
                        <span>{factor.label}</span>
                        <span className="text-slate-500">-</span>
                        <span className="text-slate-400">
                          {getFactorInsight(factor.key, factor.score, true)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Limiting Factors */}
              {limitingFactors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-semibold text-yellow-400">Limiting Factors</span>
                  </div>
                  <ul className="space-y-1.5">
                    {limitingFactors.map((factor) => (
                      <li key={factor.key} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="text-yellow-400 font-bold">{factor.score.toFixed(0)}</span>
                        <span>{factor.label}</span>
                        <span className="text-slate-500">-</span>
                        <span className="text-slate-400">
                          {getFactorInsight(factor.key, factor.score, false)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Best Approach Recommendation */}
              <div className={`p-3 rounded-lg border ${getScoreBgColor(dayScore)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Best Approach</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {recommendation.bestApproach}
                </p>
              </div>

              {/* Technique Advice */}
              {recommendation.techniqueAdvice && (
                <div className="text-xs text-slate-400 italic">
                  <span className="text-slate-500">Technique tip:</span> {recommendation.techniqueAdvice}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Learn More Footer */}
      <div className="px-4 sm:px-6 py-3 bg-slate-700/20 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-3 h-3" />
          <span>Algorithm: {speciesData.algorithmVersion}</span>
        </div>
        {onLearnMore && (
          <button
            onClick={onLearnMore}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            Learn More About Scoring
          </button>
        )}
      </div>
    </div>
  )
}

// Helper function to format factor keys to readable labels
function formatFactorLabel(key: string): string {
  const labelMap: { [key: string]: string } = {
    seasonality: 'Seasonality',
    lightTime: 'Light/Time',
    pressureTrend: 'Pressure Trend',
    solunar: 'Solunar',
    catchReports: 'Catch Reports',
    tidalCurrent: 'Tidal Current',
    seaState: 'Sea State',
    waterTemp: 'Water Temp',
    precipitation: 'Precipitation',
    pressure: 'Pressure',
    wind: 'Wind',
    tideDirection: 'Tide Direction',
    tidalRange: 'Tidal Range',
    waveHeight: 'Wave Height',
    cloudCover: 'Cloud Cover',
    temperature: 'Temperature',
    visibility: 'Visibility',
  }
  return labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
}

// Helper to get short insight text for a factor
function getFactorInsight(factorKey: string, score: number, isPositive: boolean): string {
  const insights: { [key: string]: { positive: string; negative: string } } = {
    seasonality: {
      positive: 'Fish are present',
      negative: 'Lower fish density',
    },
    lightTime: {
      positive: 'Prime feeding time',
      negative: 'Fish less active',
    },
    pressureTrend: {
      positive: 'Triggers feeding',
      negative: 'May slow bite',
    },
    solunar: {
      positive: 'Peak lunar window',
      negative: 'Between windows',
    },
    catchReports: {
      positive: 'Recent catches',
      negative: 'Limited intel',
    },
    tidalCurrent: {
      positive: 'Good flow',
      negative: 'Weak current',
    },
    seaState: {
      positive: 'Calm conditions',
      negative: 'Rough seas',
    },
    waterTemp: {
      positive: 'Optimal range',
      negative: 'Outside comfort zone',
    },
    precipitation: {
      positive: 'Clear skies',
      negative: 'Rain impact',
    },
    pressure: {
      positive: 'Favorable pressure',
      negative: 'Pressure changing',
    },
    wind: {
      positive: 'Light winds',
      negative: 'Strong winds',
    },
    tideDirection: {
      positive: 'Good tide movement',
      negative: 'Slack tide',
    },
    tidalRange: {
      positive: 'Strong exchange',
      negative: 'Minimal movement',
    },
    waveHeight: {
      positive: 'Calm waters',
      negative: 'Choppy conditions',
    },
    cloudCover: {
      positive: 'Ideal light',
      negative: 'Bright conditions',
    },
    temperature: {
      positive: 'Comfortable temps',
      negative: 'Extreme temps',
    },
    visibility: {
      positive: 'Good visibility',
      negative: 'Limited visibility',
    },
  }

  const insight = insights[factorKey]
  if (!insight) {
    return isPositive ? 'Favorable' : 'Challenging'
  }
  return isPositive ? insight.positive : insight.negative
}
