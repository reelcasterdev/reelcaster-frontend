'use client'

import { Info } from 'lucide-react'

interface OverallScoreWidgetProps {
  score: number
  maxScore?: number
  description?: string
  onDetailsClick?: () => void
}

export default function OverallScoreWidget({
  score,
  maxScore = 10,
  description = 'Takes into account tides, wind, weather, current and local intel.',
  onDetailsClick,
}: OverallScoreWidgetProps) {
  const normalizedScore = Math.min(Math.max(score, 0), maxScore)

  // Get the bar color based on overall score (all segments same color)
  const getBarColor = () => {
    if (normalizedScore >= 8) return 'bg-emerald-500'
    if (normalizedScore >= 5) return 'bg-amber-500'
    return 'bg-red-500'
  }

  // Get segment color - filled segments use score-based color, empty are gray
  const getSegmentColor = (index: number) => {
    const segmentValue = index + 1 // 1-10
    if (normalizedScore >= segmentValue) {
      return getBarColor()
    }
    return 'bg-rc-bg-light'
  }

  return (
    <div className="bg-rc-bg-darkest rounded-xl border border-rc-bg-light p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-rc-text">Overall Score</h3>
        <button className="text-rc-text-muted hover:text-rc-text transition-colors">
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Score Display */}
      <div className="text-center mb-4">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-rc-text">
            {normalizedScore.toFixed(0)}
          </span>
          <span className="text-xl text-rc-text-muted">/ {maxScore}</span>
        </div>
      </div>

      {/* Score Indicator Segments - 10 beads for 0-10 scale */}
      <div className="flex gap-1 mb-4">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(index => (
          <div
            key={index}
            className={`flex-1 h-2 rounded-full transition-colors ${getSegmentColor(index)}`}
          />
        ))}
      </div>

      {/* Description */}
      <p className="text-xs text-rc-text-muted mb-4 leading-relaxed">
        {description}
      </p>

      {/* Details Button */}
      {onDetailsClick && (
        <button
          onClick={onDetailsClick}
          className="w-full py-2 px-4 bg-rc-bg-light hover:bg-rc-bg-dark rounded-lg text-sm font-medium text-rc-text transition-colors"
        >
          Details
        </button>
      )}
    </div>
  )
}
