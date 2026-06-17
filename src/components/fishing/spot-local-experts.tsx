import type { BlueCasterSpotPage } from "@/lib/bluecaster";

function formatRelative(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (diffDays < 1) return "today";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export default function SpotLocalExperts({
  experts,
}: {
  experts: BlueCasterSpotPage["local_experts"];
}) {
  if (!experts || experts.length === 0) return null;

  return (
    <section
      data-testid="section-spot-local-experts"
      className="max-w-6xl mx-auto px-6 py-12"
    >
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text">
          Verified by Local Guides
        </h2>
        <p className="text-sm text-rc-text-muted mt-1 font-mono tracking-wide">
          Spots, species, and access notes reviewed and confirmed by working guides.
        </p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {experts.map((expert) => (
          <li
            key={expert.review_session_id}
            className="border border-rc-bg-light bg-rc-bg-dark p-5 rounded-lg flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rc-bg-light flex items-center justify-center text-rc-text font-black text-lg uppercase">
                {expert.guide_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-rc-text font-semibold truncate">
                  {expert.guide_name}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-rc-text-muted">
                  Reviewed {formatRelative(expert.submitted_at)}
                </div>
              </div>
            </div>
            <div className="text-sm text-rc-text-light border-t border-rc-bg-light pt-3">
              Verified{" "}
              <span className="font-semibold text-rc-text">
                {expert.verified_spot_count}
              </span>{" "}
              {expert.verified_spot_count === 1 ? "spot" : "spots"} in this area.
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
