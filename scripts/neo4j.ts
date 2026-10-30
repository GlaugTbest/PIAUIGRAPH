import { readFile, writeFile } from "node:fs/promises";
import neo4j from "neo4j-driver";
import { graphInput } from "../src/lib/graph";
import type { Dataset, Graph } from "../src/lib/model";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* CI uses injected secrets or local service credentials. */
}
const scope = process.argv.includes("--catalog")
  ? "catalog"
  : process.argv.includes("--state")
    ? "state"
    : "pilot";
const data: Dataset = JSON.parse(
  await readFile(`data/staging/${scope}.json`, "utf8"),
);
data.manifest.neo4j = { verified: false };
await writeFile(`data/staging/${scope}.json`, JSON.stringify(data));
await writeFile(
  `data/staging/${scope}-verification.json`,
  JSON.stringify({
    passed: false,
    version: data.manifest.version,
    reason: "Neo4j validation pending",
  }),
);
const input = graphInput(data);
const uri = process.env.NEO4J_URI;
if (!uri || !process.env.NEO4J_PASSWORD)
  throw new Error(
    "A real Neo4j instance is required to validate and publish a release",
  );
const driver = neo4j.driver(
  uri,
  neo4j.auth.basic(
    process.env.NEO4J_USER ?? "neo4j",
    process.env.NEO4J_PASSWORD,
  ),
  { connectionTimeout: 15000, maxConnectionPoolSize: 4 },
);
const session = driver.session({
  database: process.env.NEO4J_DATABASE ?? "neo4j",
});
try {
  await driver.verifyConnectivity();
  await session.run(
    "CREATE CONSTRAINT entity_identity IF NOT EXISTS FOR (n:Entity) REQUIRE (n.version, n.id) IS UNIQUE",
  );
  const version = data.manifest.version;
  for (let i = 0; i < input.nodes.length; i += 500)
    await session.executeWrite((tx) =>
      tx.run(
        "UNWIND $rows AS row MERGE (n:Entity {version:$version, id:row.id}) SET n += row",
        { rows: input.nodes.slice(i, i + 500), version },
      ),
    );
  const types = [...new Set(input.edges.map((e) => e.type))];
  for (const type of types) {
    if (!/^[A-Z_]+$/.test(type)) throw new Error("Invalid relationship type");
    const edges = input.edges.filter((e) => e.type === type);
    for (let i = 0; i < edges.length; i += 500)
      await session.executeWrite((tx) =>
        tx.run(
          `UNWIND $rows AS row MATCH (a:Entity {version:$version,id:row.source}), (b:Entity {version:$version,id:row.target}) MERGE (a)-[r:${type} {id:row.id}]->(b) SET r += row, r.version=$version`,
          { rows: edges.slice(i, i + 500), version },
        ),
      );
  }
  const result = await session.run(
    "MATCH (n:Entity {version:$version}) RETURN properties(n) AS node ORDER BY n.id",
    { version },
  );
  const relationships = await session.run(
    "MATCH (a:Entity {version:$version})-[r]->(b:Entity {version:$version}) RETURN properties(r) AS edge ORDER BY r.id",
    { version },
  );
  const plain = (v: any): any =>
    neo4j.isInt(v)
      ? v.toNumber()
      : Array.isArray(v)
        ? v.map(plain)
        : v && typeof v === "object"
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
          : v;
  const graph: Graph = {
    nodes: result.records.map((r) => {
      const n = plain(r.get("node"));
      delete n.version;
      return n;
    }),
    edges: relationships.records.map((r) => {
      const e = plain(r.get("edge"));
      delete e.version;
      return e;
    }),
    backend: "neo4j-snapshot",
    verified: true,
    version,
  };
  if (
    JSON.stringify(graph.nodes) !== JSON.stringify(input.nodes) &&
    hashStable(graph.nodes) !== hashStable(input.nodes)
  )
    throw new Error("Neo4j node round-trip mismatch");
  if (hashStable(graph.edges) !== hashStable(input.edges))
    throw new Error("Neo4j edge round-trip mismatch");
  const traversal = await session.run(
    'MATCH (s:Entity {version:$version,type:"supplier"})<-[r:RESULTADO_PARA]-(p:Entity {version:$version}) RETURN s.id AS supplier, count(DISTINCT p) AS procedures ORDER BY procedures DESC LIMIT 10',
    { version },
  );
  if (data.observations.length && !traversal.records.length)
    throw new Error("Known supplier traversal is empty");
  const components = await session.run(
    "CALL dbms.components() YIELD versions RETURN versions[0] AS version",
  );
  data.manifest.neo4j = {
    verified: true,
    version: components.records[0].get("version"),
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    verifiedAt: new Date().toISOString(),
  };
  await writeFile(`data/staging/${scope}-graph.json`, JSON.stringify(graph));
  await writeFile(`data/staging/${scope}.json`, JSON.stringify(data));
  console.log(
    JSON.stringify(
      {
        version,
        ...data.manifest.neo4j,
        knownTraversal: traversal.records.length,
      },
      null,
      2,
    ),
  );
} finally {
  await session.close();
  await driver.close();
}
function hashStable(rows: unknown[]) {
  return JSON.stringify(
    rows
      .toSorted((a, b) =>
        String((a as { id: string }).id).localeCompare(
          String((b as { id: string }).id),
        ),
      )
      .map((r) =>
        Object.fromEntries(
          Object.entries(r as object).sort(([a], [b]) => a.localeCompare(b)),
        ),
      ),
  );
}
