import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, ExternalLink } from 'lucide-react';

const SITE_URL = 'https://reelcaster.com';
const NOTICES_LIMIT = 50;

export const revalidate = 600; // 10 min

export const metadata: Metadata = {
  title: 'BC Fishing Regulations & DFO Notices | ReelCaster',
  description:
    'Latest DFO fishery notices for British Columbia: closures, openings, biotoxin alerts, and sanitary closures. Always verify with DFO before fishing.',
  alternates: { canonical: `${SITE_URL}/regulations` },
  openGraph: {
    title: 'BC Fishing Regulations | ReelCaster',
    description: 'Latest DFO fishery notices for British Columbia.',
    url: `${SITE_URL}/regulations`,
    siteName: 'ReelCaster',
    type: 'website',
    locale: 'en_CA',
  },
  robots: { index: true, follow: true },
};

interface Notice {
  id: string;
  notice_number: string | null;
  title: string;
  date_issued: string;
  notice_url: string | null;
  notice_type: string | null;
  priority_level: 'critical' | 'high' | 'medium' | 'low' | null;
  areas: number[] | null;
  species: string[] | null;
  is_closure: boolean | null;
  is_opening: boolean | null;
  is_biotoxin_alert: boolean | null;
  is_sanitary_closure: boolean | null;
}

async function fetchPublicNotices(): Promise<Notice[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await sb
    .from('dfo_fishery_notices')
    .select(
      'id, notice_number, title, date_issued, notice_url, notice_type, priority_level, areas, species, is_closure, is_opening, is_biotoxin_alert, is_sanitary_closure',
    )
    .order('date_issued', { ascending: false })
    .limit(NOTICES_LIMIT);
  if (error) return [];
  return (data ?? []) as Notice[];
}

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'GovernmentService',
  name: 'BC Fishing Regulations & DFO Notices',
  url: `${SITE_URL}/regulations`,
  provider: {
    '@type': 'GovernmentOrganization',
    name: 'Department of Fisheries and Oceans Canada',
    url: 'https://www.pac.dfo-mpo.gc.ca/',
  },
  description:
    'Aggregated DFO fishery notices for British Columbia waters: closures, openings, biotoxin alerts, sanitary closures.',
};

export default async function RegulationsPage() {
  const notices = await fetchPublicNotices();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
      />

      <article>
        <header className="max-w-5xl mx-auto px-6 pt-14 pb-8 md:pt-20 md:pb-10">
          <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-3">
            Reference · DFO Pacific Region
          </p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-rc-text mb-4">
            BC Fishing Regulations
          </h1>
          <p className="max-w-2xl text-base md:text-lg leading-relaxed text-rc-text-light">
            The latest fishery notices from DFO Pacific Region — closures,
            openings, biotoxin alerts, and sanitary closures. Always verify with
            DFO before you launch.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-rc-text-muted">
            <AlertCircle className="w-3.5 h-3.5" />
            Reference only. Not a substitute for the DFO Recreational Fishing Regulations.
          </div>
        </header>

        <section className="max-w-5xl mx-auto px-6 pb-16">
          {notices.length === 0 ? (
            <div className="bg-rc-bg-dark border border-rc-bg-light rounded-lg p-8 text-center">
              <p className="text-rc-text-light">No recent DFO notices available.</p>
              <Link
                href="https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/index-eng.html"
                target="_blank"
                className="inline-flex items-center gap-1 text-sm text-rc-text-light hover:text-rc-text mt-2 underline underline-offset-2"
              >
                Check DFO directly <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <ul
              data-testid="regulations-list"
              className="space-y-2 bg-rc-bg-dark border border-rc-bg-light rounded-lg overflow-hidden"
            >
              {notices.map((n) => (
                <li
                  key={n.id}
                  className="px-4 py-4 sm:px-6 sm:py-5 border-b border-rc-bg-light last:border-b-0"
                >
                  <div className="flex flex-wrap items-start gap-3 mb-2">
                    {n.priority_level && (
                      <PriorityBadge level={n.priority_level} />
                    )}
                    {flagsBadges(n)}
                    {n.areas && n.areas.length > 0 && (
                      <span className="px-2 py-0.5 text-[10px] tracking-widest uppercase rounded bg-rc-bg-light text-rc-text-muted border border-rc-bg-light">
                        Areas {n.areas.join(', ')}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-rc-text-muted">
                      {formatDate(n.date_issued)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-rc-text leading-snug">
                    {n.notice_url ? (
                      <Link
                        href={n.notice_url}
                        target="_blank"
                        className="hover:text-rc-text-light underline-offset-2 hover:underline inline-flex items-start gap-1.5"
                      >
                        {n.title}
                        <ExternalLink className="w-3.5 h-3.5 mt-1 flex-shrink-0 text-rc-text-muted" />
                      </Link>
                    ) : (
                      n.title
                    )}
                  </h3>
                  {n.species && n.species.length > 0 && (
                    <p className="text-xs text-rc-text-muted mt-1">
                      Species: {n.species.join(', ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </>
  );
}

function flagsBadges(n: Notice) {
  const badges: Array<{ label: string; cls: string }> = [];
  if (n.is_closure) badges.push({ label: 'Closure', cls: 'bg-red-500/20 text-red-300 border-red-500/40' });
  if (n.is_opening) badges.push({ label: 'Opening', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' });
  if (n.is_biotoxin_alert) badges.push({ label: 'Biotoxin', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' });
  if (n.is_sanitary_closure) badges.push({ label: 'Sanitary', cls: 'bg-purple-500/20 text-purple-300 border-purple-500/40' });
  return badges.map((b) => (
    <span
      key={b.label}
      className={`px-2 py-0.5 text-[10px] tracking-widest uppercase rounded border ${b.cls}`}
    >
      {b.label}
    </span>
  ));
}

function PriorityBadge({ level }: { level: 'critical' | 'high' | 'medium' | 'low' }) {
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
