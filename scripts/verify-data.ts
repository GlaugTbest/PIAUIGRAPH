import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { compare } from "../src/lib/analysis";
import { neighborhood } from "../src/lib/graph";
import type { Dataset, Graph } from "../src/lib/model";
const scope = process.argv.includes("--state") ? "state" : "pilot";
const d: Dataset = JSON.parse(
  await readFile(`data/staging/${scope}.json`, "utf8"),
);
const g: Graph = JSON.parse(
  await readFile(`data/staging/${scope}-graph.json`, "utf8"),
);
assert.equal(d.municipalities.length, 224);
assert.equal(d.regions.length, 19);
assert.equal(
  new Set(d.observations.map((o) => o.id)).size,
  d.observations.length,
);
assert.equal(d.manifest.sourceFailures, 0);
assert.ok(d.manifest.neo4j.verified);
assert.ok(g.verified);
const sha = createHash("sha256")
  .update(
    JSON.stringify({
      municipalities: d.municipalities,
      regions: d.regions,
      procedures: d.procedures,
      observations: d.observations,
      exclusions: d.exclusions,
    }),
  )
  .digest("hex");
assert.equal(sha, d.manifest.datasetSha256);
for (const o of d.observations) {
  assert.ok(/^\d{14}$/.test(o.supplierId));
  assert.ok(o.quantity > 0 && o.unitPrice > 0);
  assert.ok(d.procedures.some((p) => p.id === o.procedureId));
  assert.ok([2024, 2025].includes(o.year));
  assert.ok(o.source.sha256.length === 64 && o.itemSource.sha256.length === 64);
  const result = compare(o, d.observations);
  assert.ok(result.references.every((r) => r.procedureId !== o.procedureId));
}
for (const e of g.edges) {
  assert.ok(g.nodes.some((n) => n.id === e.source));
  assert.ok(g.nodes.some((n) => n.id === e.target));
  assert.ok(
    /^https:\/\/(pncp.gov.br|servicodados.ibge.gov.br)\//.test(e.evidence),
  );
}
const paired = d.observations.filter(
  (o) => compare(o, d.observations).references.length > 0,
);
assert.ok(
  new Set(paired.map((o) => o.productId)).size >= 2,
  "Two real comparable groups required",
);
if (scope === "pilot") {
  assert.equal(d.procedures.length, 3);
  assert.deepEqual(
    [...new Set(d.procedures.map((p) => p.municipality))].sort(),
    ["Gilbués", "Milton Brandão", "Pimenteiras"],
  );
  const iv = d.observations.find(
    (o) =>
      o.procedureId === "06554893000101-1-000001/2025" &&
      o.productId === "ivermectina-6mg",
  )!;
  assert.equal(iv.unitPrice, 1.77);
  assert.equal(iv.quantity, 3000);
  assert.ok(
    compare(iv, d.observations).references.some(
      (r) => r.supplierId === "12973088000107" && r.unitPrice === 0.77,
    ),
  );
  assert.ok(
    neighborhood(g, "supplier:12973088000107", 2).nodes.some(
      (n) => n.id === "procedure:06554216000185-1-000001/2025",
    ),
  );
}
const report = {
  scope,
  version: d.manifest.version,
  passed: true,
  checkedAt: new Date().toISOString(),
  municipalities: d.municipalities.length,
  procedures: d.procedures.length,
  observations: d.observations.length,
  comparableProducts: new Set(paired.map((o) => o.productId)).size,
  neo4j: d.manifest.neo4j,
};
await writeFile(
  `data/staging/${scope}-verification.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
