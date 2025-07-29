'use client'

import { useState, useEffect } from 'react'
import ForecastCacheService from '@/app/utils/forecastCacheService'
import Sidebar from '@/app/components/common/sidebar'

interface CacheStats {
  totalEntries: number
  expiredEntries: number
  hitCounts: { location: string; hotspot: string; hits: number }[]
  averageAge: number
}

interface LocationCacheConfig {
  location: string
  hotspot: string  
  duration: number
}

export default function CacheAdminPage() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [supabaseConfigured, setSupabaseConfigured] = useState(true)

  // Location cache configuration
  const [locationConfigs, setLocationConfigs] = useState<LocationCacheConfig[]>([])
  const [newLocationConfig, setNewLocationConfig] = useState({
    location: '',
    hotspot: '',
    duration: 6
  })

  // Actions state
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<string | null>(null)

  const loadStats = async () => {
    try {
      setRefreshing(true)
      const cacheStats = await ForecastCacheService.getCacheStats()
      setStats(cacheStats)
      
      // Check if Supabase is configured based on whether we get real data
      const hasSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      setSupabaseConfigured(!!(hasSupabaseUrl && hasSupabaseKey))
    } catch (error) {
      console.error('Error loading cache stats:', error)
      setSupabaseConfigured(false)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleForceCleanup = async () => {
    setActionLoading('cleanup')
    setActionResult(null)
    
    try {
      const result = await ForecastCacheService.forceCleanup()
      setActionResult(`Cleanup completed: ${result.removedExpired} expired entries and ${result.removedLRU} LRU entries removed`)
      await loadStats() // Refresh stats
    } catch (error) {
      setActionResult('Error during cleanup: ' + (error as Error).message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleClearAllCache = async () => {
    if (!confirm('Are you sure you want to clear ALL cache entries? This cannot be undone.')) {
      return
    }

    setActionLoading('clear')
    setActionResult(null)
    
    try {
      const success = await ForecastCacheService.clearAllCache()
      if (success) {
        setActionResult('All cache entries cleared successfully')
        await loadStats() // Refresh stats
      } else {
        setActionResult('Error clearing cache')
      }
    } catch (error) {
      setActionResult('Error clearing cache: ' + (error as Error).message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddLocationConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newLocationConfig.location || !newLocationConfig.hotspot) {
      setActionResult('Please enter both location and hotspot')
      return
    }

    setActionLoading('addConfig')
    setActionResult(null)
    
    try {
      const success = await ForecastCacheService.updateLocationCacheDuration(
        newLocationConfig.location,
        newLocationConfig.hotspot,
        newLocationConfig.duration
      )
      
      if (success) {
        setActionResult(`Cache duration for ${newLocationConfig.location} - ${newLocationConfig.hotspot} set to ${newLocationConfig.duration} hours`)
        setNewLocationConfig({ location: '', hotspot: '', duration: 6 })
        // Add to local state
        setLocationConfigs(prev => [...prev.filter(c => 
          !(c.location === newLocationConfig.location && c.hotspot === newLocationConfig.hotspot)
        ), newLocationConfig])
      } else {
        setActionResult('Error updating location cache duration')
      }
    } catch (error) {
      setActionResult('Error updating location config: ' + (error as Error).message)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen overflow-auto">
          <div className="max-w-7xl mx-auto p-6 pt-16 lg:pt-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-slate-300">Loading cache statistics...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Sidebar />
      
      <div className="lg:ml-64 min-h-screen overflow-auto">
        <div className="max-w-7xl mx-auto p-6 pt-16 lg:pt-6 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Cache Administration</h1>
              <p className="text-slate-300 mt-1">Manage forecast cache system</p>
            </div>
            
            <button
              onClick={loadStats}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {refreshing ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh Stats
            </button>
          </div>

          {/* Supabase Configuration Warning */}
          {!supabaseConfigured && (
            <div className="p-4 rounded-lg bg-yellow-900/50 border border-yellow-700">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-yellow-300 font-medium">Cache Tables Setup Required</h3>
                  <p className="text-yellow-200 text-sm mt-1">
                    To enable caching, run the SQL script in <code className="bg-yellow-900/30 px-1 rounded">SUPABASE_SETUP.sql</code> in your Supabase Dashboard → SQL Editor.
                  </p>
                  <p className="text-yellow-200 text-sm mt-2">
                    Environment variables detected: ✓ URL, ✓ Key
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Result */}
          {actionResult && (
            <div className={`p-4 rounded-lg ${
              actionResult.includes('Error') ? 'bg-red-900/50 border border-red-700' : 'bg-green-900/50 border border-green-700'
            }`}>
              <p className={actionResult.includes('Error') ? 'text-red-300' : 'text-green-300'}>
                {actionResult}
              </p>
            </div>
          )}

          {/* Cache Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-2">Total Entries</h3>
                <p className="text-3xl font-bold text-blue-400">{stats.totalEntries}</p>
              </div>
              
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-2">Expired Entries</h3>
                <p className="text-3xl font-bold text-red-400">{stats.expiredEntries}</p>
              </div>
              
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-2">Average Age</h3>
                <p className="text-3xl font-bold text-green-400">{stats.averageAge}h</p>
              </div>
              
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-2">Cache Health</h3>
                <p className="text-3xl font-bold text-yellow-400">
                  {stats.totalEntries > 0 ? Math.round((1 - stats.expiredEntries / stats.totalEntries) * 100) : 100}%
                </p>
              </div>
            </div>
          )}

          {/* Cache Actions */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Cache Actions</h2>
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleForceCleanup}
                disabled={actionLoading === 'cleanup'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
              >
                {actionLoading === 'cleanup' && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Force Cleanup
              </button>
              
              <button
                onClick={handleClearAllCache}
                disabled={actionLoading === 'clear'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'clear' && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Clear All Cache
              </button>
            </div>
          </div>

          {/* Location-Specific Cache Duration */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Location Cache Configuration</h2>
            
            <form onSubmit={handleAddLocationConfig} className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={newLocationConfig.location}
                    onChange={(e) => setNewLocationConfig(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Victoria, Sidney"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Hotspot</label>
                  <input
                    type="text"
                    value={newLocationConfig.hotspot}
                    onChange={(e) => setNewLocationConfig(prev => ({ ...prev, hotspot: e.target.value }))}
                    placeholder="Waterfront"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Duration (hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={newLocationConfig.duration}
                    onChange={(e) => setNewLocationConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={actionLoading === 'addConfig'}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === 'addConfig' ? 'Adding...' : 'Add Config'}
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Location Configs */}
            {locationConfigs.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Current Configurations</h3>
                <div className="space-y-2">
                  {locationConfigs.map((config, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-slate-700 rounded-md">
                      <span className="text-slate-300">
                        {config.location} - {config.hotspot}
                      </span>
                      <span className="text-blue-400 font-medium">
                        {config.duration} hours
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Popular Locations */}
          {stats && stats.hitCounts.length > 0 && (
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Most Popular Locations</h2>
              
              <div className="space-y-3">
                {stats.hitCounts.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-slate-700 rounded-md">
                    <span className="text-slate-300">
                      {item.location} - {item.hotspot}
                    </span>
                    <span className="text-green-400 font-medium">
                      {item.hits} hits
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}