// Server-only PostHog data access. Credentials stay on the server.
import "server-only";

const POSTHOG_HOST = process.env.POSTHOG_HOST ?? "https://us.posthog.com";
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;

export type DailyVisitors = {
  day: string; // ISO date, e.g. "2026-07-13"
  visitors: number;
};

export type HeatmapPoint = {
  x: number; // relative position across the viewport, 0..1
  y: number; // pixels down the viewport (overlay is a fixed, scroll-locked stage)
  count: number;
};

/** The URL the Boxii overlay is embedded on (heatmap capture is scoped to it). */
export const OVERLAY_PAGE_URL = "https://www.lawbrokr.com/";

export type Device = "desktop" | "mobile";

export type OverlayCapture = {
  image: string;
  width: number;
  height: number;
  viewportMin: number;
  viewportMax: number;
};

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
 * Boxii overlay click coordinates, via the PostHog heatmap API, filtered to the
 * given device's viewport-width band (the same band its screenshot was captured
 * at) so the coordinates line up with the image.
 * https://posthog.com/docs/toolbar/heatmaps
 */
export async function getOverlayClicks(
  device: Device = "desktop",
  days = 90,
): Promise<HeatmapPoint[]> {
  if (!POSTHOG_API_KEY) {
    throw new Error(
      "Missing PostHog credentials. Set POSTHOG_API_KEY in .env.local",
    );
  }

  const capture = OVERLAY_CAPTURES[device];
  const params = new URLSearchParams({
    date_from: `-${days}d`,
    type: "click",
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
