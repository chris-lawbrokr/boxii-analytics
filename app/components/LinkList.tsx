import { BRAND_PURPLE as PURPLE } from "../lib/theme";
import type { LinkRow } from "../lib/ranges";

/** Strip the scheme and trailing slash so the path — the part that differs — leads. */
function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function LinkList({
  title,
  rows,
  subtitle,
}: {
  title: string;
  rows: LinkRow[];
  subtitle?: string;
}) {
  const max = Math.max(...rows.map((r) => r.clicks), 1);

  return (
    <div>
      <p className="text-sm font-semibold text-brand-dark">{title}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No link clicks for this range.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.url}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="truncate text-foreground hover:text-brand-dark hover:underline"
                >
                  {r.label}
                </a>
                <span className="shrink-0 tabular-nums font-medium text-brand-dark">
                  {r.clicks.toLocaleString()}
                </span>
              </div>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {prettyUrl(r.url)}
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((r.clicks / max) * 100, 2)}%`,
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
