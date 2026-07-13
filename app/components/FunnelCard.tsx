import { BRAND_PURPLE } from "../lib/theme";

type Step = { label: string; value: number };

export default function FunnelCard({
  title,
  steps,
}: {
  title: string;
  steps: Step[];
}) {
  const first = steps[0]?.value || 1;

  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-brand-dark">{title}</p>
      <div className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const pctOfFirst = Math.round((step.value / first) * 100);
          const prev = i > 0 ? steps[i - 1].value : null;
          const pctOfPrev =
            prev && prev > 0 ? Math.round((step.value / prev) * 100) : null;
          return (
            <div key={step.label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-foreground">{step.label}</span>
                <span className="font-medium text-brand-dark">
                  {step.value.toLocaleString()}
                  {pctOfPrev !== null && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {pctOfPrev}% of prev
                    </span>
                  )}
                </span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-md bg-surface">
                <div
                  className="h-full rounded-md"
                  style={{
                    width: `${Math.max(pctOfFirst, 2)}%`,
                    backgroundColor: BRAND_PURPLE,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
