'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { FishingScore } from '../../utils/fishingCalculations'

interface ScoreBreakdownProps {
  score: FishingScore
  timestamp: number
  species?: string | null
  onClose?: () => void
}

interface FactorInfo {
  name: string
  icon: string
  description: string
  optimal: string
  unit?: string
  category: 'environmental' | 'marine' | 'temporal' | 'safety' | 'species'
  color: string
  bgColor: string
}

const FACTOR_INFO: Record<string, FactorInfo> = {
  pressure: {
    name: 'Barometric Pressure',
    icon: '🌡️',
    description: 'Atmospheric pressure affects fish activity',
    optimal: '1015-1020 hPa',
    unit: 'hPa',
    category: 'environmental',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/20'
  },
  wind: {
    name: 'Wind Conditions',
    icon: '💨',
    description: 'Wind speed and gusts impact fishing comfort',
    optimal: '0-10 km/h',
    unit: 'km/h',
    category: 'environmental',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-900/20'
  },
  temperature: {
    name: 'Air Temperature',
    icon: '🌡️',
    description: 'Air temperature affects fish metabolism',
    optimal: '10-14°C',
    unit: '°C',
    category: 'environmental',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20'
  },
  waterTemperature: {
    name: 'Water Temperature',
    icon: '🌊',
    description: 'Water temperature directly affects fish activity',
    optimal: '8-14°C',
    unit: '°C',
    category: 'marine',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20'
  },
  precipitation: {
    name: 'Precipitation',
    icon: '🌧️',
    description: 'Rain can affect water clarity and fish behavior',
    optimal: '0-0.1mm',
    unit: 'mm',
    category: 'environmental',
    color: 'text-slate-400',
    bgColor: 'bg-slate-900/20'
  },
  cloudCover: {
    name: 'Cloud Cover',
    icon: '☁️',
    description: 'Moderate cloud cover often improves fishing',
    optimal: '30-60%',
    unit: '%',
    category: 'environmental',
    color: 'text-gray-400',
    bgColor: 'bg-gray-900/20'
  },
  timeOfDay: {
    name: 'Time of Day',
    icon: '🕐',
    description: 'Dawn and dusk are prime feeding times',
    optimal: 'Dawn/Dusk',
    category: 'temporal',
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/20'
  },
  visibility: {
    name: 'Visibility',
    icon: '👁️',
    description: 'Good visibility helps with navigation',
    optimal: '>10km',
    unit: 'km',
    category: 'safety',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-900/20'
  },
  sunshine: {
    name: 'Sunshine Duration',
    icon: '☀️',
    description: 'Sunlight affects water temperature and fish behavior',
    optimal: '75%+',
    unit: '%',
    category: 'environmental',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20'
  },
  lightning: {
    name: 'Lightning Safety',
    icon: '⚡',
    description: 'Lightning potential for safety',
    optimal: '<100 J/kg',
    unit: 'CAPE',
    category: 'safety',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20'
  },
  atmospheric: {
    name: 'Atmospheric Stability',
    icon: '🌀',
    description: 'Stable conditions are generally better',
    optimal: '<500 CAPE',
    unit: 'CAPE',
    category: 'environmental',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-900/20'
  },
  comfort: {
    name: 'Angler Comfort',
    icon: '😊',
    description: 'Combined comfort factors',
    optimal: 'Moderate',
    category: 'safety',
    color: 'text-green-400',
    bgColor: 'bg-green-900/20'
  },
  tide: {
    name: 'Tidal Movement',
    icon: '🌊',
    description: 'Tide changes trigger feeding activity',
    optimal: '±2hrs from change',
    category: 'marine',
    color: 'text-teal-400',
    bgColor: 'bg-teal-900/20'
  },
  currentSpeed: {
    name: 'Current Speed',
    icon: '➡️',
    description: 'Current brings food to fish',
    optimal: '0.5-1.5 knots',
    unit: 'knots',
    category: 'marine',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/20'
  },
  currentDirection: {
    name: 'Current Direction',
    icon: '🧭',
    description: 'Current direction affects fish positioning',
    optimal: 'Flood/Ebb',
    category: 'marine',
    color: 'text-blue-200',
    bgColor: 'bg-blue-900/20'
  },
  species: {
    name: 'Species Factor',
    icon: '🐟',
    description: 'Species-specific adjustments',
    optimal: 'Peak season',
    category: 'species',
    color: 'text-pink-400',
    bgColor: 'bg-pink-900/20'
  }
}

// Default weights for general algorithm (percentages)
const DEFAULT_WEIGHTS: Record<string, number> = {
  pressure: 13,
  wind: 12,
  temperature: 9,
  waterTemperature: 5,
  precipitation: 10,
  tide: 8,
  currentSpeed: 4,
  currentDirection: 2,
  cloudCover: 6,
  visibility: 6,
  sunshine: 5,
  lightning: 5,
  atmospheric: 4,
  comfort: 4,
  timeOfDay: 4,
  species: 3
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-400'
  if (score >= 6) return 'text-yellow-400'
  if (score >= 4) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 8) return 'bg-gradient-to-r from-green-900/30 to-green-800/30'
  if (score >= 6) return 'bg-gradient-to-r from-yellow-900/30 to-yellow-800/30'
  if (score >= 4) return 'bg-gradient-to-r from-orange-900/30 to-orange-800/30'
  return 'bg-gradient-to-r from-red-900/30 to-red-800/30'
}

function getTrendIcon(value: number, optimal: number = 5): React.ReactElement {
  if (value > optimal + 1) return <TrendingUp className="w-3 h-3 text-green-400" />
  if (value < optimal - 1) return <TrendingDown className="w-3 h-3 text-red-400" />
  return <Minus className="w-3 h-3 text-yellow-400" />
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ScoreBreakdown({ score, timestamp, species, onClose }: ScoreBreakdownProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('environmental')
  const [showDetails, setShowDetails] = useState(true)

  // Safety check for score and breakdown
  if (!score || !score.breakdown) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <p className="text-slate-400 text-center">No score data available</p>
      </div>
    )
  }

  // Group factors by category
  const factorsByCategory = Object.entries(score.breakdown).reduce((acc, [key, value]) => {
    const info = FACTOR_INFO[key]
    if (!info) return acc

    if (!acc[info.category]) {
      acc[info.category] = []
    }

    acc[info.category].push({
      key,
      value,
      info,
      weight: DEFAULT_WEIGHTS[key] || 0
    })

    return acc
  }, {} as Record<string, Array<{key: string, value: number, info: FactorInfo, weight: number}>>)

  // Calculate category scores
  const categoryScores = Object.entries(factorsByCategory).reduce((acc, [category, factors]) => {
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0)
    const weightedSum = factors.reduce((sum, f) => sum + (f.value * f.weight / 100), 0)
    acc[category] = {
      score: totalWeight > 0 ? (weightedSum * 10 / (totalWeight / 100)) : 0,
      weight: totalWeight
    }
    return acc
  }, {} as Record<string, {score: number, weight: number}>)

  const categoryInfo = {
    environmental: { name: 'Environmental', icon: '🌤️', color: 'text-blue-400' },
    marine: { name: 'Marine & Tidal', icon: '🌊', color: 'text-teal-400' },
    temporal: { name: 'Time Factors', icon: '⏰', color: 'text-amber-400' },
    safety: { name: 'Safety & Comfort', icon: '🛡️', color: 'text-green-400' },
    species: { name: 'Species Specific', icon: '🐟', color: 'text-pink-400' }
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b border-slate-700/50 ${getScoreBg(score.total)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📊</div>
            <div>
              <h3 className="text-lg font-bold text-white">Score Breakdown</h3>
              <p className="text-sm text-slate-300">{formatTime(timestamp)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`text-3xl font-bold ${getScoreColor(score.total)}`}>
                {score.total.toFixed(1)}
              </div>
              <div className="text-xs text-slate-400">out of 10</div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {species && (
          <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-lg">
            <span className="text-xs text-slate-400">Species Algorithm:</span>
            <span className="text-xs font-semibold text-pink-400">{species}</span>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="p-4 space-y-3">
        {Object.entries(categoryInfo).map(([categoryKey, catInfo]) => {
          const factors = factorsByCategory[categoryKey] || []
          const catScore = categoryScores[categoryKey]
          if (factors.length === 0) return null

          const isExpanded = expandedCategory === categoryKey

          return (
            <div
              key={categoryKey}
              className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : categoryKey)}
                className="w-full p-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{catInfo.icon}</span>
                  <div className="text-left">
                    <div className="font-semibold text-white">{catInfo.name}</div>
                    <div className="text-xs text-slate-400">
                      {factors.length} factors • {catScore.score.toFixed(2)} pts contribution
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-xl font-bold ${getScoreColor(catScore.score)}`}>
                    {catScore.score.toFixed(1)}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Factors */}
              {isExpanded && (
                <div className="border-t border-slate-700/50 p-3 space-y-2">
                  {factors.sort((a, b) => b.weight - a.weight).map(({ key, value, info, weight }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-lg mt-0.5">{info.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {info.name}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                                {((value * weight) / 100).toFixed(2)} pts
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {info.description}
                            </div>
                            {showDetails && (
                              <div className="text-xs text-slate-500 mt-1">
                                Optimal: {info.optimal} • Weight: {weight}%
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getScoreColor(value)}`}>
                            {value.toFixed(1)}
                          </div>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            {getTrendIcon(value)}
                            <span className="text-xs text-slate-500">
                              Factor Score
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Score Bar */}
                      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            value >= 8 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                            value >= 6 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                            value >= 4 ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                            'bg-gradient-to-r from-red-500 to-red-400'
                          }`}
                          style={{ width: `${value * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer with Summary */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">
              Score calculated from {Object.keys(score.breakdown).length} factors
            </span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
      </div>
    </div>
  )
}