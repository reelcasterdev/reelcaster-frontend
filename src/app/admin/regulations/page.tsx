'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/app/components/layout'
import DashboardHeader from '@/app/components/forecast/dashboard-header'

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
    <AppShell showLocationPanel={false}>
      <div className="flex-1 min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6">
        <DashboardHeader
          title="Fishing Regulations Admin"
          showTimeframe={false}
          showSetLocation={false}
          showCustomize={false}
        />

        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={triggerScrape}
              disabled={scraping}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-rc-text rounded-lg transition-colors"
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
            <p className="text-rc-text-muted">Loading scraped regulations...</p>
          </div>
        ) : scrapedRegulations.length === 0 ? (
          <div className="bg-rc-bg-dark rounded-xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-rc-text-muted mx-auto mb-4" />
            <p className="text-rc-text-muted text-lg mb-2">No pending regulations to review</p>
            <p className="text-rc-text-muted text-sm">
              Trigger a scrape to check for updates from DFO
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {scrapedRegulations.map((reg) => (
              <div
                key={reg.id}
                className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-rc-text mb-1">
                      Area {reg.area_id}
                    </h2>
                    <p className="text-rc-text-muted text-sm">
                      Scraped: {new Date(reg.scrape_timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {reg.approval_status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveRegulation(reg.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-rc-text rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRegulation(reg.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-rc-text rounded-lg transition-colors"
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

                    <div className="bg-rc-bg-light/50 rounded-lg p-4">
                      <p className="text-rc-text-muted text-sm font-medium mb-2">Scraped Data:</p>
                      <pre className="text-rc-text-light text-xs overflow-auto max-h-64">
                        {JSON.stringify(reg.scraped_data, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-rc-bg-dark/50 border border-rc-bg-light/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-rc-text mb-4">How It Works</h3>
          <div className="space-y-3 text-rc-text-light text-sm">
            <p>
              <strong className="text-rc-text">1. Automated Scraping:</strong> Every Sunday at 2 AM,
              the system automatically scrapes DFO regulation pages.
            </p>
            <p>
              <strong className="text-rc-text">2. Change Detection:</strong> The scraper compares
              new data with existing regulations and highlights any changes.
            </p>
            <p>
              <strong className="text-rc-text">3. Manual Review:</strong> Changes require admin
              approval before being published to users.
            </p>
            <p>
              <strong className="text-rc-text">4. Version History:</strong> All changes are logged
              in the database for audit trails.
            </p>
          </div>
        </div>
        </div>
      </div>
    </AppShell>
  )
}
