import { writeFile } from "node:fs/promises";
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const endpoints = [
  "/api/catalog",
  "/api/catalog?q=servi%C3%A7os",
  "/api/catalog?kind=contracts",
  "/api/graph?center=supplier%3A12973088000107&depth=2",
];
const reports = [];
for (const endpoint of endpoints) {
  const times = [];
  let bytes = 0;
  for (let i = 0; i < 6; i++) {
    const start = performance.now(),
      response = await fetch(origin + endpoint);
    if (!response.ok) throw Error(`HTTP ${response.status} ${endpoint}`);
    const text = await response.text();
    bytes = Buffer.byteLength(text);
    JSON.parse(text);
    times.push(Math.round(performance.now() - start));
  }
  const warm = times.slice(1).sort((a, b) => a - b);
  reports.push({
    endpoint,
    firstMs: times[0],
    warmMedianMs: warm[2],
    warmMaxMs: warm.at(-1),
    responseBytes: bytes,
  });
}
const report = {
  origin,
  measuredAt: new Date().toISOString(),
  notes:
    "Sequential ordinary GETs, no throttling. First request is not guaranteed to be a server cold start. Laboratory observations, not a guarantee.",
  reports,
};
await writeFile(
  process.env.PERFORMANCE_REPORT ?? ".cache/catalog-performance.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
