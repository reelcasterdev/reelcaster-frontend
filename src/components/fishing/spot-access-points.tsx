import type { BlueCasterSpotPage } from "@/lib/bluecaster";

const TYPE_LABELS: Record<string, string> = {
  ramp: "Boat Ramp",
  marina_fuel: "Marina · Fuel",
  marina: "Marina",
  public_dock: "Public Dock",
};

export default function SpotAccessPoints({
  points,
}: {
  points: BlueCasterSpotPage["access_points"];
}) {
  if (!points || points.length === 0) return null;

  return (
    <section
      data-testid="section-spot-access-points"
      className="max-w-6xl mx-auto px-6 py-12"
    >
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text">
          Nearby Marinas &amp; Launches
        </h2>
        <p className="text-sm text-rc-text-muted mt-1 font-mono tracking-wide">
          Within 25 km of the spot, sorted by distance.
        </p>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {points.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-4 border border-rc-bg-light bg-rc-bg-dark px-4 py-3 rounded font-mono text-sm"
          >
            <div className="min-w-0">
              <div className="text-rc-text truncate">{p.name}</div>
              {p.notes && (
                <div className="text-xs text-rc-text-muted mt-1 truncate normal-case font-sans">
                  {p.notes}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end shrink-0 gap-1">
              <span className="text-xs text-rc-text-muted uppercase tracking-widest">
                {TYPE_LABELS[p.type] ?? p.type}
              </span>
              <span className="text-xs text-rc-text-muted">
                {p.distance_km.toFixed(1)} km
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
