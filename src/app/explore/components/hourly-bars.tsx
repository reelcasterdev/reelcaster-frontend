"use client";

import { useMemo } from "react";
import { currentLocalHour } from "../lib/explore-data";

/**
 * Drawer 24h mini chart per the Figma: tier-tinted bars, the best
 * contiguous window highlighted in solid green, a "now" marker line,
 * and an hour axis (06 · 12 · 18 · 24). Plain divs — no chart lib.
 */
export default function HourlyBars({
  hours,
  tz,
}: {
  /** Hourly scores 0–100, null = unavailable. */
  hours: (number | null)[];
  tz: string;
}) {
  const nowHour = currentLocalHour(tz);

  const { window, label } = useMemo(() => bestWindow(hours), [hours]);

  return (
    <div>
      <div className="rc-label text-[9px] mb-2">
        24H{label ? ` · BEST WINDOW ${label}` : ""}
      </div>
      <div className="relative flex items-end gap-[3px] h-16">
        {hours.map((score, i) => {
          const inWindow = window !== null && i >= window[0] && i <= window[1];
          const h = score === null ? 6 : Math.max(6, (score / 100) * 64);
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm ${
                score === null
                  ? "bg-rc-rule-soft"
                  : inWindow
                    ? "bg-rc-good"
                    : "bg-rc-good/30"
              }`}
              style={{ height: `${h}px` }}
            />
          );
        })}
        {/* now marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-rc-poor"
          style={{ left: `${((nowHour + 0.5) / 24) * 100}%` }}
        />
      </div>
      <div className="flex justify-between font-rc-mono text-[9px] text-rc-ink-mute mt-1.5">
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}

/** Longest contiguous run of hours ≥75 (fallback: ≥ max−10). */
function bestWindow(hours: (number | null)[]): {
  window: [number, number] | null;
  label: string | null;
} {
  const max = Math.max(...hours.map((h) => h ?? 0));
  if (max <= 0) return { window: null, label: null };
  const threshold = max >= 75 ? 75 : max - 10;

  let best: [number, number] | null = null;
  let start: number | null = null;
  for (let i = 0; i <= hours.length; i++) {
    const qualifies = i < hours.length && (hours[i] ?? 0) >= threshold;
    if (qualifies && start === null) start = i;
    if (!qualifies && start !== null) {
      const run: [number, number] = [start, i - 1];
      if (!best || run[1] - run[0] > best[1] - best[0]) best = run;
      start = null;
    }
  }
  if (!best) return { window: null, label: null };
  const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return { window: best, label: `${fmt(best[0])}–${fmt(best[1] + 1)}` };
}
