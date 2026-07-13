// Server-only PostHog data access. Credentials stay on the server.
import "server-only";
import type {
  MetricPoint,
  BreakdownRow,
  HeatType,
  Device,
  HeatmapPoint,
  OverlayCapture,
} from "./ranges";

export type {
  MetricPoint,
  BreakdownRow,
  HeatType,
  Device,
  HeatmapPoint,
  OverlayCapture,
} from "./ranges";
export {
  RANGE_OPTIONS,
  normalizeRange,
  HEAT_TYPES,
  type RangeOption,
} from "./ranges";

const POSTHOG_HOST = process.env.POSTHOG_HOST ?? "https://us.posthog.com";
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;

export type DailyVisitors = {
  day: string; // ISO date, e.g. "2026-07-13"
  visitors: number;
};

/** The URL the Boxii overlay is embedded on (heatmap capture is scoped to it). */
export const OVERLAY_PAGE_URL = "https://www.lawbrokr.com/";

/**
 * Per-device Boxii overlay screenshots the heatmap is drawn onto, and the
 * capture parameters each must line up with. The overlay is a `position: fixed`
 * full-viewport stage that locks page scroll, so click coordinates are viewport-
 * relative — we screenshot at each device's dominant viewport and filter clicks
 * to that viewport-width band so the coordinates match the pixels.
 * Re-capture with scripts/capture-overlay.mjs if the overlay design changes.
 */
export const OVERLAY_CAPTURES: Record<Device, OverlayCapture> = {
  desktop: {
    image: "/boxii-overlay-lawbrokr-desktop.png",
    width: 1512,
    height: 828,
    viewportMin: 1440,
    viewportMax: 1600,
  },
  mobile: {
    image: "/boxii-overlay-lawbrokr-mobile.png",
    width: 402,
    height: 660,
    viewportMin: 360,
    viewportMax: 450,
  },
};

/**
 * Run a HogQL query against the PostHog Query API.
 * https://posthog.com/docs/api/queries
 */
async function runHogQL(query: string): Promise<unknown[][]> {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    throw new Error(
      "Missing PostHog credentials. Set POSTHOG_API_KEY and POSTHOG_PROJECT_ID in .env.local",
    );
  }

  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      // Cache for 10 minutes so we don't hammer the API on every request.
      next: { revalidate: 600 },
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`PostHog query failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { results: unknown[][] };
  return data.results;
}

/**
 * Daily unique visitors (distinct persons with a $pageview) for the last N days.
 */
export async function getDailyVisitors(days = 30): Promise<DailyVisitors[]> {
  const rows = await runHogQL(`
    SELECT toDate(timestamp) AS day, count(DISTINCT person_id) AS visitors
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY day
    ORDER BY day
  `);

  return rows.map(([day, visitors]) => ({
    day: String(day),
    visitors: Number(visitors),
  }));
}

/**
 * Boxii overlay heatmap coordinates for a device + interaction type, filtered to
 * the device's viewport-width band (the same band its screenshot was captured
 * at) so the coordinates line up with the image.
 * https://posthog.com/docs/toolbar/heatmaps
 */
export async function getOverlayClicks(
  device: Device = "desktop",
  days = 90,
  type: HeatType = "click",
): Promise<HeatmapPoint[]> {
  if (!POSTHOG_API_KEY) {
    throw new Error(
      "Missing PostHog credentials. Set POSTHOG_API_KEY in .env.local",
    );
  }

  const capture = OVERLAY_CAPTURES[device];
  const params = new URLSearchParams({
    date_from: `-${days}d`,
    type,
    aggregation: "total_count",
    url_exact: OVERLAY_PAGE_URL,
    viewport_width_min: String(capture.viewportMin),
    viewport_width_max: String(capture.viewportMax),
  });

  const res = await fetch(`${POSTHOG_HOST}/api/heatmap/?${params}`, {
    headers: { Authorization: `Bearer ${POSTHOG_API_KEY}` },
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`PostHog heatmap failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    results: {
      pointer_relative_x: number;
      pointer_y: number;
      count: number;
    }[];
  };

  return data.results.map((r) => ({
    x: r.pointer_relative_x,
    y: r.pointer_y,
    count: r.count,
  }));
}

// ---------------------------------------------------------------------------
// Overview metrics — daily time series, each scoped to the overlay page.
// ---------------------------------------------------------------------------

/** UTC day strings (YYYY-MM-DD) for the last N days, oldest first. */
function lastNDaysUTC(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Zero-fill a sparse day→value map across the full range for a clean chart. */
function fillDaily(days: number, byDay: Map<string, number>): MetricPoint[] {
  return lastNDaysUTC(days).map((day) => ({ day, value: byDay.get(day) ?? 0 }));
}

/** Run async work over items with bounded concurrency. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

async function dailyEventCount(
  event: string,
  days: number,
): Promise<MetricPoint[]> {
  const rows = await runHogQL(`
    SELECT toDate(timestamp) AS day, count() AS n
    FROM events
    WHERE event = '${event}'
      AND properties.$current_url = '${OVERLAY_PAGE_URL}'
      AND timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY day
    ORDER BY day
  `);
  const byDay = new Map(rows.map(([d, n]) => [String(d), Number(n)]));
  return fillDaily(days, byDay);
}

/** Daily pageviews of the overlay page. */
export function getDailyPageviews(days = 30): Promise<MetricPoint[]> {
  return dailyEventCount("$pageview", days);
}

/** Daily labelled CTA clicks inside the overlay. */
export function getDailyCtaClicks(days = 30): Promise<MetricPoint[]> {
  return dailyEventCount("cta_click", days);
}

/**
 * Daily average overlay view duration (seconds) — per session, the span from
 * the first `overlay_opened` to the last `overlay_closed`. Sessions without a
 * close, or longer than an hour, are dropped as outliers.
 */
export async function getDailyAvgDuration(days = 30): Promise<MetricPoint[]> {
  const rows = await runHogQL(`
    SELECT day, round(avg(dur)) AS seconds FROM (
      SELECT toDate(o.opened) AS day,
             dateDiff('second', o.opened, c.closed) AS dur
      FROM (
        SELECT properties.$session_id AS sid, min(timestamp) AS opened
        FROM events
        WHERE event = 'overlay_opened'
          AND properties.$current_url = '${OVERLAY_PAGE_URL}'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY sid
      ) o
      INNER JOIN (
        SELECT properties.$session_id AS sid, max(timestamp) AS closed
        FROM events
        WHERE event = 'overlay_closed'
          AND properties.$current_url = '${OVERLAY_PAGE_URL}'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY sid
      ) c ON o.sid = c.sid
      WHERE dur > 0 AND dur < 3600
    )
    GROUP BY day
    ORDER BY day
  `);
  const byDay = new Map(rows.map(([d, s]) => [String(d), Number(s)]));
  return fillDaily(days, byDay);
}

/**
 * Daily total overlay clicks. There is no generic click event (autocapture is
 * off), so this reads the coordinate heatmap store one day at a time and sums
 * the click counts across all devices.
 */
export async function getDailyTotalClicks(days = 30): Promise<MetricPoint[]> {
  if (!POSTHOG_API_KEY) {
    throw new Error(
      "Missing PostHog credentials. Set POSTHOG_API_KEY in .env.local",
    );
  }
  const dates = lastNDaysUTC(days);
  const counts = await mapLimit(dates, 8, async (date) => {
    const params = new URLSearchParams({
      date_from: date,
      date_to: date,
      type: "click",
      aggregation: "total_count",
      url_exact: OVERLAY_PAGE_URL,
    });
    const res = await fetch(`${POSTHOG_HOST}/api/heatmap/?${params}`, {
      headers: { Authorization: `Bearer ${POSTHOG_API_KEY}` },
      next: { revalidate: 600 },
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { results: { count: number }[] };
    return data.results.reduce((sum, r) => sum + r.count, 0);
  });
  return dates.map((day, i) => ({ day, value: counts[i] }));
}

// ---------------------------------------------------------------------------
// Conversion, segmentation, and engagement-depth queries.
// ---------------------------------------------------------------------------

const SCOPE = `properties.$current_url = '${OVERLAY_PAGE_URL}'`;

export type FunnelData = { views: number; opens: number; cta: number };

/** Session-based funnel: viewed → opened overlay → clicked a CTA. */
export async function getFunnel(days = 30): Promise<FunnelData> {
  const rows = await runHogQL(`
    SELECT
      uniqIf(properties.$session_id, event = '$pageview') AS views,
      uniqIf(properties.$session_id, event = 'overlay_opened') AS opens,
      uniqIf(properties.$session_id, event = 'cta_click') AS cta
    FROM events
    WHERE ${SCOPE} AND timestamp >= now() - INTERVAL ${days} DAY
  `);
  const [v, o, c] = rows[0] ?? [0, 0, 0];
  return { views: Number(v), opens: Number(o), cta: Number(c) };
}

/** Distinct sessions per value of a pageview property (audience breakdowns). */
async function sessionBreakdown(
  prop: string,
  days: number,
  limit = 8,
): Promise<BreakdownRow[]> {
  const rows = await runHogQL(`
    SELECT ${prop} AS label, uniq(properties.$session_id) AS n
    FROM events
    WHERE event = '$pageview' AND ${SCOPE}
      AND timestamp >= now() - INTERVAL ${days} DAY
      AND ${prop} != ''
    GROUP BY label
    ORDER BY n DESC
    LIMIT ${limit}
  `);
  return rows.map(([l, n]) => ({ label: String(l ?? "Unknown"), value: Number(n) }));
}

export const getTrafficSources = (days = 30) =>
  sessionBreakdown("properties.traffic_source", days);
export const getDeviceBreakdown = (days = 30) =>
  sessionBreakdown("properties.$device_type", days);
export const getCountryBreakdown = (days = 30) =>
  sessionBreakdown("properties.$geoip_country_name", days);
export const getBrowserBreakdown = (days = 30) =>
  sessionBreakdown("properties.$browser", days);
export const getOsBreakdown = (days = 30) =>
  sessionBreakdown("properties.$os", days);

/** CTA clicks ranked by label (with the action taxonomy for context). */
export async function getCtaLeaderboard(days = 30): Promise<BreakdownRow[]> {
  const rows = await runHogQL(`
    SELECT properties.cta_label AS label, count() AS n
    FROM events
    WHERE event = 'cta_click' AND ${SCOPE}
      AND timestamp >= now() - INTERVAL ${days} DAY
      AND properties.cta_label != ''
    GROUP BY label
    ORDER BY n DESC
    LIMIT 10
  `);
  return rows.map(([l, n]) => ({ label: String(l ?? "Unknown"), value: Number(n) }));
}

const DURATION_BUCKETS = [
  "0–10s",
  "10–30s",
  "30–60s",
  "1–3m",
  "3–10m",
  "10m+",
] as const;

/** Distribution of overlay view durations across fixed buckets. */
export async function getDurationDistribution(
  days = 30,
): Promise<BreakdownRow[]> {
  const rows = await runHogQL(`
    SELECT bucket, count() AS n FROM (
      SELECT multiIf(
        dur < 10, '0–10s',
        dur < 30, '10–30s',
        dur < 60, '30–60s',
        dur < 180, '1–3m',
        dur < 600, '3–10m',
        '10m+') AS bucket
      FROM (
        SELECT dateDiff('second', o.opened, c.closed) AS dur
        FROM (
          SELECT properties.$session_id AS sid, min(timestamp) AS opened
          FROM events
          WHERE event = 'overlay_opened' AND ${SCOPE}
            AND timestamp >= now() - INTERVAL ${days} DAY
          GROUP BY sid
        ) o
        INNER JOIN (
          SELECT properties.$session_id AS sid, max(timestamp) AS closed
          FROM events
          WHERE event = 'overlay_closed' AND ${SCOPE}
            AND timestamp >= now() - INTERVAL ${days} DAY
          GROUP BY sid
        ) c ON o.sid = c.sid
        WHERE dur > 0 AND dur < 3600
      )
    )
    GROUP BY bucket
  `);
  const byBucket = new Map(rows.map(([b, n]) => [String(b), Number(n)]));
  return DURATION_BUCKETS.map((label) => ({
    label,
    value: byBucket.get(label) ?? 0,
  }));
}

/**
 * Scroll depth — % of overlay viewers who reached each depth. Sourced from the
 * heatmap store's scrolldepth buckets (cumulative reach, deepest-declining).
 */
export async function getScrollDepth(days = 30): Promise<BreakdownRow[]> {
  if (!POSTHOG_API_KEY) return [];
  const params = new URLSearchParams({
    date_from: `-${days}d`,
    type: "scrolldepth",
    url_exact: OVERLAY_PAGE_URL,
  });
  const res = await fetch(`${POSTHOG_HOST}/api/heatmap/?${params}`, {
    headers: { Authorization: `Bearer ${POSTHOG_API_KEY}` },
    next: { revalidate: 600 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results: { scroll_depth_bucket: number; cumulative_count: number }[];
  };
  const buckets = [...data.results].sort(
    (a, b) => a.scroll_depth_bucket - b.scroll_depth_bucket,
  );
  const max = Math.max(...buckets.map((b) => b.cumulative_count), 1);
  return buckets.map((b) => ({
    label: `${b.scroll_depth_bucket}px`,
    value: Math.round((b.cumulative_count / max) * 100),
  }));
}
