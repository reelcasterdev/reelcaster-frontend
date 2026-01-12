'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AppShell } from '../components/layout'
import DashboardHeader from '../components/forecast/dashboard-header'
import { PageLoadingSpinner } from '../components/common/loading-spinner'
import { EmptyState } from '../components/common/empty-state'
import {
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  Search
} from 'lucide-react'
import { format } from 'date-fns'
import { getDFOAreasForLocation } from '@/app/config/locations'

/** Priority levels for DFO notices */
type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

/** Notice type filter options */
type NoticeTypeFilter = 'all' | 'closure' | 'opening' | 'biotoxin' | 'sanitary'

interface DFONotice {
  id: string
  notice_number: string
  dfo_category: string
  title: string
  date_issued: string
  full_text: string
  notice_url: string
  notice_type: string
  priority_level: PriorityLevel
  areas: number[]
  subareas: string[]
  species: string[]
  is_closure: boolean
  is_opening: boolean
  is_biotoxin_alert: boolean
  is_sanitary_closure: boolean
}

interface NoticeTypeInfo {
  label: string
  color: string
}

/** Get priority text color */
function getPriorityColor(priority: PriorityLevel): string {
  switch (priority) {
    case 'critical':
      return 'text-red-400'
    case 'high':
      return 'text-orange-400'
    case 'medium':
      return 'text-amber-400'
    default:
      return 'text-rc-text-muted'
  }
}

/** Get priority label */
function getPriorityLabel(priority: PriorityLevel): string {
  switch (priority) {
    case 'critical':
      return 'Critical'
    case 'high':
      return 'High Priority'
    case 'medium':
      return 'Medium'
    default:
      return 'Low'
  }
}

/** Get type info for a notice */
function getNoticeTypeInfo(notice: DFONotice): NoticeTypeInfo {
  if (notice.is_biotoxin_alert) return { label: 'Biotoxin Alert', color: 'text-red-400' }
  if (notice.is_sanitary_closure) return { label: 'Sanitary Closure', color: 'text-red-400' }
  if (notice.is_closure) return { label: 'Closure', color: 'text-amber-400' }
  if (notice.is_opening) return { label: 'Opening', color: 'text-emerald-400' }
  return { label: 'Information', color: 'text-rc-text-muted' }
}

/** Check if notice matches type filter */
function matchesTypeFilter(notice: DFONotice, filterType: NoticeTypeFilter): boolean {
  if (filterType === 'all') return true
  if (filterType === 'closure') return notice.is_closure
  if (filterType === 'opening') return notice.is_opening
  if (filterType === 'biotoxin') return notice.is_biotoxin_alert
  if (filterType === 'sanitary') return notice.is_sanitary_closure
  return true
}

function DFONoticesContent() {
  const searchParams = useSearchParams()
  const selectedLocation = searchParams.get('location') || 'Victoria, Sidney'

  const [notices, setNotices] = useState<DFONotice[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNotices, setExpandedNotices] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<PriorityLevel | 'all'>('all')
  const [filterType, setFilterType] = useState<NoticeTypeFilter>('all')

  const areas = useMemo(() => getDFOAreasForLocation(selectedLocation), [selectedLocation])

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('dfo_fishery_notices')
        .select('*')
        .order('date_issued', { ascending: false })
        .limit(50)

      if (areas.length > 0) {
        query = query.overlaps('areas', areas)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching DFO notices:', error)
        return
      }

      setNotices(data || [])
    } catch (error) {
      console.error('Failed to fetch notices:', error)
    } finally {
      setLoading(false)
    }
  }, [areas])

  useEffect(() => {
    fetchNotices()
  }, [fetchNotices])

  const filteredNotices = useMemo(() => {
    return notices.filter(notice => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          notice.title.toLowerCase().includes(query) ||
          notice.notice_number.toLowerCase().includes(query) ||
          notice.species.some(s => s.toLowerCase().includes(query)) ||
          notice.full_text.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Priority filter
      if (filterPriority !== 'all' && notice.priority_level !== filterPriority) {
        return false
      }

      // Type filter
      if (!matchesTypeFilter(notice, filterType)) {
        return false
      }

      return true
    })
  }, [notices, searchQuery, filterPriority, filterType])

  const toggleExpanded = useCallback((noticeId: string) => {
    setExpandedNotices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(noticeId)) {
        newSet.delete(noticeId)
      } else {
        newSet.add(noticeId)
      }
      return newSet
    })
  }, [])

  return (
    <AppShell showLocationPanel={false}>
      <div className="flex-1 min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6">
        <DashboardHeader
          title="DFO Fishery Notices"
          showTimeframe={false}
          showSetLocation={true}
          showCustomize={false}
        />

        <div className="max-w-6xl mx-auto space-y-6">
          {/* Filters Section */}
          <div className="bg-rc-bg-dark rounded-xl border border-rc-bg-light p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rc-text-muted" />
              <input
                type="text"
                placeholder="Search notices by title, species, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-rc-bg-dark border border-rc-bg-light rounded-lg text-sm text-rc-text placeholder:text-rc-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              {/* Priority Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rc-text-muted" />
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as PriorityLevel | 'all')}
                  className="pl-10 pr-8 py-2.5 bg-rc-bg-dark border border-rc-bg-light rounded-lg text-sm text-rc-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as NoticeTypeFilter)}
                className="px-4 py-2.5 bg-rc-bg-dark border border-rc-bg-light rounded-lg text-sm text-rc-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Types</option>
                <option value="closure">Closures</option>
                <option value="opening">Openings</option>
                <option value="biotoxin">Biotoxin Alerts</option>
                <option value="sanitary">Sanitary Closures</option>
              </select>
            </div>
          </div>

            {/* Active Filters Display */}
            {(searchQuery || filterPriority !== 'all' || filterType !== 'all') && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-rc-bg-light">
                <span className="text-xs text-rc-text-muted">Active filters:</span>
                <div className="flex gap-2 flex-wrap">
                  {searchQuery && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rc-bg-light text-rc-text-light text-xs">
                      Search: {searchQuery}
                      <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-rc-text">×</button>
                    </span>
                  )}
                  {filterPriority !== 'all' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rc-bg-light text-rc-text-light text-xs">
                      Priority: {filterPriority}
                      <button onClick={() => setFilterPriority('all')} className="ml-1 hover:text-rc-text">×</button>
                    </span>
                  )}
                  {filterType !== 'all' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rc-bg-light text-rc-text-light text-xs">
                      Type: {filterType}
                      <button onClick={() => setFilterType('all')} className="ml-1 hover:text-rc-text">×</button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <p className="text-sm text-rc-text-muted">
            Showing {filteredNotices.length} {filteredNotices.length === 1 ? 'notice' : 'notices'} for Areas {areas.join(', ')}
          </p>

          {/* Notices List */}
          {loading ? (
            <div className="bg-rc-bg-dark rounded-xl border border-rc-bg-light p-12">
              <PageLoadingSpinner message="Loading notices..." />
            </div>
          ) : filteredNotices.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No notices found"
              description={
                searchQuery || filterPriority !== 'all' || filterType !== 'all'
                  ? 'Try adjusting your filters to see more notices.'
                  : 'There are no recent fishery notices for your selected areas.'
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredNotices.map(notice => {
                const isExpanded = expandedNotices.has(notice.id)
                const typeInfo = getNoticeTypeInfo(notice)

                return (
                  <div
                    key={notice.id}
                    className="bg-rc-bg-dark rounded-xl border border-rc-bg-light p-5 hover:border-blue-500/30 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap text-xs">
                          <span className={`font-medium ${getPriorityColor(notice.priority_level)}`}>
                            {getPriorityLabel(notice.priority_level)}
                          </span>
                          <span className={`${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          <span className="text-rc-text-muted">
                            {notice.notice_number}
                          </span>
                        </div>
                        <h3 className="font-semibold text-rc-text mb-1">
                          {notice.title}
                        </h3>
                        <p className="text-sm text-rc-text-muted">
                          Issued: {format(new Date(notice.date_issued), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleExpanded(notice.id)}
                        className="p-2 rounded-lg bg-rc-bg-light hover:bg-rc-bg-light/70 text-rc-text-muted hover:text-rc-text transition-colors"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-2 mt-4 text-xs">
                      {notice.areas.length > 0 && (
                        <span className="px-2 py-1 rounded-md bg-rc-bg-light text-rc-text-muted">
                          Areas: {notice.areas.join(', ')}
                        </span>
                      )}
                      {notice.subareas.length > 0 && (
                        <span className="px-2 py-1 rounded-md bg-rc-bg-light text-rc-text-muted">
                          Subareas: {notice.subareas.slice(0, 3).join(', ')}
                          {notice.subareas.length > 3 && ` +${notice.subareas.length - 3} more`}
                        </span>
                      )}
                      {notice.species.length > 0 && (
                        <span className="px-2 py-1 rounded-md bg-rc-bg-light text-rc-text-muted">
                          Species: {notice.species.slice(0, 2).join(', ')}
                          {notice.species.length > 2 && ` +${notice.species.length - 2} more`}
                        </span>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-rc-bg-light space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-rc-text-light mb-1">Category</h4>
                          <p className="text-sm text-rc-text-muted">{notice.dfo_category}</p>
                        </div>

                        {notice.species.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-rc-text-light mb-1">Affected Species</h4>
                            <p className="text-sm text-rc-text-muted">
                              {notice.species.join(', ')}
                            </p>
                          </div>
                        )}

                        {notice.subareas.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-rc-text-light mb-1">All Subareas</h4>
                            <p className="text-sm text-rc-text-muted">
                              {notice.subareas.join(', ')}
                            </p>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-medium text-rc-text-light mb-2">Notice Text</h4>
                          <div className="bg-rc-bg-light rounded-lg p-4">
                            <p className="text-sm text-rc-text-muted whitespace-pre-wrap">
                              {notice.full_text.substring(0, 1000)}
                              {notice.full_text.length > 1000 && '...'}
                            </p>
                          </div>
                        </div>

                        <a
                          href={notice.notice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors"
                        >
                          View Full Notice on DFO Website
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default function DFONoticesPage() {
  return (
    <Suspense fallback={
      <AppShell showLocationPanel={false}>
        <PageLoadingSpinner message="Loading DFO notices..." />
      </AppShell>
    }>
      <DFONoticesContent />
    </Suspense>
  )
}
