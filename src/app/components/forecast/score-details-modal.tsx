'use client'

import { useEffect } from 'react'
import ScoreBreakdownSimple from './score-breakdown-simple'
import { FishingScore } from '../../utils/fishingCalculations'

interface ScoreDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  score: FishingScore | null
  timestamp?: number
  species?: string | null
  comparison?: {
    score: FishingScore
    timestamp: number
    label: string
  }
}

export default function ScoreDetailsModal({
  isOpen,
  onClose,
  score,
  timestamp,
  species,
  comparison
}: ScoreDetailsModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !score) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="space-y-4">
          {/* Main Score Breakdown */}
          <ScoreBreakdownSimple
            score={score}
            timestamp={timestamp || Date.now() / 1000}
            species={species}
            onClose={onClose}
          />

          {/* Comparison Score (if provided) */}
          {comparison && (
            <div className="relative">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                <span className="px-3 py-1 bg-slate-800 border border-slate-600 rounded-full text-xs text-slate-300">
                  vs. {comparison.label}
                </span>
              </div>
              <ScoreBreakdownSimple
                score={comparison.score}
                timestamp={comparison.timestamp}
                species={species}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}