'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/app/components/layout'
import DashboardHeader from '@/app/components/forecast/dashboard-header'
import { Star, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, BarChart3, Layers, Filter } from 'lucide-react'
import { format } from 'date-fns'

interface Suggestion {
  id: string
  version: 'score_based' | 'raw_data'
  pair_id: string | null
  location_name: string
  species: string | null
  forecast_date: string
  day_index: number
  suggestion: string
  model: string
  input_tokens: number | null
  output_tokens: number | null
  latency_ms: number | null
  user_rating: number | null
  pm_rating: number | null
  pm_notes: string | null
  created_at: string
}

interface Pair {
  pairId: string
  createdAt: string
  location: string
  species: string | null
  scoreBased: PairEntry | null
  rawData: PairEntry | null
}

interface PairEntry {
  id: string
  suggestion: string
  user_rating: number | null
  pm_rating: number | null
  pm_notes: string | null
  latency_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
}

interface Stats {
  totalSuggestions: number
  unrated: number
  byVersion: {
    score_based: { count: number; avgPmRating: number | null; thumbsUp: number; thumbsDown: number }
    raw_data: { count: number; avgPmRating: number | null; thumbsUp: number; thumbsDown: number }
  }
  topLocations: Array<{ location: string; count: number }>
  topSpecies: Array<{ species: string; count: number }>
}

type ViewMode = 'list' | 'pairs'

export default function AdminAISuggestionsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [pairs, setPairs] = useState<Pair[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('pairs')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterVersion, setFilterVersion] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterSpecies, setFilterSpecies] = useState('')
  const [filterRated, setFilterRated] = useState('')
  const [filterSort, setFilterSort] = useState('newest')

  // Rating state
  const [ratingId, setRatingId] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingNotes, setRatingNotes] = useState('')
  const [savingRating, setSavingRating] = useState(false)

  // Fetch stats
  useEffect(() => {
    fetch('/api/admin/ai-suggestions?view=stats')
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
  }, [])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      view: viewMode,
      page: String(page),
      limit: viewMode === 'pairs' ? '10' : '20',
      sort: filterSort,
    })
    if (filterVersion) params.set('version', filterVersion)
    if (filterLocation) params.set('location', filterLocation)
    if (filterSpecies) params.set('species', filterSpecies)
    if (filterRated) params.set('rated', filterRated)

    try {
      const res = await fetch(`/api/admin/ai-suggestions?${params}`)
      const data = await res.json()

      if (viewMode === 'pairs') {
        setPairs(data.pairs || [])
      } else {
        setSuggestions(data.suggestions || [])
      }
      setTotalPages(data.totalPages || 0)
    } catch (e) {
      console.error('Failed to fetch:', e)
    } finally {
      setLoading(false)
    }
  }, [viewMode, page, filterVersion, filterLocation, filterSpecies, filterRated, filterSort])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [viewMode, filterVersion, filterLocation, filterSpecies, filterRated, filterSort])

  const savePmRating = async () => {
    if (!ratingId || ratingValue === 0) return
    setSavingRating(true)
    try {
      await fetch('/api/admin/ai-suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ratingId, pm_rating: ratingValue, pm_notes: ratingNotes || null }),
      })
      setRatingId(null)
      setRatingValue(0)
      setRatingNotes('')
      fetchData()
      // Refresh stats
      const statsRes = await fetch('/api/admin/ai-suggestions?view=stats')
      setStats(await statsRes.json())
    } catch (e) {
      console.error('Failed to save rating:', e)
    } finally {
      setSavingRating(false)
    }
  }

  const openRating = (id: string, currentRating: number | null, currentNotes: string | null) => {
    setRatingId(id)
    setRatingValue(currentRating || 0)
    setRatingNotes(currentNotes || '')
  }

  return (
    <AppShell showLocationPanel={false}>
      <div className="flex-1 min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6">
        <DashboardHeader
          title="AI Suggestion Evaluator"
          showTimeframe={false}
          showSetLocation={false}
          showCustomize={false}
        />

        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={<Layers className="w-4 h-4" />}
                label="Total Suggestions"
                value={stats.totalSuggestions}
              />
              <StatCard
                icon={<BarChart3 className="w-4 h-4" />}
                label="Score-Based Avg"
                value={stats.byVersion.score_based.avgPmRating?.toFixed(1) || '—'}
                color="text-blue-400"
              />
              <StatCard
                icon={<BarChart3 className="w-4 h-4" />}
                label="Raw Data Avg"
                value={stats.byVersion.raw_data.avgPmRating?.toFixed(1) || '—'}
                color="text-emerald-400"
              />
              <StatCard
                icon={<Filter className="w-4 h-4" />}
                label="Unrated"
                value={stats.unrated}
                color="text-amber-400"
              />
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterVersion}
                onChange={e => setFilterVersion(e.target.value)}
                className="bg-rc-bg-light border border-rc-bg-light rounded-lg px-3 py-1.5 text-sm text-rc-text focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Versions</option>
                <option value="score_based">Score-Based</option>
                <option value="raw_data">Raw Data</option>
              </select>

              <select
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
                className="bg-rc-bg-light border border-rc-bg-light rounded-lg px-3 py-1.5 text-sm text-rc-text focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {stats?.topLocations.map(l => (
                  <option key={l.location} value={l.location}>{l.location}</option>
                ))}
              </select>

              <select
                value={filterSpecies}
                onChange={e => setFilterSpecies(e.target.value)}
                className="bg-rc-bg-light border border-rc-bg-light rounded-lg px-3 py-1.5 text-sm text-rc-text focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Species</option>
                {stats?.topSpecies.map(s => (
                  <option key={s.species} value={s.species}>{s.species}</option>
                ))}
              </select>

              <select
                value={filterRated}
                onChange={e => setFilterRated(e.target.value)}
                className="bg-rc-bg-light border border-rc-bg-light rounded-lg px-3 py-1.5 text-sm text-rc-text focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="true">PM Rated</option>
                <option value="false">Unrated</option>
              </select>

              <select
                value={filterSort}
                onChange={e => setFilterSort(e.target.value)}
                className="bg-rc-bg-light border border-rc-bg-light rounded-lg px-3 py-1.5 text-sm text-rc-text focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="best">Best Rated</option>
                <option value="worst">Worst Rated</option>
              </select>

              <div className="ml-auto flex items-center gap-1 bg-rc-bg-light rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'list' ? 'bg-rc-bg-dark text-rc-text' : 'text-rc-text-muted hover:text-rc-text'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('pairs')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'pairs' ? 'bg-rc-bg-dark text-rc-text' : 'text-rc-text-muted hover:text-rc-text'
                  }`}
                >
                  Pairs
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          ) : viewMode === 'pairs' ? (
            <div className="space-y-4">
              {pairs.length === 0 && (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 text-rc-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-rc-text mb-2">No Suggestions Yet</h3>
                  <p className="text-sm text-rc-text-muted">AI suggestions will appear here once users generate them.</p>
                </div>
              )}
              {pairs.map(pair => (
                <PairCard
                  key={pair.pairId}
                  pair={pair}
                  onRate={openRating}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.length === 0 && (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 text-rc-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-rc-text mb-2">No Suggestions Yet</h3>
                  <p className="text-sm text-rc-text-muted">AI suggestions will appear here once users generate them.</p>
                </div>
              )}
              {suggestions.map(s => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  onRate={openRating}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-rc-bg-light text-rc-text-muted hover:text-rc-text rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-sm text-rc-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-rc-bg-light text-rc-text-muted hover:text-rc-text rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* PM Rating Modal (inline) */}
          {ratingId && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setRatingId(null)}>
              <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-rc-text">Rate This Suggestion</h3>

                {/* Stars */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRatingValue(star)}
                      className="p-0.5"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= ratingValue ? 'text-amber-400 fill-amber-400' : 'text-rc-bg-light'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Notes */}
                <textarea
                  value={ratingNotes}
                  onChange={e => setRatingNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full bg-rc-bg-light border border-rc-bg-light rounded-lg px-3 py-2 text-rc-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                />

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRatingId(null)}
                    className="px-4 py-2 text-sm text-rc-text-muted hover:text-rc-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePmRating}
                    disabled={ratingValue === 0 || savingRating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-rc-text text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingRating ? 'Saving...' : 'Save Rating'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4">
      <div className={`flex items-center gap-2 ${color || 'text-rc-text-muted'} text-xs mb-1`}>
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color || 'text-rc-text'}`}>{value}</p>
    </div>
  )
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-xs text-rc-text-muted">Unrated</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-rc-bg-light'}`}
        />
      ))}
    </div>
  )
}

function UserRatingDisplay({ rating }: { rating: number | null }) {
  if (rating == null) return null
  if (rating === 1) return <ThumbsUp className="w-3 h-3 text-emerald-400" />
  return <ThumbsDown className="w-3 h-3 text-red-400" />
}

function PairCard({ pair, onRate }: { pair: Pair; onRate: (id: string, rating: number | null, notes: string | null) => void }) {
  return (
    <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-rc-text font-medium">{pair.location}</span>
          {pair.species && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-rc-bg-light text-rc-text-muted">{pair.species}</span>
          )}
        </div>
        <span className="text-xs text-rc-text-muted">{format(new Date(pair.createdAt), 'MMM d, h:mm a')}</span>
      </div>

      {/* Side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Score-Based */}
        <div className="bg-rc-bg-darkest rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300">Score-Based</span>
            <UserRatingDisplay rating={pair.scoreBased?.user_rating ?? null} />
          </div>
          {pair.scoreBased ? (
            <>
              <p className="text-xs text-rc-text-light leading-relaxed mb-2">{pair.scoreBased.suggestion}</p>
              <div className="flex items-center justify-between">
                <StarDisplay rating={pair.scoreBased.pm_rating} />
                <button
                  onClick={() => onRate(pair.scoreBased!.id, pair.scoreBased!.pm_rating, pair.scoreBased!.pm_notes)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {pair.scoreBased.pm_rating ? 'Edit' : 'Rate'}
                </button>
              </div>
              {pair.scoreBased.latency_ms && (
                <span className="text-xs text-rc-text-muted mt-1 block">{pair.scoreBased.latency_ms}ms</span>
              )}
            </>
          ) : (
            <p className="text-xs text-rc-text-muted">No score-based suggestion</p>
          )}
        </div>

        {/* Raw Data */}
        <div className="bg-rc-bg-darkest rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300">Raw Data</span>
            <UserRatingDisplay rating={pair.rawData?.user_rating ?? null} />
          </div>
          {pair.rawData ? (
            <>
              <p className="text-xs text-rc-text-light leading-relaxed mb-2">{pair.rawData.suggestion}</p>
              <div className="flex items-center justify-between">
                <StarDisplay rating={pair.rawData.pm_rating} />
                <button
                  onClick={() => onRate(pair.rawData!.id, pair.rawData!.pm_rating, pair.rawData!.pm_notes)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {pair.rawData.pm_rating ? 'Edit' : 'Rate'}
                </button>
              </div>
              {pair.rawData.latency_ms && (
                <span className="text-xs text-rc-text-muted mt-1 block">{pair.rawData.latency_ms}ms</span>
              )}
            </>
          ) : (
            <p className="text-xs text-rc-text-muted">No raw data suggestion</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SuggestionRow({ suggestion, onRate }: { suggestion: Suggestion; onRate: (id: string, rating: number | null, notes: string | null) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              suggestion.version === 'score_based' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {suggestion.version === 'score_based' ? 'Score-Based' : 'Raw Data'}
            </span>
            <span className="text-sm text-rc-text">{suggestion.location_name}</span>
            {suggestion.species && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-rc-bg-light text-rc-text-muted">{suggestion.species}</span>
            )}
            <UserRatingDisplay rating={suggestion.user_rating} />
          </div>

          <p
            className={`text-xs text-rc-text-light leading-relaxed ${!expanded ? 'line-clamp-2' : ''} cursor-pointer`}
            onClick={() => setExpanded(!expanded)}
          >
            {suggestion.suggestion}
          </p>

          <div className="flex items-center gap-3 mt-2 text-xs text-rc-text-muted">
            <span>{format(new Date(suggestion.created_at), 'MMM d, h:mm a')}</span>
            {suggestion.latency_ms && <span>{suggestion.latency_ms}ms</span>}
            {suggestion.input_tokens && <span>{suggestion.input_tokens}+{suggestion.output_tokens} tokens</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StarDisplay rating={suggestion.pm_rating} />
          <button
            onClick={() => onRate(suggestion.id, suggestion.pm_rating, suggestion.pm_notes)}
            className="px-2 py-1 text-xs text-blue-400 hover:text-blue-300 bg-rc-bg-light rounded-lg transition-colors"
          >
            {suggestion.pm_rating ? 'Edit' : 'Rate'}
          </button>
        </div>
      </div>
    </div>
  )
}
