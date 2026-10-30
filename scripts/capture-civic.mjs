import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const directory = ".impeccable/review/civic";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const reports = [];
const contracts = await (
  await fetch(origin + "/api/catalog?kind=contracts")
).json();
const contract = contracts.rows[0];
const specs = [
  { name: "desktop", width: 1440, height: 1000, url: "/" },
  { name: "mobile", width: 390, height: 844, url: "/" },
  {
    name: "detail",
    width: 1440,
    height: 1000,
    url: "/?m=2208106&case=06554893000101-1-000001%2F2025",
  },
  {
    name: "network",
    width: 1440,
    height: 1000,
    url: "/?supplier=12973088000107&tab=network&depth=2",
  },
  {
    name: "mobile-network",
    width: 390,
    height: 844,
    url: "/?supplier=12973088000107&tab=network&depth=2",
  },
  { name: "watch", width: 1440, height: 1000, url: "/?tab=insights" },
  { name: "mobile-map", width: 390, height: 844, url: "/?tab=map" },
];
if (contract)
  specs.push(
    { name: "contracts", width: 1440, height: 1000, url: "/?tab=contracts" },
    {
      name: "contract-detail",
      width: 1440,
      height: 1000,
      url: `/?tab=contracts&case=${encodeURIComponent(contract.id)}`,
    },
    {
      name: "mobile-contract",
      width: 390,
      height: 844,
      url: `/?tab=contracts&case=${encodeURIComponent(contract.id)}`,
    },
  );
for (const spec of specs) {
  const page = await browser.newPage({
    viewport: { width: spec.width, height: spec.height },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((list) => {
      for (const x of list.getEntries()) window.__lcp = x.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(origin + spec.url);
  await page.locator(".coverage-footer").waitFor();
  if (spec.name.includes("detail") || spec.name === "mobile-contract")
    await page.locator(".record-title").waitFor();
  else if (spec.name.includes("network"))
    await page.locator(".network-node").first().waitFor();
  else if (spec.name === "mobile-map")
    await page.locator('[data-map-ready="true"]').waitFor({ timeout: 30000 });
  else if (spec.name !== "watch")
    await page.locator(".purchase-row").first().waitFor();
  else await page.locator(".insights").waitFor();
  if (spec.name === "desktop" || spec.name === "contracts")
    await page.locator('[data-map-ready="true"]').waitFor({ timeout: 30000 });
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
  await page.screenshot({
    path: `${directory}/${spec.name}-viewport.png`,
    fullPage: false,
  });
  reports.push({
    spec,
    errors,
    ...(await page.evaluate(() => ({
      lcpMs: window.__lcp,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      resourceBytes: performance
        .getEntriesByType("resource")
        .reduce((s, x) => s + x.encodedBodySize, 0),
    }))),
  });
  await page.close();
}
await browser.close();
await writeFile(
  `${directory}/evidence.json`,
  JSON.stringify(
    { origin, capturedAt: new Date().toISOString(), reports },
    null,
    2,
  ),
);
console.log(JSON.stringify(reports));
