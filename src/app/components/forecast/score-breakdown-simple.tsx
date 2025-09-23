'use client'

import { useState } from 'react'
import { Info, X } from 'lucide-react'
import { FishingScore } from '../../utils/fishingCalculations'

interface ScoreBreakdownProps {
  score: FishingScore
  timestamp: number
  species?: string | null
  onClose?: () => void
}

// Simplified factor configuration with clearer names
const FACTORS = {
  pressure: { name: 'Pressure', icon: '🌡️', weight: 13 },
  wind: { name: 'Wind', icon: '💨', weight: 12 },
  temperature: { name: 'Air Temp', icon: '🌡️', weight: 9 },
  waterTemperature: { name: 'Water Temp', icon: '💧', weight: 5 },
  precipitation: { name: 'Rain', icon: '🌧️', weight: 10 },
  tide: { name: 'Tide', icon: '🌊', weight: 8 },
  currentSpeed: { name: 'Current', icon: '➡️', weight: 4 },
  currentDirection: { name: 'Direction', icon: '🧭', weight: 2 },
  cloudCover: { name: 'Clouds', icon: '☁️', weight: 6 },
  visibility: { name: 'Visibility', icon: '👁️', weight: 6 },
  sunshine: { name: 'Sunshine', icon: '☀️', weight: 5 },
  lightning: { name: 'Lightning', icon: '⚡', weight: 5 },
  atmospheric: { name: 'Stability', icon: '🌀', weight: 4 },
  comfort: { name: 'Comfort', icon: '😊', weight: 4 },
  timeOfDay: { name: 'Time', icon: '🕐', weight: 4 },
  species: { name: 'Species', icon: '🐟', weight: 3 }
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-400'
  if (score >= 6) return 'text-yellow-400'
  if (score >= 4) return 'text-orange-400'
  return 'text-red-400'
}

function getBarColor(score: number): string {
  if (score >= 8) return 'bg-green-500'
  if (score >= 6) return 'bg-yellow-500'
  if (score >= 4) return 'bg-orange-500'
  return 'bg-red-500'
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ScoreBreakdownSimple({ score, timestamp, species, onClose }: ScoreBreakdownProps) {
  const [showWeights, setShowWeights] = useState(false)

  // Safety check
  if (!score || !score.breakdown) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <p className="text-slate-400 text-center">No score data available</p>
      </div>
    )
  }

  // Sort factors by contribution (value * weight)
  const sortedFactors = Object.entries(score.breakdown)
    .map(([key, value]) => ({
      key,
      value,
      factor: FACTORS[key as keyof typeof FACTORS],
      contribution: (value * (FACTORS[key as keyof typeof FACTORS]?.weight || 0)) / 100
    }))
    .filter(item => item.factor) // Only include known factors
    .sort((a, b) => b.contribution - a.contribution)

  // Get top contributors
  const topFactors = sortedFactors.slice(0, 5)
  const bottomFactors = sortedFactors.slice(-3)

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden max-w-2xl">
      {/* Simplified Header */}
      <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Score Analysis</h3>
            <p className="text-sm text-slate-400">{formatTime(timestamp)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(score.total)}`}>
                {score.total.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500">out of 10</div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="p-4 space-y-4">
        {/* Top Contributors */}
        <div>
          <h4 className="text-sm font-semibold text-slate-400 mb-2">Top Contributing Factors</h4>
          <div className="space-y-2">
            {topFactors.map(({ key, value, factor, contribution }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-lg">{factor.icon}</span>
                  <span className="text-sm text-white">{factor.name}</span>
                  {showWeights && (
                    <span className="text-xs text-slate-500">({factor.weight}%)</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-slate-700/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${getBarColor(value)}`}
                      style={{ width: `${value * 10}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-white w-12 text-right">
                    +{contribution.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Limiting Factors */}
        {bottomFactors.some(f => f.value < 5) && (
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-2">Limiting Factors</h4>
            <div className="space-y-2">
              {bottomFactors.filter(f => f.value < 5).map(({ key, value, factor, contribution }) => (
                <div key={key} className="flex items-center justify-between opacity-75">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{factor.icon}</span>
                    <span className="text-sm text-slate-300">{factor.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-700/50 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${getBarColor(value)}`}
                        style={{ width: `${value * 10}%` }}
                      />
                    </div>
                    <span className="text-sm text-red-400 w-12 text-right">
                      {contribution.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Factors Table */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            <Info className="w-3 h-3" />
            View all factors
          </summary>
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="space-y-1">
              {sortedFactors.map(({ key, value, factor, contribution }) => (
                <div key={key} className="flex items-center justify-between py-1 hover:bg-slate-800/30 px-2 -mx-2 rounded">
                  <div className="flex items-center gap-2">
                    <span>{factor.icon}</span>
                    <span className="text-xs text-slate-400">{factor.name}</span>
                    <span className="text-xs text-slate-600">({factor.weight}%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-xs ${getScoreColor(value)}`}>
                      {value.toFixed(1)}/10
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right">
                      +{contribution.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>

      {/* Footer with context */}
      <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs">
          <div className="text-slate-500">
            {species ? (
              <span>Algorithm: <span className="text-pink-400">{species}</span></span>
            ) : (
              <span>General Algorithm</span>
            )}
          </div>
          <button
            onClick={() => setShowWeights(!showWeights)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showWeights ? 'Hide' : 'Show'} weights
          </button>
        </div>
      </div>
    </div>
  )
}