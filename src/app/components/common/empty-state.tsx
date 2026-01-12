/**
 * EmptyState - Reusable empty state component
 *
 * Usage:
 * <EmptyState
 *   icon={Fish}
 *   title="No catches yet"
 *   description="Start logging your catches to see them here"
 * />
 *
 * With action:
 * <EmptyState
 *   icon={Bell}
 *   title="No notifications"
 *   description="You're all caught up!"
 *   action={{ label: "Set up alerts", onClick: handleSetup }}
 * />
 */

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateAction {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  /** Lucide icon to display */
  icon: LucideIcon
  /** Main title text */
  title: string
  /** Optional description text */
  description?: string
  /** Optional action button */
  action?: EmptyStateAction
  /** Additional CSS classes for the container */
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      <Icon className="w-12 h-12 text-rc-text-muted mx-auto mb-4" />
      <h3 className="text-lg font-medium text-rc-text mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-rc-text-muted max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

/**
 * EmptyStateCard - Empty state inside a card container
 *
 * Useful for empty states inside card layouts that need consistent background
 */
export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'bg-rc-bg-dark rounded-xl border border-rc-bg-light p-8 text-center',
        className
      )}
    >
      <Icon className="w-12 h-12 text-rc-text-muted mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-rc-text mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-rc-text-muted max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
