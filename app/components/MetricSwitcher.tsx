"use client";

import { useState } from "react";
import MetricChart, { type MetricFormat } from "./MetricChart";
import type { MetricPoint } from "../lib/ranges";

export type MetricOption = {
  key: string;
  label: string;
  data: MetricPoint[];
  color: string;
  format: MetricFormat;
};

export default function MetricSwitcher({
  options,
}: {
  options: MetricOption[];
}) {
  const [activeKey, setActiveKey] = useState(options[0].key);
  const active = options.find((o) => o.key === activeKey) ?? options[0];

  return (
    <div>
      <div
        className="mb-2 inline-flex rounded-lg border border-border bg-surface p-0.5"
        role="tablist"
        aria-label="Metric"
      >
        {options.map((o) => {
          const isActive = o.key === active.key;
          return (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveKey(o.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-white text-brand-dark shadow-[0px_1px_2px_0px_rgba(59,37,89,0.12)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <MetricChart
        key={active.key}
        title={active.label}
        data={active.data}
        color={active.color}
        format={active.format}
        showTitle={false}
      />
    </div>
  );
}
