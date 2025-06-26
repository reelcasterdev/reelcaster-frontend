export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-green-400'
  if (score >= 6) return 'text-yellow-400'
  if (score >= 4) return 'text-orange-400'
  return 'text-red-400'
}

export const getScoreLabel = (score: number): string => {
  if (score >= 8.5) return 'Excellent'
  if (score >= 7) return 'Very Good'
  if (score >= 5.5) return 'Good'
  if (score >= 4) return 'Fair'
  if (score >= 2.5) return 'Poor'
  return 'Very Poor'
}
