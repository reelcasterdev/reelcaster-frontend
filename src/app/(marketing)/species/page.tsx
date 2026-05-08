import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchSpeciesList } from '@/lib/bluecaster';

const SITE_URL = 'https://reelcaster.com';

export const metadata: Metadata = {
  title: 'BC Fishing Species — Salmon, Halibut, Lingcod & More | ReelCaster',
  description:
    'Browse the species you can target in British Columbia: salmon (chinook, coho, sockeye, pink, chum), halibut, lingcod, rockfish, and more. Seasonal calendars, regulations, and the spots where they show up.',
  alternates: { canonical: `${SITE_URL}/species` },
  openGraph: {
    title: 'BC Fishing Species | ReelCaster',
    description: 'Species library for British Columbia fishing.',
    url: `${SITE_URL}/species`,
    siteName: 'ReelCaster',
    type: 'website',
    locale: 'en_CA',
  },
  robots: { index: true, follow: true },
};

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'BC Fishing Species',
  url: `${SITE_URL}/species`,
  description:
    'Species library for British Columbia fishing — calendars, regulations, and top spots.',
};

export default async function SpeciesIndexPage() {
  const species = await fetchSpeciesList({ limit: 100 });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
      />

      <article>
        <section className="max-w-6xl mx-auto px-6 pt-14 pb-10 md:pt-20 md:pb-14">
          <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-3">
            Species
          </p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-rc-text mb-5">
            BC Fishing Species
          </h1>
          <p className="max-w-2xl text-base md:text-lg leading-relaxed text-rc-text-light">
            Every species ReelCaster scores for, with seasonal abundance, key
            techniques, and the cities where they show up. Tap one to see where
            it&apos;s biting and what the regs say this month.
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-8">
          {species.length === 0 ? (
            <p className="text-rc-text-muted">No species published yet.</p>
          ) : (
            <ul
              data-testid="species-list"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
            >
              {species.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/species/${s.slug}`}
                    data-testid="species-card"
                    className="block bg-rc-bg-dark border border-rc-bg-light rounded-lg p-4 hover:border-blue-500/40 transition-colors h-full"
                  >
                    <h3 className="font-semibold text-rc-text">{s.name}</h3>
                    {s.scientific_name && (
                      <p className="text-xs italic text-rc-text-muted mt-1">
                        {s.scientific_name}
                      </p>
                    )}
                    {s.family && (
                      <p className="text-[11px] uppercase tracking-widest text-rc-text-muted mt-2">
                        {s.family}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </>
  );
}
