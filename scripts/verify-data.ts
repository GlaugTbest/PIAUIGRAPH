import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { compare } from "../src/lib/analysis";
import { neighborhood } from "../src/lib/graph";
import type { Dataset, Graph } from "../src/lib/model";
const scope = process.argv.includes("--catalog")
  ? "catalog"
  : process.argv.includes("--state")
    ? "state"
    : "pilot";
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
assert.equal(new Set(d.procedures.map((p) => p.id)).size, d.procedures.length);
for (const p of d.procedures) {
  assert.equal(
    p.id,
    `${p.cnpj}-1-${String(p.sequence).padStart(6, "0")}/${p.year}`,
  );
  assert.ok(d.municipalities.some((m) => m.id === p.municipalityId));
  assert.ok(p.agency && p.unit && p.unitCode);
  assert.ok(![p.agency, p.unit, p.unitCode].includes("undefined"));
}
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
      ...(d.contracts ? { contracts: d.contracts } : {}),
    }),
  )
  .digest("hex");
assert.equal(sha, d.manifest.datasetSha256);
for (const o of d.observations) {
  assert.ok(/^\d{14}$/.test(o.supplierId));
  assert.ok(o.quantity > 0 && o.unitPrice > 0);
  assert.ok(o.supplier.trim() && o.supplier !== "undefined");
  assert.ok(Number.isFinite(Date.parse(o.date)));
  assert.ok(o.source.url.startsWith("https://pncp.gov.br/api/pncp/v1/orgaos/"));
  assert.ok(d.procedures.some((p) => p.id === o.procedureId));
  assert.ok([2024, 2025].includes(o.year));
  assert.ok(o.source.sha256.length === 64 && o.itemSource.sha256.length === 64);
  const result = compare(o, d.observations);
  assert.ok(result.references.every((r) => r.procedureId !== o.procedureId));
}
const graphNodeIds = new Set(g.nodes.map((n) => n.id));
for (const e of g.edges) {
  assert.ok(graphNodeIds.has(e.source));
  assert.ok(graphNodeIds.has(e.target));
  assert.ok(
    /^https:\/\/(pncp.gov.br|servicodados.ibge.gov.br)\//.test(e.evidence),
  );
}
if (scope === "catalog") {
  assert.equal(d.manifest.catalogCoverage?.length, 19 * 24);
  const windows = d.manifest.contractIndexCoverage ?? [];
  assert.equal(windows.length, 24);
  assert.equal(new Set(windows.map((w) => `${w.year}-${w.month}`)).size, 24);
  for (const w of windows) {
    assert.ok([2024, 2025].includes(w.year) && w.month >= 1 && w.month <= 12);
    assert.equal(
      w.captured,
      w.reported,
      "Every official monthly result must be captured",
    );
  }
  assert.equal(
    windows.reduce((s, w) => s + w.included, 0),
    d.contracts?.length,
  );
  assert.equal(d.manifest.contracts, d.contracts?.length);
  assert.equal(
    new Set(d.contracts?.map((c) => c.id)).size,
    d.contracts?.length,
  );
  const ids = new Set(d.procedures.map((p) => p.id));
  for (const c of d.contracts ?? []) {
    assert.ok(!c.supplierId || /^\d{14}$/.test(c.supplierId));
    assert.ok(!c.procedureId || ids.has(c.procedureId));
    assert.ok(d.municipalities.some((m) => m.id === c.municipalityId));
  }
  assert.ok(d.procedures.some((p) => !/(medicamento|farmac)/i.test(p.object)));
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
