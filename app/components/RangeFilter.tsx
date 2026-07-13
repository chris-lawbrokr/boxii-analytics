"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGE_OPTIONS, normalizeRange } from "../lib/ranges";

export default function RangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = normalizeRange(searchParams.get("days"));

  return (
    <div
      className="inline-flex rounded-lg border border-border bg-surface p-0.5"
      role="tablist"
      aria-label="Date range"
    >
      {RANGE_OPTIONS.map((days) => {
        const active = days === current;
        return (
          <button
            key={days}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => router.push(`${pathname}?days=${days}`)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              active
                ? "bg-white text-brand-dark shadow-[0px_1px_2px_0px_rgba(59,37,89,0.12)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {days}d
          </button>
        );
      })}
    </div>
  );
}
