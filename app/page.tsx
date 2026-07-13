import { Suspense } from "react";
import MetricChart from "./components/MetricChart";
import MetricSwitcher, { type MetricOption } from "./components/MetricSwitcher";
import CategoryChart from "./components/CategoryChart";
import BreakdownList from "./components/BreakdownList";
import FunnelCard from "./components/FunnelCard";
import KpiCard from "./components/KpiCard";
import RangeFilter from "./components/RangeFilter";
import { Card } from "@/components/ui/card/Card";
import { BRAND_PURPLE as PURPLE } from "./lib/theme";
import {
  getDailyPageviews,
  getDailyTotalClicks,
  getDailyCtaClicks,
  getDailyAvgDuration,
  getFunnel,
  getCtaLeaderboard,
  getDurationDistribution,
  getScrollDepth,
  getTrafficSources,
  getDeviceBreakdown,
  getCountryBreakdown,
  getBrowserBreakdown,
  getOsBreakdown,
  normalizeRange,
  OVERLAY_PAGE_URL,
  type MetricPoint,
  type BreakdownRow,
  type FunnelData,
} from "./lib/posthog";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = normalizeRange(daysParam);

  let error: string | null = null;
  let funnel: FunnelData = { views: 0, opens: 0, cta: 0 };
  let views: MetricPoint[] = [];
  let clicksVsCta: MetricOption[] = [];
  let avgDuration: MetricPoint[] = [];
  let ctaLeaderboard: BreakdownRow[] = [];
  let durationDist: BreakdownRow[] = [];
  let scrollDepth: BreakdownRow[] = [];
  let trafficSources: BreakdownRow[] = [];
  let devices: BreakdownRow[] = [];
  let countries: BreakdownRow[] = [];
  let browsers: BreakdownRow[] = [];
  let operatingSystems: BreakdownRow[] = [];

  try {
    const [
      fn,
      pageviews,
      totalClicks,
      ctaClicks,
      dur,
      cta,
      distr,
      scroll,
      traffic,
      device,
      country,
      browser,
      os,
    ] = await Promise.all([
      getFunnel(days),
      getDailyPageviews(days),
      getDailyTotalClicks(days),
      getDailyCtaClicks(days),
      getDailyAvgDuration(days),
      getCtaLeaderboard(days),
      getDurationDistribution(days),
      getScrollDepth(days),
      getTrafficSources(days),
      getDeviceBreakdown(days),
      getCountryBreakdown(days),
      getBrowserBreakdown(days),
      getOsBreakdown(days),
    ]);
    funnel = fn;
    views = pageviews;
    clicksVsCta = [
      {
        key: "clicks",
        label: "Clicks",
        data: totalClicks,
        color: PURPLE,
        format: "number",
      },
      {
        key: "cta",
        label: "CTA clicks",
        data: ctaClicks,
        color: PURPLE,
        format: "number",
      },
    ];
    avgDuration = dur;
    ctaLeaderboard = cta;
    durationDist = distr;
    scrollDepth = scroll;
    trafficSources = traffic;
    devices = device;
    countries = country;
    browsers = browser;
    operatingSystems = os;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics.";
  }

  const ctaRate = funnel.views
    ? Math.round((funnel.cta / funnel.views) * 100)
    : 0;
  const noCta = Math.max(funnel.opens - funnel.cta, 0);
  const noCtaRate = funnel.opens ? Math.round((noCta / funnel.opens) * 100) : 0;
  const totalCtaClicks = ctaLeaderboard.reduce((s, r) => s + r.value, 0);

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold leading-9 -tracking-tight text-brand-dark">
            Overview
          </h1>
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
        <>
          <Section title="Conversion">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card className="p-5">
                <KpiCard
                  label="CTA rate"
                  value={`${ctaRate}%`}
                  sub={`${funnel.cta} of ${funnel.views} sessions`}
                />
              </Card>
              <Card className="p-5">
                <KpiCard
                  label="Total CTA clicks"
                  value={totalCtaClicks.toLocaleString()}
                  sub="across all CTAs"
                />
              </Card>
              <Card className="p-5">
                <KpiCard
                  label="No-CTA sessions"
                  value={noCta.toLocaleString()}
                  sub={`${noCtaRate}% of opens`}
                />
              </Card>
              <Card className="p-5">
                <KpiCard
                  label="Overlay opens"
                  value={funnel.opens.toLocaleString()}
                  sub="sessions"
                />
              </Card>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <FunnelCard
                  title="Conversion funnel"
                  steps={[
                    { label: "Viewed", value: funnel.views },
                    { label: "Opened overlay", value: funnel.opens },
                    { label: "Clicked a CTA", value: funnel.cta },
                  ]}
                />
              </Card>
              <Card className="p-6">
                <BreakdownList title="Top CTAs" rows={ctaLeaderboard} />
              </Card>
            </div>
          </Section>

          <Section title="Trends">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-6 lg:col-span-2">
                <MetricChart
                  title="Views"
                  data={views}
                  color={PURPLE}
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
                  color={PURPLE}
                  format="duration"
                />
              </Card>
            </div>
          </Section>

          <Section title="Engagement depth">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <CategoryChart
                  title="View duration distribution"
                  data={durationDist}
                  color={PURPLE}
                  type="bar"
                />
              </Card>
              <Card className="p-6">
                <CategoryChart
                  title="Scroll depth (% of viewers reaching)"
                  data={scrollDepth}
                  color={PURPLE}
                  type="area"
                  valueSuffix="%"
                />
              </Card>
            </div>
          </Section>

          <Section title="Audience">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="p-6">
                <BreakdownList title="Traffic source" rows={trafficSources} />
              </Card>
              <Card className="p-6">
                <BreakdownList title="Device" rows={devices} />
              </Card>
              <Card className="p-6">
                <BreakdownList title="Country" rows={countries} />
              </Card>
              <Card className="p-6">
                <BreakdownList title="Browser" rows={browsers} />
              </Card>
              <Card className="p-6">
                <BreakdownList
                  title="Operating system"
                  rows={operatingSystems}
                />
              </Card>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
