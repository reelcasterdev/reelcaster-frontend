interface SkeletonLoaderProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  rows?: number
}

export default function SkeletonLoader({ 
  className = '', 
  variant = 'rectangular',
  width = '100%',
  height = '1rem',
  rows = 1
}: SkeletonLoaderProps) {
  const baseClasses = "bg-slate-700/50 animate-pulse"
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  const skeletonStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  if (rows > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(rows)].map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              ...skeletonStyle,
              width: index === rows - 1 && variant === 'text' ? '75%' : skeletonStyle.width
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={skeletonStyle}
    />
  )
}

// Pre-built skeleton components for common UI elements
export function CardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
      <SkeletonLoader height="1.5rem" width="60%" />
      <SkeletonLoader rows={3} />
      <SkeletonLoader height="2rem" width="40%" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="space-y-4">
        <SkeletonLoader height="1.5rem" width="50%" />
        <SkeletonLoader height="200px" />
        <div className="flex justify-between">
          {[...Array(8)].map((_, i) => (
            <SkeletonLoader key={i} height="0.75rem" width="2rem" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-6 gap-4 p-4 bg-slate-700/50">
        {[...Array(6)].map((_, i) => (
          <SkeletonLoader key={i} height="0.875rem" width="60%" />
        ))}
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-slate-700">
        {[...Array(6)].map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-4 p-4">
            {[...Array(6)].map((_, colIndex) => (
              <SkeletonLoader key={colIndex} height="1rem" width="80%" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}