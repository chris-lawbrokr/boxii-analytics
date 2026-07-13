/**
 * Re-capture the Boxii overlay screenshot the dashboard heatmap is drawn onto.
 *
 * The overlay is a `position: fixed`, scroll-locked, full-viewport stage, so
 * heatmap clicks are viewport-relative. We screenshot the overlay open at the
 * dominant desktop viewport (1512x828) so the stored image lines up with the
 * clicks that `getOverlayClicks()` fetches (filtered to that viewport band).
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
const DEV_URL = `http://localhost:5173/?site=${TENANT}`;
const W = 1512;
const H = 828;

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, `../public/boxii-overlay-${TENANT}.png`);

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
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
});

await page.goto(DEV_URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForFunction(
  () => {
    const el = document.querySelector("boxii-overlay");
    return !!el?.shadowRoot?.querySelector(".stage");
  },
  { timeout: 15000 },
);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200); // let the stage-in animation settle

await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: W, height: H } });
console.log(`Captured ${TENANT} overlay → ${OUT}`);

await browser.close();
