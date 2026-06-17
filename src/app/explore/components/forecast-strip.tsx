"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import type { ForecastStripModel, ForecastDay } from "../lib/forecast-strip";
import DayCell from "./day-cell";
import UpgradeDialog from "./upgrade-dialog";

const CONFIDENCE_NOTE = "confidence fades past day 7 · ECMWF + GFS";

function bestWindowLabel(model: ForecastStripModel): string | null {
  const d = model.bestDay;
  if (!d) return null;
  return `${d.dow} ${d.date}${d.peakLabel ? ` · ${d.peakLabel}` : ""}`;
}

/**
 * Floating 14-day forecast strip (desktop) — spans from just right of the
 * rail to the right edge, per the Figma. Always top-right in both list and
 * drawer modes. Tapping a day drives the map; the "Hide" button collapses
 * it to a reopen chip.
 */
export default function ForecastStrip({
  model,
  speciesName,
  selectedIso,
  loading,
  onSelectDay,
}: {
  model: ForecastStripModel | null;
  speciesName: string | null;
  selectedIso: string;
  loading: boolean;
  onSelectDay: (day: ForecastDay) => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleDay = (day: ForecastDay) => {
    if (day.locked) {
      setUpgradeOpen(true);
      return;
    }
    onSelectDay(day);
  };

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="hidden lg:flex fixed top-20 right-6 z-30 items-center gap-2 px-3 py-2 rounded-lg bg-rc-panel border border-rc-rule shadow-rc-panel text-sm font-semibold text-rc-ink-soft hover:text-rc-ink transition-colors"
      >
        <ChevronUp className="w-4 h-4" />
        14-day forecast
      </button>
    );
  }

  return (
    <>
      <div className="hidden lg:block fixed top-20 left-[420px] right-6 z-30 bg-rc-panel border border-rc-rule rounded-xl shadow-rc-panel px-4 py-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="rc-label text-[9px]">
              14-Day Forecast{speciesName ? ` · ${speciesName}` : ""}
            </div>
            <div className="font-rc-mono text-[10px] text-rc-ink-mute italic mt-0.5">
              {CONFIDENCE_NOTE}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {model?.bestDay && (
              <span className="flex items-center gap-1.5 font-rc-mono text-[11px] text-rc-ink-soft">
                <span className="w-1.5 h-1.5 rounded-full bg-rc-good" />
                Best window {bestWindowLabel(model)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setHidden(true)}
              className="px-2.5 py-1 rounded-md bg-rc-brand text-white text-xs font-semibold hover:bg-rc-brand-hover transition-colors"
            >
              Hide
            </button>
          </div>
        </div>

        {/* Cells */}
        {loading || !model ? (
          <div className="flex gap-1.5">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[88px] rounded-lg bg-rc-surface animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex gap-1.5">
            {model.days.map((day) => (
              <DayCell
                key={day.index}
                day={day}
                selected={day.iso === selectedIso}
                onSelect={() => handleDay(day)}
              />
            ))}
          </div>
        )}

        <div className="font-rc-mono text-[10px] text-rc-ink-mute italic mt-2 text-right">
          tap a day · selected day drives the map
        </div>
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}

/**
 * Compact mobile variant — a horizontal day scroller docked under the top
 * bar. Same selection + lock semantics.
 */
export function MobileForecastStrip({
  model,
  selectedIso,
  onSelectDay,
}: {
  model: ForecastStripModel | null;
  selectedIso: string;
  onSelectDay: (day: ForecastDay) => void;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  if (!model) return null;

  const handleDay = (day: ForecastDay) => {
    if (day.locked) {
      setUpgradeOpen(true);
      return;
    }
    onSelectDay(day);
  };

  return (
    <>
      <div className="lg:hidden fixed top-16 inset-x-2 z-20 flex gap-1.5 overflow-x-auto scrollbar-hide bg-rc-panel/95 backdrop-blur border border-rc-rule rounded-xl shadow-rc-bar p-1.5">
        {model.days.map((day) => (
          <div key={day.index} className="w-14 shrink-0">
            <DayCell
              day={day}
              selected={day.iso === selectedIso}
              onSelect={() => handleDay(day)}
            />
          </div>
        ))}
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
