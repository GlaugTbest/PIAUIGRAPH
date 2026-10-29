import { readFile, mkdir, writeFile, copyFile, rename } from "node:fs/promises";
import type { Dataset } from "../src/lib/model";
import { gzipSync } from "node:zlib";
const scope = process.argv.includes("--catalog")
  ? "catalog"
  : process.argv.includes("--state")
    ? "state"
    : "pilot";
const data: Dataset = JSON.parse(
  await readFile(`data/staging/${scope}.json`, "utf8"),
);
const verification = JSON.parse(
  await readFile(`data/staging/${scope}-verification.json`, "utf8"),
);
if (
  !verification.passed ||
  verification.version !== data.manifest.version ||
  !data.manifest.neo4j.verified
)
  throw new Error("Unverified release cannot be promoted");
const dir = `data/releases/${data.manifest.version}`;
await mkdir(dir, { recursive: true });
for (const [from, to] of [
  [scope, "dataset"],
  [`${scope}-graph`, "graph"],
  [`${scope}-sources`, "sources"],
]) {
  if (scope === "catalog")
    await writeFile(
      `${dir}/${to}.json.gz`,
      gzipSync(await readFile(`data/staging/${from}.json`), { level: 9 }),
    );
  else await copyFile(`data/staging/${from}.json`, `${dir}/${to}.json`);
}
await copyFile(
  `data/staging/${scope}-verification.json`,
  `${dir}/verification.json`,
);
await writeFile(
  "data/active.tmp",
  JSON.stringify({ version: data.manifest.version }),
);
await rename("data/active.tmp", "data/active.json");
console.log(`Activated verified ${scope} release ${data.manifest.version}`);
