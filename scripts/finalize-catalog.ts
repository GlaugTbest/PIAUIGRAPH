import { readFile, writeFile } from "node:fs/promises";
import { digest } from "./official-client";
import type { Dataset } from "../src/lib/model";
const d: Dataset = JSON.parse(
  await readFile("data/staging/catalog.json", "utf8"),
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
