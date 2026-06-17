"use client";

import {
  TIER_PILL,
  fmtPeak,
  tierFor,
  type RailSpot,
} from "../lib/explore-data";

/**
 * Rail spot card per the Figma spec: name + tier pill, driver line,
 * WIND/SEA/TIDE condition row. Hover: brand border + soft tint +
 * "View more" pill.
 */
export default function SpotCard({
  spot,
  onSelect,
}: {
  spot: RailSpot;
  onSelect: () => void;
}) {
  const tier = tierFor(spot.score);
  const peak = fmtPeak(spot.peakHour);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative w-full text-left bg-rc-panel border border-rc-rule rounded-[10px] overflow-hidden transition-colors hover:border-rc-brand hover:bg-rc-brand-soft/40"
    >
      <div className="flex items-start justify-between px-3 pt-3 pb-2.5">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-rc-ink truncate">
            {spot.name}
          </div>
          <div className="font-rc-mono text-xs text-rc-ink-soft mt-0.5 truncate">
            {spot.driverSpecies
              ? `${spot.driverSpecies} driving${peak ? ` · peak ${peak}` : ""}`
              : "No live score yet"}
          </div>
        </div>
        <span
          className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${TIER_PILL[tier]}`}
        >
          {spot.score !== null
            ? `${spot.score} ${tier.toUpperCase()}`
            : "NO SCORE"}
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-rc-rule-soft border-t border-rc-rule-soft">
        {(
          [
            ["WIND", spot.conditions.wind],
            ["SEA", spot.conditions.sea],
            ["TIDE", spot.conditions.tide],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="px-3 py-2">
            <div className="rc-label text-[9px]">{label}</div>
            <div className="font-rc-mono text-xs font-medium text-rc-ink mt-0.5 truncate">
              {value ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Hover affordance */}
      <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-rc-panel border border-rc-rule shadow-rc-panel text-xs font-semibold text-rc-brand opacity-0 group-hover:opacity-100 transition-opacity">
        View more
      </span>
    </button>
  );
}
