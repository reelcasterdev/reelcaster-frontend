import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';
import type { BlueCasterCityPage } from '@/lib/bluecaster';

interface Notice {
  id: string;
  title: string;
  date_issued: string;
  notice_url: string | null;
  priority_level: 'critical' | 'high' | 'medium' | 'low' | null;
  areas: number[] | null;
  is_closure: boolean | null;
  is_opening: boolean | null;
  is_biotoxin_alert: boolean | null;
}

const NOTICE_LIMIT = 3;

async function fetchNoticesForAreas(areas: number[]): Promise<Notice[]> {
  if (areas.length === 0) return [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const sb = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await sb
      .from('dfo_fishery_notices')
      .select(
        'id, title, date_issued, notice_url, priority_level, areas, is_closure, is_opening, is_biotoxin_alert',
      )
      .overlaps('areas', areas)
      .or(
        'priority_level.in.(critical,high),is_closure.eq.true,is_opening.eq.true,is_biotoxin_alert.eq.true',
      )
      .order('date_issued', { ascending: false })
      .limit(NOTICE_LIMIT);
    return (data ?? []) as Notice[];
  } catch {
    return [];
  }
}

export default async function CityRegulationAlerts({
  regulatoryAreas,
}: {
  regulatoryAreas: BlueCasterCityPage['regulatory_areas'];
}) {
  const cityAreas = Array.from(
    new Set(
      regulatoryAreas
        .map((a) => parseInt(a.area_number, 10))
        .filter((n) => Number.isFinite(n)),
    ),
  );
  if (cityAreas.length === 0) return null;

  const notices = await fetchNoticesForAreas(cityAreas);
  if (notices.length === 0) return null;

  return (
    <section
      data-testid="section-city-regulation-alerts"
      className="border-y border-rc-bg-light bg-rc-bg-darkest"
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-2 inline-flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              DFO Pacific · Areas {cityAreas.join(', ')}
            </p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text">
              Active in your fishing areas
            </h2>
          </div>
          <Link
            href="/regulations"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-rc-text-light hover:text-rc-text"
          >
            All notices <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {notices.map((n) => (
            <li
              key={n.id}
              data-testid="regulation-alert-card"
              className="bg-rc-bg-dark border border-rc-bg-light rounded-lg p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                {n.priority_level && <PriorityBadge level={n.priority_level} />}
                {n.is_closure && (
                  <Badge label="Closure" cls="bg-red-500/20 text-red-300 border-red-500/40" />
                )}
                {n.is_opening && (
                  <Badge
                    label="Opening"
                    cls="bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  />
                )}
                {n.is_biotoxin_alert && (
                  <Badge
                    label="Biotoxin"
                    cls="bg-amber-500/20 text-amber-300 border-amber-500/40"
                  />
                )}
              </div>
              <h3 className="text-sm font-semibold text-rc-text leading-snug">
                {n.notice_url ? (
                  <a
                    href={n.notice_url}
                    target="_blank"
                    rel="noopener"
                    className="hover:text-rc-text-light inline-flex items-start gap-1.5"
                  >
                    {n.title}
                    <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0 text-rc-text-muted" />
                  </a>
                ) : (
                  n.title
                )}
              </h3>
              <div className="mt-auto flex items-center justify-between text-xs text-rc-text-muted">
                <span>{formatDate(n.date_issued)}</span>
                {n.areas && n.areas.length > 0 && (
                  <span>Areas {n.areas.slice(0, 3).join(', ')}</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 sm:hidden">
          <Link
            href="/regulations"
            className="inline-flex items-center gap-1 text-sm font-medium text-rc-text-light hover:text-rc-text"
          >
            All notices <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PriorityBadge({
  level,
}: {
  level: 'critical' | 'high' | 'medium' | 'low';
}) {
  const map: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-red-500/20 text-red-300 border border-red-500/40',
    medium: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    low: 'bg-rc-bg-light text-rc-text-muted border border-rc-bg-light',
  };
  return (
    <span
      className={`px-2 py-0.5 text-[10px] tracking-widest uppercase rounded ${map[level]}`}
    >
      {level}
    </span>
  );
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={`px-2 py-0.5 text-[10px] tracking-widest uppercase rounded border ${cls}`}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
