"use client";

import { useCallback, useEffect, useRef } from "react";
import type { HeatmapPoint } from "../lib/posthog";

type Props = {
  points: HeatmapPoint[];
  imageSrc: string;
  baseWidth: number;
  baseHeight: number;
};

// blue → cyan → lime → yellow → red
const RAMP: [number, number, number][] = [
  [0, 0, 255],
  [0, 255, 255],
  [0, 255, 0],
  [255, 255, 0],
  [255, 0, 0],
];

function rampColor(t: number): [number, number, number] {
  const s = Math.min(0.999, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.floor(s);
  const f = s - i;
  const a = RAMP[i];
  const b = RAMP[i + 1];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

export default function OverlayHeatmap({
  points,
  imageSrc,
  baseWidth,
  baseHeight,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    // Match the canvas backing store to the image's displayed size (retina-aware).
    const cssW = img.clientWidth;
    const cssH = img.clientHeight || (cssW * baseHeight) / baseWidth;
    if (cssW === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    if (points.length === 0) return;

    const max = Math.max(...points.map((p) => p.count), 1);
    const radius = Math.max(18, cssW * 0.03);

    // 1) Accumulate soft radial blobs into an alpha-only layer.
    for (const p of points) {
      const x = p.x * cssW;
      const y = (p.y / baseHeight) * cssH;
      const alpha = Math.min(1, 0.25 + 0.75 * (p.count / max));
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, `rgba(0,0,0,${alpha})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2) Colorize the accumulated alpha through the heat ramp.
    const w = canvas.width;
    const h = canvas.height;
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      if (a === 0) continue;
      const [r, g, b] = rampColor(a);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = Math.min(255, a * 235);
    }
    ctx.putImageData(id, 0, 0);
  }, [points, baseWidth, baseHeight]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(() => draw());
    if (imgRef.current) ro.observe(imgRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Boxii overlay"
        width={baseWidth}
        height={baseHeight}
        className="block w-full"
        onLoad={draw}
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute left-0 top-0 opacity-70 mix-blend-multiply"
      />
    </div>
  );
}
