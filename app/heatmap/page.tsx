import OverlayHeatmap from "../components/OverlayHeatmap";
import { Card } from "@/components/ui/card/Card";
import {
  getOverlayClicks,
  OVERLAY_PAGE_URL,
  OVERLAY_CAPTURE,
  type HeatmapPoint,
} from "../lib/posthog";

export default async function HeatmapPage() {
  let heatmap: HeatmapPoint[] = [];
  let error: string | null = null;

  try {
    heatmap = await getOverlayClicks(60);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load heatmap.";
  }

  const totalClicks = heatmap.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-4xl font-bold leading-9 -tracking-tight text-brand-dark">
          Heatmap
        </h1>
      </header>

      {error ? (
        <Card className="border border-status-error-border bg-status-error-bg text-status-error-text">
          <p className="font-medium">Couldn&apos;t load heatmap.</p>
          <p className="mt-1 font-mono text-xs opacity-80">{error}</p>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-brand-dark">
                Boxii overlay click heatmap
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Desktop · last 60 days
              </p>
            </div>
            <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
              {totalClicks.toLocaleString()} clicks
            </span>
          </div>
          <OverlayHeatmap
            points={heatmap}
            imageSrc={OVERLAY_CAPTURE.image}
            baseWidth={OVERLAY_CAPTURE.width}
            baseHeight={OVERLAY_CAPTURE.height}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Coordinate heat over a snapshot of the current overlay. The overlay
            locks page scroll, so clicks are viewport-relative; capture matches
            the dominant 1512×828 desktop viewport.
          </p>
        </Card>
      )}
    </div>
  );
}
