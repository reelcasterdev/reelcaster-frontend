'use client'

import { useEffect, useState } from 'react'
import {
  getHistoricalScoresForLocation,
  getHistoricalTrends,
  LocationHistoricalScore,
} from '../../utils/historicalData'

interface HistoricalFishingScoresProps {
  location: string
  species?: string
}

export default function HistoricalFishingScores({ location, species }: HistoricalFishingScoresProps) {
  const [scores, setScores] = useState<LocationHistoricalScore[]>([])
  const [trends, setTrends] = useState<{
    recent: number
    overall: number
    trend: 'improving' | 'declining' | 'stable'
  } | null>(null)

  useEffect(() => {
    const historicalScores = getHistoricalScoresForLocation(location)
    const filteredScores = species
      ? historicalScores.filter(
          score =>
            score.species.toLowerCase().includes(species.toLowerCase()) ||
            species.toLowerCase().includes(score.species.toLowerCase()),
        )
      : historicalScores

    setScores(filteredScores.slice(0, 10)) // Show latest 10 entries
    setTrends(getHistoricalTrends(location, species))
  }, [location, species])

  if (scores.length === 0) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Historical Fishing Data</h3>
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-400">No historical fishing data available for this location</p>
        </div>
      </div>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )
      case 'declining':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-400'
      case 'declining':
        return 'text-red-400'
      default:
        return 'text-blue-400'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-yellow-400'
    if (score >= 4) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-500/20 border-green-500/30'
    if (score >= 6) return 'bg-yellow-500/20 border-yellow-500/30'
    if (score >= 4) return 'bg-orange-500/20 border-orange-500/30'
    return 'bg-red-500/20 border-red-500/30'
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Historical Fishing Data</h3>
        <div className="text-sm text-gray-400">
          {scores.length} {scores.length === 1 ? 'record' : 'records'} found
        </div>
      </div>

      {/* Trends Summary */}
      {trends && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Recent Average</span>
              <span className={`text-lg font-bold ${getScoreColor(trends.recent)}`}>{trends.recent}/10</span>
            </div>
            <div className="text-xs text-gray-500">Last 3 records</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Overall Average</span>
              <span className={`text-lg font-bold ${getScoreColor(trends.overall)}`}>{trends.overall}/10</span>
            </div>
            <div className="text-xs text-gray-500">All time</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Trend</span>
              <div className="flex items-center gap-2">
                {getTrendIcon(trends.trend)}
                <span className={`font-medium capitalize ${getTrendColor(trends.trend)}`}>{trends.trend}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">Recent vs overall</div>
          </div>
        </div>
      )}

      {/* Historical Records */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-white mb-3">Recent Records</h4>
        {scores.map((score, index) => (
          <div
            key={`${score.date}-${score.species}-${index}`}
            className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-600 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-gray-400 text-sm font-mono">{new Date(score.date).toLocaleDateString()}</div>
              <div className="text-white font-medium">{score.species}</div>
              <div className="text-gray-400 text-sm">{score.location}</div>
            </div>

            <div
              className={`px-3 py-1 rounded-full border text-sm font-bold ${getScoreBgColor(
                score.score,
              )} ${getScoreColor(score.score)}`}
            >
              {score.score}/10
            </div>
          </div>
        ))}
      </div>

      {scores.length >= 10 && (
        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">Showing latest 10 records</p>
        </div>
      )}
    </div>
  )
}
