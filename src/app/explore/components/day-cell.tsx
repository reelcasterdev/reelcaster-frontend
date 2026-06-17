"use client";

import { Lock } from "lucide-react";
import { TIER_TEXT } from "../lib/explore-data";
import type { ForecastDay } from "../lib/forecast-strip";

/**
 * One forecast-strip day cell per the Figma: DOW · date · tier-colored
 * score · peak-time chip. Selected = brand fill; best day gets a "BEST"
 * badge; locked days (11–14, free tier) show a lock + "BOAT PRO".
 */
export default function DayCell({
  day,
  selected,
  onSelect,
}: {
  day: ForecastDay;
  selected: boolean;
  onSelect: () => void;
}) {
  if (day.locked) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 rounded-lg border border-rc-rule bg-rc-surface opacity-60 flex flex-col items-center justify-center gap-1 py-2"
      >
        <div className="rc-label text-[9px] leading-none">{day.dow}</div>
        <div className="font-rc-mono text-[10px] text-rc-ink-soft">
          {day.date}
        </div>
        <Lock className="w-3.5 h-3.5 text-rc-ink-mute mt-1" />
        <div className="rc-label text-[8px] leading-none">BOAT PRO</div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex-1 min-w-0 rounded-lg border flex flex-col items-center gap-1 py-2 transition-colors ${
        selected
          ? "border-rc-brand bg-rc-brand text-white"
          : "border-rc-rule bg-rc-panel hover:border-rc-ink-mute"
      }`}
    >
      {day.isBest && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold font-rc-mono tracking-wide bg-rc-badge text-rc-ink leading-none">
          BEST
        </span>
      )}
      <div
        className={`rc-label text-[9px] leading-none ${selected ? "text-white/70" : ""}`}
      >
        {day.dow}
      </div>
      <div
        className={`font-rc-mono text-[10px] ${selected ? "text-white/85" : "text-rc-ink-soft"}`}
      >
        {day.date}
      </div>
      <div
        className={`text-2xl font-bold leading-none tracking-[-0.04em] ${
          selected ? "text-white" : TIER_TEXT[day.tier]
        }`}
      >
        {day.score ?? "—"}
      </div>
      {day.peakLabel && (
        <div
          className={`font-rc-mono text-[9px] mt-0.5 px-1.5 py-0.5 rounded ${
            selected
              ? "bg-white/18 text-white"
              : "bg-rc-good-soft text-rc-good-ink"
          }`}
        >
          {day.peakLabel}
        </div>
      )}
    </button>
  );
}
