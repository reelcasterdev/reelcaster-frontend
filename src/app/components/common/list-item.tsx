/**
 * ListItem - Reusable list item component with icon and actions
 *
 * Usage:
 * <ListItem
 *   icon={Fish}
 *   iconColor="emerald"
 *   title="Chinook Salmon"
 *   subtitle="Caught at Waterfront"
 *   metadata="2 hours ago"
 *   onClick={() => handleClick()}
 * />
 *
 * With actions:
 * <ListItem
 *   icon={Bell}
 *   title="Custom Alert"
 *   subtitle="Wind < 15 km/h"
 *   actions={<button onClick={handleDelete}>Delete</button>}
 * />
 */

import { LucideIcon, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ListItemColor = 'default' | 'emerald' | 'amber' | 'blue' | 'red'

interface ListItemProps {
  /** Lucide icon to display */
  icon?: LucideIcon
  /** Color for the icon container */
  iconColor?: ListItemColor
  /** Main title */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Optional metadata (shown on the right side on desktop) */
  metadata?: string
  /** Optional badge/status element */
  badge?: React.ReactNode
  /** Optional action buttons */
  actions?: React.ReactNode
  /** Click handler for the entire item */
  onClick?: () => void
  /** Show chevron indicator (default true if onClick is provided) */
  showChevron?: boolean
  /** Additional CSS classes */
  className?: string
}

const iconColorClasses: Record<ListItemColor, { bg: string; text: string }> = {
  default: {
    bg: 'bg-rc-bg-light',
    text: 'text-rc-text-muted',
  },
  emerald: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
  },
  amber: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
  },
  red: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
  },
}

export function ListItem({
  icon: Icon,
  iconColor = 'default',
  title,
  subtitle,
  metadata,
  badge,
  actions,
  onClick,
  showChevron,
  className,
}: ListItemProps) {
  const isClickable = !!onClick
  const shouldShowChevron = showChevron ?? isClickable
  const colors = iconColorClasses[iconColor]

  const content = (
    <>
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {/* Icon */}
        {Icon && (
          <div className={cn('p-3 rounded-xl flex-shrink-0', colors.bg)}>
            <Icon className={cn('w-6 h-6', colors.text)} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-rc-text font-semibold truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-rc-text-muted mt-1 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right side - metadata/actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {metadata && (
          <span className="text-sm text-rc-text-muted hidden sm:block">
            {metadata}
          </span>
        )}
        {actions}
        {shouldShowChevron && (
          <ChevronRight className="w-5 h-5 text-rc-text-muted" />
        )}
      </div>
    </>
  )

  const baseClasses = cn(
    'flex items-center justify-between bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4',
    isClickable && 'cursor-pointer hover:border-blue-500/30 transition-colors',
    className
  )

  if (isClickable) {
    return (
      <button onClick={onClick} className={cn(baseClasses, 'w-full text-left')}>
        {content}
      </button>
    )
  }

  return <div className={baseClasses}>{content}</div>
}

/**
 * ListItemSkeleton - Loading skeleton for list items
 */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4 animate-pulse',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-rc-bg-light" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 bg-rc-bg-light rounded" />
        <div className="h-3 w-1/2 bg-rc-bg-light rounded" />
      </div>
    </div>
  )
}

export default ListItem
