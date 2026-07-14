import { BRAND_PURPLE as PURPLE } from "../lib/theme";
import { MIN_SESSIONS_FOR_RATE, type SegmentRow } from "../lib/ranges";

/**
 * A segment ranked by traffic, showing how far each one converts. Rows below
 * MIN_SESSIONS_FOR_RATE keep their counts but withhold the rate — a 100% CTA
 * rate off two sessions reads as a headline and is nothing of the kind.
 */
export default function SegmentTable({
  title,
  rows,
  subtitle,
}: {
  title: string;
  rows: SegmentRow[];
  subtitle?: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-brand-dark">{title}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No data for this range.
        </p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 text-left font-medium">Segment</th>
              <th className="pb-2 text-right font-medium">Sessions</th>
              {/* Opened is the least load-bearing column; drop it first when narrow. */}
              <th className="hidden pb-2 text-right font-medium sm:table-cell">
                Opened
              </th>
              <th className="pb-2 pl-3 text-right font-medium">CTA rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const reliable = r.sessions >= MIN_SESSIONS_FOR_RATE;
              return (
                <tr key={r.label} className="border-t border-border">
                  <td className="max-w-0 py-2.5 pr-3">
                    <span className="block truncate text-foreground">
                      {r.label}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {r.sessions.toLocaleString()}
                  </td>
                  <td className="hidden py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {reliable ? `${r.openRate}%` : "—"}
                  </td>
                  <td className="w-[38%] py-2.5 pl-3">
                    {reliable ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(r.ctaRate, 2)}%`,
                              backgroundColor: PURPLE,
                            }}
                          />
                        </div>
                        <span className="shrink-0 tabular-nums font-medium text-brand-dark">
                          {r.ctaRate}%
                        </span>
                      </div>
                    ) : (
                      <p className="text-right text-xs text-muted-foreground">
                        too few sessions
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
