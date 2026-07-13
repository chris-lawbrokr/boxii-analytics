"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { DailyVisitors } from "../lib/posthog";

// ApexCharts touches `window`, so it can only render on the client.
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full animate-pulse rounded-lg bg-zinc-100" />
  ),
});

export default function VisitorsChart({ data }: { data: DailyVisitors[] }) {
  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "var(--font-geist-sans), sans-serif",
      background: "transparent",
    },
    theme: { mode: "light" },
    colors: ["#6366f1"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 },
    },
    grid: { borderColor: "rgba(148,163,184,0.15)", strokeDashArray: 4 },
    xaxis: {
      type: "datetime",
      categories: data.map((d) => d.day),
      labels: { style: { colors: "#94a3b8" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: "#94a3b8" } },
      min: 0,
    },
    tooltip: {
      x: { format: "MMM d, yyyy" },
      theme: "light",
    },
  };

  const series = [
    {
      name: "Visitors",
      data: data.map((d) => d.visitors),
    },
  ];

  return (
    <ReactApexChart
      options={options}
      series={series}
      type="area"
      height={350}
    />
  );
}
