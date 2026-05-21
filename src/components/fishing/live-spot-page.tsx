"use client";

// Live spot detail — port of the /test/spot-mockup design wired to real
// data. Same logo treatment, action buttons, framed score chips, tide
// backdrop, sticky 14-day picker, merged chart + conditions card, and
// PoweredBy 〜BlueCaster caption — but every value comes from
// fetchLiveSpotDetail() instead of seed data.

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FactorVerdict,
  GuideNote,
  HourlyConditions,
  LiveRegulation,
  LiveSpotDetail,
  NearbySpotCard,
  RegStatus,
  SeasonState,
  SunHours,
  Forecast14dPayload,
  SpotPageInitial,
} from "@/lib/bluecaster/live-spot-types";
import { fetchForecast14d } from "@/lib/bluecaster-client";

// Tide state at a given hour — used by the inspector strip to show
// "rising/falling/HIGH/LOW" beside the height value. Compares the value to
// its neighbors: a strict local max is HIGH, a strict local min is LOW,
// otherwise the trend toward the next hour drives ↑ / ↓.
type TideState = "high" | "low" | "rising" | "falling" | null;
function tideStateAtHour(hour: number, tide: (number | null)[]): TideState {
  const v = tide[hour];
  if (v == null) return null;
  const prev = hour > 0 ? tide[hour - 1] : null;
  const next = hour < tide.length - 1 ? tide[hour + 1] : null;
  if (prev != null && next != null) {
    if (v > prev && v >= next) return "high";
    if (v < prev && v <= next) return "low";
    return next > v ? "rising" : next < v ? "falling" : null;
  }
  if (next != null) return next > v ? "rising" : "falling";
  if (prev != null) return v > prev ? "rising" : "falling";
  return null;
}

// All tide extrema in a 24-hour series, with fractional-hour interpolation
// for sub-hourly accuracy. Used by the score chart to render labeled HIGH/LOW
// markers right on the tide line.
type TideExtremum = { hour: number; m: number; type: "high" | "low" };
function findTideExtrema(tide: (number | null)[]): TideExtremum[] {
  const out: TideExtremum[] = [];
  for (let i = 1; i < tide.length - 1; i++) {
    const a = tide[i - 1];
    const b = tide[i];
    const c = tide[i + 1];
    if (a == null || b == null || c == null) continue;
    if (b > a && b >= c) {
      // Quadratic-fit refinement to get sub-hour accuracy.
      const denom = a - 2 * b + c;
      const offset = denom !== 0 ? 0.5 * ((a - c) / denom) : 0;
      const refinedHour = i + Math.max(-0.5, Math.min(0.5, offset));
      const refinedM = b - 0.25 * (a - c) * offset;
      out.push({ hour: refinedHour, m: refinedM, type: "high" });
    } else if (b < a && b <= c) {
      const denom = a - 2 * b + c;
      const offset = denom !== 0 ? 0.5 * ((a - c) / denom) : 0;
      const refinedHour = i + Math.max(-0.5, Math.min(0.5, offset));
      const refinedM = b - 0.25 * (a - c) * offset;
      out.push({ hour: refinedHour, m: refinedM, type: "low" });
    }
  }
  return out;
}

// Format a fractional hour (e.g. 7.2) as "7:12 AM".
function fmtFractionalHour(h: number): string {
  const totalMin = Math.round(h * 60);
  const hours = Math.floor(totalMin / 60) % 24;
  const minutes = totalMin % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const display = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${display}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

// Strip the standard suffix words from a full species common name so the
// chip bar reads "Chinook · Coho · Halibut · Lingcod" instead of "Chinook
// Salmon · Coho Salmon · Pacific Halibut · Lingcod". Anglers know what
// "Halibut" means without the geographic qualifier.
function shortSpeciesName(name: string): string {
  return name
    .replace(/^Pacific\s+/i, "")
    .replace(/\s+Salmon$/i, "")
    .replace(/\s+Rockfish$/i, "")
    .trim();
}

// Smooth-curve helper: build a Catmull-Rom path through the given points and
// emit it as a sequence of cubic-bezier C commands. The mockup's tide curve
// has a soft hand-drawn feel that straight L-segments can't match —
// Catmull-Rom passes through every input point with smooth tangents.
function smoothPath(pts: ReadonlyArray<readonly [number, number]>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// ─── Color helpers (mirrors spot-mockup) ──────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-amber-600";
  if (score >= 50) return "text-zinc-500";
  return "text-zinc-400";
}
function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-amber-500";
  if (score >= 50) return "bg-zinc-400";
  return "bg-zinc-300";
}
function scoreFrame(score: number): { bg: string; border: string; text: string } {
  if (score >= 80) return { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700" };
  if (score >= 65) return { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700" };
  if (score >= 50) return { bg: "bg-zinc-100", border: "border-zinc-300", text: "text-zinc-600" };
  return { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-600" };
}

// ─── Unit selector ────────────────────────────────────────────────────

function UnitRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-base text-zinc-700">{label}</span>
      <div className="flex rounded-md border border-zinc-200 overflow-hidden">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`px-2.5 py-1 text-sm font-medium transition ${
                active ? "bg-[#1F40E0] text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Unit conversion ──────────────────────────────────────────────────
//
// The page's raw data uses canonical units (m, kt, °C, mm) — fingerprint
// engine, weather feeds, and tide series all speak metric. The display
// layer converts to whatever the user picked in the units dropdown.
//
// Chart math (bar baselines, max scales) stays in canonical units; only
// the visible numeric labels convert. That way a switch from m → ft
// doesn't reshape the bars, only relabels the peaks.

type DepthUnit = "ft" | "m";
type WindUnit = "kt" | "mph" | "kph";
type TempUnit = "°C" | "°F";
type PrecipUnit = "mm" | "in";

type Units = {
  depth: DepthUnit;
  tide: DepthUnit;
  swell: DepthUnit;
  wind: WindUnit;
  temp: TempUnit;
  precip: PrecipUnit;
};

const DEFAULT_UNITS: Units = {
  depth: "ft",
  tide: "m",
  swell: "m",
  wind: "kt",
  temp: "°C",
  precip: "mm",
};

const UNITS_STORAGE_KEY = "bluecaster.spot.units.v1";

const M_TO_FT = 3.28084;
const KT_TO_MPH = 1.15078;
const KT_TO_KPH = 1.852;
const MM_TO_IN = 1 / 25.4;

function convertM(valM: number, unit: DepthUnit): number {
  return unit === "ft" ? valM * M_TO_FT : valM;
}
function convertKt(valKt: number, unit: WindUnit): number {
  if (unit === "mph") return valKt * KT_TO_MPH;
  if (unit === "kph") return valKt * KT_TO_KPH;
  return valKt;
}
function convertC(valC: number, unit: TempUnit): number {
  return unit === "°F" ? (valC * 9) / 5 + 32 : valC;
}
function convertMm(valMm: number, unit: PrecipUnit): number {
  return unit === "in" ? valMm * MM_TO_IN : valMm;
}

// Display formatters — always take the canonical value and the user's
// preferred unit; return the final display string with unit suffix.
function fmtHeight(valM: number, unit: DepthUnit): string {
  const v = convertM(valM, unit);
  // ft reads naturally as an integer at the heights anglers see (0–10 ft);
  // m keeps the 0.1 resolution that surfers/anglers already use.
  return unit === "ft" ? `${v.toFixed(1)} ft` : `${v.toFixed(1)} m`;
}
function fmtWindSpeed(valKt: number, unit: WindUnit): string {
  return `${Math.round(convertKt(valKt, unit))} ${unit}`;
}
function fmtTemp(valC: number, unit: TempUnit, decimals = 0): string {
  return `${convertC(valC, unit).toFixed(decimals)}${unit}`;
}
function fmtPrecip(valMm: number, unit: PrecipUnit): string {
  const v = convertMm(valMm, unit);
  // mm at 0.1 reads fine; in needs 2 decimals to not collapse 0.1mm → "0.00in".
  return unit === "in" ? `${v.toFixed(2)} in` : `${v.toFixed(1)} mm`;
}

// Aligning Factors valueLines arrive from the server as pre-baked strings
// generated by lib/factor-format.ts ("0.7m chop", "1.2m range today",
// "12.3°C"). The proper fix is to thread `key` + `raw_value` into the
// payload and re-format client-side, but until that refactor lands this
// regex pass converts the three height/temperature patterns the current
// formatters can produce. New factor strings that introduce a different
// unit pattern need a matching line here.
function convertValueLine(line: string | null, units: Units): string | null {
  if (!line) return null;
  let out = line;
  if (units.swell === "ft") {
    out = out.replace(/(-?\d+(?:\.\d+)?)\s*m\b/g, (_, v) =>
      `${convertM(parseFloat(v), "ft").toFixed(1)}ft`,
    );
  }
  if (units.temp === "°F") {
    out = out.replace(/(-?\d+(?:\.\d+)?)°C/g, (_, v) =>
      `${convertC(parseFloat(v), "°F").toFixed(1)}°F`,
    );
  }
  return out;
}

// ─── Brand marks ──────────────────────────────────────────────────────

function ReelCasterLogo({ size = "md", color = "#1F40E0" }: { size?: "sm" | "md" | "lg"; color?: string }) {
  const dims = {
    sm: { reel: "text-base", caster: "text-[4.5px]", framePad: "px-1.5 pt-[1px] pb-[2px]", border: "border", rounded: "rounded-[3px]", casterMt: "-mt-[1px]" },
    md: { reel: "text-3xl", caster: "text-[7px]", framePad: "px-2.5 pt-[2px] pb-[3px]", border: "border-2", rounded: "rounded", casterMt: "-mt-[2px]" },
    lg: { reel: "text-6xl", caster: "text-sm", framePad: "px-5 pt-[4px] pb-2", border: "border-[3px]", rounded: "rounded-md", casterMt: "-mt-[3px]" },
  }[size];
  return (
    <div className="relative inline-block select-none">
      <div
        className={`flex flex-col items-center leading-none ${dims.border} ${dims.rounded} ${dims.framePad}`}
        style={{ fontFamily: "var(--font-montserrat), sans-serif", color, borderColor: color }}
      >
        <div className={`tracking-tight ${dims.reel}`} style={{ fontWeight: 800 }}>REEL</div>
        <div className={`${dims.casterMt} ${dims.caster}`} style={{ fontWeight: 600, letterSpacing: "0.45em", paddingLeft: "0.45em" }}>
          CASTER
        </div>
      </div>
    </div>
  );
}

function TideWaveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 4" width="1.05em" height="0.75em" className={`inline-block shrink-0 ${className ?? ""}`} style={{ verticalAlign: "-0.05em" }} aria-hidden>
      <path
        d="M 0.4 2 C 1.4 0.4, 2.6 0.4, 3.6 2 C 4.6 3.6, 5.8 3.6, 6.8 2"
        fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function PoweredByBluecaster({ className }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-tight ${className ?? ""}`}>
      <span>Powered by</span>
      <span className="inline-flex items-center" style={{ gap: "0.1em" }}>
        <TideWaveMark />
        <span>BlueCaster</span>
      </span>
    </span>
  );
}

// ─── Tide backdrop for the score card ────────────────────────────────
//
// Faint tide curve drawn behind the score number / factors. This is a
// decorative read — a sense of "where we are in the tide cycle" — not a
// data surface. Real tide data with HIGH / LOW snap points + extremum
// times lives in the conditions-table tide row below.

function ScoreCardTideBackdrop({ tide, currentHour }: { tide: (number | null)[]; currentHour: number }) {
  const W = 800;
  const H = 100;
  const padTop = 14;
  const padBot = 10;
  const valid = tide.filter((v): v is number => v != null);
  const max = valid.length ? Math.max(...valid) : 1;
  const min = valid.length ? Math.min(...valid) : 0;
  const range = max - min || 1;
  const xForHour = (h: number) => (h / 23) * W;
  const yForVal = (v: number) => padTop + (H - padTop - padBot) - ((v - min) / range) * (H - padTop - padBot);
  const points = tide.map((v, i) => (v == null ? null : ([xForHour(i), yForVal(v)] as const)));
  const validPts = points.filter((p): p is readonly [number, number] => p !== null);
  const pathLine = smoothPath(validPts);
  const smoothBody = pathLine.replace(/^M\s+[\d.-]+\s+[\d.-]+\s*/, "");
  const pathArea =
    validPts.length === 0
      ? ""
      : `M ${validPts[0][0].toFixed(1)} ${H} L ${validPts[0][0].toFixed(1)} ${validPts[0][1].toFixed(1)} ${smoothBody} L ${validPts[validPts.length - 1][0].toFixed(1)} ${H} Z`;
  const nowX = xForHour(currentHour);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="absolute inset-0 pointer-events-none"
      style={{ height: "100%", width: "100%" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="liveTideBgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1F40E0" stopOpacity="0" />
          <stop offset="100%" stopColor="#1F40E0" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      {pathArea && <path d={pathArea} fill="url(#liveTideBgGrad)" />}
      {pathLine && <path d={pathLine} fill="none" stroke="#1F40E0" strokeOpacity="0.18" strokeWidth="1.1" />}
      <line x1={nowX} y1={padTop} x2={nowX} y2={H - padBot} stroke="#1F40E0" strokeOpacity="0.30" strokeWidth="0.9" strokeDasharray="2 3" />
    </svg>
  );
}

// ─── Action buttons (top right) ──────────────────────────────────────

function ActionBtn({ label, icon, primary, onBlue }: { label: string; icon: React.ReactNode; primary?: boolean; onBlue?: boolean }) {
  // Two-axis styling: `primary` flags the "Log a Catch" CTA; `onBlue`
  // swaps the palette to read against a blue header strip (inverted CTA,
  // semi-transparent ghost for the others) instead of the default light
  // header. Keeps a single component for both variants rather than
  // forking the icon set.
  let cls: string;
  if (onBlue && primary) {
    cls = "bg-white text-[#1F40E0] hover:bg-white/90";
  } else if (onBlue) {
    cls = "text-white hover:bg-white/15";
  } else if (primary) {
    cls = "bg-[#1F40E0] text-white hover:bg-[#1A35BF]";
  } else {
    cls = "text-zinc-700 hover:bg-zinc-100";
  }
  return (
    <button className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition ${cls}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
const HeartI = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
);
const ShareI = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
);
const BellI = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
);
const CamI = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);

// ─── Aligning Factors row ────────────────────────────────────────────
//
// Two-line layout: the structural label on top (Tide / Light / Water temp)
// + a plain-English value-line underneath ("Late ebb · 42 min to slack",
// "Golden hour", "12.4°C"). Verdict word + dot stays on the right.
//
// The wire-level verdict type is "Prime" | "Fair" | "Poor" for API
// stability, but we display "Poor" as "Tough" — softer language that
// reads like "this is one of the things working against you today"
// rather than "this factor failed a test."

function FactorRow({
  label,
  status,
  valueLine,
}: {
  label: string;
  status: FactorVerdict;
  valueLine?: string | null;
}) {
  const cfg: Record<
    FactorVerdict,
    { dot: string; text: string; display: string }
  > = {
    Prime: { dot: "bg-emerald-500", text: "text-emerald-700", display: "Prime" },
    Fair: { dot: "bg-amber-500", text: "text-amber-700", display: "Fair" },
    Poor: { dot: "bg-rose-500", text: "text-rose-700", display: "Tough" },
  };
  const c = cfg[status];
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        {/* Slight top-padding so the dot lines up with the label baseline,
            not the top of the multiline block. */}
        <span className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 shrink-0`} />
        <div className="min-w-0">
          <div className="text-base text-zinc-700 leading-tight">{label}</div>
          {valueLine && (
            <div className="text-[11px] text-zinc-500 leading-tight mt-0.5">
              {valueLine}
            </div>
          )}
        </div>
      </div>
      <span
        className={`text-[10px] uppercase tracking-widest font-bold shrink-0 mt-1 ${c.text}`}
      >
        {c.display}
      </span>
    </div>
  );
}

// ─── Seasonality strip ──────────────────────────────────────────────

function SeasonalityStrip({
  speciesName,
  fullName,
  weeks,
  todayWeek,
}: {
  speciesName: string;
  fullName: string;
  weeks: SeasonState[];
  todayWeek: number;
}) {
  const stateColor: Record<SeasonState, string> = {
    peak: "bg-emerald-500",
    shoulder: "bg-amber-400",
    off: "bg-zinc-300",
    closed: "bg-rose-500",
    // "No data" is a distinct paler shade — anglers reading the strip can
    // tell "we don't have this month curated yet" from "this spot is
    // reliably dead this month."
    nodata: "bg-zinc-100",
  };
  const stateLabel: Record<SeasonState, string> = {
    peak: "Peak season",
    shoulder: "Shoulder season",
    off: "Off season",
    closed: "Closed",
    nodata: "No data yet",
  };
  const stateText: Record<SeasonState, string> = {
    peak: "text-emerald-700",
    shoulder: "text-amber-700",
    off: "text-zinc-600",
    closed: "text-rose-700",
    nodata: "text-zinc-400",
  };
  const todayState = weeks[todayWeek];
  // Run-length count of how many more weeks the current state will hold.
  let weeksAhead = 0;
  for (let i = todayWeek + 1; i < weeks.length && weeks[i] === todayState; i++) weeksAhead++;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-zinc-500">Seasonality</div>
          <div className="text-base text-zinc-700 mt-0.5">When {speciesName} is best at this spot</div>
        </div>
        <div className="text-sm text-zinc-500">52-week view · today highlighted</div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-baseline gap-3">
            <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold uppercase tracking-wide text-white whitespace-nowrap ${stateColor[todayState]}`}>
              {stateLabel[todayState]}
            </span>
            <span className={`text-base ${stateText[todayState]}`}>
              {todayState === "peak" || todayState === "shoulder"
                ? `Currently in ${stateLabel[todayState].toLowerCase()} for ${fullName}`
                : todayState === "closed"
                ? `${fullName} retention is closed this week`
                : todayState === "nodata"
                ? `No seasonal-abundance data on file for ${fullName} this month`
                : `${fullName} is in off-season this week`}
            </span>
          </div>
          {weeksAhead > 0 && (
            <span className="text-sm text-zinc-500">~{weeksAhead + 1} more weeks at {todayState}</span>
          )}
        </div>

        <div className="relative">
          <div className="grid gap-px" style={{ gridTemplateColumns: "repeat(52, minmax(0, 1fr))" }}>
            {weeks.map((s, i) => (
              <div
                key={i}
                className={`h-7 rounded-sm ${stateColor[s]} ${i === todayWeek ? "ring-2 ring-[#1F40E0] ring-offset-1 z-10 relative" : ""}`}
                title={`Week ${i + 1}: ${stateLabel[s]}`}
              />
            ))}
          </div>
          <div className="absolute" style={{ left: `calc(${((todayWeek + 0.5) / 52) * 100}% - 6px)`, top: "calc(100% + 2px)" }}>
            <div className="text-[#1F40E0] text-sm leading-none">▲</div>
          </div>
        </div>

        <div className="grid grid-cols-12 mt-5 text-[10px] text-zinc-500 text-center font-medium">
          {months.map((m) => (
            <div key={m}>{m}</div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-5 text-sm text-zinc-500 flex-wrap">
          {(["peak", "shoulder", "off", "closed", "nodata"] as SeasonState[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${stateColor[s]}`} />
              <span>{stateLabel[s]}</span>
            </div>
          ))}
        </div>

        {/* Source caption — anglers asked "where is this from?" so we say
            it explicitly. The 52-week curve is the wizard's stage-8 ensemble
            (city-level, normalized weights centered around 1.0). DFO regs
            override the curve with a hard "closed" when retention is shut. */}
        <div className="mt-3 text-[11px] text-zinc-400 leading-snug">
          Source: <span className="font-medium text-zinc-500">species_seasonality_weeks</span> (wizard stage-8 ensemble — city × species, 52-week normalized curve)
          {" "}with a closure overlay from <span className="font-medium text-zinc-500">spot_species_regulations</span>.
          Species without a fingerprint curve show as <span className="font-medium text-zinc-500">no data yet</span> (not off-season).
        </div>
      </div>
    </div>
  );
}

// ─── Regulations band ────────────────────────────────────────────────

function regStatusCfg(status: RegStatus): { pill: string; text: string } {
  if (status === "Closed") return { pill: "bg-rose-600 text-white", text: "text-rose-700" };
  if (status === "Release") return { pill: "bg-amber-500 text-white", text: "text-amber-700" };
  return { pill: "bg-emerald-600 text-white", text: "text-emerald-700" };
}

function RegulationsBand({
  regulations,
  areaCode,
  activeSpeciesName,
}: {
  regulations: LiveRegulation[];
  areaCode: string | null;
  activeSpeciesName: string | undefined;
}) {
  // Match the active species against regs by species_common (case-insensitive
  // contains both ways — DB has "Pacific Halibut" while the species master
  // has "Pacific Halibut" too, but Coho can vary).
  const findRegFor = (name: string | undefined): LiveRegulation | undefined => {
    if (!name) return undefined;
    return regulations.find(
      (r) => r.speciesCommon.toLowerCase() === name.toLowerCase() ||
             r.speciesCommon.toLowerCase().includes(name.toLowerCase()),
    );
  };
  const active = findRegFor(activeSpeciesName);
  // The regs band shows ONLY the active species — species switching happens
  // up in the species chip bar at the top. Putting a duplicate switcher down
  // here was redundant and made the band feel like its own UI surface.

  return (
    <section className="border-y-2 border-amber-200 bg-amber-50/60">
      <div className="mx-auto max-w-7xl px-6 py-3.5">
        {/* 3-column grid: label left · chip center · disclaimer right. The
            1fr–auto–1fr template anchors the chip to the page center
            regardless of how wide the label or the link end up — flex +
            ml-auto would only center the chip BETWEEN the two siblings,
            which drifts as the disclaimer gets longer.
            On narrow widths the chip can overflow the middle cell; the
            chip itself uses flex-wrap so it line-breaks instead of
            shoving the disclaimer offscreen. */}
        <div
          className="grid items-center gap-4"
          style={{ gridTemplateColumns: "1fr auto 1fr" }}
        >
          <div className="flex flex-col gap-0.5 justify-self-start">
            <span className="text-sm uppercase tracking-wider font-semibold text-amber-900">Regulations</span>
            {areaCode && <span className="text-[11px] font-semibold text-amber-900">DFO area {areaCode}</span>}
          </div>

          {/* Active species — single card, single line, our voice. The
              wire-level `notes` field (raw DFO copy / admin metadata) is
              deliberately NOT rendered: it tends to either duplicate the
              structured rules already in `detail` or carry verbatim DFO
              language that conflicts with our consumer-facing tone.
              External API consumers can still read `notes` from
              /api/v1/.../spot-page if they want it. */}
          <div className="justify-self-center">
            {active && (() => {
              const cfg = regStatusCfg(active.status);
              return (
                <div className="flex items-center gap-2 rounded-md bg-white border-2 border-[#1F40E0] px-3 py-1.5 shadow-sm flex-wrap">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.pill}`}>
                    {active.status}
                  </span>
                  <span className="font-semibold text-zinc-900 text-base">{active.speciesCommon}</span>
                  {active.detail && (
                    <span className="text-base text-zinc-700">{active.detail}</span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* DFO disclaimer in the right column. */}
          <a
            href="https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/index-eng.html"
            target="_blank"
            rel="noreferrer"
            className="justify-self-end text-[11px] font-medium text-amber-900 hover:text-amber-700 underline"
          >
            Always check with DFO ↗
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Hourly chart ────────────────────────────────────────────────────

const COL_W = 48;
const LABEL_W = 80;

function HourlyChart({
  hourly,
  hoveredHour,
  onHoverHour,
  bestHour,
  sun,
  currentHour,
}: {
  hourly: (number | null)[];
  hoveredHour: number | null;
  onHoverHour: (h: number | null) => void;
  bestHour: number | null;
  sun: SunHours;
  /** Current local hour, 0..23 — only set when viewing "today." Renders a
   *  vertical "now" line over the chart so the eye anchors on the present. */
  currentHour: number | null;
}) {
  const innerW = 24 * COL_W;
  const W = LABEL_W + innerW;
  const H = 232;
  const padTop = 28;
  const padBot = 54;
  const chartH = H - padTop - padBot;
  const xAt = (h: number) => LABEL_W + h * COL_W;

  // Best-hours band: highlight a 3-hour window around the best score hour, like
  // the bite-window highlight on the spot-mockup chart.
  const biteStart = bestHour == null ? null : Math.max(0, bestHour - 1);
  const biteEnd = biteStart == null ? null : Math.min(24, biteStart + 3);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" preserveAspectRatio="xMidYMid meet">
      {/* Two-tier night/twilight shading — outer (nautical) darker, inner
          (civil) lighter. Mirrors the spot-mockup's chart backdrop so the
          eye reads "light-of-day" without needing labels. */}
      <rect x={LABEL_W} y={padTop} width={sun.nauticalRise * COL_W} height={chartH} fill="#0F172A" opacity={0.075} />
      <rect x={LABEL_W + sun.nauticalSet * COL_W} y={padTop} width={(24 - sun.nauticalSet) * COL_W} height={chartH} fill="#0F172A" opacity={0.075} />
      <rect x={LABEL_W + sun.nauticalRise * COL_W} y={padTop} width={(sun.civilRise - sun.nauticalRise) * COL_W} height={chartH} fill="#0F172A" opacity={0.035} />
      <rect x={LABEL_W + sun.civilSet * COL_W} y={padTop} width={(sun.nauticalSet - sun.civilSet) * COL_W} height={chartH} fill="#0F172A" opacity={0.035} />
      {[0, 25, 50, 75, 100].map((g) => {
        const y = padTop + chartH - (g / 100) * chartH;
        return (
          <g key={g}>
            <line x1={LABEL_W} y1={y} x2={LABEL_W + innerW} y2={y} stroke="#F4F4F5" strokeWidth={1} />
            <text x={LABEL_W - 8} y={y + 3} fontSize={10} fill="#A1A1AA" textAnchor="end">{g}</text>
          </g>
        );
      })}
      {biteStart != null && biteEnd != null && (
        <>
          <rect x={LABEL_W + biteStart * COL_W} y={padTop - 10} width={(biteEnd - biteStart) * COL_W} height={chartH + 10} fill="#10B981" opacity={0.18} rx={2} />
          <text x={LABEL_W + ((biteStart + biteEnd) / 2) * COL_W} y={padTop - 14} fontSize={10} fill="#047857" textAnchor="middle" fontWeight={700} letterSpacing="0.04em">
            BEST HOURS
          </text>
        </>
      )}
      {hourly.map((v, h) => {
        if (v == null) return null;
        const barWidth = COL_W * 0.62;
        const bx = xAt(h) + (COL_W - barWidth) / 2;
        const bh = (v / 100) * chartH;
        const by = padTop + chartH - bh;
        return (
          <rect key={h} x={bx} y={by} width={barWidth} height={bh} fill="#1F40E0" opacity={hoveredHour === h ? 1 : 0.78} rx={1.5} />
        );
      })}
      {/* Current-time indicator — light blue dotted line + outlined "NOW"
          pill at the top. Visually distinct from the (solid) hover snap
          line so the two never get confused. Only rendered when viewing
          today. */}
      {currentHour != null && (
        <g>
          <line
            x1={xAt(currentHour) + COL_W / 2}
            y1={padTop - 4}
            x2={xAt(currentHour) + COL_W / 2}
            y2={padTop + chartH + 2}
            stroke="#7090E5"
            strokeWidth={1}
            strokeDasharray="2 3"
            opacity={0.85}
          />
          <rect
            x={xAt(currentHour) + COL_W / 2 - 14}
            y={padTop - 16}
            width={28}
            height={11}
            rx={2}
            fill="#FFFFFF"
            stroke="#7090E5"
            strokeWidth={1}
          />
          <text
            x={xAt(currentHour) + COL_W / 2}
            y={padTop - 8}
            fontSize={8}
            fill="#7090E5"
            textAnchor="middle"
            fontWeight={700}
            letterSpacing="0.1em"
          >
            NOW
          </text>
        </g>
      )}
      {Array.from({ length: 24 }, (_, h) => h).filter((h) => h % 3 === 0).map((h) => {
        const x = xAt(h) + COL_W / 2;
        const lab = h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`;
        return <text key={h} x={x} y={H - 4} fontSize={9} fill="#A1A1AA" textAnchor="middle" fontWeight={500}>{lab}</text>;
      })}
      {Array.from({ length: 24 }, (_, h) => h).map((h) => (
        <rect key={`hz${h}`} x={xAt(h)} y={padTop - 10} width={COL_W} height={chartH + 10} fill="transparent"
              onMouseEnter={() => onHoverHour(h)} onMouseLeave={() => onHoverHour(null)} style={{ cursor: "pointer" }} />
      ))}
    </svg>
  );
}

function fmtHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}
function fmtHourLabel(h: number): string {
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

// ─── Conditions table (8 rows) ──────────────────────────────────────
//
// Layout:
//   ┌──────────┬──────────────────────────────────────┐
//   │ inspector strip (full-width)                    │
//   ├──────────┬──────────────────────────────────────┤
//   │ hour hdr │ 0  3  6  9  12  15  18  21           │
//   ├──────────┼──────────────────────────────────────┤
//   │ Tide     │   smooth blue tide curve + extrema   │
//   ├──────────┼──────────────────────────────────────┤
//   │ Wind     │   bars                               │
//   │ Waves    │   bars                               │
//   │ ...                                             │
//   └──────────┴──────────────────────────────────────┘
//
// A single "hover overlay" sits on top of the entire bar-area with 24
// transparent column zones — that way ANY pixel of the column triggers
// the hour, and moving between adjacent columns doesn't blink the
// inspector strip off because the cursor never leaves the overlay.

type ConditionsTableProps = {
  conditions: HourlyConditions[];
  hourlyScores: (number | null)[];
  hoveredHour: number | null;
  onHoverHour: (h: number | null) => void;
  bestHour: number | null;
  sun: SunHours;
  /** Current local hour, 0..23 — only set when viewing today. Renders a
   *  vertical "now" line through the entire table body. */
  currentHour: number | null;
  units: Units;
};

type CondRow = {
  label: string;
  unit: string;
  val: (h: HourlyConditions) => number | null;
  // Optional gust accessor (only the Wind row uses this).
  val2?: (h: HourlyConditions) => number | null;
  // How a single value formats into the small label above peak bars.
  fmt: (v: number) => string;
  // Bar/area color identity.
  color: string;
  // Optional gust color overlay.
  color2?: string;
  // Fixed y-axis scale [baseline, max]. Using physical defaults instead of
  // auto-tight per-day scaling means a "calm 1kt day" looks SMALL relative
  // to a 30kt blow, the way an angler reads weather. Auto-scaling makes
  // every flat day look dramatic and every windy day look the same.
  baseline: number;
  max: number;
  // Below this, the row collapses to "<label> · calm/dry/clear all day".
  emptyThreshold?: number;
  emptyLabel?: string;
  // Inspector-strip presentation: complete value-with-unit string ("12 kt",
  // "23°C", "0.5 m") and the cell's reserved width in px. The fixed widths
  // mean adjacent cells don't shift left/right as the user scrubs hours and
  // values flip between 1, 2, 3 digit lengths.
  inspector: { fmt: (v: number) => string; width: number };
};

// Palette anchored on the brand blue (#1F40E0). Each row gets a distinct
// variation in the same family — tints, shades, and hue rotations toward
// cyan-blue — so the table reads as one cohesive blue-family chart instead
// of a rainbow of unrelated row colors.
//
//   #1F40E0  ← brand (Tide, anchor)
//   #2A4FBE  ← steel-blue, slightly desaturated (Wind sustained)
//   #7090E5  ← lighter sky-blue (Wind gust overlay)
//   #2A55C8  ← cooler/darker brand variant (Waves)
//   #5680E8  ← mid-tint sky blue (Swell)
//   #4A8AC0  ← cyan-leaning blue (Air temp, slightly cooler than ocean blues)
//   #2050C8  ← cool deep blue (Precip)
//   #94A3C8  ← desaturated slate-blue (Cloud — quiet, recedes)
//   #0E7AB5  ← teal-blue, deepest cyan-shift (Sea temp)
// Build the conditions-table row config from the user's unit prefs.
//
// `baseline` and `max` stay in canonical units (m, kt, °C, mm) so chart math
// — bar heights, normalized positions — doesn't change when the display
// unit flips. Only the `fmt` and `inspector.fmt` strings convert.
//
// Waves rides on the swell unit pref since they're both wave heights;
// surfacing a separate "waves" toggle for a 0.5-m chop didn't seem worth it.
function buildCondRows(units: Units): CondRow[] {
  return [
    { label: "Wind",     unit: units.wind, val: (c) => c.windKt,   val2: (c) => c.windGustKt, fmt: (v) => `${Math.round(convertKt(v, units.wind))}`, color: "#2A4FBE", color2: "#7090E5", baseline: 0, max: 30,
      inspector: { fmt: (v) => fmtWindSpeed(v, units.wind), width: 100 } },
    { label: "Waves",    unit: units.swell, val: (c) => c.waveM,                               fmt: (v) => convertM(v, units.swell).toFixed(1),       color: "#2A55C8", baseline: 0, max: 2,  emptyThreshold: 0.15, emptyLabel: "Flat",
      inspector: { fmt: (v) => fmtHeight(v, units.swell), width: 100 } },
    { label: "Swell",    unit: units.swell, val: (c) => c.swellM,                              fmt: (v) => convertM(v, units.swell).toFixed(1),       color: "#5680E8", baseline: 0, max: 1.5, emptyThreshold: 0.15, emptyLabel: "Flat",
      inspector: { fmt: (v) => fmtHeight(v, units.swell), width: 100 } },
    { label: "Air temp", unit: units.temp, val: (c) => c.airTempC,                            fmt: (v) => `${Math.round(convertC(v, units.temp))}`,  color: "#4A8AC0", baseline: 5, max: 25,
      inspector: { fmt: (v) => fmtTemp(v, units.temp, 0), width: 110 } },
    { label: "Precip",   unit: units.precip, val: (c) => c.precipMm,                            fmt: (v) => (units.precip === "in" ? convertMm(v, units.precip).toFixed(2) : v.toFixed(1)), color: "#2050C8", baseline: 0, max: 3,  emptyThreshold: 0.1, emptyLabel: "Dry all day",
      inspector: { fmt: (v) => fmtPrecip(v, units.precip), width: 116 } },
    { label: "Cloud",    unit: "%",       val: (c) => c.cloudPct,                            fmt: (v) => `${Math.round(v)}`,                        color: "#94A3C8", baseline: 0, max: 100,
      inspector: { fmt: (v) => `${Math.round(v)}%`, width: 96 } },
    { label: "Sea temp", unit: units.temp, val: (c) => c.seaTempC,                            fmt: (v) => convertC(v, units.temp).toFixed(1),        color: "#0E7AB5", baseline: 6, max: 16,
      inspector: { fmt: (v) => fmtTemp(v, units.temp, 1), width: 116 } },
  ];
}

// Pick up to 3 local peak indices in a series, each at least 3 hours apart.
// Drives the "peak value label" decoration on each row so anglers see "wind
// hits 18 at 3pm" without reading every column.
function pickPeakIndices(values: (number | null)[], emptyThreshold = 0): number[] {
  const valid = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => typeof x.v === "number" && x.v > emptyThreshold);
  if (valid.length === 0) return [];
  // Find local maxima: points where the value is greater than both neighbors.
  const localMax: Array<{ v: number; i: number }> = [];
  for (let k = 1; k < valid.length - 1; k++) {
    if (valid[k].v >= valid[k - 1].v && valid[k].v >= valid[k + 1].v) localMax.push(valid[k]);
  }
  if (localMax.length === 0) localMax.push(...valid);
  // Sort by value descending and take top 3, ensuring 3-hour spacing.
  localMax.sort((a, b) => b.v - a.v);
  const picked: number[] = [];
  for (const p of localMax) {
    if (picked.every((q) => Math.abs(q - p.i) >= 3)) picked.push(p.i);
    if (picked.length >= 3) break;
  }
  return picked.sort((a, b) => a - b);
}

function ConditionsTable({ conditions, hourlyScores, hoveredHour, onHoverHour, bestHour, sun, currentHour, units }: ConditionsTableProps) {
  const innerW = 24 * COL_W;
  const condRows = buildCondRows(units);
  // Surfline-scale row heights — taller bars, more vertical drama, peak
  // labels and gridline ticks have real breathing room. Tide row is taller
  // still to keep HIGH / LOW labels (HIGH/LOW + time + height = 3 lines
  // each side) well-separated from the curve and from each other.
  const ROW_H = 76;
  const TIDE_ROW_H = 130;
  // Inspector header includes Tide (always first) — but the rendered Tide row
  // is a curve, not bars.
  // Tide row in the inspector strip — the value comes with a direction
  // indicator (↑ rising, ↓ falling, HIGH at extremum, LOW at extremum)
  // so anglers see the trend without looking at a separate chart.
  const tideSeries = conditions.map((c) => c.tideM);
  const tideStateForCell = (h: number): TideState => tideStateAtHour(h, tideSeries);
  const inspectorRows: Array<CondRow & { renderInspector?: (h: number) => string }> = [
    {
      label: "Tide",
      unit: units.tide,
      val: (c) => c.tideM,
      fmt: (v) => convertM(v, units.tide).toFixed(1),
      color: "#1F40E0",
      baseline: 0,
      max: 4,
      inspector: { fmt: (v) => fmtHeight(v, units.tide), width: 120 },
      renderInspector: (h) => {
        const v = tideSeries[h];
        if (v == null) return "—";
        const state = tideStateForCell(h);
        const base = fmtHeight(v, units.tide);
        if (state === "high") return `${base} HIGH`;
        if (state === "low") return `${base} LOW`;
        if (state === "rising") return `${base} ↑`;
        if (state === "falling") return `${base} ↓`;
        return base;
      },
    },
    ...condRows,
  ];
  // Wind row is +14px taller (room for direction arrow strip). Tide row is
  // its own dedicated row at the top of the body (+TIDE_ROW_H px).
  const totalBarsHeight = condRows.reduce((sum, r) => sum + (r.label === "Wind" ? ROW_H + 14 : ROW_H), 0);
  const totalBodyHeight = TIDE_ROW_H + totalBarsHeight;

  return (
    <div className="bg-white">
      {/* Inspector strip — always rendered, never blinks. Hour cell width
          is fixed so the row never reflows as the cursor scrubs columns. */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 bg-zinc-50/60 px-4 h-12">
        <div className="flex items-center gap-3 min-w-0">
          {hoveredHour !== null && conditions[hoveredHour] && (
            <>
              <span className="text-base font-bold text-zinc-900 tabular-nums shrink-0 inline-block whitespace-nowrap" style={{ width: 80 }}>
                {fmtHourLabel(hoveredHour)}
              </span>
              <span className="text-zinc-300 shrink-0">·</span>
              <div className="flex items-baseline flex-wrap">
                {inspectorRows.map((r) => {
                  const v = r.val(conditions[hoveredHour]);
                  // Tide cell uses a custom renderer so it can append HIGH /
                  // LOW / ↑ / ↓ alongside the height value.
                  const display =
                    r.renderInspector != null
                      ? r.renderInspector(hoveredHour)
                      : v == null
                      ? "—"
                      : r.inspector.fmt(v);
                  return (
                    <div
                      key={r.label}
                      className="flex items-baseline gap-1.5 shrink-0"
                      style={{ minWidth: r.inspector.width }}
                    >
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">{r.label}</span>
                      <span className="text-sm font-semibold text-zinc-900 tabular-nums">{display}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        {hoveredHour !== null ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Score</span>
            <span className={`text-lg font-bold tabular-nums leading-none ${scoreColor(hourlyScores[hoveredHour] ?? 0)}`}>
              {hourlyScores[hoveredHour] ?? "—"}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-zinc-400 italic shrink-0">Hover any column to inspect</span>
        )}
      </div>

      {/* Hour header row */}
      <div className="flex border-b border-zinc-100 bg-zinc-50/40">
        <div className="shrink-0" style={{ width: LABEL_W }} />
        <svg viewBox={`0 0 ${innerW} 18`} className="block flex-1" style={{ height: 18 }} preserveAspectRatio="none">
          {Array.from({ length: 24 }, (_, h) => h).filter((h) => h % 3 === 0).map((h) => {
            const x = h * COL_W + COL_W / 2;
            // AM/PM suffix on every label (matches the score chart's hour
            // ticks so the two surfaces speak the same time language).
            const lab = h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`;
            return <text key={h} x={x} y={12} fontSize={9} fill="#A1A1AA" textAnchor="middle">{lab}</text>;
          })}
        </svg>
      </div>

      {/* Body — left label gutter + right svg-area, with a single absolute
          hover overlay covering ALL column hover zones spanning the full
          height of the body. That way moving between columns never leaves
          the overlay (no blink), and white space inside any cell still
          triggers the column hover (no need to land on a 1px-tall bar). */}
      <div className="flex relative">
        <div className="shrink-0" style={{ width: LABEL_W }}>
          {/* Tide row label — first because tide is the lead concern for
              anglers; the actual curve + HIGH/LOW markers render to the
              right. */}
          <div
            className="flex flex-col justify-center px-3 border-b border-zinc-100"
            style={{ height: TIDE_ROW_H }}
          >
            <div className="text-[10px] uppercase tracking-wide font-semibold text-zinc-700 leading-tight">Tide</div>
            <div className="text-[10px] text-zinc-500 leading-tight">{units.tide}</div>
          </div>
          {/* Bar-row labels — wind row is taller because it has a direction
              arrow strip beneath the bars. */}
          {condRows.map((r, i) => (
            <div
              key={r.label}
              className={`flex flex-col justify-center px-3 ${i === condRows.length - 1 ? "" : "border-b border-zinc-100"}`}
              style={{ height: r.label === "Wind" ? ROW_H + 14 : ROW_H }}
            >
              <div className="text-[10px] uppercase tracking-wide font-semibold text-zinc-700 leading-tight">{r.label}</div>
              <div className="text-[10px] text-zinc-500 leading-tight">{r.unit}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 relative">
          {/* Two-tier twilight overlay — same nautical/civil shading as the
              score chart so the eye reads day vs night vs twilight without
              additional labels. Spans the full height of the body. */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 bottom-0 bg-slate-900" style={{ left: "0%", width: `${(sun.nauticalRise / 24) * 100}%`, opacity: 0.075 }} />
            <div className="absolute top-0 bottom-0 bg-slate-900" style={{ left: `${(sun.nauticalSet / 24) * 100}%`, width: `${((24 - sun.nauticalSet) / 24) * 100}%`, opacity: 0.075 }} />
            <div className="absolute top-0 bottom-0 bg-slate-900" style={{ left: `${(sun.nauticalRise / 24) * 100}%`, width: `${((sun.civilRise - sun.nauticalRise) / 24) * 100}%`, opacity: 0.035 }} />
            <div className="absolute top-0 bottom-0 bg-slate-900" style={{ left: `${(sun.civilSet / 24) * 100}%`, width: `${((sun.nauticalSet - sun.civilSet) / 24) * 100}%`, opacity: 0.035 }} />
          </div>

          {/* Best-hours band — extends from the score chart down through ALL
              rows of the conditions table, like the spot-mockup. */}
          {bestHour != null && (
            <div
              className="absolute pointer-events-none bg-emerald-500/10"
              style={{
                left: `${(Math.max(0, bestHour - 1) / 24) * 100}%`,
                width: `${(3 / 24) * 100}%`,
                top: 0,
                bottom: 0,
              }}
            />
          )}

          {/* Current-time vertical line — light blue, DOTTED. Visually
              distinct from the (solid) hover snap line. Only rendered when
              viewing today. */}
          {currentHour != null && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `calc(${((currentHour + 0.5) / 24) * 100}% - 0.5px)`,
                top: 0,
                bottom: 0,
                width: 1,
                // Vertical dotted line via tiled gradient — 2px line, 3px gap.
                backgroundImage: "linear-gradient(to bottom, #7090E5 50%, transparent 50%)",
                backgroundSize: "100% 5px",
                backgroundRepeat: "repeat-y",
                opacity: 0.85,
                zIndex: 1,
              }}
            />
          )}

          {/* Tide row — smooth curve with sub-hour-accurate HIGH / LOW
              markers labeled with the actual extremum time (e.g. "12:42
              AM"). Lives at the top of the data rows because tide drives
              the bite window for most anglers. */}
          <TideDataRow tide={tideSeries} h={TIDE_ROW_H} isLast={false} tideUnit={units.tide} />

          {/* Data rows — visual encoding picked per-kind so e.g. precip
              doesn't render as a wall of stubby invisible bars when the
              forecast is dry. */}
          {condRows.map((r, idx) => (
            <CondDataRow
              key={r.label}
              row={r}
              conditions={conditions}
              hoveredHour={hoveredHour}
              isLast={idx === condRows.length - 1}
              h={r.label === "Wind" ? ROW_H + 14 : ROW_H}
            />
          ))}

          {/* Single hover overlay — 24 transparent column zones spanning
              the full body height. ANY hover within a column lights up
              that hour for every row + the inspector strip. */}
          <div className="absolute inset-0 flex" style={{ height: totalBodyHeight }} onMouseLeave={() => onHoverHour(null)}>
            {Array.from({ length: 24 }, (_, h) => h).map((h) => (
              <div
                key={h}
                className="flex-1 cursor-pointer"
                onMouseEnter={() => onHoverHour(h)}
              />
            ))}
          </div>

          {/* Snap line — drawn on top of everything via absolute positioning
              when a column is hovered. */}
          {hoveredHour != null && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `calc(${((hoveredHour + 0.5) / 24) * 100}% - 0.5px)`,
                top: 0,
                bottom: 0,
                width: 1,
                background: "rgba(31, 64, 224, 0.55)",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Tide row — smooth blue curve + sub-hour-accurate HIGH / LOW markers with
// real extremum times (e.g. "12:42 AM"). Lives in the conditions table now,
// not the score chart, because tide is its own concern and the combined chart
// was getting too busy.
//
// The HIGH / LOW labels use `findTideExtrema` which does a quadratic-fit
// refinement on the three samples around each peak — that snaps the marker
// to the actual extremum (e.g. 7:42) instead of the nearest hourly sample
// (8:00). For tide, where 18 minutes can mean an hour of slack water vs.
// rip, that precision matters.
function TideDataRow({ tide, h, isLast, tideUnit }: { tide: (number | null)[]; h: number; isLast: boolean; tideUnit: DepthUnit }) {
  const innerW = 24 * COL_W;
  // Generous top/bottom padding so HIGH labels above and LOW labels below
  // never collide with the curve or the row borders. Three label lines
  // (HIGH, time, height) need ~30px of headroom each.
  const padTop = 30;
  const padBot = 34;
  const chartH = h - padTop - padBot;
  const valid = tide.filter((v): v is number => v != null);
  if (valid.length === 0) {
    return (
      <div className={`relative ${isLast ? "" : "border-b border-zinc-100"}`} style={{ height: h }}>
        <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
          <span className="text-[11px] uppercase tracking-widest font-semibold text-zinc-400">No tide data</span>
        </div>
      </div>
    );
  }
  const max = Math.max(...valid);
  const min = Math.min(...valid);
  const range = max - min || 1;
  const xForHour = (hr: number) => hr * COL_W + COL_W / 2;
  const yForVal = (v: number) => padTop + chartH - ((v - min) / range) * chartH;
  const pts = tide.map((v, i) => (v == null ? null : ([xForHour(i), yForVal(v)] as const))).filter((p): p is readonly [number, number] => p !== null);
  if (pts.length === 0) {
    return <div className={`relative ${isLast ? "" : "border-b border-zinc-100"}`} style={{ height: h }} />;
  }
  const line = smoothPath(pts);
  const areaBody = line.replace(/^M\s+[\d.-]+\s+[\d.-]+\s*/, "");
  const area = `M ${pts[0][0]} ${h} L ${pts[0][0]} ${pts[0][1]} ${areaBody} L ${pts[pts.length - 1][0]} ${h} Z`;
  // Quadratic-fit refined extrema — sub-hour accuracy for the marker
  // position AND the time label.
  const extrema = findTideExtrema(tide);
  return (
    <div className={`relative ${isLast ? "" : "border-b border-zinc-100"}`} style={{ height: h }}>
      <svg viewBox={`0 0 ${innerW} ${h}`} className="block w-full" style={{ height: h }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="condTideArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F40E0" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#1F40E0" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* 6-hour gridlines for vertical rhythm — same cadence as the bar
            rows below, so the eye reads morning / midday / afternoon /
            evening at a glance. */}
        {[6, 12, 18].map((g) => (
          <line key={g} x1={g * COL_W} y1={padTop} x2={g * COL_W} y2={h - padBot} stroke="#F4F4F5" strokeWidth={1} />
        ))}
        <path d={area} fill="url(#condTideArea)" />
        <path d={line} fill="none" stroke="#1F40E0" strokeWidth={1.6} />
        {extrema.map((ex, i) => {
          const x = xForHour(ex.hour);
          const y = yForVal(ex.m);
          const isHigh = ex.type === "high";
          // Stack labels: HIGH/LOW closest to the dot, then time, then height
          // furthest away. Using fmtFractionalHour gives "12:42 AM" — that's
          // the actual extremum time, snapped via quadratic-fit refinement.
          return (
            <g key={i}>
              {isHigh ? (
                <circle cx={x} cy={y} r={3.5} fill="#1F40E0" />
              ) : (
                <circle cx={x} cy={y} r={3.5} fill="#FFFFFF" stroke="#1F40E0" strokeWidth={1.6} />
              )}
              <text
                x={x}
                y={isHigh ? y - 8 : y + 14}
                fontSize={9}
                fill="#1E40AF"
                textAnchor="middle"
                fontWeight={700}
                letterSpacing="0.06em"
              >
                {isHigh ? "HIGH" : "LOW"}
              </text>
              <text
                x={x}
                y={isHigh ? y - 19 : y + 25}
                fontSize={9}
                fill="#0F172A"
                textAnchor="middle"
                fontWeight={600}
              >
                {fmtFractionalHour(ex.hour)}
              </text>
              <text
                x={x}
                y={isHigh ? y - 30 : y + 36}
                fontSize={8}
                fill="#64748B"
                textAnchor="middle"
              >
                {fmtHeight(ex.m, tideUnit)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Unified per-row renderer — bars with peak value labels, fixed y-axis
// scales, and an empty-state callout when the day's data sits below a
// meaningful threshold. Mirrors the spot-mockup BarStrip so every row reads
// in the same visual language and no row collapses to a "row of zeros."
function CondDataRow({
  row, conditions, hoveredHour, isLast, h,
}: {
  row: CondRow;
  conditions: HourlyConditions[];
  hoveredHour: number | null;
  isLast: boolean;
  h: number;
}) {
  const innerW = 24 * COL_W;
  const isWindRow = row.label === "Wind";
  // Wind reserves padBot for direction arrows; other rows don't need it.
  const padTop = 14; // room for peak value labels above the tallest bar
  const padBot = isWindRow ? 14 : 4;
  const chartH = h - padTop - padBot;
  const values = conditions.map((c) => row.val(c));
  const valid = values.filter((v): v is number => v != null);

  // Empty-state collapse — when the day is calm/dry/etc, replace the bars
  // with an inline summary so the row doesn't read as broken.
  if (
    valid.length === 0 ||
    (row.emptyThreshold != null && valid.every((v) => v < row.emptyThreshold!))
  ) {
    return (
      <div className={`relative ${isLast ? "" : "border-b border-zinc-100"}`} style={{ height: h }}>
        <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
          <span className="text-[11px] uppercase tracking-widest font-semibold text-zinc-400">
            {row.emptyLabel ?? "No data"}
          </span>
        </div>
      </div>
    );
  }

  const yFor = (v: number) => {
    const norm = Math.max(0, Math.min(1, (v - row.baseline) / (row.max - row.baseline)));
    return padTop + chartH - norm * chartH;
  };
  const peakIndices = pickPeakIndices(values, row.emptyThreshold ?? 0);
  const isWind = row.label === "Wind";
  const gusts = isWind && row.val2 ? conditions.map((c) => row.val2!(c)) : null;

  return (
    <div className={`relative ${isLast ? "" : "border-b border-zinc-100"}`} style={{ height: h }}>
      <svg viewBox={`0 0 ${innerW} ${h}`} className="block w-full" style={{ height: h }} preserveAspectRatio="none">
        {/* 6-hour gridlines for vertical rhythm — subtle, just enough to
            divide morning / midday / afternoon / evening at a glance. */}
        {[6, 12, 18].map((g) => (
          <line key={g} x1={g * COL_W} y1={padTop} x2={g * COL_W} y2={h - padBot} stroke="#F4F4F5" strokeWidth={1} />
        ))}
        {/* Gust extensions — drawn first so they sit behind the sustained bars. */}
        {gusts &&
          gusts.map((g, hr) => {
            const v = values[hr];
            if (g == null || v == null || g <= v) return null;
            const barW = COL_W * 0.62;
            const bx = hr * COL_W + (COL_W - barW) / 2;
            const sy = yFor(v);
            const gy = yFor(g);
            return (
              <rect
                key={`g${hr}`}
                x={bx + barW * 0.15}
                y={gy}
                width={barW * 0.7}
                height={sy - gy}
                fill={row.color2 ?? row.color}
                opacity={hoveredHour === hr ? 0.95 : 0.65}
                rx={1}
              />
            );
          })}
        {/* Sustained bars — same colored fill across the row. Min height of 2
            so even calm hours read as bars (anchors the eye), not nothing. */}
        {values.map((v, hr) => {
          if (v == null) return null;
          const barW = COL_W * 0.62;
          const bx = hr * COL_W + (COL_W - barW) / 2;
          const sy = yFor(v);
          const bh = Math.max(2, h - padBot - sy);
          const by = h - padBot - bh;
          const isH = hoveredHour === hr;
          return (
            <rect
              key={hr}
              x={bx}
              y={by}
              width={barW}
              height={bh}
              fill={row.color}
              opacity={isH ? 1 : 0.7}
              rx={1}
            />
          );
        })}
        {/* Peak value labels — concrete numbers above each local peak so the
            row reads as data even if the bars are short. */}
        {peakIndices.map((hr) => {
          const v = values[hr];
          if (v == null) return null;
          const x = hr * COL_W + COL_W / 2;
          const sy = yFor(v);
          // For wind, prefer the gust label since that's the headline value.
          const label = gusts && gusts[hr] != null && gusts[hr]! > v ? row.fmt(gusts[hr]!) : row.fmt(v);
          return (
            <text key={`p${hr}`} x={x} y={Math.max(10, sy - 4)} fontSize={10} fill="#0F172A" textAnchor="middle" fontWeight={600}>
              {label}
            </text>
          );
        })}
        {/* Wind direction arrows — small triangular markers at EVERY hour
            beneath the bars. Arrow ROTATES to match the wind's bearing
            (meteorological "from" convention). The arrow's tail points where
            the wind is coming from, head points where it's going. */}
        {isWindRow &&
          Array.from({ length: 24 }, (_, i) => i).map((hr) => {
              const deg = conditions[hr]?.windDirDeg;
              if (deg == null) return null;
              const x = hr * COL_W + COL_W / 2;
              const y = h - 7;
              const isH = hoveredHour === hr;
              return (
                <g key={`d${hr}`} transform={`translate(${x} ${y}) rotate(${deg})`}>
                  {/* Tiny chevron pointing in the direction the wind blows TOWARD
                      (deg + 180° relative to the meteorological "from"). We
                      draw the chevron pointing up at neutral and rotate by deg+180
                      via a +180° rotate inside the path's local space below. */}
                  <path
                    d="M 0 -4 L 3 4 L 0 2 L -3 4 Z"
                    fill="#3B6FB6"
                    opacity={isH ? 1 : 0.7}
                    transform="rotate(180)"
                  />
                </g>
              );
            })}
      </svg>
    </div>
  );
}

// ─── Section header (mockup parity) ───────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-lg font-semibold text-zinc-900">{title}</div>
      {subtitle && <div className="text-base text-zinc-500">{subtitle}</div>}
    </div>
  );
}

// ─── Guide Notes section ──────────────────────────────────────────────
//
// Renders the most recent guide-tier reviewer quotes for this spot. Two-
// up grid on md+; the "Tight lines!" decoration only shows when the
// second column would otherwise be empty (single-note common case) so
// the section never feels half-finished.

function GuideNotesSection({ notes, spotId }: { notes: GuideNote[]; spotId: string }) {
  if (notes.length === 0) return null;
  return (
    <section className="border-b border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <SectionHeader title="Guide Notes" subtitle="Local knowledge from reviewers who've fished here" />
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {notes.map((n, i) => (
            <div key={`${spotId}-note-${i}`} className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="text-base leading-relaxed text-zinc-800">&ldquo;{n.text}&rdquo;</div>
              <div className="mt-3 text-sm text-zinc-500">{n.author}{n.date ? ` · ${n.date}` : ""}</div>
            </div>
          ))}
          {notes.length === 1 && (
            <div className="hidden md:flex items-center justify-center select-none">
              <div className="text-7xl font-black tracking-tight text-[#061333]/30 uppercase">Tight lines!</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Nearby Spots section ─────────────────────────────────────────────
//
// 4-card rail using a simplified SpotCard ported from the spot-mockup.
// Cards with `href` are clickable links to a real live spot page; the
// rest are visual stand-ins until we wire a haversine-by-lat/lng query
// against fishing_spots.

// 24-hour score chart for the nearby-card footer. One thin bar per local
// hour of today, height scaled 0–100 (fixed scale — the score axis is
// already absolute, so auto-scaling would lie about how good a "good"
// day is at this spot). null entries (out-of-season / no data) render
// as gaps. Uses brand blue under low opacity so the wind + tide text
// reads cleanly on top.
function NearbyScoreChart({ scores, cardId }: { scores: (number | null)[]; cardId: string }) {
  if (scores.length === 0) return null;
  const W = 200;
  const H = 50;
  const padTop = 6;
  const padBot = 4;
  const chartH = H - padTop - padBot;
  const barW = W / 24;
  const gap = barW * 0.18;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      <defs>
        <linearGradient id={`nearby-score-${cardId}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1F40E0" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#1F40E0" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      {scores.slice(0, 24).map((v, i) => {
        if (typeof v !== "number") return null;
        const h = (v / 100) * chartH;
        const x = i * barW + gap / 2;
        const y = padTop + chartH - h;
        return <rect key={i} x={x} y={y} width={barW - gap} height={h} fill={`url(#nearby-score-${cardId})`} rx={0.6} />;
      })}
    </svg>
  );
}

function nearbySeasonPillCfg(state: NearbySpotCard["seasonState"]) {
  switch (state) {
    case "peak":
      return { bg: "bg-emerald-100", text: "text-emerald-800", label: "Peak season" };
    case "shoulder":
      return { bg: "bg-amber-100", text: "text-amber-800", label: "Shoulder season" };
    case "off":
      return { bg: "bg-zinc-100", text: "text-zinc-700", label: "Off season" };
    case "closed":
      return { bg: "bg-rose-100", text: "text-rose-800", label: "Closed" };
  }
}

function NearbySpotCardEl({ card, units }: { card: NearbySpotCard; units: Units }) {
  const top = card.species[0];
  const intelCfg = card.intel
    ? card.intel.verdict === "strong"
      ? { wrap: "bg-emerald-600/95", label: "Strong bite" }
      : card.intel.verdict === "mixed"
      ? { wrap: "bg-amber-600/95", label: "Mixed" }
      : { wrap: "bg-zinc-600/95", label: "Slow" }
    : null;
  const seasonCfg = nearbySeasonPillCfg(card.seasonState);
  // Format wind + tide through the user's unit prefs so this card stays
  // in sync with the rest of the page when prefs flip.
  const windDisplay = `${fmtWindSpeed(card.windKt, units.wind)}${card.windDir ? ` ${card.windDir}` : ""}`;
  const highHeight = fmtHeight(card.tide.nextHigh.heightM, units.tide);
  const lowHeight = fmtHeight(card.tide.nextLow.heightM, units.tide);
  const inner = (
    <>
      <div className="aspect-[2/1] relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bathy-preview.png" alt="" aria-hidden="true" className="block w-full h-full" />
        {intelCfg && card.intel && (
          <div className={`absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-md backdrop-blur-sm px-2 py-1 shadow-sm ${intelCfg.wrap}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse shrink-0" />
            <span className="text-[10px] font-semibold text-white tabular-nums">
              <span className="uppercase tracking-widest font-bold mr-1">{intelCfg.label}</span>
              · {card.intel.count} fresh
            </span>
          </div>
        )}
      </div>
      <div className="px-3 pt-3 pb-2 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight text-zinc-900 truncate group-hover:text-[#1F40E0]">{card.name}</h3>
          <span className={`text-xl font-bold tabular-nums leading-none shrink-0 ${scoreColor(top.score)}`}>{top.score}</span>
        </div>
        <div className="text-[10px] text-zinc-500">DFO area {card.dfoArea}</div>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="text-sm truncate">
            <span className="text-zinc-500">Top: </span>
            <span className="font-semibold text-zinc-900">{top.name}</span>
          </div>
          <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap ${seasonCfg.bg} ${seasonCfg.text}`}>
            {seasonCfg.label}
          </span>
        </div>
        <div className="text-[11px] min-h-[16px]">
          {card.biteWindow && (
            <span>
              <span className="text-zinc-500">Bite: </span>
              <span className="font-semibold text-emerald-700 tabular-nums">{card.biteWindow}</span>
            </span>
          )}
        </div>
        <div className="text-[11px] tabular-nums">
          {card.species.map((s, i) => (
            <span key={s.name}>
              <span className="text-zinc-600">{s.name}</span>{" "}
              <span className={`font-bold ${scoreColor(s.score)}`}>{s.score}</span>
              {i < card.species.length - 1 && <span className="text-zinc-300 mx-1">·</span>}
            </span>
          ))}
        </div>
        {/* Wind + next H/L tide — sits in the card body (white) above
            the score-chart band. Keeps the score chart strip below as a
            single-purpose data viz instead of a mixed text + chart
            backdrop. */}
        <div className="pt-1 flex items-center justify-between gap-2 tabular-nums">
          <div className="text-[11px] text-zinc-700 shrink-0">
            <span className="font-medium">{windDisplay}</span>
          </div>
          <div className="text-[10px] text-zinc-700 leading-snug text-right">
            <div>
              <span className="font-bold text-zinc-500 mr-1">H</span>
              <span className="font-medium">{card.tide.nextHigh.time}</span>
              <span className="text-zinc-400"> · {highHeight}</span>
            </div>
            <div>
              <span className="font-bold text-zinc-500 mr-1">L</span>
              <span className="font-medium">{card.tide.nextLow.time}</span>
              <span className="text-zinc-400"> · {lowHeight}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden border-t border-zinc-100 bg-blue-50/40 h-12">
        {/* 24-hour score chart for the card's top-scoring species today.
            Owns the gray strip entirely now — wind + tide moved up into
            the body so the chart has clean visual real-estate. Fixed
            row height so cards stay uniform regardless of curve shape. */}
        <NearbyScoreChart scores={card.scoreNext24h} cardId={card.id} />
      </div>
    </>
  );
  const className = "group rounded-xl border border-zinc-200 bg-white text-left transition hover:border-[#1F40E0] hover:shadow-md overflow-hidden flex flex-col";
  // The BC API ships `/test/*` hrefs for cards that have a dedicated BC mockup
  // page. Those routes don't exist on reelcaster — strip them so the card
  // renders as non-clickable rather than 404'ing on click. Hrefs that point
  // at real consumer routes (or are external) pass through unchanged.
  const safeHref = card.href && !card.href.startsWith("/test/") ? card.href : null;
  if (safeHref) {
    return (
      <a href={safeHref} className={className}>
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
}

function NearbySpotsSection({ cards, units }: { cards: NearbySpotCard[]; units: Units }) {
  if (cards.length === 0) return null;
  return (
    <section className="border-b border-zinc-200">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <SectionHeader title="Nearby Spots" subtitle="Other productive spots within easy run" />
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((c) => (
            <NearbySpotCardEl key={c.id} card={c} units={units} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer actions CTA ───────────────────────────────────────────────

function FooterActionsSection({ spotName }: { spotName: string }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div
          className="rounded-xl border border-zinc-200 p-6 flex flex-wrap items-center justify-between gap-4"
          style={{
            backgroundColor: "#FFFFFF",
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.75), rgba(255,255,255,0.75)), url("/topo-bg.png")',
            backgroundSize: "auto, 1500px 838px",
            backgroundRepeat: "no-repeat, repeat",
          }}
        >
          <div>
            <div className="text-lg font-semibold">Stay on top of {spotName}</div>
            <div className="text-base text-zinc-600">Get notified when conditions line up for your target species.</div>
          </div>
          <div className="flex items-center gap-2">
            <ActionBtn label="Favorite" icon={HeartI} />
            <ActionBtn label="Share" icon={ShareI} />
            <ActionBtn label="Set Alert" icon={BellI} />
            <ActionBtn label="Log a Catch" icon={CamI} primary />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────

export default function LiveSpotPage({
  data: initialData,
  headerTheme = "light",
}: {
  data: SpotPageInitial;
  /** Top-nav strip palette. "blue" paints the strip in brand blue with a
   *  white ReelCaster logo + white ghost action buttons; the inverted
   *  "Log a Catch" CTA becomes white-on-blue. Everything below the top
   *  nav (species chip bar, score card, etc.) stays the same regardless. */
  headerTheme?: "light" | "blue";
}) {
  const [activeId, setActiveId] = useState(initialData.species[0]?.id ?? "");
  const [selectedDay, setSelectedDay] = useState(0);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  // Lazy 14-day extended grid. Initially null; populated by the predictive
  // prefetch effect below on first user activity (or after idle). When set,
  // it overrides the today-only `daily14`/grids in the merged `data` we
  // pass downstream.
  const [forecast14d, setForecast14d] = useState<Forecast14dPayload | null>(null);
  // Predictive prefetch: kick off /forecast-14d on the FIRST signal that
  // the user is interacting with the page (scroll / pointer / key / touch),
  // or after the browser is idle (max ~800ms). Whichever fires first; the
  // others detach. By the time the user actually clicks a future-day tile
  // in the picker, the data is already in memory.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let triggered = false;
    let cancelled = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      detach();
      fetchForecast14d(initialData.spot.slug)
        .then((payload) => {
          if (!cancelled) setForecast14d(payload);
        })
        .catch((err) => console.warn("forecast-14d fetch failed", err));
    };
    const eventNames = ["scroll", "pointermove", "pointerdown", "keydown", "touchstart"] as const;
    const detach = () => {
      eventNames.forEach((e) => window.removeEventListener(e, trigger));
    };
    eventNames.forEach((e) =>
      window.addEventListener(e, trigger, { once: true, passive: true }),
    );
    // Idle fallback so a passive viewer still gets the data within ~800ms.
    // Safari lacks requestIdleCallback; fall back to setTimeout there.
    const ric = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
    }).requestIdleCallback;
    const cic = (window as Window & {
      cancelIdleCallback?: (h: number) => void;
    }).cancelIdleCallback;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    if (ric) {
      idleHandle = ric(() => trigger(), { timeout: 800 });
    } else {
      timeoutHandle = setTimeout(trigger, 800);
    }
    return () => {
      cancelled = true;
      detach();
      if (idleHandle != null && cic) cic(idleHandle);
      if (timeoutHandle != null) clearTimeout(timeoutHandle);
    };
  }, [initialData.spot.slug]);
  // The component below was written against the full `LiveSpotDetail` shape
  // — it reads `data.daily14`, `data.hourlyScoreGrid`, etc. We merge the
  // lazy payload over the initial trimmed payload here so the rest of the
  // component code doesn't need to know whether the 14-day data has loaded
  // yet — picks 0–13 just work once the merge happens.
  const data: LiveSpotDetail = useMemo(() => {
    if (!forecast14d) return initialData as unknown as LiveSpotDetail;
    return {
      ...(initialData as unknown as LiveSpotDetail),
      daily14: forecast14d.daily14,
      hourlyScoreGrid: forecast14d.hourlyScoreGrid,
      hourlyConditionsGrid: forecast14d.hourlyConditionsGrid,
      tide14d: forecast14d.tide14d,
    };
  }, [initialData, forecast14d]);
  // Sticky-bar context: the spot name slides into the top bar (where it
  // says "BlueCaster" / center) once the user has scrolled past the
  // ScoreCard, so they always have a sense of "where am I."
  const scoreCardRef = useRef<HTMLDivElement | null>(null);
  const [scoreCardScrolledPast, setScoreCardScrolledPast] = useState(false);
  useEffect(() => {
    if (!scoreCardRef.current || typeof IntersectionObserver === "undefined") return;
    const node = scoreCardRef.current;
    // rootMargin shifts the observer's hit window so we trip the boolean
    // when the BOTTOM of the card crosses the bottom of the sticky top
    // bar (~64px tall). Without this offset, the name would only appear
    // once the card was fully off-screen, which is too late.
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        // isIntersecting=false + boundingClientRect.top < 0 ⇒ scrolled past.
        setScoreCardScrolledPast(!e.isIntersecting && e.boundingClientRect.top < 0);
      },
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  // Unit-selector state — preferences for how values render across the page.
  // Values flow downstream through buildCondRows() + the formatter helpers
  // near the top of this file, so a flip in any pref re-renders every
  // numeric value (chart inspector, Right Now panel, 14-day temps, etc.)
  // in the new unit. Persisted to localStorage so the user's choice sticks
  // across page loads. Defaults are SSR-safe; the localStorage rehydrate
  // happens in a useEffect after mount.
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [units, setUnits] = useState<Units>(DEFAULT_UNITS);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(UNITS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") setUnits({ ...DEFAULT_UNITS, ...parsed });
    } catch {
      // Corrupt / unavailable storage — fall back to defaults silently.
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
    } catch {
      // Quota or private-mode — preferences are session-only in that case.
    }
  }, [units]);

  const activeSpecies = useMemo(
    () => data.species.find((s) => s.id === activeId) ?? data.species[0],
    [activeId, data.species],
  );
  const hourlyScoresForActive: (number | null)[] = useMemo(() => {
    if (!activeSpecies) return Array(24).fill(null);
    return data.hourlyScoreGrid[activeSpecies.id]?.[selectedDay] ?? Array(24).fill(null);
  }, [data.hourlyScoreGrid, activeSpecies, selectedDay]);
  const conditions = data.hourlyConditionsGrid[selectedDay] ?? [];
  const dayInfo = data.daily14[selectedDay];

  // Today (day 0) tide for the score-card backdrop. Faint decorative
  // wash — the real H/L snap points live in the conditions-table tide row.
  const day0Tide = (data.hourlyConditionsGrid[0] ?? []).map((c) => c.tideM ?? null) as (number | null)[];
  const day0HasTide = day0Tide.some((v) => v != null);

  const todayTopScore = activeSpecies ? data.topScoreTodayBySpecies[activeSpecies.id] : 0;
  const todayPeakHour = activeSpecies ? data.topScoreHourBySpecies[activeSpecies.id] : 0;
  const todayFactors = activeSpecies ? data.todayFactorsBySpecies[activeSpecies.id] ?? [] : [];

  // Peak hour for the SELECTED day (not just today) — drives the BEST HOURS
  // band on the chart and the highlighted column in the conditions table.
  const selectedDayPeakHour = useMemo(() => {
    const day = hourlyScoresForActive;
    let peak = -1;
    let peakHour = -1;
    for (let h = 0; h < day.length; h++) {
      const v = day[h];
      if (typeof v === "number" && v > peak) {
        peak = v;
        peakHour = h;
      }
    }
    return peakHour >= 0 ? peakHour : null;
  }, [hourlyScoresForActive]);

  const nowLocal = new Date();
  const nowLocalHour = nowLocal.getUTCHours() + (-7); // PDT offset
  const nowHour = ((nowLocalHour % 24) + 24) % 24;

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Floating Log a Catch — same as mockup */}
      <button className="fixed bottom-6 right-6 z-30 rounded-full bg-[#1F40E0] text-white px-5 py-3 shadow-xl shadow-blue-900/25 hover:bg-[#1A35BF] transition-all text-sm font-semibold">
        Log a Catch
      </button>

      {/* Sticky stack: top nav + species chip bar */}
      <div className="sticky top-0 z-20">
        {/* Top nav strip — theme-aware. `headerTheme="blue"` paints the
            strip in brand blue with a white ReelCaster logo + white
            ghost action buttons; the inverted Log-a-Catch CTA becomes
            white-on-blue. Default "light" keeps the original white
            strip + brand-blue logo. */}
        <div className={
          headerTheme === "blue"
            ? "border-b border-[#1A35BF] bg-[#1F40E0]"
            : "border-b border-zinc-200 bg-white/95 backdrop-blur"
        }>
          <div className="mx-auto max-w-7xl px-6 py-3 grid items-center" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
            <button className={`justify-self-start flex items-center gap-1.5 text-sm font-medium transition ${
              headerTheme === "blue"
                ? "text-white/90 hover:text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M 10 4 L 6 8 L 10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to map
            </button>
            <div className="justify-self-center">
              <ReelCasterLogo size="md" color={headerTheme === "blue" ? "#FFFFFF" : "#1F40E0"} />
            </div>
            <div className="justify-self-end flex items-center gap-2">
              <ActionBtn label="Favorite" icon={HeartI} onBlue={headerTheme === "blue"} />
              <ActionBtn label="Share" icon={ShareI} onBlue={headerTheme === "blue"} />
              <ActionBtn label="Set Alert" icon={BellI} onBlue={headerTheme === "blue"} />
              <ActionBtn label="Log a Catch" icon={CamI} primary onBlue={headerTheme === "blue"} />
            </div>
          </div>
        </div>
        <div className="border-b border-zinc-200 bg-white/95 backdrop-blur">
          {/* Sticky-bar second row: spot-name reveal on the left (only shown
              once the user has scrolled past the score card, so they always
              know which spot they're reading), species chips + units anchored
              to the right edge. Layout uses [1fr auto] so the chips and units
              cluster together at the right and the spot-name fills the left
              when present. */}
          <div className="mx-auto max-w-7xl px-6 py-2.5 grid items-center gap-4" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="justify-self-start min-w-0">
              {scoreCardScrolledPast ? (
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-base font-bold text-zinc-900 truncate">{data.spot.name}</span>
                  {data.spot.dfoSubarea && (
                    <span className="text-[11px] text-zinc-500 whitespace-nowrap">DFO area {data.spot.dfoSubarea}</span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Species &amp; units</span>
              )}
            </div>
            <div className="justify-self-end flex items-center gap-2 flex-wrap">
              {data.species.map((s) => {
                const active = s.id === activeId;
                // Chip score reflects the SELECTED day's peak (not today's),
                // so jumping forward in the 14-day picker updates every
                // chip's number to that day's outlook.
                const dayGrid = data.hourlyScoreGrid[s.id]?.[selectedDay] ?? [];
                const dayValid = dayGrid.filter((v): v is number => typeof v === "number");
                const ts = dayValid.length ? Math.max(...dayValid) : 0;
                // A species without ANY scored hours on the selected day
                // shows "—" instead of "0" — those are functionally different
                // (no signal vs. genuinely poor day) and conflating them
                // misrepresents reality.
                const hasScores = dayValid.length > 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={`shrink-0 flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
                      active ? "border-[#1F40E0] bg-[#1F40E0] text-white shadow-sm" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    <span className="text-sm font-medium whitespace-nowrap">{shortSpeciesName(s.name)}</span>
                    <span className={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${hasScores ? scoreBg(ts) : "bg-zinc-300"}`}>
                      {hasScores ? ts : "—"}
                    </span>
                  </button>
                );
              })}
              {/* Unit selector pinned right after the chips — same row, no
                  gap. State is wired but downstream formatters still render
                  canonical units; that's a separate pass. */}
              <div className="relative shrink-0">
              <button
                onClick={() => setUnitsOpen(!unitsOpen)}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                  unitsOpen
                    ? "border-[#1F40E0] bg-blue-50 text-[#1F40E0]"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                }`}
              >
                Units
                <svg width="9" height="9" viewBox="0 0 9 9" className={`transition-transform ${unitsOpen ? "rotate-180" : ""}`}>
                  <path d="M 1.5 3 L 4.5 6 L 7.5 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {unitsOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-zinc-200 bg-white shadow-lg p-4 z-30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Display units</div>
                    <button
                      onClick={() => setUnitsOpen(false)}
                      className="text-zinc-400 hover:text-zinc-700 text-base leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    <UnitRow label="Depth" value={units.depth} options={["ft", "m"]} onChange={(v) => setUnits({ ...units, depth: v as "ft" | "m" })} />
                    <UnitRow label="Tide" value={units.tide} options={["ft", "m"]} onChange={(v) => setUnits({ ...units, tide: v as "ft" | "m" })} />
                    <UnitRow label="Swell" value={units.swell} options={["ft", "m"]} onChange={(v) => setUnits({ ...units, swell: v as "ft" | "m" })} />
                    <UnitRow label="Wind speed" value={units.wind} options={["kt", "mph", "kph"]} onChange={(v) => setUnits({ ...units, wind: v as "kt" | "mph" | "kph" })} />
                    <UnitRow label="Temperature" value={units.temp} options={["°C", "°F"]} onChange={(v) => setUnits({ ...units, temp: v as "°C" | "°F" })} />
                    <UnitRow label="Precipitation" value={units.precip} options={["mm", "in"]} onChange={(v) => setUnits({ ...units, precip: v as "mm" | "in" })} />
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 italic">
                    Saved to your preferences
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero — score card + bathymetry with Right Now strip on top */}
      <section className="bg-gradient-to-b from-zinc-50 to-white">
        <div className="mx-auto max-w-7xl px-6 pt-8 pb-2">
          {/* items-start so the score card doesn't stretch to match the
              taller bathymetry panel. Default grid behaviour stretches
              both items to the row's tallest content, which leaves the
              short card with dead white space at the bottom. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
            {/* LEFT: ScoreCard. Sizes to content — we used to stretch with
                `min-h-full` + `mt-auto` on the intel strip so it'd match the
                bathymetry panel's height, but that left a dead white band
                between the factors and fresh-reports. Mismatched heights
                are fine on this 2-column grid; visual junk is not. */}
            <div ref={scoreCardRef} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
              {/* Spot header — name + city + DFO area. PEAK SEASON badge is
                  NOT here anymore; it belongs with the species, not the
                  spot, so it lives next to the "Today · <species>" line
                  below. */}
              <div className="px-5 pt-5 pb-4">
                <h1 className="text-2xl font-bold text-zinc-900 leading-tight tracking-tight">{data.spot.name}</h1>
                <div className="text-base text-zinc-500 mt-0.5">
                  {[data.spot.city, data.spot.region].filter(Boolean).join(", ") || "—"}
                </div>
                {data.spot.dfoSubarea && (
                  <div className="text-sm text-zinc-500 mt-1">DFO area {data.spot.dfoSubarea}</div>
                )}
              </div>

              {/* Score + Today's Factors. Faint tide curve sits in the
                  background as a decorative read of "where we are in the
                  cycle" — the actionable HIGH / LOW snap points live in the
                  conditions-table tide row below. */}
              <div className="px-5 py-4 border-t border-zinc-100 flex items-start gap-6 relative overflow-hidden min-h-[200px]">
                {day0HasTide && <ScoreCardTideBackdrop tide={day0Tide} currentHour={nowHour} />}
                <div className="flex-1 min-w-0 relative">
                  {/* TODAY · <species> + season pill on the same line. The
                      pill is a property of the species, not the spot, so it
                      moves with the species selection. */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">
                      Today · {activeSpecies?.name ?? "—"}
                    </span>
                    {activeSpecies && (() => {
                      const state: SeasonState = data.seasonStateBySpecies[activeSpecies.id] ?? "nodata";
                      const cfg: Record<SeasonState, { bg: string; text: string; label: string }> = {
                        peak: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Peak season" },
                        shoulder: { bg: "bg-amber-100", text: "text-amber-800", label: "Shoulder season" },
                        off: { bg: "bg-zinc-100", text: "text-zinc-700", label: "Off season" },
                        closed: { bg: "bg-rose-100", text: "text-rose-800", label: "Closed" },
                        nodata: { bg: "bg-zinc-50", text: "text-zinc-400", label: "Season N/A" },
                      };
                      const c = cfg[state];
                      return (
                        <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap ${c.bg} ${c.text}`}>
                          {c.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className={`text-6xl font-bold tracking-tight tabular-nums ${scoreColor(todayTopScore)}`}>{todayTopScore}</div>
                    <div className="text-xl text-zinc-400 font-light">/ 100</div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-base">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-700">Best hour</span>
                    <span className="text-zinc-300">·</span>
                    <span className="font-semibold text-zinc-900">{fmtHour(todayPeakHour)}</span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-block rounded bg-white/70 px-1.5 py-0.5 -ml-1.5 text-[10px] text-zinc-400 italic backdrop-blur-[1px]">
                      <PoweredByBluecaster />
                    </span>
                  </div>
                </div>
                <div className="shrink-0 min-w-[200px] relative">
                  {/* "Aligning factors" reads as "what's coming together to
                      produce this score" — works whether the score is high
                      (everything aligning) or low (factors aligning against
                      you). "Today's factors" was abstract; this is purposeful. */}
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-2">Aligning factors</div>
                  <div className="space-y-2">
                    {todayFactors.length > 0 ? (
                      todayFactors.map((f) => (
                        <FactorRow
                          key={f.label}
                          label={f.label}
                          status={f.status}
                          valueLine={convertValueLine(f.valueLine, units)}
                        />
                      ))
                    ) : (
                      <div className="text-sm text-zinc-400 italic">Pending engine output</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent intel — sits flush below the score/factors. Verdict-
                  tinted background, pulsing dot, "Fresh reports of bites in
                  the area · last 7 days," View → link on the right. */}
              {(() => {
                const last7 = data.catchSignals.filter((s) => s.daysAgo != null && s.daysAgo <= 7);
                if (last7.length === 0) return null;
                const positive = last7.filter((s) => s.sentiment === "positive" || s.wasSuccessful === true).length;
                const negative = last7.filter((s) => s.sentiment === "negative" || s.wasSuccessful === false).length;
                const intelCfg =
                  positive > negative * 2
                    ? { border: "border-emerald-200", bg: "bg-emerald-50/70", dot: "bg-emerald-500", body: "text-emerald-900", text: "text-emerald-700" }
                    : positive > 0 && negative > 0
                    ? { border: "border-amber-200", bg: "bg-amber-50/70", dot: "bg-amber-500", body: "text-amber-900", text: "text-amber-700" }
                    : { border: "border-zinc-200", bg: "bg-zinc-50/70", dot: "bg-zinc-500", body: "text-zinc-700", text: "text-zinc-700" };
                return (
                  <div className={`px-5 py-2.5 border-t ${intelCfg.border} ${intelCfg.bg} flex items-center gap-2 flex-wrap`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${intelCfg.dot} animate-pulse shrink-0`} />
                    <span className={`text-base ${intelCfg.body}`}>
                      Fresh reports of bites in the area · last 7 days
                    </span>
                    <button className={`ml-auto text-[11px] font-medium ${intelCfg.text} underline hover:opacity-80`}>
                      View →
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* RIGHT: bathymetry + Right Now chips */}
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white flex flex-col">
              {data.rightNow && (
                <div className="px-4 pt-2.5 pb-2 border-b border-zinc-200 bg-zinc-50/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-700">Right Now</span>
                    <span className="text-[10px] text-zinc-400 ml-auto whitespace-nowrap">{data.rightNow.hourLocal}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-x-3">
                    {[
                      {
                        label: "Wind",
                        // Sustained + direction only. Gusts are noise in the
                        // Right Now strip — the full gust profile lives in
                        // the conditions table below.
                        value:
                          data.rightNow.windKt == null
                            ? "—"
                            : `${fmtWindSpeed(data.rightNow.windKt, units.wind)}${data.rightNow.windDir ? " " + data.rightNow.windDir : ""}`,
                      },
                      { label: "Swell", value: data.rightNow.swellM == null ? "—" : fmtHeight(data.rightNow.swellM, units.swell) },
                      { label: "Sea temp", value: data.rightNow.seaTempC == null ? "—" : fmtTemp(data.rightNow.seaTempC, units.temp, 1) },
                      { label: "Air temp", value: data.rightNow.airTempC == null ? "—" : fmtTemp(data.rightNow.airTempC, units.temp, 1) },
                      { label: "Cloud", value: data.rightNow.cloudPct == null ? "—" : `${Math.round(data.rightNow.cloudPct)}%` },
                      { label: "Precip", value: data.rightNow.precipMm == null ? "—" : fmtPrecip(data.rightNow.precipMm, units.precip) },
                    ].map((c) => (
                      <div key={c.label} className="flex flex-col leading-tight min-w-0">
                        <span className="text-[9px] uppercase tracking-wide font-semibold text-zinc-500">{c.label}</span>
                        <span className="text-sm font-semibold text-zinc-900 tabular-nums truncate">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 text-sm">
                <div className="flex gap-1">
                  <button className="rounded px-2.5 py-1 bg-zinc-900 text-white">Bathymetry</button>
                  <button className="rounded px-2.5 py-1 text-zinc-600 hover:bg-zinc-100">Satellite</button>
                  <button className="rounded px-2.5 py-1 text-zinc-600 hover:bg-zinc-100">Chart</button>
                </div>
                <div className="text-zinc-500">{units.depth} · Regs overlay</div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bathy-preview.png" alt="Bathymetry" className="block w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* About this spot — 4-5 sentences of prose authored by the City
          Wizard's Stage ⑫ ("Write SEO Intros") and stored on
          fishing_spots.seo_intro. Layout: label stacked above the prose,
          both left-aligned with the score card's left edge above. Tight
          top padding so this reads as a continuation of the card column
          rather than a separate section bolted on. Renders only when the
          wizard has run for this spot. */}
      {data.spot.seoIntro && (
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 pt-3 pb-6">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-2">
              About this spot
            </div>
            {/* max-w-prose caps the line length around ~65ch — readable, and
                close to the score-card column width on lg screens so the
                prose sits under the card column without bleeding wide. */}
            <p className="text-base leading-relaxed text-zinc-700 max-w-prose">
              {data.spot.seoIntro}
            </p>
          </div>
        </section>
      )}

      {/* Regulations band — driven entirely by the species selector at the
          top. We pass the full reg array and let the band match by name; no
          switcher chips inside the band itself. */}
      {data.regulations.length > 0 && (
        <RegulationsBand
          regulations={data.regulations}
          areaCode={data.regAreaCode}
          activeSpeciesName={activeSpecies?.name}
        />
      )}

      {/* 14-day picker, sticky */}
      <div className="relative">
        <section
          className="sticky top-[128px] z-10 border-b border-zinc-200 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.08)]"
          style={{
            backgroundColor: "#FFFFFF",
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.75), rgba(255,255,255,0.75)), url("/topo-bg.png")',
            backgroundSize: "auto, 1500px 838px",
            backgroundRepeat: "no-repeat, repeat",
          }}
        >
          <div className="mx-auto max-w-7xl px-6 pt-3 pb-3">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-sm uppercase tracking-wider font-semibold text-zinc-500 whitespace-nowrap">
                  14-Day Forecast — pick a day
                </span>
                <span className="text-zinc-300">·</span>
                <span className="text-[11px] text-zinc-400 italic truncate">
                  Drives the hourly forecast and conditions below
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 italic shrink-0 whitespace-nowrap">
                Confidence fades past day 7 · ECMWF + GFS · live session_scores
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 lg:grid-cols-14">
              {data.daily14.map((d, i) => {
                const active = i === selectedDay;
                const fade = i > 6 ? 0.7 : 1;
                // `loaded` distinguishes today (always loaded) + days that
                // arrived via the lazy /forecast-14d fetch from the
                // skeleton placeholders that sit there until the prefetch
                // resolves. `score == null` is the canonical signal —
                // everything else (glyph/high/low) follows.
                const loaded = d.score != null;
                const sf = loaded ? scoreFrame(d.score!) : { bg: "bg-zinc-50", border: "border-zinc-200", text: "text-zinc-300" };
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(i)}
                    className={`rounded-md border p-2 text-left transition ${
                      active ? "border-[#1F40E0] bg-blue-50 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <div style={{ opacity: fade }} className="flex flex-col gap-1.5">
                      <div>
                        <div className="text-base font-bold uppercase tracking-wide text-zinc-800 leading-none">{d.dow}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{d.date}</div>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        {loaded ? (
                          <>
                            <span className="text-base leading-none">{d.glyph}</span>
                            <span className="text-[10px] text-zinc-600 tabular-nums">
                              {d.high == null ? "—" : Math.round(convertC(d.high, units.temp))}°<span className="text-zinc-400"> / </span>{d.low == null ? "—" : Math.round(convertC(d.low, units.temp))}°
                            </span>
                          </>
                        ) : (
                          <>
                            {/* Skeleton glyph + temp-range — same line height
                                so the tile doesn't reflow when real values
                                arrive. The animate-pulse signal is enough
                                to read "loading" without a spinner. */}
                            <span className="inline-block w-4 h-4 rounded bg-zinc-200 animate-pulse" />
                            <span className="inline-block w-10 h-3 rounded bg-zinc-200 animate-pulse" />
                          </>
                        )}
                      </div>
                      {/* Score badge — solid number when loaded; pulsing dash
                          while the lazy fetch is in flight. flex justify-
                          center beats text-center for tabular-nums centring. */}
                      <div className={`rounded-md border ${sf.border} ${sf.bg} py-1 flex justify-center items-center`}>
                        {loaded ? (
                          <span className={`text-xl font-bold tabular-nums leading-none ${sf.text}`}>{d.score}</span>
                        ) : (
                          <span className="text-xl font-bold tabular-nums leading-none text-zinc-300 animate-pulse">—</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Hourly Forecast & Conditions — merged card, mirrors mockup */}
        <section className="border-b border-zinc-200 bg-zinc-50">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="text-sm uppercase tracking-wider font-semibold text-zinc-500 mb-3">Hourly Forecast & Conditions</div>
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 pt-3 pb-3 border-b border-zinc-100">
                <div className="flex justify-between items-stretch gap-3">
                  <div className="flex flex-col justify-between gap-2">
                    <div className="text-lg font-semibold text-zinc-900 leading-none">
                      {dayInfo?.dow}, {dayInfo?.date}
                      {/* Only render glyph + temp range when the forecast for
                          this day has actually loaded. Days 1..13 in the
                          initial payload have null glyph/high/low; rendering
                          "null null° / null°" is uglier than a clean
                          "Loading…" hint. */}
                      {dayInfo?.glyph != null ? (
                        <span className="ml-2 text-base font-normal text-zinc-500">{dayInfo.glyph} {dayInfo.high == null ? "—" : Math.round(convertC(dayInfo.high, units.temp))}° / {dayInfo.low == null ? "—" : Math.round(convertC(dayInfo.low, units.temp))}°</span>
                      ) : (
                        <span className="ml-2 text-base font-normal text-zinc-400 italic">Loading 14-day forecast…</span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-600 flex items-center gap-2 leading-none">
                      <span>Hourly score for <strong className="font-semibold text-zinc-800">{activeSpecies?.name ?? "—"}</strong></span>
                      <span className="inline-block w-3.5 h-3 rounded-sm bg-[#1F40E0]" />
                      <span>· tide</span>
                      <svg width="22" height="6" viewBox="0 0 22 6" className="inline-block">
                        <line x1="1" y1="3" x2="21" y2="3" stroke="#5680E8" strokeWidth="1.8" />
                      </svg>
                    </div>
                  </div>
                  {/* Score readout removed — the inspector strip below
                      already shows "<hour> Score X" when the user scrubs.
                      Showing the same number here is redundant and made the
                      header feel cluttered. PoweredByBluecaster stays. */}
                  <div className="flex flex-col items-end justify-end leading-none">
                    <div className="text-[10px] text-zinc-400 italic"><PoweredByBluecaster className="items-end" /></div>
                  </div>
                </div>
              </div>
              <HourlyChart hourly={hourlyScoresForActive} hoveredHour={hoveredHour} onHoverHour={setHoveredHour} bestHour={selectedDayPeakHour} sun={data.sun} currentHour={selectedDay === 0 ? nowHour : null} />
              <div className="border-t border-zinc-200">
                <ConditionsTable conditions={conditions} hourlyScores={hourlyScoresForActive} hoveredHour={hoveredHour} onHoverHour={setHoveredHour} bestHour={selectedDayPeakHour} sun={data.sun} currentHour={selectedDay === 0 ? nowHour : null} units={units} />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Seasonality strip — 52-week heatmap for the active species at this
          spot, derived from seasonal_calendar.rating per month. Mirrors the
          spot-mockup SeasonalityStrip. */}
      {activeSpecies && data.seasonWeeksBySpecies[activeSpecies.id] && (
        <section
          className="border-b border-zinc-200"
          style={{
            backgroundColor: "#FFFFFF",
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.75), rgba(255,255,255,0.75)), url("/topo-bg.png")',
            backgroundSize: "auto, 1500px 838px",
            backgroundRepeat: "no-repeat, repeat",
          }}
        >
          <div className="mx-auto max-w-7xl px-6 py-6">
            <SeasonalityStrip
              speciesName={shortSpeciesName(activeSpecies.name)}
              fullName={activeSpecies.name}
              weeks={data.seasonWeeksBySpecies[activeSpecies.id]}
              todayWeek={data.todayWeek}
            />
          </div>
        </section>
      )}

      <GuideNotesSection notes={data.guideNotes} spotId={data.spot.id} />
      <NearbySpotsSection cards={data.nearbySpots} units={units} />
      <FooterActionsSection spotName={data.spot.name} />

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-stretch justify-between gap-6">
          <div className="flex flex-col justify-between gap-3">
            <ReelCasterLogo size="lg" color="#BDAE9B" />
            <div className="text-base font-medium text-zinc-700">© 2026 Copia Digital Inc</div>
          </div>
          <div className="text-sm text-zinc-500 italic self-end">
            Live data: <span className="font-mono">{data.spot.id.slice(0, 8)}</span> · {data.species.length} species · {data.tide14d.length} tide pts
          </div>
        </div>
      </footer>
    </div>
  );
}
