interface NewForecastHeaderProps {  
  isCachedData?: boolean
  isRefreshing?: boolean
  cacheInfo?: { createdAt?: string; expiresAt?: string }
}

export default function NewForecastHeader({ 
  
  isCachedData = false, 
  isRefreshing = false, 
  cacheInfo = {} 
}: NewForecastHeaderProps) {
  
  const formatCacheTime = (timestamp?: string) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="space-y-2">
      {isCachedData && cacheInfo.createdAt && (
        <p className="text-sm text-slate-400 flex items-center">
          Data from {formatCacheTime(cacheInfo.createdAt)}
          {cacheInfo.expiresAt && (
            <span className="ml-2">
              • Expires {formatCacheTime(cacheInfo.expiresAt)}
            </span>
          )}
          {isRefreshing && (
            <span className="ml-2 inline-flex items-center">
              <svg
                className="w-4 h-4 animate-spin text-blue-400"
                viewBox="0 0 20 20"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M18 10a8 8 0 01-8 8V18a8 8 0 100-16v2a8 8 0 018 8z"
                ></path>
              </svg>
              <span className="ml-1 text-xs text-blue-400">Refreshing...</span>
            </span>
          )}
        </p>
      )}
    </div>
  )
}