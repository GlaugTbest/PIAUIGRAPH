import { test } from "node:test";
import assert from "node:assert/strict";
import { getData, explore, filtersFrom } from "../src/lib/data";
import { compare } from "../src/lib/analysis";
test("active real release preserves identity, counts, sources and Neo4j export", async () => {
  const { data, graph } = await getData();
  assert.equal(data.municipalities.length, 224);
  assert.equal(data.regions.length, 19);
  assert.ok(graph.verified);
  assert.equal(graph.nodes.length, data.manifest.neo4j.nodes);
  assert.equal(graph.edges.length, data.manifest.neo4j.edges);
  assert.equal(
    new Set(data.observations.map((o) => o.id)).size,
    data.observations.length,
  );
  assert.ok(
    data.observations.every(
      (o) =>
        o.source.url.startsWith("https://pncp.gov.br/") &&
        o.source.sha256.length === 64,
    ),
  );
});
test("same filters scope list and aggregates; missing values never become procedure totals", async () => {
  const { data } = await getData();
  for (const id of ["2208106", "2204402", "2206357"]) {
    const f = filtersFrom(new URLSearchParams({ m: id }));
    const e = explore(data, f);
    assert.ok(e.procedures.every((p) => p.municipalityId === id));
    const obs = data.observations.filter((o) => o.municipalityId === id);
    assert.equal(e.summary.observations, obs.length);
    assert.equal(
      e.summary.awardValue,
      obs.filter((o) => o.total !== null).reduce((s, o) => s + o.total!, 0),
    );
  }
});
test("real ivermectin pair and exclusion of own procedure", async () => {
  const { data } = await getData();
  const o = data.observations.find(
    (o) => o.id === "06554893000101-1-000001/2025:1630042:1",
  )!;
  assert.ok(o);
  assert.equal(o.unitPrice, 1.77);
  assert.equal(o.quantity, 3000);
  const c = compare(o, data.observations);
  assert.ok(
    c.references.some(
      (r) =>
        r.procedureId === "06554216000185-1-000001/2025" &&
        r.quantity === 3000 &&
        r.unitPrice === 0.77,
    ),
  );
  assert.ok(c.references.every((r) => r.procedureId !== o.procedureId));
});
test("input filters are bounded and invalid values ignored", () => {
  const f = filtersFrom(
    new URLSearchParams("m=bad&r=x&y=2030&page=99999&p=unknown"),
  );
  assert.equal(f.municipality, "");
  assert.equal(f.region, "");
  assert.equal(f.year, "");
  assert.equal(f.page, 1000);
  assert.equal(f.product, "");
});
