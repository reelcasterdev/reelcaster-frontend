import type { Metadata } from "next";
import Link from "next/link";
import { fetchHierarchy, fetchPublishedCities } from "@/lib/bluecaster";
import {
  COVERED_PROVINCES,
  PROVINCE_DISPLAY_NAMES,
  isCovered,
} from "@/lib/regions";

const SITE_URL = "https://reelcaster.com";

export const metadata: Metadata = {
  title: "Fishing Forecasts by Region | ReelCaster",
  description:
    "Live fishing intelligence for British Columbia, Washington, and Oregon. Browse forecasts by city, with regulations, seasonal guides, and 24-hour scoring.",
  alternates: { canonical: `${SITE_URL}/fishing` },
  openGraph: {
    title: "Fishing Forecasts by Region | ReelCaster",
    description:
      "Live fishing intelligence for British Columbia, Washington, and Oregon.",
    url: `${SITE_URL}/fishing`,
    siteName: "ReelCaster",
    type: "website",
    locale: "en_CA",
  },
  robots: { index: true, follow: true },
};

export default async function FishingIndexPage() {
  const [hierarchy, publishedCities] = await Promise.all([
    fetchHierarchy(),
    fetchPublishedCities(),
  ]);

  // Build a Set of published city slugs so we can show only what's live.
  const publishedSlugs = new Set<string>(
    (publishedCities ?? []).map(
      (p: { slug?: string; cities?: { slug?: string } }) =>
        (p.cities?.slug ?? p.slug ?? "") as string,
    ),
  );

  // Flatten hierarchy → provinces with their published cities only.
  const provinces: Array<{
    code: string;
    name: string;
    citiesPublished: Array<{ slug: string; name: string }>;
    citiesTotal: number;
  }> = [];

  for (const country of hierarchy?.countries ?? []) {
    for (const province of country.states_provinces) {
      const cities: Array<{ slug: string; name: string }> = [];
      let total = 0;
      for (const region of province.regions) {
        for (const city of region.cities) {
          total += 1;
          if (publishedSlugs.has(city.slug)) {
            cities.push({ slug: city.slug, name: city.name });
          }
        }
      }
      provinces.push({
        code: province.code,
        name: province.name,
        citiesPublished: cities,
        citiesTotal: total,
      });
    }
  }

  // Sort: covered first (in COVERED_PROVINCES order), then everything else by name.
  const covered = provinces
    .filter((p) => isCovered(p.code))
    .sort(
      (a, b) =>
        COVERED_PROVINCES.indexOf(
          a.code.toUpperCase() as (typeof COVERED_PROVINCES)[number],
        ) -
        COVERED_PROVINCES.indexOf(
          b.code.toUpperCase() as (typeof COVERED_PROVINCES)[number],
        ),
    );
  const comingSoon = provinces
    .filter((p) => !isCovered(p.code))
    .sort((a, b) => a.name.localeCompare(b.name));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Fishing Forecasts",
        item: `${SITE_URL}/fishing`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-14 pb-10 md:pt-20 md:pb-14">
          <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-3">
            ReelCaster Forecasts
          </p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-rc-text mb-5">
            Fishing Forecasts by Region
          </h1>
          <p className="max-w-2xl text-base md:text-lg leading-relaxed text-rc-text-light mb-6">
            Live conditions, 24-hour scoring, regulations, and local intel for
            every published city. ReelCaster is live in British Columbia,
            Washington, and Oregon — drop a waitlist pin if your spot isn&apos;t
            here yet.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white transition-colors"
            >
              Open the Explore canvas →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center px-5 py-2.5 bg-rc-bg-dark border border-rc-bg-light hover:border-blue-500/40 rounded-lg text-sm font-semibold text-rc-text transition-colors"
            >
              See Pro Intel pricing
            </Link>
          </div>
        </section>

        {/* Covered provinces */}
        <section className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text mb-6">
            Live Coverage
          </h2>

          {covered.length === 0 ? (
            <p className="text-rc-text-muted">No published regions yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {covered.map((p) => (
                <Link
                  key={p.code}
                  href={`/fishing/${p.code.toLowerCase()}`}
                  className="group block bg-rc-bg-dark border border-rc-bg-light rounded-lg p-5 hover:border-blue-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs tracking-[0.25em] uppercase font-medium text-rc-text-muted mb-1">
                        {p.code}
                      </p>
                      <h3 className="text-xl font-bold text-rc-text">
                        {PROVINCE_DISPLAY_NAMES[p.code.toUpperCase()] ?? p.name}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] tracking-widest uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Live
                    </span>
                  </div>
                  <p className="text-sm text-rc-text-light mb-4">
                    {p.citiesPublished.length}{" "}
                    {p.citiesPublished.length === 1 ? "city" : "cities"}{" "}
                    available
                  </p>
                  {p.citiesPublished.length > 0 && (
                    <ul className="space-y-1.5 text-sm text-rc-text-light">
                      {p.citiesPublished.slice(0, 6).map((c) => (
                        <li
                          key={c.slug}
                          className="flex items-center justify-between"
                        >
                          <span className="group-hover:underline">
                            {c.name}
                          </span>
                          <span className="text-rc-text-muted group-hover:text-rc-text">
                            ›
                          </span>
                        </li>
                      ))}
                      {p.citiesPublished.length > 6 && (
                        <li className="text-xs text-rc-text-muted pt-1">
                          +{p.citiesPublished.length - 6} more
                        </li>
                      )}
                    </ul>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Coming soon */}
        {comingSoon.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 py-8">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text mb-6">
              Coming Soon
            </h2>
            <div className="flex flex-wrap gap-2">
              {comingSoon.map((p) => (
                <span
                  key={`${p.code}-${p.name}`}
                  className="px-3 py-1.5 rounded-full text-sm bg-rc-bg-light text-rc-text-light border border-rc-bg-light"
                >
                  {p.name}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-rc-text-muted">
              Drop a pin from{" "}
              <Link
                href="/explore"
                className="underline underline-offset-2 hover:text-rc-text"
              >
                Explore
              </Link>{" "}
              to vote for your region.
            </p>
          </section>
        )}

        <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-rc-bg-light text-center">
          <p className="text-xs text-rc-text-muted">
            Data provided by ReelCaster. Regulations are reference only &mdash;
            always verify with DFO.
          </p>
        </footer>
      </article>
    </>
  );
}
