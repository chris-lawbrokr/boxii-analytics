import { Suspense } from "react";
import HeatmapViewer from "../components/HeatmapViewer";
import RangeFilter from "../components/RangeFilter";
import { Card } from "@/components/ui/card/Card";
import {
  getOverlayClicks,
  normalizeRange,
  OVERLAY_CAPTURES,
  OVERLAY_PAGE_URL,
  type Device,
  type HeatType,
  type HeatmapPoint,
} from "../lib/posthog";

const DEVICES: Device[] = ["desktop", "mobile"];
const TYPES: HeatType[] = ["click", "mousemove", "rageclick"];

export default async function HeatmapPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = normalizeRange(daysParam);

  let points: Record<Device, Record<HeatType, HeatmapPoint[]>> | null = null;
  let error: string | null = null;

  try {
    const combos = DEVICES.flatMap((d) => TYPES.map((t) => ({ d, t })));
    const results = await Promise.all(
      combos.map((c) => getOverlayClicks(c.d, days, c.t)),
    );
    const empty = () =>
      ({ click: [], mousemove: [], rageclick: [] }) as Record<
        HeatType,
        HeatmapPoint[]
      >;
    const acc: Record<Device, Record<HeatType, HeatmapPoint[]>> = {
      desktop: empty(),
      mobile: empty(),
    };
    combos.forEach((c, i) => {
      acc[c.d][c.t] = results[i];
    });
    points = acc;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load heatmap.";
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold leading-9 -tracking-tight text-brand-dark">
            Heatmap
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Where visitors interact with the Boxii overlay ·{" "}
            <span className="font-medium text-foreground">
              {OVERLAY_PAGE_URL}
            </span>
          </p>
        </div>
        <Suspense fallback={null}>
          <RangeFilter />
        </Suspense>
      </header>

      {error || !points ? (
        <Card className="border border-status-error-border bg-status-error-bg text-status-error-text">
          <p className="font-medium">Couldn&apos;t load heatmap.</p>
          <p className="mt-1 font-mono text-xs opacity-80">{error}</p>
        </Card>
      ) : (
        <Card className="p-6">
          <HeatmapViewer captures={OVERLAY_CAPTURES} points={points} />
          <p className="mt-3 text-xs text-muted-foreground">
            Coordinate heat over a snapshot of the current overlay. Clicks are
            viewport-relative (the overlay locks page scroll); each device view
            matches its dominant viewport ({OVERLAY_CAPTURES.desktop.width}×
            {OVERLAY_CAPTURES.desktop.height} desktop,{" "}
            {OVERLAY_CAPTURES.mobile.width}×{OVERLAY_CAPTURES.mobile.height}{" "}
            mobile).
          </p>
        </Card>
      )}
    </div>
  );
}
