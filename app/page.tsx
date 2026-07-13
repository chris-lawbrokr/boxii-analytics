import { Suspense } from "react";
import MetricChart from "./components/MetricChart";
import MetricSwitcher, {
  type MetricOption,
} from "./components/MetricSwitcher";
import RangeFilter from "./components/RangeFilter";
import { Card } from "@/components/ui/card/Card";
import {
  getDailyPageviews,
  getDailyTotalClicks,
  getDailyCtaClicks,
  getDailyAvgDuration,
  normalizeRange,
  OVERLAY_PAGE_URL,
  type MetricPoint,
} from "./lib/posthog";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = normalizeRange(daysParam);

  let views: MetricPoint[] = [];
  let clicksVsCta: MetricOption[] = [];
  let avgDuration: MetricPoint[] = [];
  let error: string | null = null;

  try {
    const [pageviews, totalClicks, ctaClicks, duration] = await Promise.all([
      getDailyPageviews(days),
      getDailyTotalClicks(days),
      getDailyCtaClicks(days),
      getDailyAvgDuration(days),
    ]);
    views = pageviews;
    clicksVsCta = [
      { key: "clicks", label: "Clicks", data: totalClicks, color: "#22c55e", format: "number" },
      { key: "cta", label: "CTA clicks", data: ctaClicks, color: "#a855f7", format: "number" },
    ];
    avgDuration = duration;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics.";
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold leading-9 -tracking-tight text-brand-dark">
            Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Boxii overlay analytics for{" "}
            <span className="font-medium text-foreground">
              {OVERLAY_PAGE_URL}
            </span>
          </p>
        </div>
        <Suspense fallback={null}>
          <RangeFilter />
        </Suspense>
      </header>

      {error ? (
        <Card className="border border-status-error-border bg-status-error-bg text-status-error-text">
          <p className="font-medium">Couldn&apos;t load analytics.</p>
          <p className="mt-1 font-mono text-xs opacity-80">{error}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-6 lg:col-span-2">
            <MetricChart
              title="Views"
              data={views}
              color="#6366f1"
              format="number"
            />
          </Card>
          <Card className="p-6">
            <MetricSwitcher options={clicksVsCta} />
          </Card>
          <Card className="p-6">
            <MetricChart
              title="Avg. view duration"
              data={avgDuration}
              color="#d97706"
              format="duration"
            />
          </Card>
        </div>
      )}
    </div>
  );
}
