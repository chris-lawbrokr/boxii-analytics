import VisitorsChart from "./components/VisitorsChart";
import OverlayHeatmap from "./components/OverlayHeatmap";
import {
  getDailyVisitors,
  getOverlayClicks,
  OVERLAY_PAGE_URL,
  OVERLAY_CAPTURE,
  type DailyVisitors,
  type HeatmapPoint,
} from "./lib/posthog";

export default async function Home() {
  let data: DailyVisitors[] = [];
  let heatmap: HeatmapPoint[] = [];
  let error: string | null = null;

  try {
    [data, heatmap] = await Promise.all([
      getDailyVisitors(30),
      getOverlayClicks(60),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics.";
  }

  const totalClicks = heatmap.reduce((sum, p) => sum + p.count, 0);

  const totalVisitors = data.reduce((sum, d) => sum + d.visitors, 0);
  const peak = data.reduce((max, d) => Math.max(max, d.visitors), 0);
  const today = data.at(-1)?.visitors ?? 0;

  return (
    <div className="min-h-full flex-1 bg-zinc-50 font-sans">
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <header className="mb-8">
          <p className="text-sm font-medium text-indigo-500">
            lawbrokr.com analytics
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Daily unique visitors over the last 30 days.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p className="font-medium">Couldn&apos;t load analytics.</p>
            <p className="mt-1 font-mono text-xs opacity-80">{error}</p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total (30d)" value={totalVisitors} />
              <StatCard label="Peak day" value={peak} />
              <StatCard label="Latest day" value={today} />
            </div>

            <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-medium text-zinc-700">
                Daily visitors
              </h2>
              <VisitorsChart data={data} />
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium text-zinc-700">
                    Boxii overlay click heatmap
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Where visitors click on the Boxii overlay ·{" "}
                    <span className="font-mono">{OVERLAY_PAGE_URL}</span> ·
                    desktop · last 60 days
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-zinc-400">
                  {totalClicks.toLocaleString()} clicks
                </span>
              </div>
              <OverlayHeatmap
                points={heatmap}
                imageSrc={OVERLAY_CAPTURE.image}
                baseWidth={OVERLAY_CAPTURE.width}
                baseHeight={OVERLAY_CAPTURE.height}
              />
              <p className="mt-3 text-xs text-zinc-400">
                Coordinate heat over a snapshot of the current overlay. The
                overlay locks page scroll, so clicks are viewport-relative;
                capture matches the dominant 1512×828 desktop viewport.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
