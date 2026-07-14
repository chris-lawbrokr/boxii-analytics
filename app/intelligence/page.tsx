import { Suspense } from "react";
import SegmentTable from "../components/SegmentTable";
import LinkList from "../components/LinkList";
import FunnelCard from "../components/FunnelCard";
import BreakdownList from "../components/BreakdownList";
import KpiCard from "../components/KpiCard";
import RangeFilter from "../components/RangeFilter";
import { Card } from "@/components/ui/card/Card";
import {
  getTrafficSourceConversion,
  getChannelConversion,
  getReferrerConversion,
  getCityConversion,
  getRegionConversion,
  getDeviceConversion,
  getBrowserConversion,
  getTopLinks,
  getMiniFunnel,
  getMiniClicks,
  getCloseTriggers,
  normalizeRange,
  type SegmentRow,
  type LinkRow,
  type BreakdownRow,
  type MiniFunnel,
} from "../lib/posthog";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function IntelligencePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = normalizeRange(daysParam);

  let error: string | null = null;
  let sources: SegmentRow[] = [];
  let channels: SegmentRow[] = [];
  let referrers: SegmentRow[] = [];
  let cities: SegmentRow[] = [];
  let regions: SegmentRow[] = [];
  let devices: SegmentRow[] = [];
  let browsers: SegmentRow[] = [];
  let links: LinkRow[] = [];
  let mini: MiniFunnel = { closed: 0, engaged: 0, reopened: 0 };
  let miniClicks: BreakdownRow[] = [];
  let closeTriggers: BreakdownRow[] = [];

  try {
    [
      sources,
      channels,
      referrers,
      cities,
      regions,
      devices,
      browsers,
      links,
      mini,
      miniClicks,
      closeTriggers,
    ] = await Promise.all([
      getTrafficSourceConversion(days),
      getChannelConversion(days),
      getReferrerConversion(days),
      getCityConversion(days),
      getRegionConversion(days),
      getDeviceConversion(days),
      getBrowserConversion(days),
      getTopLinks(days),
      getMiniFunnel(days),
      getMiniClicks(days),
      getCloseTriggers(days),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics.";
  }

  const miniTotalClicks = miniClicks.reduce((s, r) => s + r.value, 0);
  const engagedRate = mini.closed
    ? Math.round((mini.engaged / mini.closed) * 100)
    : 0;
  const reopenRate = mini.closed
    ? Math.round((mini.reopened / mini.closed) * 100)
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold leading-9 -tracking-tight text-brand-dark">
            Conversion intelligence
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
          <Section title="" description="">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-6 lg:col-span-2">
                <SegmentTable
                  title="Traffic source"
                  subtitle="Boxii's own normalized attribution, resolved at page load."
                  rows={sources}
                />
              </Card>
              <Card className="p-6">
                <SegmentTable
                  title="Channel"
                  subtitle="PostHog's channel classification, for cross-checking."
                  rows={channels}
                />
              </Card>
              <Card className="p-6">
                <SegmentTable title="Referring domain" rows={referrers} />
              </Card>
            </div>
          </Section>

          <Section
            title="Geography"
            description="Where converting visitors are. City and region come from GeoIP on every event."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <SegmentTable title="State / region" rows={regions} />
              </Card>
              <Card className="p-6">
                <SegmentTable title="City" rows={cities} />
              </Card>
            </div>
          </Section>

          <Section title="Device">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <SegmentTable title="Device type" rows={devices} />
              </Card>
              <Card className="p-6">
                <SegmentTable title="Browser" rows={browsers} />
              </Card>
            </div>
          </Section>

          <Section
            title="Links"
            description="Only CTAs that navigate somewhere carry a destination, so this is the subset of the overlay that sends people onward."
          >
            <Card className="p-6">
              <LinkList
                title="Most clicked links"
                subtitle="Ranked by clicks across the selected range."
                rows={links}
              />
            </Card>
          </Section>

          <Section
            title="Mini Boxii"
            description="The collapsed floating launcher, which only exists once the overlay is dismissed — the overlay's second act."
          >
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card className="p-5">
                <KpiCard
                  label="Mini clicks"
                  value={miniTotalClicks.toLocaleString()}
                  sub="while collapsed"
                />
              </Card>
              <Card className="p-5">
                <KpiCard
                  label="Engaged mini"
                  value={`${engagedRate}%`}
                  sub={`${mini.engaged} of ${mini.closed} dismissals`}
                />
              </Card>
              <Card className="p-5">
                <KpiCard
                  label="Reopen rate"
                  value={`${reopenRate}%`}
                  sub={`${mini.reopened} came back`}
                />
              </Card>
              <Card className="p-5">
                <KpiCard
                  label="Dismissals"
                  value={mini.closed.toLocaleString()}
                  sub="sessions that closed it"
                />
              </Card>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <FunnelCard
                  title="Dismiss → mini → return"
                  steps={[
                    { label: "Closed the overlay", value: mini.closed },
                    { label: "Clicked mini Boxii", value: mini.engaged },
                    { label: "Reopened Boxii", value: mini.reopened },
                  ]}
                />
              </Card>
              <Card className="p-6">
                <BreakdownList title="Mini Boxii clicks" rows={miniClicks} />
              </Card>
              <Card className="p-6 lg:col-span-2">
                <BreakdownList
                  title="How the overlay gets dismissed"
                  rows={closeTriggers}
                />
              </Card>
            </div>
            <p className="text-xs text-muted-foreground">
              Attributed by{" "}
              <code className="font-mono">overlay_state = &quot;collapsed&quot;</code>
              , so CTAs opened from the launcher&apos;s menu count too — not just
              the reopen tap. Low volume: all mini activity to date falls inside
              the last 7 days, so the 30d and 90d ranges currently show the same
              numbers.
            </p>
          </Section>

          <Section title="Persona">
            <Card className="p-6">
              <p className="text-sm font-semibold text-brand-dark">
                Age and gender aren&apos;t available
              </p>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                PostHog doesn&apos;t collect demographics, and Boxii runs{" "}
                <code className="font-mono text-xs">
                  person_profiles: &apos;identified_only&apos;
                </code>{" "}
                with no lead-capture widget shipped yet — so every session in
                this dashboard is anonymous. Nothing in the event stream implies
                age or gender, and inferring it from names or geography would be
                a guess dressed up as a metric.
              </p>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                Unlocking this needs two things: the lead-capture widget calling{" "}
                <code className="font-mono text-xs">identify()</code> (the
                plumbing already exists in{" "}
                <code className="font-mono text-xs">
                  src/analytics/identify.ts
                </code>
                ), and then a third-party enrichment provider keyed on the
                captured email. Until then, the segments above are the real
                &quot;who&quot; — location, device, and source.
              </p>
            </Card>
          </Section>
        </>
      )}
    </div>
  );
}
