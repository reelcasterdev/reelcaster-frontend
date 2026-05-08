import Link from "next/link";
import { fetchCitySpots } from "@/lib/bluecaster";

interface CitySpotsProps {
  citySlug: string;
  cityName: string;
  provinceCode: string;
}

export default async function CitySpots({
  citySlug,
  cityName,
  provinceCode,
}: CitySpotsProps) {
  let spots: Awaited<ReturnType<typeof fetchCitySpots>> = [];
  try {
    spots = await fetchCitySpots(citySlug);
  } catch {
    spots = [];
  }

  if (!spots.length) return null;

  const provinceLower = provinceCode.toLowerCase();

  return (
    <section
      data-testid="section-city-spots"
      className="max-w-6xl mx-auto px-6 py-12"
      aria-label={`Fishing spots in ${cityName}`}
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text">
          Fishing Spots in {cityName}
        </h2>
        <span className="font-mono text-xs tracking-widest uppercase text-rc-text-muted shrink-0">
          {spots.length} {spots.length === 1 ? "spot" : "spots"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {spots.map((spot) => (
          <Link
            key={spot.id}
            href={`/fishing/${provinceLower}/${citySlug}/${spot.slug}`}
            className="group bg-rc-bg-dark border border-rc-bg-light rounded-lg px-5 py-4 flex items-center justify-between hover:border-blue-500/40 transition-all"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-rc-text truncate">
                {spot.name}
              </p>
              <p className="font-mono text-[10px] tracking-widest uppercase text-rc-text-muted mt-1">
                {spot.lat.toFixed(3)}°, {spot.lng.toFixed(3)}°
              </p>
            </div>
            <svg
              className="w-4 h-4 text-rc-text-muted shrink-0 ml-3 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
