'use client'

import { useState, useRef, useEffect } from 'react'
import { getFactorExplanation, getRecommendationForScore, getScoreLabel } from '../../utils/speciesExplanations'

interface FactorTooltipProps {
  factor: string
  species: string
  score: number
  value?: number | string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function FactorTooltip({
  factor,
  species,
  score,
  value,
  children,
  position = 'top'
}: FactorTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isTouched, setIsTouched] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get explanation data
  const explanation = getFactorExplanation(species, factor)
  const recommendation = getRecommendationForScore(species, factor, score)
  const scoreLabel = getScoreLabel(score)

  // Handle click outside to close on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false)
        setIsTouched(false)
      }
    }

    if (isTouched) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isTouched])

  const handleMouseEnter = () => {
    if (!isTouched) {
      setIsVisible(true)
    }
  }

  const handleMouseLeave = () => {
    if (!isTouched) {
      setIsVisible(false)
    }
  }

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsTouched(true)
    setIsVisible(!isVisible)
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2'
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2'
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    }
  }

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-700'
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-700'
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-700'
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-700'
      default:
        return 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-700'
    }
  }

  const getScoreColorClass = () => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-blue-400'
    if (score >= 4) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Get short "why it matters" (first sentence)
  const shortWhyMatters = explanation?.whyItMatters
    ? explanation.whyItMatters.split('.')[0] + '.'
    : null

  // Get short recommendation (first sentence)
  const shortRecommendation = recommendation
    ? recommendation.split('.')[0] + '.'
    : null

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouch}
    >
      {children}

      {isVisible && (explanation || recommendation) && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${getPositionClasses()} w-64 sm:w-72`}
          role="tooltip"
        >
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
            {/* Header with score */}
            <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-white capitalize">
                {factor.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className={`text-sm font-bold ${getScoreColorClass()}`}>
                {score.toFixed(1)}/10 • {scoreLabel.label}
              </span>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
              {/* Why it matters - condensed */}
              {shortWhyMatters && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  {shortWhyMatters}
                </p>
              )}

              {/* Recommendation - condensed */}
              {shortRecommendation && (
                <div className={`text-xs p-2 rounded ${
                  score >= 8 ? 'bg-green-900/20 text-green-300' :
                  score >= 6 ? 'bg-blue-900/20 text-blue-300' :
                  score >= 4 ? 'bg-yellow-900/20 text-yellow-300' :
                  'bg-red-900/20 text-red-300'
                }`}>
                  <span className="font-medium">Tip:</span> {shortRecommendation}
                </div>
              )}

              {/* Value if available */}
              {value !== undefined && (
                <div className="text-xs text-slate-500">
                  Current: {value}
                </div>
              )}
            </div>

            {/* Tap hint on mobile */}
            <div className="px-3 py-1.5 bg-slate-900/50 border-t border-slate-700/50 text-center">
              <span className="text-[10px] text-slate-500">
                {isTouched ? 'Tap outside to close' : 'Click for details'}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-8 ${getArrowClasses()}`}
          />
        </div>
      )}
    </div>
  )
}

// Simple inline tooltip for quick hover info
interface SimpleTooltipProps {
  content: string
  children: React.ReactNode
}

export function SimpleTooltip({ content, children }: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 whitespace-nowrap shadow-lg">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-l-transparent border-r-transparent border-b-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  )
}
