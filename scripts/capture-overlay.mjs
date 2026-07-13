/**
 * Re-capture the Boxii overlay screenshots the dashboard heatmaps are drawn onto,
 * one per device (desktop + mobile).
 *
 * The overlay is a `position: fixed`, scroll-locked, full-viewport stage, so
 * heatmap clicks are viewport-relative. We screenshot the overlay open at each
 * device's dominant viewport so the stored image lines up with the clicks that
 * `getOverlayClicks(device)` fetches (filtered to that viewport-width band).
 *
 * Prereqs:
 *   - The boxii-js repo checked out next to this one, with `npm run dev` running
 *     (Vite dev harness at http://localhost:5173 — mounts the overlay open).
 *   - A Chromium/Chrome executable. Set CHROME_PATH, or it falls back to a
 *     Playwright-cached Chrome for Testing, then system Google Chrome.
 *   - `npm i -D playwright-core` (only needed to run this script).
 *
 * Usage:  node scripts/capture-overlay.mjs [tenant]      (tenant defaults to "lawbrokr")
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const TENANT = process.argv[2] || "lawbrokr";

// Dominant viewport per device, from PostHog session data for the overlay page.
const DEVICES = [
  { name: "desktop", width: 1512, height: 828 },
  { name: "mobile", width: 402, height: 660 },
];

const here = dirname(fileURLToPath(import.meta.url));

function resolveChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1232/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "No Chrome found. Set CHROME_PATH to a Chromium/Chrome executable.",
    );
  }
  return found;
}

const browser = await chromium.launch({
  executablePath: resolveChrome(),
  headless: true,
});

for (const device of DEVICES) {
  const page = await browser.newPage({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: 2,
    isMobile: device.name === "mobile",
    hasTouch: device.name === "mobile",
  });

  await page.goto(`http://localhost:5173/?site=${TENANT}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForFunction(
    () => !!document.querySelector("boxii-overlay")?.shadowRoot?.querySelector(".stage"),
    { timeout: 15000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200); // let the stage-in animation settle

  const out = resolve(here, `../public/boxii-overlay-${TENANT}-${device.name}.png`);
  await page.screenshot({
    path: out,
    clip: { x: 0, y: 0, width: device.width, height: device.height },
  });
  console.log(`Captured ${TENANT} ${device.name} (${device.width}x${device.height}) → ${out}`);
  await page.close();
}

await browser.close();
