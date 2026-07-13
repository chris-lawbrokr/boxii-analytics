"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { BreakdownRow } from "../lib/ranges";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] w-full animate-pulse rounded-lg bg-surface" />
  ),
});

export default function CategoryChart({
  title,
  data,
  color,
  type = "bar",
  valueSuffix = "",
}: {
  title: string;
  data: BreakdownRow[];
  color: string;
  type?: "bar" | "area";
  valueSuffix?: string;
}) {
  const options: ApexOptions = {
    chart: {
      type,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "var(--font-geist-sans), sans-serif",
      background: "transparent",
    },
    colors: [color],
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    stroke:
      type === "area"
        ? { curve: "smooth", width: 2 }
        : { width: 0 },
    fill:
      type === "area"
        ? {
            type: "gradient",
            gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.03 },
          }
        : { opacity: 1 },
    grid: { borderColor: "rgba(148,163,184,0.15)", strokeDashArray: 4 },
    xaxis: {
      categories: data.map((d) => d.label),
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        rotate: 0,
        hideOverlappingLabels: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        formatter: (v) => `${Math.round(v)}${valueSuffix}`,
      },
    },
    tooltip: {
      theme: "light",
      y: { formatter: (v) => `${Math.round(v).toLocaleString()}${valueSuffix}` },
    },
  };

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-brand-dark">{title}</p>
      <ReactApexChart
        options={options}
        series={[{ name: title, data: data.map((d) => d.value) }]}
        type={type}
        height={200}
      />
    </div>
  );
}
