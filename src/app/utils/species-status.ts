/**
 * Species status utilities
 */

export type SpeciesStatus = 'open' | 'restricted' | 'closed' | 'non-retention'

export interface SpeciesStatusStyle {
  textClass: string
  label: string
}

const STATUS_STYLES: Record<SpeciesStatus, SpeciesStatusStyle> = {
  open: {
    textClass: 'text-green-400',
    label: 'Open',
  },
  restricted: {
    textClass: 'text-red-400',
    label: 'Restricted',
  },
  'non-retention': {
    textClass: 'text-orange-400',
    label: 'Non Retention',
  },
  closed: {
    textClass: 'text-red-500',
    label: 'Closed',
  },
}

/**
 * Get the text color class for a species status
 */
export function getStatusTextClass(status: SpeciesStatus): string {
  return STATUS_STYLES[status]?.textClass || 'text-gray-400'
}

/**
 * Get the human-readable label for a species status
 */
export function getStatusLabel(status: SpeciesStatus): string {
  return STATUS_STYLES[status]?.label || status
}

/**
 * Get complete status style information
 */
export function getStatusStyle(status: SpeciesStatus): SpeciesStatusStyle {
  return STATUS_STYLES[status] || { textClass: 'text-gray-400', label: status }
}
