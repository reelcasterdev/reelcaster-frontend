import Link from 'next/link';
import { ArrowRight, Navigation } from 'lucide-react';
import {
  fetchSpotsByCoordinates,
  fetchHierarchy,
} from '@/lib/bluecaster';

const NEARBY_LIMIT = 5;
const NEARBY_RADIUS_KM = 50;

interface ResolvedSpot {
  slug: string;
  name: string;
  citySlug: string;
  cityName: string;
  provinceCode: string;
  distanceKm: number;
}

// fetchSpotsByCoordinates returns nearby spots without city/province slugs.
// Resolve URLs by joining against the cached hierarchy (one extra call,
// 3600s revalidation) so each card can deep-link into the right route.
async function buildSpotIndex(): Promise<
  Map<string, { citySlug: string; cityName: string; provinceCode: string }>
> {
  const tree = await fetchHierarchy();
  const index = new Map<
    string,
    { citySlug: string; cityName: string; provinceCode: string }
  >();
  if (!tree) return index;
  for (const country of tree.countries ?? []) {
    for (const province of country.states_provinces ?? []) {
      for (const region of province.regions ?? []) {
        for (const city of region.cities ?? []) {
          for (const spot of city.spots ?? []) {
            if (!spot.is_published) continue;
            index.set(spot.slug, {
              citySlug: city.slug,
              cityName: city.name,
              provinceCode: (province.code ?? 'bc').toLowerCase(),
            });
          }
        }
      }
    }
  }
  return index;
}

export default async function SpotNearbySpots({
  lat,
  lng,
  currentSlug,
}: {
  lat: number;
  lng: number;
  currentSlug: string;
}) {
  const [byCoords, spotIndex] = await Promise.all([
    fetchSpotsByCoordinates(lat, lng, NEARBY_RADIUS_KM),
    buildSpotIndex(),
  ]);

  if (!byCoords) return null;

  const resolved: ResolvedSpot[] = [];
  for (const s of byCoords.nearby_spots ?? []) {
    if (s.slug === currentSlug) continue;
    const cityInfo = spotIndex.get(s.slug);
    if (!cityInfo) continue; // skip orphan-from-hierarchy spots; never render dead links
    resolved.push({
      slug: s.slug,
      name: s.name,
      citySlug: cityInfo.citySlug,
      cityName: cityInfo.cityName,
      provinceCode: cityInfo.provinceCode,
      distanceKm: s.distance_km,
    });
    if (resolved.length >= NEARBY_LIMIT) break;
  }

  if (resolved.length === 0) return null;

  return (
    <section
      data-testid="section-spot-nearby-spots"
      className="border-t border-rc-bg-light bg-rc-bg-dark"
    >
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-2 inline-flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5" />
              Within {NEARBY_RADIUS_KM}km
            </p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text">
              Nearby spots
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
          {resolved.map((s) => (
            <Link
              key={s.slug}
              href={`/fishing/${s.provinceCode}/${s.citySlug}/${s.slug}`}
              data-testid="nearby-spot-card"
              className="group block bg-rc-bg-darkest border border-rc-bg-light rounded-lg p-5 hover:border-blue-500/40 transition-colors"
            >
              <p className="text-xs uppercase tracking-widest text-rc-text-muted mb-2">
                {s.cityName} · {s.provinceCode.toUpperCase()}
              </p>
              <h3 className="text-lg font-bold text-rc-text mb-3 leading-tight group-hover:text-blue-300 transition-colors">
                {s.name}
              </h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-rc-text-muted">
                  {s.distanceKm.toFixed(0)} km away
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-rc-text-light group-hover:text-rc-text">
                  View forecast <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
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
