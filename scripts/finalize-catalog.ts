import { readFile, writeFile } from "node:fs/promises";
import { digest } from "./official-client";
import type { Dataset } from "../src/lib/model";
import { publicText } from "../src/lib/text";
const d: Dataset = JSON.parse(
  await readFile("data/staging/catalog.json", "utf8"),
);
for (const p of d.procedures) {
  p.object = publicText(p.object);
  p.agency = publicText(p.agency);
  p.unit = publicText(p.unit);
}
for (const o of d.observations) {
  o.supplier = publicText(o.supplier);
  o.description = publicText(o.description);
}
for (const e of d.exclusions) e.description = publicText(e.description);
const sourceList = JSON.parse(
  await readFile("data/staging/catalog-sources.json", "utf8"),
);
for (const o of d.observations) sourceList.push(o.source, o.itemSource);
await writeFile(
  "data/staging/catalog-sources.json",
  JSON.stringify(
    [...new Map(sourceList.map((s: { url: string }) => [s.url, s])).values()],
    null,
    2,
  ),
);
d.manifest.datasetSha256 = digest(
  JSON.stringify({
    municipalities: d.municipalities,
    regions: d.regions,
    procedures: d.procedures,
    observations: d.observations,
    exclusions: d.exclusions,
    contracts: d.contracts ?? [],
  }),
);
await writeFile("data/staging/catalog.json", JSON.stringify(d));
console.log(
  JSON.stringify({
    version: d.manifest.version,
    procedures: d.procedures.length,
    contracts: d.contracts?.length,
    hash: d.manifest.datasetSha256,
  }),
);
