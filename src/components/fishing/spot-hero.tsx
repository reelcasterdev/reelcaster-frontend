import Image from "next/image";
import Link from "next/link";
import type { BlueCasterSpotPage } from "@/lib/bluecaster";

export default function SpotHero({ data }: { data: BlueCasterSpotPage }) {
  const { hero } = data.page;
  const { spot } = data;
  const { hierarchy } = data;
  const hasImage = Boolean(hero.image_url);

  return (
    <section
      data-testid="section-spot-hero"
      className="relative w-full h-[400px] md:h-[500px] overflow-hidden"
    >
      {hero.image_url ? (
        <Image
          src={hero.image_url}
          alt={hero.image_alt ?? `Fishing at ${spot.name}`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-rc-bg-light" />
      )}

      {hasImage && (
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      )}

      <div className="relative z-10 flex flex-col justify-end h-full max-w-6xl mx-auto px-6 pb-10 md:pb-14">
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex items-center gap-0 text-rc-text-light text-xs tracking-[0.25em] uppercase font-medium">
            {hero.breadcrumb.map((crumb, i) => {
              const isLast = i === hero.breadcrumb.length - 1;
              return (
                <li
                  key={crumb.href}
                  className={i > 0 ? "before:content-['/'] before:mx-1.5" : ""}
                >
                  {isLast ? (
                    <span>{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-white transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase text-white leading-none tracking-tight">
          {hero.h1}
        </h1>

        <ul className="flex flex-wrap gap-3 mt-5 text-rc-text-light text-xs tracking-widest uppercase font-medium">
          {hierarchy?.city.name && (
            <li>
              <span className="text-rc-text-muted">in</span>{" "}
              <Link
                href={`/fishing/${hierarchy.province.code}/${hierarchy.city.slug}`}
                className="border-b border-rc-text-muted hover:text-white"
              >
                {hierarchy.city.name}
              </Link>
            </li>
          )}
          {spot.depth_avg_m != null && (
            <li>
              <span className="text-rc-text-muted">depth</span>{" "}
              <span>{spot.depth_avg_m.toFixed(0)}m avg</span>
            </li>
          )}
          {spot.dfo_area_label && (
            <li>
              <span className="text-rc-text-muted">{spot.dfo_area_label}</span>
            </li>
          )}
          {spot.tidal_station_name && (
            <li>
              <span className="text-rc-text-muted">tides</span>{" "}
              <span>{spot.tidal_station_name}</span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
