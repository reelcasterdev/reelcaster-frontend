'use client'

import { useState, useEffect } from 'react'
import { Info, MapPin, Fish, RefreshCw } from 'lucide-react'
import { fetchFishingReports } from '../../utils/fishingReportsApi'
import { useSearchParams } from 'next/navigation'

interface FishingReport {
  id: string | number
  title: string
  source: string
  time: string
  location?: string
  species?: string
  description?: string
  imageUrl?: string
}

export default function FishingReports() {
  const searchParams = useSearchParams()
  const location = searchParams.get('location') || 'Victoria, Sidney'
  
  const [reports, setReports] = useState<FishingReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadReports = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true)
      const data = await fetchFishingReports(location, 8)
      setReports(data)
      setError(null)
    } catch (err) {
      console.error('Error loading reports:', err)
      setError('Unable to load fishing reports')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  const handleRefresh = () => {
    loadReports(true)
  }

  if (loading) {
    return (
      <div className="bg-rc-bg-darkest rounded-xl p-6 border border-rc-bg-light">
        <h2 className="text-xl font-semibold text-rc-text mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3 p-3">
                <div className="w-4 h-4 bg-rc-bg-dark rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-rc-bg-dark rounded w-3/4"></div>
                  <div className="h-3 bg-rc-bg-light rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-rc-bg-darkest rounded-xl p-4 sm:p-6 border border-rc-bg-light">
      <h2 className="text-lg sm:text-xl font-semibold text-rc-text mb-4 sm:mb-6">Fishing Reports</h2>

      <div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 sm:p-2 rounded-lg bg-rc-bg-dark hover:bg-rc-bg-light transition-colors disabled:opacity-50 ml-auto"
                title="Refresh reports"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-rc-text-muted ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {error ? (
              <div className="text-center py-6 text-rc-text-muted">
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => loadReports()}
                  className="mt-2 text-rc-text-light hover:text-rc-text text-sm"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-rc-bg-dark/50 hover:bg-rc-bg-dark transition-colors"
                  >
                    <div className="mt-1 flex-shrink-0">
                      {report.species ? (
                        <Fish className="w-4 h-4 text-rc-text-muted" />
                      ) : report.location ? (
                        <MapPin className="w-4 h-4 text-rc-text-muted" />
                      ) : (
                        <Info className="w-4 h-4 text-rc-text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-rc-text text-xs sm:text-sm font-medium leading-relaxed line-clamp-2">
                        {report.title}
                      </p>
                      {report.description && (
                        <p className="text-rc-text-muted text-xs mt-1 line-clamp-2">
                          {report.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-rc-text-muted text-xs font-medium">{report.source}</span>
                        <span className="text-rc-text-muted/70 text-xs">{report.time}</span>
                      </div>
                    </div>
                    {report.imageUrl && (
                      <div className="flex-shrink-0 hidden sm:block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={report.imageUrl}
                          alt={report.species || 'Fish observation'}
                          className="w-12 h-12 rounded object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {reports.length === 0 && (
                  <div className="text-center py-6 text-rc-text-muted">
                    <Fish className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent fishing reports available</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-rc-bg-light">
              <p className="text-xs text-rc-text-muted text-center">
                Data from local sources
              </p>
            </div>
          </div>
      </div>
    </div>
  )
}