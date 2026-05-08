import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import {
  fetchPublicCities,
  fetchSpeciesList,
  fetchHierarchy,
  type BlueCasterPublicCity,
  type BlueCasterSpeciesSummary,
} from '@/lib/bluecaster';
import {
  ArrowRight,
  Compass,
  Bell,
  Anchor,
  Map as MapIcon,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Navigation,
} from 'lucide-react';

const SITE_URL = 'https://reelcaster.com';
const NOTICE_LIMIT = 3;
const FEATURED_SPOT_LIMIT = 6;

export const metadata: Metadata = {
  title: 'ReelCaster — BC Fishing Forecasts, Tides & Local Intel',
  description:
    'Live fishing intelligence for British Columbia. 14-day forecasts, tide data, regulations, species guides, and the spots local anglers actually fish.',
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    title: 'ReelCaster — BC Fishing Forecasts',
    description: 'Live fishing intelligence for British Columbia.',
    url: SITE_URL,
    siteName: 'ReelCaster',
    type: 'website',
    locale: 'en_CA',
  },
  robots: { index: true, follow: true },
};

const HOW_IT_WORKS = [
  {
    icon: Compass,
    title: 'See conditions',
    body:
      'Live tide, wind, swell, and a daily fishing score for every covered city — no spreadsheet required.',
  },
  {
    icon: Bell,
    title: 'Set an alert',
    body:
      'Get an email when conditions hit your bar — wind under 15kt, tide swing over 1.5m, score above 70.',
  },
  {
    icon: Anchor,
    title: 'Log your catch',
    body:
      'Tap one button on the boat. Offline-first, GPS-tagged. Build a real record across seasons.',
  },
];

const HOMEPAGE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ReelCaster',
  url: SITE_URL,
  description:
    'Live fishing forecasts, regulations, and local intel for British Columbia and the Pacific Northwest.',
};

interface HomepageNotice {
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

async function fetchHomepageNotices(): Promise<HomepageNotice[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const sb = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // Prefer high-signal notices (critical/high priority OR closures/openings/biotoxin).
    const { data } = await sb
      .from('dfo_fishery_notices')
      .select(
        'id, title, date_issued, notice_url, priority_level, areas, is_closure, is_opening, is_biotoxin_alert',
      )
      .or(
        'priority_level.in.(critical,high),is_closure.eq.true,is_opening.eq.true,is_biotoxin_alert.eq.true',
      )
      .order('date_issued', { ascending: false })
      .limit(NOTICE_LIMIT);
    return (data ?? []) as HomepageNotice[];
  } catch {
    return [];
  }
}

interface FeaturedSpot {
  name: string;
  slug: string;
  citySlug: string;
  cityName: string;
  provinceCode: string;
}

async function fetchFeaturedSpots(): Promise<FeaturedSpot[]> {
  const tree = await fetchHierarchy();
  if (!tree) return [];
  const out: FeaturedSpot[] = [];
  for (const country of tree.countries ?? []) {
    for (const province of country.states_provinces ?? []) {
      for (const region of province.regions ?? []) {
        for (const city of region.cities ?? []) {
          for (const spot of city.spots ?? []) {
            if (!spot.is_published) continue;
            out.push({
              name: spot.name,
              slug: spot.slug,
              citySlug: city.slug,
              cityName: city.name,
              provinceCode: (province.code ?? 'bc').toLowerCase(),
            });
            if (out.length >= FEATURED_SPOT_LIMIT) return out;
          }
        }
      }
    }
  }
  return out;
}

export default async function MarketingHomePage() {
  const [cities, species, notices, spots] = await Promise.all([
    fetchPublicCities({ province: 'BC', status: 'published', order: 'featured', limit: 8 }),
    fetchSpeciesList({ limit: 6 }),
    fetchHomepageNotices(),
    fetchFeaturedSpots(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOMEPAGE_JSONLD) }}
      />

      <Hero />
      <RegulationAlertsStrip notices={notices} />
      <HowItWorks />
      <FeaturedCities cities={cities} />
      <FeaturedSpots spots={spots} />
      <SpeciesPreview species={species} />
      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <section
      data-testid="homepage-hero"
      className="relative overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-20">
        <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-4">
          ReelCaster · British Columbia
        </p>
        <h1
          data-testid="marketing-hero-headline"
          className="text-4xl md:text-6xl font-black uppercase tracking-tight text-rc-text max-w-3xl mb-6 leading-[1.05]"
        >
          The fishing forecast actually built for the boat.
        </h1>
        <p className="max-w-2xl text-base md:text-lg leading-relaxed text-rc-text-light mb-8">
          Tides, wind, swell, scoring, and seasonal calendars for every published
          BC city — pulled together so you can decide whether to launch in 30
          seconds, not 30 minutes of tab juggling.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            data-testid="marketing-primary-cta"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white transition-colors"
          >
            Sign up free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/fishing"
            className="inline-flex items-center gap-2 px-5 py-3 bg-rc-bg-dark border border-rc-bg-light hover:border-blue-500/40 rounded-lg text-sm font-semibold text-rc-text transition-colors"
          >
            Browse fishing spots
          </Link>
        </div>

        <div className="mt-10 flex items-center gap-6 text-xs text-rc-text-muted">
          <span className="inline-flex items-center gap-1">
            <MapIcon className="w-3.5 h-3.5" /> Victoria · Sidney · Tofino · Sooke
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 14-day Pro forecasts
          </span>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section
      data-testid="homepage-how-it-works"
      className="border-t border-rc-bg-light bg-rc-bg-dark"
    >
      <div className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-rc-bg-darkest border border-rc-bg-light rounded-lg p-6"
            >
              <div className="w-10 h-10 rounded-md bg-blue-600 text-white flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-rc-text mb-2">{title}</h3>
              <p className="text-sm text-rc-text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedCities({ cities }: { cities: BlueCasterPublicCity[] }) {
  if (cities.length === 0) {
    return null;
  }
  return (
    <section
      data-testid="homepage-featured-cities"
      className="border-t border-rc-bg-light"
    >
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-2">
              Live coverage
            </p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text">
              Fishing cities
            </h2>
          </div>
          <Link
            href="/fishing/bc"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-rc-text-light hover:text-rc-text"
          >
            All BC cities <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div
          data-testid="city-carousel"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {cities.map((c) => (
            <Link
              key={c.slug}
              href={`/fishing/${c.province ?? 'bc'}/${c.slug}`}
              data-testid="city-card"
              className="group block bg-rc-bg-dark border border-rc-bg-light rounded-lg overflow-hidden hover:border-blue-500/40 transition-colors"
            >
              <div className="relative aspect-[4/3] bg-rc-bg-light">
                {c.hero_image_url ? (
                  // Using next/image with a remote URL needs domain config; use plain img to avoid blocking.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.hero_image_url}
                    alt={c.hero_image_alt ?? `${c.name} fishing`}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-rc-bg-light to-rc-bg-darkest" />
                )}
              </div>
              <div className="p-4">
                <p className="text-xs uppercase tracking-widest text-rc-text-muted mb-1">
                  {c.province?.toUpperCase() ?? 'BC'}
                </p>
                <h3 className="text-lg font-bold text-rc-text mb-1">
                  {c.name}
                </h3>
                {c.region_label && (
                  <p className="text-xs text-rc-text-muted">{c.region_label}</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/fishing/bc"
            className="inline-flex items-center gap-1 text-sm font-medium text-rc-text-light hover:text-rc-text"
          >
            All BC cities <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SpeciesPreview({ species }: { species: BlueCasterSpeciesSummary[] }) {
  if (species.length === 0) {
    return null;
  }
  return (
    <section
      data-testid="homepage-species-preview"
      className="border-t border-rc-bg-light bg-rc-bg-dark"
    >
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-2">
              Species library
            </p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text">
              What anglers chase
            </h2>
          </div>
          <Link
            href="/species"
            className="inline-flex items-center gap-1 text-sm font-medium text-rc-text-light hover:text-rc-text"
          >
            All species <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {species.map((s) => (
            <Link
              key={s.id}
              href={`/species/${s.slug}`}
              data-testid="species-card"
              className="block bg-rc-bg-darkest border border-rc-bg-light rounded-lg p-4 hover:border-blue-500/40 transition-colors"
            >
              <h3 className="font-semibold text-rc-text">{s.name}</h3>
              {s.scientific_name && (
                <p className="text-xs italic text-rc-text-muted mt-0.5">
                  {s.scientific_name}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function RegulationAlertsStrip({ notices }: { notices: HomepageNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <section
      data-testid="homepage-regulation-alerts"
      className="border-t border-rc-bg-light bg-rc-bg-darkest"
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-2 inline-flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              DFO alerts · Pacific Region
            </p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text">
              On the water this week
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

function FeaturedSpots({ spots }: { spots: FeaturedSpot[] }) {
  if (spots.length === 0) return null;
  return (
    <section
      data-testid="homepage-featured-spots"
      className="border-t border-rc-bg-light bg-rc-bg-dark"
    >
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-2 inline-flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5" />
              Spots locals fish
            </p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text">
              Featured fishing spots
            </h2>
          </div>
          <Link
            href="/explore"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-rc-text-light hover:text-rc-text"
          >
            Explore the map <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spots.map((s) => (
            <Link
              key={`${s.citySlug}-${s.slug}`}
              href={`/fishing/${s.provinceCode}/${s.citySlug}/${s.slug}`}
              data-testid="spot-card"
              className="group block bg-rc-bg-darkest border border-rc-bg-light rounded-lg p-5 hover:border-blue-500/40 transition-colors"
            >
              <p className="text-xs uppercase tracking-widest text-rc-text-muted mb-2">
                {s.cityName} · {s.provinceCode.toUpperCase()}
              </p>
              <h3 className="text-lg font-bold text-rc-text mb-3 leading-tight group-hover:text-blue-300 transition-colors">
                {s.name}
              </h3>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-rc-text-light group-hover:text-rc-text">
                View forecast <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6 sm:hidden">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 text-sm font-medium text-rc-text-light hover:text-rc-text"
          >
            Explore the map <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section
      data-testid="homepage-final-cta"
      className="border-t border-rc-bg-light"
    >
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-rc-text mb-4">
          Ready to fish smarter?
        </h2>
        <p className="text-base text-rc-text-light mb-6">
          Free tier gives you a 1-day forecast, 1 alert, unlimited catch
          logging. Pro unlocks the full 14-day window, multi-species scoring,
          and bathymetry.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white transition-colors"
          >
            Sign up free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-3 bg-rc-bg-dark border border-rc-bg-light hover:border-blue-500/40 rounded-lg text-sm font-semibold text-rc-text transition-colors"
          >
            See Pro pricing
          </Link>
        </div>
      </div>
    </section>
  );
}

// Suppress unused-import warning — `Image` is reserved for next/image migration once
// remote-domain config is added in a follow-up.
void Image;
