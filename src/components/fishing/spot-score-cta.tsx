import type { BlueCasterSpotPage } from "@/lib/bluecaster";
import SpotScoreCtaButton from "@/app/components/marketing/spot-score-cta-button";

const STATE_LABEL: Record<string, string> = {
  peak: "Peak",
  mid: "In season",
  off: "Off season",
  closed: "Closed",
};

const STATE_TONE: Record<string, string> = {
  peak: "text-blue-300",
  mid: "text-emerald-300",
  off: "text-rc-text-muted",
  closed: "text-rc-text-muted",
};

export default function SpotScoreCta({
  score,
  spotSlug,
}: {
  score: BlueCasterSpotPage["rc_score_now"];
  spotSlug: string;
}) {
  // Convert 0..1 score to 0..100 display.
  const displayScore =
    score && Number.isFinite(score.score)
      ? Math.round(score.score * 100)
      : null;

  return (
    <section
      data-testid="section-spot-score-cta"
      className="max-w-6xl mx-auto px-6 py-8"
    >
      <div className="border-y border-rc-bg-light py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-rc-text-muted mb-2">
              RC Score Now
            </p>
            {score ? (
              <div className="flex flex-col gap-1">
                <div className="text-sm text-rc-text-light font-semibold">
                  {score.species_name}
                </div>
                <div
                  className={`text-xs font-mono tracking-widest uppercase ${
                    STATE_TONE[score.state] ?? "text-rc-text-muted"
                  }`}
                >
                  {STATE_LABEL[score.state] ?? score.state}
                </div>
              </div>
            ) : (
              <div className="text-xs text-rc-text-muted">No live score</div>
            )}
          </div>
          <div
            className={`text-6xl md:text-7xl font-black tracking-tight font-mono ${
              displayScore == null ? "text-rc-text-muted" : "text-rc-text"
            }`}
          >
            {displayScore != null ? displayScore : "--"}
          </div>
        </div>

        <SpotScoreCtaButton spotSlug={spotSlug} />
      </div>
    </section>
  );
}
