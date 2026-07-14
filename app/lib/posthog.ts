// Server-only PostHog data access. Credentials stay on the server.
import "server-only";
import type {
  MetricPoint,
  BreakdownRow,
  SegmentRow,
  LinkRow,
  HeatType,
  Device,
  HeatmapPoint,
  OverlayCapture,
} from "./ranges";

export type {
  MetricPoint,
  BreakdownRow,
  SegmentRow,
  LinkRow,
  HeatType,
  Device,
  HeatmapPoint,
  OverlayCapture,
} from "./ranges";
export {
  RANGE_OPTIONS,
  normalizeRange,
  HEAT_TYPES,
  MIN_SESSIONS_FOR_RATE,
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

// ---------------------------------------------------------------------------
// Conversion intelligence — segment → open → CTA, and outbound link ranking.
// ---------------------------------------------------------------------------

/**
 * Funnel per value of a session-level dimension: sessions → overlay opens → CTA
 * clicks. Every dimension used here (traffic source, GeoIP, device) rides on
 * every event, so `any()` over the session's events resolves it reliably.
 *
 * This is what separates the intelligence tab from Overview's raw counts: the
 * same dimensions, but measured by how well they convert rather than how much
 * traffic they send.
 */
async function segmentFunnel(
  prop: string,
  days: number,
  limit = 10,
): Promise<SegmentRow[]> {
  const rows = await runHogQL(`
    SELECT seg, count() AS sessions,
           countIf(opened) AS opens,
           countIf(clicked) AS ctas
    FROM (
      SELECT properties.$session_id AS sid,
             any(${prop}) AS seg,
             max(event = 'overlay_opened') AS opened,
             max(event = 'cta_click') AS clicked
      FROM events
      WHERE ${SCOPE} AND timestamp >= now() - INTERVAL ${days} DAY
      GROUP BY sid
    )
    WHERE seg IS NOT NULL AND seg != ''
    GROUP BY seg
    ORDER BY sessions DESC
    LIMIT ${limit}
  `);

  return rows.map(([label, sessions, opens, ctas]) => {
    const s = Number(sessions);
    const o = Number(opens);
    const c = Number(ctas);
    return {
      label: String(label),
      sessions: s,
      opens: o,
      ctas: c,
      openRate: s ? Math.round((o / s) * 100) : 0,
      ctaRate: o ? Math.round((c / o) * 100) : 0,
    };
  });
}

export const getTrafficSourceConversion = (days = 30) =>
  segmentFunnel("properties.traffic_source", days);
export const getChannelConversion = (days = 30) =>
  segmentFunnel("properties.traffic_channel", days);
export const getCityConversion = (days = 30) =>
  segmentFunnel("properties.$geoip_city_name", days);
export const getRegionConversion = (days = 30) =>
  segmentFunnel("properties.$geoip_subdivision_1_name", days);
export const getDeviceConversion = (days = 30) =>
  segmentFunnel("properties.$device_type", days);
export const getBrowserConversion = (days = 30) =>
  segmentFunnel("properties.$browser", days);
export const getReferrerConversion = (days = 30) =>
  segmentFunnel("properties.$referring_domain", days);

/**
 * Outbound links ranked by clicks. Only CTAs that actually navigate somewhere
 * carry `destination_url`; in-overlay CTAs (tab switches, chips) don't, so this
 * is a strictly narrower — and more actionable — list than the CTA leaderboard.
 *
 * Grouping is by URL, since the destination is the thing being ranked — but more
 * than one CTA can point at the same URL (the HubSpot booking link is reachable
 * from both "Book a free demo" and "Talk to Sales"), so the label shown is the
 * most frequent one rather than an arbitrary pick.
 */
export async function getTopLinks(days = 30, limit = 12): Promise<LinkRow[]> {
  const rows = await runHogQL(`
    SELECT properties.destination_url AS dest,
           topK(1)(properties.cta_label)[1] AS label,
           count() AS n
    FROM events
    WHERE event = 'cta_click' AND ${SCOPE}
      AND timestamp >= now() - INTERVAL ${days} DAY
      AND properties.destination_url IS NOT NULL
      AND properties.destination_url != ''
    GROUP BY dest
    ORDER BY n DESC
    LIMIT ${limit}
  `);
  return rows.map(([url, label, n]) => ({
    url: String(url),
    label: String(label ?? "Unlabelled"),
    clicks: Number(n),
  }));
}

// ---------------------------------------------------------------------------
// Mini Boxii — the collapsed floating launcher (boxii-js: src/overlay/
// boxii-launcher.ts). It only exists after the overlay collapses, so every
// metric here is the overlay's second act: who comes back once it's dismissed.
// ---------------------------------------------------------------------------

export type MiniFunnel = { closed: number; engaged: number; reopened: number };

/**
 * Sessions that dismissed the overlay → clicked the mini launcher → reopened.
 *
 * Clicks are attributed to the mini launcher by `overlay_state = 'collapsed'`
 * rather than by action, so a CTA opened from the launcher's link menu counts
 * too. `reopened` re-asserts `collapsed` so it can never exceed `engaged` and
 * invert the funnel, even if `reopen_overlay` is someday fired while expanded.
 */
export async function getMiniFunnel(days = 30): Promise<MiniFunnel> {
  // The outer aliases must not reuse the subquery's names: HogQL resolves
  // `countIf(closed) AS closed` against the alias it is defining and rejects it
  // as an aggregate inside an aggregate.
  const rows = await runHogQL(`
    SELECT countIf(closed) AS closed_n,
           countIf(closed AND mini) AS engaged_n,
           countIf(closed AND reopened) AS reopened_n
    FROM (
      SELECT properties.$session_id AS sid,
             max(event = 'overlay_closed') AS closed,
             max(event = 'cta_click'
                 AND properties.overlay_state = 'collapsed') AS mini,
             max(event = 'cta_click'
                 AND properties.overlay_state = 'collapsed'
                 AND properties.cta_action = 'reopen_overlay') AS reopened
      FROM events
      WHERE ${SCOPE} AND timestamp >= now() - INTERVAL ${days} DAY
      GROUP BY sid
    )
  `);
  const [c, e, r] = rows[0] ?? [0, 0, 0];
  return { closed: Number(c), engaged: Number(e), reopened: Number(r) };
}

/** What people click on the mini launcher, ranked. */
export async function getMiniClicks(days = 30): Promise<BreakdownRow[]> {
  const rows = await runHogQL(`
    SELECT properties.cta_label AS label, count() AS n
    FROM events
    WHERE event = 'cta_click' AND ${SCOPE}
      AND properties.overlay_state = 'collapsed'
      AND timestamp >= now() - INTERVAL ${days} DAY
      AND properties.cta_label != ''
    GROUP BY label
    ORDER BY n DESC
    LIMIT 10
  `);
  return rows.map(([l, n]) => ({ label: String(l ?? "Unknown"), value: Number(n) }));
}

/**
 * How the overlay gets dismissed — the event that creates the mini launcher in
 * the first place. `main_site` is the in-overlay button out to the host page;
 * `api` is a programmatic close.
 */
export async function getCloseTriggers(days = 30): Promise<BreakdownRow[]> {
  const rows = await runHogQL(`
    SELECT properties.trigger AS label, count() AS n
    FROM events
    WHERE event = 'overlay_closed' AND ${SCOPE}
      AND timestamp >= now() - INTERVAL ${days} DAY
      AND properties.trigger != ''
    GROUP BY label
    ORDER BY n DESC
  `);
  return rows.map(([l, n]) => ({ label: String(l ?? "Unknown"), value: Number(n) }));
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
