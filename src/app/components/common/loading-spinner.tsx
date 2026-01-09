/**
 * LoadingSpinner - Reusable loading spinner component
 *
 * Usage:
 * <LoadingSpinner /> - Default medium size
 * <LoadingSpinner size="sm" /> - Small spinner
 * <LoadingSpinner size="lg" message="Loading data..." /> - Large with message
 * <LoadingSpinner fullScreen /> - Full screen centered spinner
 */

import { cn } from '@/lib/utils'

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl'

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize
  /** Optional message to display below spinner */
  message?: string
  /** If true, displays spinner centered on full screen */
  fullScreen?: boolean
  /** Additional CSS classes */
  className?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
  xl: 'h-16 w-16 border-4',
}

const textSizeClasses: Record<SpinnerSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
}

export function LoadingSpinner({
  size = 'md',
  message,
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-blue-500 border-t-transparent',
          sizeClasses[size]
        )}
      />
      {message && (
        <p className={cn('text-rc-text-muted', textSizeClasses[size])}>{message}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        {spinner}
      </div>
    )
  }

  return spinner
}

/**
 * PageLoadingSpinner - Full page loading state with consistent styling
 *
 * Usage:
 * <PageLoadingSpinner message="Loading your catches..." />
 */
export function PageLoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex-1 min-h-screen p-4 sm:p-6">
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent" />
          <p className="text-rc-text-muted text-sm">{message}</p>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner
