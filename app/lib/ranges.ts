// Client-safe shared types/constants (no server-only imports), so client
// components like RangeFilter can use them without pulling in posthog.ts.

export type MetricPoint = { day: string; value: number };

/** Allowed date-range presets (days). */
export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeOption = (typeof RANGE_OPTIONS)[number];

export function normalizeRange(value: unknown): RangeOption {
  const n = Number(value);
  return (RANGE_OPTIONS as readonly number[]).includes(n)
    ? (n as RangeOption)
    : 30;
}
