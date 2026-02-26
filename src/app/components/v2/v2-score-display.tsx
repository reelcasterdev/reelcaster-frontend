'use client'

import { Info } from 'lucide-react'
import { getScoreBgClass } from '@/app/utils/score-utils'

interface V2ScoreDisplayProps {
  score: number
  onDetailsClick?: () => void
}

export default function V2ScoreDisplay({ score, onDetailsClick }: V2ScoreDisplayProps) {
  const maxScore = 10
  const normalizedScore = Math.min(Math.max(score, 0), maxScore)

  const getSegmentColor = (index: number) => {
    if (normalizedScore >= index + 1) return getScoreBgClass(normalizedScore)
    return 'bg-rc-bg-light'
  }

  return (
    <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-rc-text">Overall Score</h3>
        {onDetailsClick && (
          <button
            onClick={onDetailsClick}
            className="text-rc-text-muted hover:text-rc-text transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="text-center mb-3">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-rc-text">
            {normalizedScore.toFixed(1)}
          </span>
          <span className="text-xl text-rc-text-muted">/ {maxScore}</span>
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(index => (
          <div
            key={index}
            className={`flex-1 h-2 rounded-full transition-colors ${getSegmentColor(index)}`}
          />
        ))}
      </div>

      <p className="text-xs text-rc-text-muted leading-relaxed">
        Takes into account tides, wind, weather, current and local intel.
      </p>
    </div>
  )
}
