import VisitorsChart from "./components/VisitorsChart";
import { Card } from "@/components/ui/card/Card";
import { getDailyVisitors, type DailyVisitors } from "./lib/posthog";

export default async function Home() {
  let data: DailyVisitors[] = [];
  let error: string | null = null;

  try {
    data = await getDailyVisitors(30);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics.";
  }

  const totalVisitors = data.reduce((sum, d) => sum + d.visitors, 0);
  const peak = data.reduce((max, d) => Math.max(max, d.visitors), 0);
  const today = data.at(-1)?.visitors ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-4xl font-bold leading-9 -tracking-tight text-brand-dark">
          Overview
        </h1>
      </header>

      {error ? (
        <Card className="border border-status-error-border bg-status-error-bg text-status-error-text">
          <p className="font-medium">Couldn&apos;t load analytics.</p>
          <p className="mt-1 font-mono text-xs opacity-80">{error}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total visitors (30d)" value={totalVisitors} />
            <StatCard label="Peak day" value={peak} />
            <StatCard label="Latest day" value={today} />
          </div>

          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold text-brand-dark">
              Daily visitors
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Unique visitors over the last 30 days
            </p>
            <VisitorsChart data={data} />
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-brand-dark">
        {value.toLocaleString()}
      </p>
    </Card>
  );
}
