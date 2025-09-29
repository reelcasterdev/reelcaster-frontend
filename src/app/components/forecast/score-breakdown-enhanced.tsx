'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, X } from 'lucide-react'
import { FishingScore } from '../../utils/fishingCalculations'

interface EnhancedScoreBreakdownProps {
  score: FishingScore
  timestamp: number
  species?: string | null
  onClose?: () => void
  rawData?: any // Raw weather/tide data if available
}

// Enhanced factor configuration with scoring ranges
const FACTOR_CONFIG = {
  pressure: {
    name: 'Barometric Pressure',
    icon: '🌡️',
    weight: 13,
    unit: 'hPa',
    optimal: { min: 1010, max: 1020 },
    good: { min: 1005, max: 1025 },
    scoring: [
      { range: '1010-1020 hPa', score: '8-10', label: 'Optimal - Stable conditions' },
      { range: '1005-1010 hPa', score: '6-8', label: 'Good - Rising pressure' },
      { range: '1020-1025 hPa', score: '6-8', label: 'Good - Falling pressure' },
      { range: '< 1005 hPa', score: '3-6', label: 'Fair - Low pressure system' },
      { range: '> 1025 hPa', score: '3-6', label: 'Fair - High pressure system' },
    ]
  },
  wind: {
    name: 'Wind Speed',
    icon: '💨',
    weight: 12,
    unit: 'km/h',
    optimal: { min: 0, max: 10 },
    good: { min: 10, max: 20 },
    scoring: [
      { range: '0-10 km/h', score: '8-10', label: 'Calm - Perfect conditions' },
      { range: '10-20 km/h', score: '6-8', label: 'Light breeze - Good conditions' },
      { range: '20-30 km/h', score: '4-6', label: 'Moderate - Challenging' },
      { range: '> 30 km/h', score: '2-4', label: 'Strong - Poor conditions' },
    ]
  },
  temperature: {
    name: 'Air Temperature',
    icon: '🌡️',
    weight: 9,
    unit: '°C',
    optimal: { min: 10, max: 20 },
    good: { min: 5, max: 25 },
    scoring: [
      { range: '10-20°C', score: '8-10', label: 'Optimal - Best activity' },
      { range: '5-10°C', score: '6-8', label: 'Cool - Good activity' },
      { range: '20-25°C', score: '6-8', label: 'Warm - Morning/evening best' },
      { range: '< 5°C', score: '3-6', label: 'Cold - Slower metabolism' },
      { range: '> 25°C', score: '3-6', label: 'Hot - Deep water activity' },
    ]
  },
  waterTemperature: {
    name: 'Water Temperature',
    icon: '💧',
    weight: 5,
    unit: '°C',
    optimal: { min: 8, max: 16 },
    good: { min: 6, max: 18 },
    scoring: [
      { range: '8-16°C', score: '8-10', label: 'Optimal - Peak feeding' },
      { range: '6-8°C', score: '6-8', label: 'Cool - Active feeding' },
      { range: '16-18°C', score: '6-8', label: 'Warm - Early/late feeding' },
      { range: '< 6°C', score: '3-6', label: 'Cold - Reduced activity' },
      { range: '> 18°C', score: '3-6', label: 'Very warm - Deep refuges' },
    ]
  },
  precipitation: {
    name: 'Precipitation',
    icon: '🌧️',
    weight: 10,
    unit: 'mm/hr',
    optimal: { min: 0, max: 0.5 },
    good: { min: 0.5, max: 2 },
    scoring: [
      { range: '0 mm/hr', score: '8-10', label: 'No rain - Clear conditions' },
      { range: '0-0.5 mm/hr', score: '7-9', label: 'Light drizzle - Good' },
      { range: '0.5-2 mm/hr', score: '5-7', label: 'Light rain - Can be productive' },
      { range: '2-5 mm/hr', score: '3-5', label: 'Moderate rain - Challenging' },
      { range: '> 5 mm/hr', score: '1-3', label: 'Heavy rain - Poor visibility' },
    ]
  },
  tide: {
    name: 'Tide Movement',
    icon: '🌊',
    weight: 8,
    unit: 'm/hr',
    optimal: { min: 0.5, max: 1.5 },
    good: { min: 0.2, max: 2.0 },
    scoring: [
      { range: 'Moving (0.5-1.5 m/hr)', score: '8-10', label: 'Optimal current flow' },
      { range: 'Slow (0.2-0.5 m/hr)', score: '6-8', label: 'Light current' },
      { range: 'Fast (> 1.5 m/hr)', score: '5-7', label: 'Strong current' },
      { range: 'Slack (< 0.2 m/hr)', score: '3-6', label: 'Minimal movement' },
    ]
  },
  cloudCover: {
    name: 'Cloud Cover',
    icon: '☁️',
    weight: 6,
    unit: '%',
    optimal: { min: 40, max: 70 },
    good: { min: 20, max: 80 },
    scoring: [
      { range: '40-70%', score: '8-10', label: 'Overcast - Ideal light' },
      { range: '20-40%', score: '6-8', label: 'Partly cloudy - Good' },
      { range: '70-90%', score: '6-8', label: 'Mostly cloudy - Good' },
      { range: '< 20%', score: '4-6', label: 'Sunny - Bright conditions' },
      { range: '> 90%', score: '5-7', label: 'Heavy overcast' },
    ]
  },
  visibility: {
    name: 'Visibility',
    icon: '👁️',
    weight: 6,
    unit: 'km',
    optimal: { min: 5, max: 20 },
    good: { min: 2, max: 30 },
    scoring: [
      { range: '> 10 km', score: '8-10', label: 'Excellent visibility' },
      { range: '5-10 km', score: '6-8', label: 'Good visibility' },
      { range: '2-5 km', score: '4-6', label: 'Moderate visibility' },
      { range: '< 2 km', score: '2-4', label: 'Poor visibility' },
    ]
  },
  timeOfDay: {
    name: 'Time of Day',
    icon: '🕐',
    weight: 4,
    unit: '',
    optimal: { dawn: true, dusk: true },
    scoring: [
      { range: 'Dawn ± 2hrs', score: '9-10', label: 'Peak feeding time' },
      { range: 'Dusk ± 2hrs', score: '9-10', label: 'Peak feeding time' },
      { range: 'Morning (6-10am)', score: '6-8', label: 'Active period' },
      { range: 'Evening (4-8pm)', score: '6-8', label: 'Active period' },
      { range: 'Midday', score: '3-5', label: 'Slower period' },
      { range: 'Night', score: '4-6', label: 'Species dependent' },
    ]
  },
}

interface FactorRowProps {
  factorKey: string
  score: number
  weight: number
  contribution: number
  actualValue?: any
  expanded: boolean
  onToggle: () => void
}

function FactorRow({ factorKey, score, weight, contribution, actualValue, expanded, onToggle }: FactorRowProps) {
  const config = FACTOR_CONFIG[factorKey as keyof typeof FACTOR_CONFIG]
  if (!config) return null

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-yellow-400'
    if (score >= 4) return 'text-orange-400'
    return 'text-red-400'
  }

  const getContributionColor = (contribution: number) => {
    if (contribution >= 0.8) return 'text-green-400'
    if (contribution >= 0.5) return 'text-yellow-400'
    if (contribution >= 0.3) return 'text-orange-400'
    return 'text-red-400'
  }

  // Trend could be calculated if we have previous values
  // const trend = null

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="text-lg">{config.icon}</span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{config.name}</span>
              <span className="text-xs text-slate-500">({weight}% weight)</span>
            </div>
            {actualValue !== undefined && (
              <div className="text-xs text-slate-400 mt-0.5">
                Value: {actualValue}{config.unit && ` ${config.unit}`}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Score */}
          <div className="text-right">
            <div className={`font-bold ${getScoreColor(score)}`}>
              {score.toFixed(1)}
            </div>
            <div className="text-xs text-slate-500">score</div>
          </div>

          {/* Contribution */}
          <div className="text-right">
            <div className={`font-bold ${getContributionColor(contribution)}`}>
              +{contribution.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">impact</div>
          </div>

          {/* Expand icon */}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50">
          <div className="space-y-3">
            {/* Current Status */}
            <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
              <span className="text-sm text-slate-400">Current Status:</span>
              <span className={`font-medium ${getScoreColor(score)}`}>
                {score >= 8 ? 'Optimal' : score >= 6 ? 'Good' : score >= 4 ? 'Fair' : 'Poor'}
              </span>
            </div>

            {/* Scoring Ranges */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-400 mb-1">Scoring Ranges:</div>
              {config.scoring?.map((range, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between text-xs p-2 rounded ${
                    // Highlight the current range
                    actualValue !== undefined && range.label.toLowerCase().includes('optimal') && score >= 8
                      ? 'bg-green-900/20 border border-green-700/30'
                      : actualValue !== undefined && range.label.toLowerCase().includes('good') && score >= 6
                      ? 'bg-yellow-900/20 border border-yellow-700/30'
                      : 'bg-slate-800/50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-slate-300">{range.range}</div>
                    <div className="text-slate-500 mt-0.5">{range.label}</div>
                  </div>
                  <div className={`font-bold ml-3 ${
                    range.score.includes('8-10') ? 'text-green-400' :
                    range.score.includes('6-8') || range.score.includes('7-9') ? 'text-yellow-400' :
                    range.score.includes('4-6') || range.score.includes('5-7') ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {range.score}
                  </div>
                </div>
              ))}
            </div>

            {/* Algorithm Note */}
            <div className="text-xs text-slate-500 italic">
              Score contributes {contribution.toFixed(2)} to final score ({weight}% × {score.toFixed(1)}/10)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ScoreBreakdownEnhanced({
  score,
  timestamp,
  species,
  onClose,
  rawData
}: EnhancedScoreBreakdownProps) {
  const [expandedFactors, setExpandedFactors] = useState<Set<string>>(new Set())
  const [showAllFactors, setShowAllFactors] = useState(false)

  // Safety check
  if (!score || !score.breakdown) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <p className="text-slate-400 text-center">No score data available</p>
      </div>
    )
  }

  // Process and sort factors
  const processedFactors = Object.entries(score.breakdown)
    .map(([key, value]) => {
      const config = FACTOR_CONFIG[key as keyof typeof FACTOR_CONFIG]
      if (!config) return null

      return {
        key,
        value,
        config,
        weight: config.weight,
        contribution: (value * config.weight) / 100,
        actualValue: rawData?.[key] // Get actual value from raw data if available
      }
    })
    .filter(Boolean) as any[]

  const sortedFactors = processedFactors.sort((a, b) => b.contribution - a.contribution)
  const topFactors = sortedFactors.slice(0, 5)
  const displayedFactors = showAllFactors ? sortedFactors : topFactors

  const toggleFactor = (key: string) => {
    const newExpanded = new Set(expandedFactors)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedFactors(newExpanded)
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent'
    if (score >= 6) return 'Good'
    if (score >= 4) return 'Fair'
    return 'Poor'
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-yellow-400'
    if (score >= 4) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden max-w-3xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Enhanced Score Analysis</h3>
            <p className="text-sm text-slate-400">{formatTime(timestamp)}</p>
            {species && (
              <p className="text-xs text-pink-400 mt-1">Species Algorithm: {species}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(score.total)}`}>
                {score.total.toFixed(1)}
              </div>
              <div className="text-sm text-slate-400">{getScoreLabel(score.total)}</div>
              <div className="text-xs text-slate-500 mt-1">out of 10</div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="p-4 bg-slate-800/30 border-b border-slate-700/50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-slate-500 mb-1">Top Factor</div>
            <div className="font-medium text-white">
              {topFactors[0]?.config.name}
            </div>
            <div className="text-xs text-green-400">+{topFactors[0]?.contribution.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Conditions</div>
            <div className="font-medium text-white">
              {score.total >= 7 ? 'Favorable' : score.total >= 5 ? 'Moderate' : 'Challenging'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Factors</div>
            <div className="font-medium text-white">{sortedFactors.length} Active</div>
          </div>
        </div>
      </div>

      {/* Factor List */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-white">Factor Breakdown</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (expandedFactors.size === displayedFactors.length) {
                  setExpandedFactors(new Set())
                } else {
                  setExpandedFactors(new Set(displayedFactors.map(f => f.key)))
                }
              }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {expandedFactors.size === displayedFactors.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {displayedFactors.map((factor) => (
          <FactorRow
            key={factor.key}
            factorKey={factor.key}
            score={factor.value}
            weight={factor.weight}
            contribution={factor.contribution}
            actualValue={factor.actualValue}
            expanded={expandedFactors.has(factor.key)}
            onToggle={() => toggleFactor(factor.key)}
          />
        ))}

        {!showAllFactors && sortedFactors.length > 5 && (
          <button
            onClick={() => setShowAllFactors(true)}
            className="w-full py-2 text-center text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            Show {sortedFactors.length - 5} More Factors
          </button>
        )}

        {showAllFactors && sortedFactors.length > 5 && (
          <button
            onClick={() => setShowAllFactors(false)}
            className="w-full py-2 text-center text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            Show Less
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-3 h-3" />
          <span>Click any factor to see detailed scoring ranges and how your current conditions compare</span>
        </div>
      </div>
    </div>
  )
}