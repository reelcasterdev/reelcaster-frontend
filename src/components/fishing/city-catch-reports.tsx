import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Fish, ArrowRight } from 'lucide-react';
import type { FishingReportData } from '@/app/types/fishing-report';

const HIGHLIGHT_LIMIT = 4;

// Supabase `fishing_reports.location` values are city pairs, not slugs.
// Map BC city slugs to the right report row.
const CITY_TO_REPORT_LOCATION: Record<string, string> = {
  'victoria-bc': 'Victoria, Sidney',
  'sidney-bc': 'Victoria, Sidney',
  'sooke-bc': 'Sooke, Port Renfrew',
  'port-renfrew-bc': 'Sooke, Port Renfrew',
};

interface ReportRow {
  week_ending: string;
  report_data: FishingReportData;
}

const CONDITION_BADGE: Record<string, string> = {
  EXCELLENT: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'VERY GOOD': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  GOOD: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  FAIR: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  SLOW: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  SPOTTY: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
};

async function fetchLatestReport(
  citySlug: string,
): Promise<ReportRow | null> {
  const location = CITY_TO_REPORT_LOCATION[citySlug];
  if (!location) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await sb
      .from('fishing_reports')
      .select('week_ending, report_data')
      .eq('location', location)
      .eq('is_active', true)
      .order('week_ending', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return data as ReportRow;
  } catch {
    return null;
  }
}

export default async function CityCatchReports({
  citySlug,
  cityName,
}: {
  citySlug: string;
  cityName: string;
}) {
  const report = await fetchLatestReport(citySlug);
  if (!report) return null;

  const conditions = report.report_data?.overallConditions ?? {};
  const entries = Object.entries(conditions).slice(0, HIGHLIGHT_LIMIT);
  if (entries.length === 0) return null;

  return (
    <section
      data-testid="section-city-catch-reports"
      className="border-y border-rc-bg-light bg-rc-bg-dark"
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-2 inline-flex items-center gap-2">
              <Fish className="w-3.5 h-3.5" />
              {cityName} · week ending {formatDate(report.week_ending)}
            </p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text">
              Last week on the water
            </h2>
          </div>
          <Link
            href="/historical-reports"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-rc-text-light hover:text-rc-text"
          >
            Older reports <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {entries.map(([species, condition]) => (
            <li
              key={species}
              data-testid="report-highlight-card"
              className="bg-rc-bg-darkest border border-rc-bg-light rounded-lg p-4 flex flex-col gap-2"
            >
              <span
                className={`self-start px-2 py-0.5 text-[10px] tracking-widest uppercase rounded border ${
                  CONDITION_BADGE[condition.toUpperCase()] ??
                  'bg-rc-bg-light text-rc-text-muted border-rc-bg-light'
                }`}
              >
                {condition}
              </span>
              <h3 className="text-sm font-semibold text-rc-text leading-snug">
                {species}
              </h3>
            </li>
          ))}
        </ul>

        {report.report_data?.fishingTips?.[0] && (
          <p className="mt-5 text-sm text-rc-text-light leading-relaxed max-w-3xl">
            <span className="text-rc-text-muted">From the report:</span>{' '}
            {report.report_data.fishingTips[0]}
          </p>
        )}

        <div className="mt-5 sm:hidden">
          <Link
            href="/historical-reports"
            className="inline-flex items-center gap-1 text-sm font-medium text-rc-text-light hover:text-rc-text"
          >
            Older reports <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
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
