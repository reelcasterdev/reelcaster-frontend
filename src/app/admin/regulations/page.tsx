'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'

interface ScrapedRegulation {
  id: string
  area_id: string
  scraped_data: any
  scrape_timestamp: string
  approval_status: 'pending' | 'approved' | 'rejected'
  changes_detected: string[]
  error_message?: string
}

export default function RegulationsAdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [scrapedRegulations, setScrapedRegulations] = useState<ScrapedRegulation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scraping, setScraping] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    fetchScrapedRegulations()
  }, [user, router])

  const fetchScrapedRegulations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/regulations/scrape')
      const data = await response.json()

      if (response.ok) {
        setScrapedRegulations(data.scraped || [])
      } else {
        setError('Failed to fetch scraped regulations')
      }
    } catch {
      setError('Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const triggerScrape = async () => {
    try {
      setScraping(true)
      setError(null)

      const response = await fetch('/api/regulations/scrape', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Scraping completed!\n\n${data.results.map((r: any) =>
          `${r.area}: ${r.success ? `✓ ${r.changesDetected} changes detected` : `✗ ${r.error}`}`
        ).join('\n')}`)
        fetchScrapedRegulations()
      } else {
        setError(data.error || 'Scraping failed')
      }
    } catch {
      setError('Failed to trigger scrape')
    } finally {
      setScraping(false)
    }
  }

  const approveRegulation = async (id: string) => {
    try {
      const response = await fetch(`/api/regulations/approve/${id}`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('Regulation approved and activated!')
        fetchScrapedRegulations()
      } else {
        alert('Failed to approve regulation')
      }
    } catch {
      alert('Error approving regulation')
    }
  }

  const rejectRegulation = async (id: string) => {
    try {
      const response = await fetch(`/api/regulations/approve/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Regulation rejected')
        fetchScrapedRegulations()
      } else {
        alert('Failed to reject regulation')
      }
    } catch {
      alert('Error rejecting regulation')
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Fishing Regulations Admin</h1>
          <button
            onClick={triggerScrape}
            disabled={scraping}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${scraping ? 'animate-spin' : ''}`} />
            {scraping ? 'Scraping...' : 'Trigger Scrape'}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-slate-400">Loading scraped regulations...</p>
          </div>
        ) : scrapedRegulations.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No pending regulations to review</p>
            <p className="text-slate-500 text-sm">
              Trigger a scrape to check for updates from DFO
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {scrapedRegulations.map((reg) => (
              <div
                key={reg.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">
                      Area {reg.area_id}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      Scraped: {new Date(reg.scrape_timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {reg.approval_status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveRegulation(reg.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRegulation(reg.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {reg.error_message ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400 font-medium mb-1">Scraping Error</p>
                    <p className="text-red-300 text-sm">{reg.error_message}</p>
                  </div>
                ) : (
                  <>
                    {reg.changes_detected && reg.changes_detected.length > 0 ? (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                        <p className="text-yellow-400 font-medium mb-2">
                          {reg.changes_detected.length} Changes Detected
                        </p>
                        <ul className="space-y-1">
                          {reg.changes_detected.map((change, idx) => (
                            <li key={idx} className="text-yellow-300 text-sm">
                              • {change}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                        <p className="text-green-400 text-sm">
                          ✓ No changes detected - regulations are up to date
                        </p>
                      </div>
                    )}

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm font-medium mb-2">Scraped Data:</p>
                      <pre className="text-slate-300 text-xs overflow-auto max-h-64">
                        {JSON.stringify(reg.scraped_data, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p>
              <strong className="text-white">1. Automated Scraping:</strong> Every Sunday at 2 AM,
              the system automatically scrapes DFO regulation pages.
            </p>
            <p>
              <strong className="text-white">2. Change Detection:</strong> The scraper compares
              new data with existing regulations and highlights any changes.
            </p>
            <p>
              <strong className="text-white">3. Manual Review:</strong> Changes require admin
              approval before being published to users.
            </p>
            <p>
              <strong className="text-white">4. Version History:</strong> All changes are logged
              in the database for audit trails.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
