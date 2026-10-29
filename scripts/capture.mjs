import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const directory = ".impeccable/review";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const reports = [];
for (const spec of [
  { name: "desktop", width: 1440, height: 1000, url: "/" },
  { name: "mobile", width: 390, height: 844, url: "/" },
  {
    name: "desktop-detail",
    width: 1440,
    height: 1000,
    url: "/?m=2208106&case=06554893000101-1-000001%2F2025",
  },
  {
    name: "desktop-network",
    width: 1440,
    height: 1000,
    url: "/?m=2204402&supplier=12973088000107&tab=network&depth=2",
  },
]) {
  const page = await browser.newPage({
    viewport: { width: spec.width, height: spec.height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(origin + spec.url);
  await page.locator('[data-map-ready="true"]').waitFor({ timeout: 30000 });
  await page.locator(".summary-grid strong").first().waitFor();
  if (spec.name.includes("detail"))
    await page.locator(".item-evidence").first().waitFor();
  if (spec.name.includes("network"))
    await page.locator(".network-visual svg").waitFor();
  if (spec.name.includes("detail"))
    await page.locator(".item-evidence").first().scrollIntoViewIfNeeded();
  if (spec.name.includes("network"))
    await page.locator(".network-visual").scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `${directory}/${spec.name}.png`,
    fullPage: true,
  });
  const performance = await page.evaluate(() => ({
    lcpMs: window.__lcp,
    navigation: performance
      .getEntriesByType("navigation")
      .map((n) => ({
        domInteractive: n.domInteractive,
        loadEventEnd: n.loadEventEnd,
      })),
    resources: performance
      .getEntriesByType("resource")
      .map((r) => ({
        name: r.name.split("/").slice(-1)[0],
        encodedBytes: r.encodedBodySize,
        transferBytes: r.transferSize,
      })),
    horizontalOverflow:
      document.documentElement.scrollWidth > window.innerWidth + 1,
  }));
  reports.push({ viewport: spec, errors, ...performance });
  await page.close();
}
await browser.close();
await writeFile(
  `${directory}/browser-evidence.json`,
  JSON.stringify(
    { origin, capturedAt: new Date().toISOString(), reports },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    reports.map((r) => ({
      name: r.viewport.name,
      lcpMs: r.lcpMs,
      bytes: r.resources.reduce((s, x) => s + x.encodedBytes, 0),
      errors: r.errors,
      horizontalOverflow: r.horizontalOverflow,
    })),
    null,
    2,
  ),
);
