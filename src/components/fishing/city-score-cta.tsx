import Link from "next/link";

export default function CityScoreCta({
  score,
  citySlug,
}: {
  score: number | null;
  citySlug: string;
}) {
  return (
    <section
      data-testid="section-city-score-cta"
      className="max-w-6xl mx-auto px-6 py-8"
    >
      <div className="border-y border-rc-bg-light py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* RC Score teaser */}
        <div className="flex items-center gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-rc-text-muted mb-2">
              RC Score Today
            </p>
            <div className="flex items-end gap-1" aria-hidden="true">
              {[40, 65, 85, 55, 70].map((h, i) => (
                <div
                  key={i}
                  className={`w-3 rounded-sm bg-rc-text-muted${score == null ? " opacity-30" : ""}`}
                  style={{ height: `${h * 0.4}px` }}
                />
              ))}
            </div>
          </div>
          <div className="text-4xl font-black text-rc-text-muted tracking-tight font-mono">
            {score != null ? score : "--"}
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/signup?from=fishing&city=${citySlug}`}
          className="border border-rc-bg-light text-rc-text-light text-sm px-6 py-3 uppercase tracking-widest font-medium hover:border-blue-500/40 hover:bg-rc-bg-dark transition-colors rounded"
        >
          Unlock 14-Day Forecast &rarr;
        </Link>
      </div>
    </section>
  );
}
