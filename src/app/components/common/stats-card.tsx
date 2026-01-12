/**
 * StatsCard - Reusable statistics card component
 *
 * Usage:
 * <StatsCard icon={Fish} label="Total Catches" value={42} />
 * <StatsCard icon={Anchor} label="Landed" value={30} color="emerald" />
 * <StatsCard icon={TrendingUp} label="Growth" value="+15%" color="blue" trend={{ direction: 'up', value: 15 }} />
 */

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatsCardColor = 'default' | 'emerald' | 'amber' | 'blue' | 'red'

interface StatsCardTrend {
  direction: 'up' | 'down'
  value: number
}

interface StatsCardProps {
  /** Lucide icon to display */
  icon: LucideIcon
  /** Label text */
  label: string
  /** Value to display (string or number) */
  value: string | number
  /** Color variant for the card */
  color?: StatsCardColor
  /** Optional trend indicator */
  trend?: StatsCardTrend
  /** Additional CSS classes */
  className?: string
}

const colorClasses: Record<StatsCardColor, { text: string; icon: string }> = {
  default: {
    text: 'text-rc-text',
    icon: 'text-rc-text-muted',
  },
  emerald: {
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
  },
  amber: {
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
  blue: {
    text: 'text-blue-400',
    icon: 'text-blue-400',
  },
  red: {
    text: 'text-red-400',
    icon: 'text-red-400',
  },
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  color = 'default',
  trend,
  className,
}: StatsCardProps) {
  const colors = colorClasses[color]

  return (
    <div
      className={cn(
        'bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4',
        className
      )}
    >
      <div className={cn('flex items-center gap-2 text-xs mb-1', colors.icon)}>
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={cn('text-2xl font-bold', colors.text)}>{value}</p>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium',
              trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * StatsCardGrid - Grid wrapper for stats cards
 *
 * Usage:
 * <StatsCardGrid>
 *   <StatsCard icon={Fish} label="Total" value={42} />
 *   <StatsCard icon={Anchor} label="Landed" value={30} color="emerald" />
 * </StatsCardGrid>
 */
interface StatsCardGridProps {
  children: React.ReactNode
  /** Number of columns on different screen sizes */
  columns?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
  }
  className?: string
}

export function StatsCardGrid({
  children,
  columns = { default: 2, sm: 4 },
  className,
}: StatsCardGridProps) {
  const gridCols = cn(
    'grid gap-3',
    columns.default === 1 && 'grid-cols-1',
    columns.default === 2 && 'grid-cols-2',
    columns.default === 3 && 'grid-cols-3',
    columns.default === 4 && 'grid-cols-4',
    columns.sm === 2 && 'sm:grid-cols-2',
    columns.sm === 3 && 'sm:grid-cols-3',
    columns.sm === 4 && 'sm:grid-cols-4',
    columns.md === 3 && 'md:grid-cols-3',
    columns.md === 4 && 'md:grid-cols-4',
    columns.lg === 4 && 'lg:grid-cols-4',
    columns.lg === 5 && 'lg:grid-cols-5',
    columns.lg === 6 && 'lg:grid-cols-6',
    className
  )

  return <div className={gridCols}>{children}</div>
}

export default StatsCard
