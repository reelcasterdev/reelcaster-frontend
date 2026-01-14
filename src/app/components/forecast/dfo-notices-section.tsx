'use client';

/**
 * DFO Fishery Notices Section
 *
 * Displays recent DFO recreational fishing and safety notices
 * relevant to the user's fishing location.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface DFONotice {
  id: string;
  notice_number: string;
  dfo_category: string;
  title: string;
  date_issued: string;
  full_text: string;
  notice_url: string;
  notice_type: string;
  priority_level: 'critical' | 'high' | 'medium' | 'low';
  areas: number[];
  subareas: string[];
  species: string[];
  is_closure: boolean;
  is_opening: boolean;
  is_biotoxin_alert: boolean;
  is_sanitary_closure: boolean;
}

interface DFONoticesSectionProps {
  // Fishing areas to filter notices (e.g., [19, 20])
  areas?: number[];
  // Species to filter notices (optional)
  species?: string[];
  // Maximum number of notices to show
  limit?: number;
}

export function DFONoticesSection({ areas = [19, 20], species = [], limit = 10 }: DFONoticesSectionProps) {
  const [notices, setNotices] = useState<DFONotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNotices, setExpandedNotices] = useState<Set<string>>(new Set());

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch recent notices for the specified areas
      let query = supabase
        .from('dfo_fishery_notices')
        .select('*')
        .order('date_issued', { ascending: false })
        .limit(limit);

      // Filter by areas if specified
      if (areas.length > 0) {
        query = query.overlaps('areas', areas);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching DFO notices:', error);
        return;
      }

      // Additional client-side filtering by species if specified
      let filteredNotices = data || [];
      if (species.length > 0) {
        filteredNotices = filteredNotices.filter(notice =>
          notice.species.some((s: string) =>
            species.some(userSpecies =>
              s.toLowerCase().includes(userSpecies.toLowerCase()) ||
              userSpecies.toLowerCase().includes(s.toLowerCase())
            )
          )
        );
      }

      setNotices(filteredNotices);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
    } finally {
      setLoading(false);
    }
  }, [areas, species, limit]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  function toggleExpanded(noticeId: string) {
    setExpandedNotices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noticeId)) {
        newSet.delete(noticeId);
      } else {
        newSet.add(noticeId);
      }
      return newSet;
    });
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case 'critical':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Critical
          </Badge>
        );
      case 'high':
        return (
          <Badge variant="default" className="gap-1 bg-orange-500">
            <AlertTriangle className="h-3 w-3" />
            High Priority
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="gap-1">
            <Info className="h-3 w-3" />
            Medium
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            Low
          </Badge>
        );
    }
  }

  function getNoticeTypeLabel(notice: DFONotice) {
    if (notice.is_biotoxin_alert) return '⚠️ Biotoxin Alert';
    if (notice.is_sanitary_closure) return '⚠️ Sanitary Closure';
    if (notice.is_closure) return '🚫 Closure';
    if (notice.is_opening) return '✅ Opening';
    return '📋 Information';
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>DFO Fishery Notices</CardTitle>
          <CardDescription>Loading recent notices...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (notices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>DFO Fishery Notices</CardTitle>
          <CardDescription>No recent notices for your fishing areas</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>DFO Fishery Notices</CardTitle>
        <CardDescription>
          Recent fishing regulations and safety alerts for Areas {areas.join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notices.map(notice => {
            const isExpanded = expandedNotices.has(notice.id);

            return (
              <div
                key={notice.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityBadge(notice.priority_level)}
                      <span className="text-xs text-muted-foreground">
                        {notice.notice_number}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">
                      {getNoticeTypeLabel(notice)} {notice.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Issued: {format(new Date(notice.date_issued), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleExpanded(notice.id)}
                    className="text-muted-foreground hover:text-foreground"
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
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  {notice.areas.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Areas: {notice.areas.join(', ')}
                    </Badge>
                  )}
                  {notice.subareas.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Subareas: {notice.subareas.slice(0, 3).join(', ')}
                      {notice.subareas.length > 3 && ' +more'}
                    </Badge>
                  )}
                  {notice.species.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Species: {notice.species.slice(0, 2).join(', ')}
                      {notice.species.length > 2 && ' +more'}
                    </Badge>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold mb-1">Category</h4>
                      <p className="text-xs text-muted-foreground">{notice.dfo_category}</p>
                    </div>

                    {notice.species.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold mb-1">Affected Species</h4>
                        <p className="text-xs text-muted-foreground">
                          {notice.species.join(', ')}
                        </p>
                      </div>
                    )}

                    {notice.full_text && notice.full_text.trim() && (
                      <div>
                        <h4 className="text-xs font-semibold mb-1">Notice Text</h4>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">
                          {notice.full_text.substring(0, 500)}
                          {notice.full_text.length > 500 && '...'}
                        </p>
                      </div>
                    )}

                    <a
                      href={notice.notice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View Full Notice on DFO Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
