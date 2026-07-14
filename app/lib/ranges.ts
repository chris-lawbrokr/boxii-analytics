// Client-safe shared types/constants (no server-only imports), so client
// components like RangeFilter can use them without pulling in posthog.ts.

export type MetricPoint = { day: string; value: number };

/** A single categorical breakdown row (label + count/percentage). */
export type BreakdownRow = { label: string; value: number };

/**
 * One segment's funnel: how many sessions arrived from it, and how far they got.
 * Rates are percentages of the previous step (opens ÷ sessions, ctas ÷ opens).
 */
export type SegmentRow = {
  label: string;
  sessions: number;
  opens: number;
  ctas: number;
  openRate: number;
  ctaRate: number;
};

/** A clicked outbound link, ranked by click count. */
export type LinkRow = { url: string; label: string; clicks: number };

/**
 * Below this many sessions a conversion rate is noise (one extra click swings it
 * tens of points), so the UI shows the counts but withholds the rate.
 */
export const MIN_SESSIONS_FOR_RATE = 5;

export type Device = "desktop" | "mobile";

export type HeatmapPoint = {
  x: number; // relative position across the viewport, 0..1
  y: number; // pixels down the viewport (overlay is a fixed, scroll-locked stage)
  count: number;
};

export type OverlayCapture = {
  image: string;
  width: number;
  height: number;
  viewportMin: number;
  viewportMax: number;
};

/** Heatmap interaction layers available from the coordinate store. */
export const HEAT_TYPES = [
  { id: "click", label: "Clicks" },
  { id: "mousemove", label: "Moves" },
  { id: "rageclick", label: "Rage" },
] as const;
export type HeatType = (typeof HEAT_TYPES)[number]["id"];

/** Allowed date-range presets (days). */
export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeOption = (typeof RANGE_OPTIONS)[number];

export function normalizeRange(value: unknown): RangeOption {
  const n = Number(value);
  return (RANGE_OPTIONS as readonly number[]).includes(n)
    ? (n as RangeOption)
    : 30;
}
