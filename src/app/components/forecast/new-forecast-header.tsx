interface NewForecastHeaderProps {
  location: string
  hotspot: string
  isCachedData?: boolean
  isRefreshing?: boolean
  cacheInfo?: { createdAt?: string; expiresAt?: string }
}

export default function NewForecastHeader({ 
  location, 
  hotspot, 
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
      <div className="flex items-center gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          FISHING FORECAST
        </h1>
        
        {/* Cache indicator */}
        {(isCachedData || isRefreshing) && (
          <div className="flex items-center gap-2 text-sm">
            {isCachedData && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700/50">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12l4-4m-4 4l4 4" />
                </svg>
                Cached
              </span>
            )}
            
            {isRefreshing && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700/50">
                <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating
              </span>
            )}
          </div>
        )}
      </div>
      
      <p className="text-xl text-slate-300">
        Today&apos;s outlook for{' '}
        <span className="text-blue-400 font-medium">
          {hotspot}, {location}
        </span>
        .
      </p>
      
      {/* Cache timestamp info */}
      {isCachedData && cacheInfo.createdAt && (
        <p className="text-sm text-slate-400">
          Data from {formatCacheTime(cacheInfo.createdAt)}
          {cacheInfo.expiresAt && (
            <span className="ml-2">
              • Expires {formatCacheTime(cacheInfo.expiresAt)}
            </span>
          )}
        </p>
      )}
    </div>
  )
}