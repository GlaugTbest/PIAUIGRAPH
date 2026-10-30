import { readFile } from "node:fs/promises";
import path from "node:path";
import { compare, normalize, PRODUCTS } from "./analysis";
import type { Dataset, Graph, Observation, Procedure } from "./model";
import { readReleaseFile } from "./release";

let cached: { version: string; data: Dataset } | undefined;
let cachedGraph: { version: string; graph: Graph } | undefined;
const pendingData = new Map<string, Promise<Dataset>>();
const pendingGraph = new Map<string, Promise<Graph>>();
async function activeVersion() {
  const { version } = JSON.parse(
    await readFile(path.join(process.cwd(), "data/active.json"), "utf8"),
  );
  if (!/^[a-zA-Z0-9-]+$/.test(version))
    throw new Error("Invalid release identifier");
  return version as string;
}
export async function getData() {
  const version = await activeVersion();
  if (cached && cached.version === version) return cached;
  if (!pendingData.has(version))
    pendingData.set(
      version,
      readReleaseFile(
        path.join(process.cwd(), "data/releases", version),
        "dataset",
      ).finally(() => pendingData.delete(version)),
    );
  const data: Dataset = await pendingData.get(version)!;
  if (data.manifest.version !== version || !data.manifest.neo4j.verified)
    throw Error("Inconsistent release");
  cached = { version, data };
  return cached;
}
export async function getGraph() {
  const version = await activeVersion();
  if (cachedGraph?.version === version) return cachedGraph;
  if (!pendingGraph.has(version))
    pendingGraph.set(
      version,
      readReleaseFile(
        path.join(process.cwd(), "data/releases", version),
        "graph",
      ).finally(() => pendingGraph.delete(version)),
    );
  const graph: Graph = await pendingGraph.get(version)!;
  if (graph.version !== version || !graph.verified)
    throw Error("Inconsistent graph release");
  cachedGraph = { version, graph };
  return cachedGraph;
}
export type Filters = {
  municipality: string;
  region: string;
  year: string;
  product: string;
  indicator: string;
  search: string;
  page: number;
};
export function filtersFrom(params: URLSearchParams): Filters {
  return {
    municipality: /^22\d{5}$/.test(params.get("m") ?? "")
      ? params.get("m")!
      : "",
    region: /^22\d{4}$/.test(params.get("r") ?? "") ? params.get("r")! : "",
    year: ["2024", "2025"].includes(params.get("y") ?? "")
      ? params.get("y")!
      : "",
    product: PRODUCTS.some((p) => p.id === params.get("p"))
      ? params.get("p")!
      : "",
    indicator: params.get("i") === "difference" ? "difference" : "all",
    search: (params.get("q") ?? "").slice(0, 120),
    page: Math.max(1, Math.min(1000, Number(params.get("page")) || 1)),
  };
}
export function selectData(data: Dataset, f: Filters) {
  const municipalityIds = new Set(
    data.municipalities
      .filter(
        (m) =>
          (!f.municipality || m.id === f.municipality) &&
          (!f.region || m.regionId === f.region),
      )
      .map((m) => m.id),
  );
  let observations = data.observations.filter(
    (o) =>
      municipalityIds.has(o.municipalityId) &&
      (!f.year || o.year === Number(f.year)) &&
      (!f.product || o.productId === f.product),
  );
  let procedures = data.procedures.filter((p) =>
    municipalityIds.has(p.municipalityId),
  );
  if (f.year || f.product) {
    const ids = new Set(observations.map((o) => o.procedureId));
    procedures = procedures.filter((p) => ids.has(p.id));
  }
  if (f.search) {
    const q = normalize(f.search);
    const matched = new Set(
      observations
        .filter((o) =>
          normalize(`${o.supplier} ${o.supplierId} ${o.product}`).includes(q),
        )
        .map((o) => o.procedureId),
    );
    procedures = procedures.filter(
      (p) =>
        normalize(`${p.object} ${p.agency} ${p.id} ${p.municipality}`).includes(
          q,
        ) || matched.has(p.id),
    );
    const ids = new Set(procedures.map((p) => p.id));
    observations = observations.filter((o) => ids.has(o.procedureId));
  }
  const alerts = observations.filter(
    (o) => compare(o, data.observations).alert,
  );
  if (f.indicator === "difference") {
    const ids = new Set(alerts.map((o) => o.procedureId));
    procedures = procedures.filter((p) => ids.has(p.id));
    observations = observations.filter((o) => ids.has(o.procedureId));
  }
  return { observations, procedures, alerts, municipalityIds };
}
export function summarize(
  observations: Observation[],
  procedures: Procedure[],
) {
  // Award totals only for selected medicine item results; never add procedure headline values.
  const amounts = observations.filter((o) => o.total !== null);
  return {
    procedures: procedures.length,
    observations: observations.length,
    suppliers: new Set(observations.map((o) => o.supplierId)).size,
    municipalities: new Set(procedures.map((p) => p.municipalityId)).size,
    awardValue: amounts.length
      ? amounts.reduce((s, o) => s + o.total!, 0)
      : null,
    missingValue: observations.length - amounts.length,
  };
}
export function explore(data: Dataset, f: Filters) {
  const { observations, procedures, alerts } = selectData(data, f);
  const totalPages = Math.max(1, Math.ceil(procedures.length / 15));
  const page = Math.min(f.page, totalPages);
  const rows = procedures.toSorted(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id),
  );
  const analysisUniverse = data.observations.filter(
    (o) => !f.product || o.productId === f.product,
  );
  const comparisons = observations.slice(0, 30).map((o) => {
    const c = compare(o, analysisUniverse);
    return {
      id: o.id,
      product: o.product,
      municipality: data.municipalities.find((m) => m.id === o.municipalityId)
        ?.name,
      price: o.unitPrice,
      references: c.references.length,
      sufficient: c.sufficient,
      alert: c.alert,
      difference: c.sufficient ? c.difference : null,
    };
  });
  const territory = data.municipalities.map((m) => {
    const ps = procedures.filter((p) => p.municipalityId === m.id);
    return {
      id: m.id,
      count: ps.length,
      observations: observations.filter((o) => o.municipalityId === m.id)
        .length,
    };
  });
  return {
    summary: summarize(observations, procedures),
    procedures: rows.slice((page - 1) * 15, page * 15),
    page,
    totalPages,
    total: rows.length,
    comparisons,
    territory,
    alertCount: alerts.length,
    scope: data.manifest.scopeDescription,
    version: data.manifest.version,
  };
}
export const money = (n: number | null, digits = 2) =>
  n === null
    ? "Não informado"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(n);
