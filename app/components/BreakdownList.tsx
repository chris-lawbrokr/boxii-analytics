import type { BreakdownRow } from "../lib/ranges";
import { BRAND_PURPLE as PURPLE } from "../lib/theme";

export default function BreakdownList({
  title,
  rows,
  unit,
}: {
  title: string;
  rows: BreakdownRow[];
  unit?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-brand-dark">{title}</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No data for this range.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{r.label}</span>
                <span className="shrink-0 font-medium text-brand-dark">
                  {r.value.toLocaleString()}
                  {unit}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((r.value / max) * 100, 2)}%`,
                    backgroundColor: PURPLE,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
