"use client";

import { useEffect, useRef } from "react";
import type { Map as MlMap } from "maplibre-gl";

// Ported from bluecaster's app/map/useCurrentsArrows.ts — a Windy-style animated
// tidal-current field. When enabled, overlays a transparent 2D canvas on the
// map and advects ~1500 particles through the velocity grid from our
// /api/bluecaster/currents/field proxy, with fading speed-colored trails.
// Particles live in lng/lat and project through the map each frame, so they
// stay geo-anchored. Re-fetches the field on pan/zoom.

interface Field {
  cols: number;
  rows: number;
  w: number;
  s: number;
  e: number;
  n: number;
  u: (number | null)[];
  v: (number | null)[];
  max: number;
}

const PARTICLES = 1500;
const MAX_AGE = 160; // frames before a particle respawns (keeps the field churning)
const TRAIL_FADE = 0.93; // per-frame alpha multiplier; lower = shorter trails
const TARGET_PX_PER_KT = 0.175; // on-screen px/frame for a 1 kt current (zoom-normalized)

// blue → cyan → green → amber → red, by speed
const STOPS = [
  [116, 173, 209],
  [69, 117, 180],
  [65, 171, 93],
  [253, 174, 97],
  [215, 48, 39],
];
function speedColor(sp: number, max: number): string {
  const t = Math.max(0, Math.min(1, sp / (max || 1.5)));
  const seg = t * (STOPS.length - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  const a = STOPS[i];
  const b = STOPS[Math.min(i + 1, STOPS.length - 1)];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
}

export function useCurrents({
  map,
  enabled,
  timeIso,
}: {
  map: MlMap | null;
  enabled: boolean;
  timeIso: string | null;
}) {
  const timeRef = useRef<string | null>(timeIso);
  timeRef.current = timeIso;
  const fetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!map || !enabled) return;

    const container = map.getContainer();
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:2;";
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = container.clientWidth;
      H = container.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let field: Field | null = null;
    const P = new Float64Array(PARTICLES * 3); // lng, lat, age
    let seeded = false;

    const spawn = (i: number) => {
      const b = map.getBounds();
      const w = field ? Math.max(field.w, b.getWest()) : b.getWest();
      const e = field ? Math.min(field.e, b.getEast()) : b.getEast();
      const s = field ? Math.max(field.s, b.getSouth()) : b.getSouth();
      const n = field ? Math.min(field.n, b.getNorth()) : b.getNorth();
      P[i * 3] = w + Math.random() * (e - w);
      P[i * 3 + 1] = s + Math.random() * (n - s);
      P[i * 3 + 2] = Math.random() * MAX_AGE;
    };

    const sampleUV = (lng: number, lat: number): [number, number] | null => {
      if (!field) return null;
      const { cols, rows, w, s, e, n, u, v } = field;
      if (lng < w || lng > e || lat < s || lat > n) return null;
      const fx = ((lng - w) / (e - w)) * (cols - 1);
      const fy = ((lat - s) / (n - s)) * (rows - 1);
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(x0 + 1, cols - 1);
      const y1 = Math.min(y0 + 1, rows - 1);
      const tx = fx - x0;
      const ty = fy - y0;
      const id = (yy: number, xx: number) => yy * cols + xx;
      const u00 = u[id(y0, x0)], u10 = u[id(y0, x1)], u01 = u[id(y1, x0)], u11 = u[id(y1, x1)];
      const v00 = v[id(y0, x0)], v10 = v[id(y0, x1)], v01 = v[id(y1, x0)], v11 = v[id(y1, x1)];
      if (u00 == null || u10 == null || u01 == null || u11 == null ||
          v00 == null || v10 == null || v01 == null || v11 == null) return null;
      const uu = (u00 * (1 - tx) + u10 * tx) * (1 - ty) + (u01 * (1 - tx) + u11 * tx) * ty;
      const vv = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
      return [uu, vv as number];
    };

    const fetchField = async () => {
      const b = map.getBounds();
      const qs = new URLSearchParams({
        bbox: `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`,
        cols: "64",
        rows: "48",
      });
      if (timeRef.current) qs.set("time", timeRef.current);
      try {
        const g = await fetch(`/api/bluecaster/currents/field?${qs.toString()}`).then((r) =>
          r.ok ? r.json() : null,
        );
        if (!g) return;
        field = { cols: g.cols, rows: g.rows, w: g.bbox[0], s: g.bbox[1], e: g.bbox[2], n: g.bbox[3], u: g.u, v: g.v, max: g.max_speed_kn || 1.5 };
        if (!seeded) {
          for (let i = 0; i < PARTICLES; i++) spawn(i);
          seeded = true;
        }
      } catch {
        /* keep prior field */
      }
    };
    fetchRef.current = fetchField;

    let moving = false;
    const onMoveStart = () => {
      moving = true;
      ctx.clearRect(0, 0, W, H); // avoid trail smear during pan/zoom
    };
    const onMoveEnd = () => {
      moving = false;
      resize();
      fetchField();
    };
    map.on("movestart", onMoveStart);
    map.on("moveend", onMoveEnd);
    window.addEventListener("resize", resize);

    fetchField();

    let raf = 0;
    const frame = () => {
      if (!moving && field) {
        // fade existing trails (transparent-canvas alpha multiply)
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = 1.4;

        const pxPerDeg = (256 * Math.pow(2, map.getZoom())) / 360;
        const scale = TARGET_PX_PER_KT / pxPerDeg; // deg/frame per knot, zoom-normalized

        for (let i = 0; i < PARTICLES; i++) {
          const lng = P[i * 3];
          const lat = P[i * 3 + 1];
          const age = P[i * 3 + 2];
          const uv = sampleUV(lng, lat);
          if (!uv || age > MAX_AGE) {
            spawn(i);
            continue;
          }
          const cosLat = Math.cos((lat * Math.PI) / 180) || 1;
          const nlng = lng + (uv[0] * scale) / cosLat;
          const nlat = lat + uv[1] * scale;
          const p0 = map.project([lng, lat]);
          const p1 = map.project([nlng, nlat]);
          ctx.strokeStyle = speedColor(Math.hypot(uv[0], uv[1]), field.max);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          P[i * 3] = nlng;
          P[i * 3 + 1] = nlat;
          P[i * 3 + 2] = age + 1;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      map.off("movestart", onMoveStart);
      map.off("moveend", onMoveEnd);
      window.removeEventListener("resize", resize);
      canvas.remove();
    };
  }, [enabled, map]);

  // Re-fetch the field when the scrubber time changes (no rebuild).
  useEffect(() => {
    if (enabled) fetchRef.current?.();
  }, [timeIso, enabled]);
}
