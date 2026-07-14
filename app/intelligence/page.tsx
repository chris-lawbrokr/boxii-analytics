import SegmentTable from "../components/SegmentTable";
import LinkList from "../components/LinkList";
import FunnelCard from "../components/FunnelCard";
import BreakdownList from "../components/BreakdownList";
import KpiCard from "../components/KpiCard";
import PageHeader from "../components/PageHeader";
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
      <PageHeader title="Conversion intelligence" />

      {error ? (
        <Card className="border border-status-error-border bg-status-error-bg text-status-error-text">
          <p className="font-medium">Couldn&apos;t load analytics.</p>
          <p className="mt-1 font-mono text-xs opacity-80">{error}</p>
        </Card>
      ) : (
        <>
          <Section title="">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-6 lg:col-span-2">
                <SegmentTable title="Traffic source" rows={sources} />
              </Card>
              <Card className="p-6">
                <SegmentTable title="Channel" rows={channels} />
              </Card>
              <Card className="p-6">
                <SegmentTable title="Referring domain" rows={referrers} />
              </Card>
            </div>
          </Section>

          <Section title="Geography">
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

          <Section title="Links">
            <Card className="p-6">
              <LinkList title="Most clicked links" rows={links} />
            </Card>
          </Section>

          <Section title="Mini Boxii">
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
          </Section>
        </>
      )}
    </div>
  );
}
