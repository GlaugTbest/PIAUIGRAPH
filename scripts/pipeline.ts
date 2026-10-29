import { spawnSync } from "node:child_process";
const state = process.argv.includes("--state");
const catalog = process.argv.includes("--catalog");
const extra = state ? ["--state"] : [];
const steps = catalog
  ? [
      ["scripts/collect.ts", "--state"],
      ["scripts/collect-catalog.ts", "--medicine-stage"],
      ["scripts/collect-contract-index.ts"],
      ["scripts/finalize-catalog.ts"],
      ["scripts/neo4j.ts", "--catalog"],
      ["scripts/verify-data.ts", "--catalog"],
      ["scripts/promote.ts", "--catalog"],
    ]
  : [
      [
        "scripts/collect.ts",
        ...extra,
        ...(process.argv.includes("--refresh") ? ["--refresh"] : []),
      ],
      ["scripts/neo4j.ts", ...extra],
      ["scripts/verify-data.ts", ...extra],
      ["scripts/promote.ts", ...extra],
    ];
for (const args of steps) {
  const result = spawnSync(process.execPath, ["--import", "tsx", ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
