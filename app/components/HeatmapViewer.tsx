"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import OverlayHeatmap from "./OverlayHeatmap";
import {
  HEAT_TYPES,
  type Device,
  type HeatType,
  type HeatmapPoint,
  type OverlayCapture,
} from "../lib/ranges";

const DEVICES: { id: Device; label: string; icon: typeof Monitor }[] = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

type ByType = Record<HeatType, HeatmapPoint[]>;

export default function HeatmapViewer({
  captures,
  points,
}: {
  captures: Record<Device, OverlayCapture>;
  points: Record<Device, ByType>;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [type, setType] = useState<HeatType>("click");

  const capture = captures[device];
  const active = points[device][type];
  const total = active.reduce((sum, p) => sum + p.count, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Device toggle */}
          <div
            className="inline-flex rounded-lg border border-border bg-surface p-0.5"
            role="tablist"
            aria-label="Device"
          >
            {DEVICES.map((d) => {
              const activeTab = d.id === device;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab}
                  onClick={() => setDevice(d.id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    activeTab
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
          {/* Type toggle */}
          <div
            className="inline-flex rounded-lg border border-border bg-surface p-0.5"
            role="tablist"
            aria-label="Interaction type"
          >
            {HEAT_TYPES.map((t) => {
              const activeTab = t.id === type;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab}
                  onClick={() => setType(t.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    activeTab
                      ? "bg-white text-brand-dark shadow-[0px_1px_2px_0px_rgba(59,37,89,0.12)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
          {total.toLocaleString()} {type === "mousemove" ? "moves" : "clicks"}
        </span>
      </div>

      {active.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface py-16 text-center text-sm text-muted-foreground">
          No {type === "mousemove" ? "movement" : type} data on {device} for this
          range.
        </p>
      ) : (
        <div
          className={device === "mobile" ? "mx-auto max-w-[420px]" : "w-full"}
        >
          <OverlayHeatmap
            key={`${device}-${type}`}
            points={active}
            imageSrc={capture.image}
            baseWidth={capture.width}
            baseHeight={capture.height}
          />
        </div>
      )}
    </div>
  );
}
