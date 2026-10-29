import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compare,
  identifyProduct,
  median,
  percentDifference,
  safeCsv,
} from "../src/lib/analysis";
import { neighborhood } from "../src/lib/graph";
import type { Observation, Graph } from "../src/lib/model";
// Synthetic records are isolated to tests; production data comes exclusively from the official importer.
function observation(
  id: string,
  price: number,
  procedure = id,
  agency = id,
  supplier = id,
  quantity = 100,
): Observation {
  return {
    id,
    procedureId: procedure,
    agencyId: agency,
    municipalityId: "2208106",
    productId: "ivermectina-6mg",
    product: "Ivermectina 6 mg",
    description: "IVERMECTINA 6MG",
    item: 1,
    result: 1,
    supplierId: supplier,
    supplier,
    date: "2025-03-10",
    year: 2025,
    quantity,
    unitPrice: price,
    total: quantity * price,
    originalUnit: "CPR",
    originalQuantity: quantity,
    originalPrice: price,
    conversion: 1,
    source: {
      url: "https://pncp.gov.br/test-fixture",
      sha256: "0".repeat(64),
      capturedAt: "2026-10-29T00:00:00Z",
    },
    itemSource: {
      url: "https://pncp.gov.br/test-fixture",
      sha256: "0".repeat(64),
      capturedAt: "2026-10-29T00:00:00Z",
    },
    precisionNote: null,
  };
}
test("known medians and percentage differences", () => {
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(percentDifference(15, 10), 50);
  assert.equal(percentDifference(5, 0), null);
});
test("excludes self, entire same procedure, duplicate reference procedures and incompatible quantities", () => {
  const o = observation("target", 20, "proc");
  const rows = [
    o,
    observation("same", 10, "proc"),
    observation("a", 10, "a"),
    observation("dup", 11, "a"),
    observation("large", 1, "large", "large", "large", 201),
  ];
  const c = compare(o, rows);
  assert.equal(c.references.length, 1);
  assert.equal(c.referenceMedian, 10);
  assert.equal(c.alert, false);
  assert.equal(c.sufficient, false);
});
test("diversity and sample threshold gate highlights", () => {
  const o = observation("target", 20);
  const refs = Array.from({ length: 5 }, (_, i) =>
    observation(`r${i}`, 10, `p${i}`, `a${i % 3}`, `s${i % 2}`),
  );
  assert.equal(compare(o, [o, ...refs]).alert, true);
  assert.equal(
    compare(o, [o, ...refs.map((r) => ({ ...r, agencyId: "same" }))]).alert,
    false,
  );
  assert.equal(
    compare(o, [o, ...refs.map((r) => ({ ...r, supplierId: "same" }))]).alert,
    false,
  );
});
test("time, year, dosage and incoherent totals prevent invalid references", () => {
  const o = observation("target", 20);
  const refs = [
    { ...observation("old", 10), date: "2024-03-10", year: 2024 },
    { ...observation("distant", 10), date: "2025-10-31" },
    { ...observation("product", 10), productId: "different" },
    { ...observation("bad", 10), precisionNote: "Divergência material" },
    { ...observation("zero", 0) },
  ];
  assert.equal(compare(o, refs).references.length, 0);
  assert.equal(
    identifyProduct("IVERMECTINA 6MG", "CPR").product?.id,
    "ivermectina-6mg",
  );
  assert.equal(identifyProduct("Ivermectina", "CPR").product, null);
  assert.equal(identifyProduct("IVERMECTINA 6MG C/4", "CX").product, null);
  assert.equal(identifyProduct("AAS INFANTIL 100MG CX C/1000", "CPR").product, null);
  assert.equal(identifyProduct("ESPIRONOLACTONA 50MG", "CPR").product, null);
});
test("CSV preserves unknown and blocks spreadsheet formula injection", () => {
  const csv = safeCsv([{ name: '=HYPERLINK("bad")', amount: null }]);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes(';""'));
  assert.ok(!csv.includes("undefined"));
});
test("an inconsistent observed result cannot trigger a highlight even with enough references", () => {
  const refs = Array.from({ length: 5 }, (_, i) =>
    observation(`r${i}`, 10, `p${i}`, `a${i % 3}`, `s${i % 2}`),
  );
  for (const change of [
    { precisionNote: "Divergência material" },
    { quantity: 0 },
    { date: "unknown" },
    { unitPrice: Infinity },
  ]) {
    const result = compare({ ...observation("target", 20), ...change }, refs);
    assert.equal(result.alert, false);
    assert.equal(result.sufficient, false);
    assert.equal(result.difference, null);
  }
});
test("graph traversal respects years, missing center, two-hop cap and truncation", () => {
  const graph: Graph = {
    nodes: Array.from({ length: 120 }, (_, i) => ({
      id: String(i),
      type: "supplier",
      label: String(i),
    })),
    edges: Array.from({ length: 119 }, (_, i) => ({
      id: String(i),
      source: "0",
      target: String(i + 1),
      type: "RESULTADO_PARA",
      year: i === 0 ? 2024 : 2025,
      evidence: "https://pncp.gov.br/",
      capturedAt: "2026-10-29",
    })),
    backend: "neo4j-snapshot",
    verified: true,
    version: "test",
  };
  const g = neighborhood(graph, "0", 99, 2025);
  assert.equal(g.nodes.length, 100);
  assert.equal(g.truncated, true);
  assert.ok(!g.edges.some((e) => e.year === 2024));
  assert.equal(neighborhood(graph, "missing", 1).nodes.length, 0);
});
