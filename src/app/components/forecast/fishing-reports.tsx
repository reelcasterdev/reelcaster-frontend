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
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3 p-3">
                <div className="w-4 h-4 bg-slate-600 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-600 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700">
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">Fishing Reports</h2>
      
      <div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 sm:p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors disabled:opacity-50 ml-auto"
                title="Refresh reports"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {error ? (
              <div className="text-center py-6 text-slate-400">
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => loadReports()}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {reports.map((report) => (
                  <div 
                    key={report.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="mt-1 flex-shrink-0">
                      {report.species ? (
                        <Fish className="w-4 h-4 text-blue-400" />
                      ) : report.location ? (
                        <MapPin className="w-4 h-4 text-green-400" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs sm:text-sm font-medium leading-relaxed line-clamp-2">
                        {report.title}
                      </p>
                      {report.description && (
                        <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                          {report.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-slate-400 text-xs font-medium">{report.source}</span>
                        <span className="text-slate-500 text-xs">{report.time}</span>
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
                  <div className="text-center py-6 text-slate-400">
                    <Fish className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent fishing reports available</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                Data from local sources
              </p>
            </div>
          </div>
      </div>
    </div>
  )
}