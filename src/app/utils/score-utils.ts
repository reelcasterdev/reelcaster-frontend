/**
 * Score utility functions for consistent styling across the application
 */

export type ScoreLevel = 'best' | 'good' | 'fair' | 'poor'

export interface ScoreStyle {
  level: ScoreLevel
  label: string
  bgClass: string
  textClass: string
  gradient: string
}

/**
 * Score thresholds for different levels
 */
export const SCORE_THRESHOLDS = {
  BEST: 8,
  GOOD: 6,
  FAIR: 4,
} as const

/**
 * Score colors - using Tailwind classes
 */
export const SCORE_COLORS = {
  best: {
    bg: 'bg-[#00C950]',
    text: 'text-[#00C950]',
    hex: '#00C950',
    rgb: 'rgba(0, 201, 80, 0.1)',
  },
  good: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-500',
    hex: '#eab308',
    rgb: 'rgba(234, 179, 8, 0.1)',
  },
  fair: {
    bg: 'bg-orange-500',
    text: 'text-orange-500',
    hex: '#f97316',
    rgb: 'rgba(249, 115, 22, 0.1)',
  },
  poor: {
    bg: 'bg-red-500',
    text: 'text-red-500',
    hex: '#ef4444',
    rgb: 'rgba(239, 68, 68, 0.1)',
  },
} as const

/**
 * Get the score level based on numeric score
 */
export function getScoreLevel(score: number): ScoreLevel {
  if (score >= SCORE_THRESHOLDS.BEST) return 'best'
  if (score >= SCORE_THRESHOLDS.GOOD) return 'good'
  if (score >= SCORE_THRESHOLDS.FAIR) return 'fair'
  return 'poor'
}

/**
 * Get human-readable label for a score level
 */
export function getScoreLabel(score: number): string {
  const level = getScoreLevel(score)
  const labels: Record<ScoreLevel, string> = {
    best: 'Best',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  }
  return labels[level]
}

/**
 * Get the background color class for a score
 */
export function getScoreBgClass(score: number): string {
  return SCORE_COLORS[getScoreLevel(score)].bg
}

/**
 * Get the text color class for a score
 */
export function getScoreTextClass(score: number): string {
  return SCORE_COLORS[getScoreLevel(score)].text
}

/**
 * Get the radial gradient for score card backgrounds
 */
export function getScoreGradient(score: number): string {
  const rgb = SCORE_COLORS[getScoreLevel(score)].rgb
  return `radial-gradient(circle at 30% 70%, ${rgb} 0%, transparent 70%)`
}

/**
 * Get complete score style information
 */
export function getScoreStyle(score: number): ScoreStyle {
  const level = getScoreLevel(score)
  return {
    level,
    label: getScoreLabel(score),
    bgClass: SCORE_COLORS[level].bg,
    textClass: SCORE_COLORS[level].text,
    gradient: getScoreGradient(score),
  }
}

/**
 * Format score for display (e.g., "7.5")
 */
export function formatScore(score: number, precision: number = 1): string {
  return score.toFixed(precision)
}
