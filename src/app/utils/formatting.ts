/**
 * Formatting Utilities
 *
 * Centralized formatting functions for dates, times, numbers, and text.
 * Use these instead of inline formatting to ensure consistency.
 */

/**
 * Format a date string for display
 *
 * @param dateString - Date string or Date object
 * @param options - Formatting options
 * @returns Formatted date string
 *
 * Usage:
 * formatDate('2024-01-15') // "Mon, Jan 15, 2024"
 * formatDate('2024-01-15', { includeYear: false }) // "Mon, Jan 15"
 * formatDate('2024-01-15', { format: 'short' }) // "Jan 15"
 */
export function formatDate(
  dateString: string | Date,
  options: {
    format?: 'full' | 'long' | 'short' | 'numeric'
    includeYear?: boolean
    includeWeekday?: boolean
  } = {}
): string {
  const { format = 'long', includeYear = true, includeWeekday = true } = options
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  if (isNaN(date.getTime())) {
    return 'Invalid date'
  }

  const formatOptions: Intl.DateTimeFormatOptions = {}

  switch (format) {
    case 'full':
      formatOptions.weekday = 'long'
      formatOptions.year = 'numeric'
      formatOptions.month = 'long'
      formatOptions.day = 'numeric'
      break
    case 'long':
      if (includeWeekday) formatOptions.weekday = 'short'
      formatOptions.year = includeYear ? 'numeric' : undefined
      formatOptions.month = 'short'
      formatOptions.day = 'numeric'
      break
    case 'short':
      formatOptions.month = 'short'
      formatOptions.day = 'numeric'
      if (includeYear) formatOptions.year = 'numeric'
      break
    case 'numeric':
      formatOptions.year = includeYear ? 'numeric' : undefined
      formatOptions.month = '2-digit'
      formatOptions.day = '2-digit'
      break
  }

  return date.toLocaleDateString('en-CA', formatOptions)
}

/**
 * Format a time string for display
 *
 * @param dateString - Date string or Date object
 * @param options - Formatting options
 * @returns Formatted time string
 *
 * Usage:
 * formatTime('2024-01-15T14:30:00') // "2:30 PM"
 * formatTime('2024-01-15T14:30:00', { format: '24h' }) // "14:30"
 */
export function formatTime(
  dateString: string | Date,
  options: {
    format?: '12h' | '24h'
    includeSeconds?: boolean
  } = {}
): string {
  const { format = '12h', includeSeconds = false } = options
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  if (isNaN(date.getTime())) {
    return 'Invalid time'
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: format === '12h',
  }

  return date.toLocaleTimeString('en-CA', formatOptions)
}

/**
 * Format a number with locale-specific thousand separators
 *
 * @param num - Number to format
 * @param options - Formatting options
 * @returns Formatted number string
 *
 * Usage:
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234.567, { decimals: 2 }) // "1,234.57"
 */
export function formatNumber(
  num: number,
  options: {
    decimals?: number
    compact?: boolean
  } = {}
): string {
  const { decimals, compact = false } = options

  if (compact && Math.abs(num) >= 1000) {
    return Intl.NumberFormat('en-CA', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(num)
  }

  return Intl.NumberFormat('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/**
 * Format a percentage
 *
 * @param value - Value between 0-1 or 0-100
 * @param isDecimal - If true, treats value as decimal (0-1)
 * @returns Formatted percentage string
 *
 * Usage:
 * formatPercent(75) // "75%"
 * formatPercent(0.75, true) // "75%"
 */
export function formatPercent(value: number, isDecimal = false): string {
  const percent = isDecimal ? value * 100 : value
  return `${Math.round(percent)}%`
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 *
 * Usage:
 * truncateText('This is a long text', 10) // "This is a..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Format relative time (e.g., "2 hours ago")
 *
 * @param dateString - Date string or Date object
 * @returns Relative time string
 *
 * Usage:
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`

  return formatDate(date, { format: 'short' })
}

/**
 * Format coordinates for display
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param precision - Decimal places (default 4)
 * @returns Formatted coordinates string
 *
 * Usage:
 * formatCoordinates(48.4284, -123.3656) // "48.4284°N, 123.3656°W"
 */
export function formatCoordinates(
  lat: number,
  lon: number,
  precision = 4
): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(precision)}°${latDir}, ${Math.abs(lon).toFixed(precision)}°${lonDir}`
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string
 *
 * Usage:
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1048576) // "1 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format temperature with unit
 *
 * @param temp - Temperature value
 * @param unit - 'C' or 'F'
 * @returns Formatted temperature string
 *
 * Usage:
 * formatTemperature(20, 'C') // "20°C"
 */
export function formatTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
  return `${Math.round(temp)}°${unit}`
}

/**
 * Format wind speed with unit
 *
 * @param speed - Wind speed value
 * @param unit - 'kph', 'mph', or 'knots'
 * @returns Formatted wind speed string
 *
 * Usage:
 * formatWindSpeed(25, 'kph') // "25 km/h"
 */
export function formatWindSpeed(
  speed: number,
  unit: 'kph' | 'mph' | 'knots' = 'kph'
): string {
  const unitLabels = {
    kph: 'km/h',
    mph: 'mph',
    knots: 'kn',
  }
  return `${Math.round(speed)} ${unitLabels[unit]}`
}
