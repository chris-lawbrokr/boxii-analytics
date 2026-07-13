"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import OverlayHeatmap from "./OverlayHeatmap";
import type { Device, HeatmapPoint, OverlayCapture } from "../lib/posthog";

export type DeviceView = {
  points: HeatmapPoint[];
  capture: OverlayCapture;
};

const DEVICES: { id: Device; label: string; icon: typeof Monitor }[] = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

export default function HeatmapViewer({
  views,
}: {
  views: Record<Device, DeviceView>;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const view = views[device];
  const totalClicks = view.points.reduce((sum, p) => sum + p.count, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
          role="tablist"
          aria-label="Device"
        >
          {DEVICES.map((d) => {
            const active = d.id === device;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDevice(d.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-white text-brand-dark shadow-[0px_1px_2px_0px_rgba(59,37,89,0.12)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <d.icon size={15} />
                {d.label}
              </button>
            );
          })}
        </div>
        <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
          {totalClicks.toLocaleString()} clicks
        </span>
      </div>

      {view.points.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface py-16 text-center text-sm text-muted-foreground">
          No clicks recorded on {device} yet.
        </p>
      ) : (
        <div
          className={device === "mobile" ? "mx-auto max-w-[420px]" : "w-full"}
        >
          <OverlayHeatmap
            key={device}
            points={view.points}
            imageSrc={view.capture.image}
            baseWidth={view.capture.width}
            baseHeight={view.capture.height}
          />
        </div>
      )}
    </div>
  );
}
