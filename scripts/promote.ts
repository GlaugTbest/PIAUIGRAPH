import { readFile, mkdir, writeFile, copyFile, rename } from "node:fs/promises";
import type { Dataset } from "../src/lib/model";
const scope = process.argv.includes("--state") ? "state" : "pilot";
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
await copyFile(`data/staging/${scope}.json`, `${dir}/dataset.json`);
await copyFile(`data/staging/${scope}-graph.json`, `${dir}/graph.json`);
await copyFile(
  `data/staging/${scope}-verification.json`,
  `${dir}/verification.json`,
);
await copyFile(`data/staging/${scope}-sources.json`, `${dir}/sources.json`);
await writeFile(
  "data/active.tmp",
  JSON.stringify({ version: data.manifest.version }),
);
await rename("data/active.tmp", "data/active.json");
console.log(`Activated verified ${scope} release ${data.manifest.version}`);
