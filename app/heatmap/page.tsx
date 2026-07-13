import HeatmapViewer, { type DeviceView } from "../components/HeatmapViewer";
import { Card } from "@/components/ui/card/Card";
import {
  getOverlayClicks,
  OVERLAY_CAPTURES,
  OVERLAY_PAGE_URL,
  type Device,
} from "../lib/posthog";

export default async function HeatmapPage() {
  let views: Record<Device, DeviceView> | null = null;
  let error: string | null = null;

  try {
    const [desktop, mobile] = await Promise.all([
      getOverlayClicks("desktop", 90),
      getOverlayClicks("mobile", 90),
    ]);
    views = {
      desktop: { points: desktop, capture: OVERLAY_CAPTURES.desktop },
      mobile: { points: mobile, capture: OVERLAY_CAPTURES.mobile },
    };
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load heatmap.";
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-4xl font-bold leading-9 -tracking-tight text-brand-dark">
          Heatmap
        </h1>
      </header>

      {error || !views ? (
        <Card className="border border-status-error-border bg-status-error-bg text-status-error-text">
          <p className="font-medium">Couldn&apos;t load heatmap.</p>
          <p className="mt-1 font-mono text-xs opacity-80">{error}</p>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-brand-dark">
              Boxii overlay click heatmap
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Last 90 days</p>
          </div>
          <HeatmapViewer views={views} />
        </Card>
      )}
    </div>
  );
}
