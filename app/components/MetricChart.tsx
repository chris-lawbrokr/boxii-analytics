"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { MetricPoint } from "../lib/ranges";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="h-[160px] w-full animate-pulse rounded-lg bg-surface" />
  ),
});

export type MetricFormat = "number" | "duration";

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

export default function MetricChart({
  title,
  data,
  color,
  format = "number",
  showTitle = true,
}: {
  title: string;
  data: MetricPoint[];
  color: string;
  format?: MetricFormat;
  showTitle?: boolean;
}) {
  // Headline: total clicks/views over the range; average for duration.
  let headline: string;
  if (format === "duration") {
    const nonZero = data.filter((d) => d.value > 0);
    const avg = nonZero.length
      ? nonZero.reduce((s, d) => s + d.value, 0) / nonZero.length
      : 0;
    headline = formatDuration(avg);
  } else {
    headline = data
      .reduce((s, d) => s + d.value, 0)
      .toLocaleString();
  }

  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "var(--font-geist-sans), sans-serif",
      background: "transparent",
      sparkline: { enabled: false },
    },
    colors: [color],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.03 },
    },
    grid: { borderColor: "rgba(148,163,184,0.15)", strokeDashArray: 4 },
    xaxis: {
      type: "datetime",
      categories: data.map((d) => d.day),
      labels: { style: { colors: "#9ca3af", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        formatter: (v) =>
          format === "duration" ? formatDuration(v) : `${Math.round(v)}`,
      },
    },
    tooltip: {
      theme: "light",
      x: { format: "MMM d, yyyy" },
      y: {
        formatter: (v) =>
          format === "duration"
            ? formatDuration(v)
            : `${Math.round(v).toLocaleString()}`,
      },
    },
  };

  const series = [{ name: title, data: data.map((d) => d.value) }];

  return (
    <div>
      {showTitle && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      <p className="mt-1 mb-2 text-2xl font-semibold text-brand-dark">
        {headline}
      </p>
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        height={160}
      />
    </div>
  );
}
