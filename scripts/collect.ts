import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { identifyProduct, normalize } from "../src/lib/analysis";
import type {
  Dataset,
  Municipality,
  Observation,
  Procedure,
  Source,
} from "../src/lib/model";

type Raw = Record<string, any>; // Official payloads are validated and projected below; never published wholesale.
const state = process.argv.includes("--state");
const scope = state ? "state" : "pilot";
const base = "https://pncp.gov.br/api";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
let requests = 0;
let failures = 0;
const sourceManifest = new Map<string, Source>();
let nextRequestAt = 0;
async function pace() {
  const now = Date.now();
  const at = Math.max(now, nextRequestAt);
  nextRequestAt = at + 1500;
  await new Promise((r) => setTimeout(r, Math.max(0, at - now)));
}
await mkdir(".cache/official", { recursive: true });
await mkdir("data/staging", { recursive: true });

async function official(url: string): Promise<{ data: any; source: Source }> {
  if (!/^https:\/\/(pncp\.gov\.br|servicodados\.ibge\.gov\.br)\//.test(url))
    throw new Error("Unapproved official origin");
  const file = path.join(".cache/official", hash(url) + ".json");
  if (!process.argv.includes("--refresh")) {
    try {
      const cached = JSON.parse(await readFile(file, "utf8"));
      sourceManifest.set(url, cached.source);
      return cached;
    } catch {
      /* Cache miss, including interrupted writes. */
    }
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await pace();
      requests++;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(45000),
        headers: {
          Accept: "application/json",
          "User-Agent": "PIAUIGRAPH/0.1 (public procurement research)",
        },
      });
      if (response.status === 204) {
        const result = {
          data: null,
          source: {
            url,
            capturedAt: new Date().toISOString(),
            sha256: hash(""),
          },
        };
        sourceManifest.set(url, result.source);
        await writeFile(file, JSON.stringify(result));
        return result;
      }
      if (response.status === 429) {
        const wait = Math.max(
          15000,
          Math.min(
            120000,
            Number(response.headers.get("retry-after") ?? "30") * 1000,
          ),
        );
        nextRequestAt = Math.max(nextRequestAt, Date.now() + wait);
        console.log(`PNCP rate limit: backing off ${wait / 1000}s`);
        throw new Error(`HTTP 429: ${url}`);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : null;
      const result = {
        data,
        source: {
          url,
          capturedAt: new Date().toISOString(),
          sha256: hash(raw),
        },
      };
      await writeFile(file, JSON.stringify(result));
      sourceManifest.set(url, result.source);
      return result;
    } catch (e) {
      if (attempt === 7) {
        failures++;
        throw e;
      }
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw new Error("Unreachable");
}

async function pool<T, R>(
  rows: T[],
  fn: (row: T, index: number) => Promise<R>,
  concurrency = 3,
) {
  const results: R[] = new Array(rows.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
      while (cursor < rows.length) {
        const i = cursor++;
        results[i] = await fn(rows[i], i);
      }
    }),
  );
  return results;
}

const geo = await official(
  "https://servicodados.ibge.gov.br/api/v1/localidades/estados/22/municipios",
);
const municipalities: Municipality[] = geo.data
  .map((m: Raw) => ({
    id: String(m.id),
    name: m.nome,
    regionId: String(m["regiao-imediata"].id),
    region: m["regiao-imediata"].nome,
  }))
  .sort((a: Municipality, b: Municipality) => a.id.localeCompare(b.id));
if (
  municipalities.length !== 224 ||
  new Set(municipalities.map((m) => m.id)).size !== 224
)
  throw new Error("Unexpected IBGE municipality coverage");
const regions = [
  ...new Map(
    municipalities.map((m) => [m.regionId, { id: m.regionId, name: m.region }]),
  ).values(),
];
const mesh = await official(
  "https://servicodados.ibge.gov.br/api/v3/malhas/estados/22?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio",
);
if (mesh.data.features?.length !== municipalities.length)
  throw new Error("Municipal mesh mismatch");
await mkdir("public/geo", { recursive: true });
await writeFile("public/geo/piaui.geojson", JSON.stringify(mesh.data));

let scanned = 0;
let candidates: { raw: Raw; source: Source }[] = [];
const pilotIds = [
  ["06554893000101", 2025, 1],
  ["06554216000185", 2025, 1],
  ["01612590000176", 2024, 1],
];
if (!state) {
  candidates = await pool(pilotIds, async ([cnpj, year, seq]) => {
    const r = await official(
      `${base}/consulta/v1/orgaos/${cnpj}/compras/${year}/${seq}`,
    );
    return { raw: r.data, source: r.source };
  });
  scanned = candidates.length;
} else {
  const windows = [2024, 2025].flatMap((year) =>
    Array.from({ length: 12 }, (_, m) => ({ year, month: m + 1 })),
  );
  await pool(windows, async ({ year, month }) => {
    const initial = `${year}${String(month).padStart(2, "0")}01`;
    const final = `${year}${String(month).padStart(2, "0")}${new Date(Date.UTC(year, month, 0)).getUTCDate()}`;
    for (let page = 1; page <= 200; page++) {
      const result = await official(
        `${base}/consulta/v1/contratacoes/publicacao?dataInicial=${initial}&dataFinal=${final}&codigoModalidadeContratacao=6&uf=PI&pagina=${page}&tamanhoPagina=50`,
      );
      const rows: Raw[] = result.data?.data ?? [];
      if (!Array.isArray(rows))
        throw new Error("Unexpected PNCP publication schema");
      scanned += rows.length;
      candidates.push(
        ...rows
          .filter(
            (r) =>
              [2024, 2025].includes(r.anoCompra) &&
              /medicamento|farmac/.test(normalize(r.objetoCompra ?? "")),
          )
          .map((raw) => ({ raw, source: result.source })),
      );
      if (!rows.length || page >= result.data.totalPaginas) break;
      if (page === 200)
        throw new Error(
          "Pagination work budget exceeded; no release was activated",
        );
    }
    console.log(`Metadata ${year}-${String(month).padStart(2, "0")} complete`);
  });
}
const unique = [
  ...new Map(candidates.map((c) => [c.raw.numeroControlePNCP, c])).values(),
].sort((a, b) =>
  String(a.raw.numeroControlePNCP).localeCompare(
    String(b.raw.numeroControlePNCP),
  ),
);
const procedures: Procedure[] = [];
const observations: Observation[] = [];
const exclusions: Dataset["exclusions"] = [];
await pool(unique, async ({ raw: r, source }, index) => {
  const municipality = municipalities.find(
    (m) => m.id === String(r.unidadeOrgao?.codigoIbge),
  );
  if (!municipality) return; // Preserve metadata counts; this release scopes geolocated PI purchasing units.
  const cnpj = String(r.orgaoEntidade?.cnpj ?? "");
  if (
    !/^\d{14}$/.test(cnpj) ||
    !r.numeroControlePNCP ||
    ![2024, 2025].includes(r.anoCompra)
  )
    throw new Error("Invalid official procedure identity");
  const id = r.numeroControlePNCP;
  const p: Procedure = {
    id,
    cnpj,
    agency: String(r.orgaoEntidade.razaoSocial),
    unit: String(r.unidadeOrgao.nomeUnidade),
    unitCode: String(r.unidadeOrgao.codigoUnidade),
    municipalityId: municipality.id,
    municipality: municipality.name,
    year: r.anoCompra,
    sequence: r.sequencialCompra,
    object: String(r.objetoCompra ?? "").slice(0, 12000),
    publishedAt: r.dataPublicacaoPncp ?? "",
    mode: r.modalidadeNome ?? "Não informado",
    srp: r.srp === true,
    estimated: finite(r.valorTotalEstimado),
    homologated: finite(r.valorTotalHomologado),
    officialUrl: `https://pncp.gov.br/app/editais/${cnpj}/${r.anoCompra}/${r.sequencialCompra}`,
    source,
    itemCount: 0,
    matchedCount: 0,
  };
  for (let page = 1; page <= 100; page++) {
      const itemsUrl = `${base}/pncp/v1/orgaos/${cnpj}/compras/${p.year}/${p.sequence}/itens?pagina=${page}&tamanhoPagina=500`;
    const items = await official(itemsUrl);
    if (items.data == null) break;
    if (!Array.isArray(items.data))
      throw new Error(`Unexpected items schema: ${itemsUrl}`);
    for (const item of items.data as Raw[]) {
      p.itemCount++;
      const identified = identifyProduct(
        String(item.descricao ?? ""),
        String(item.unidadeMedida ?? ""),
      );
      if (!identified.product) {
        if (
          /ivermectina|espironolactona|acido folico|acetilsalicilico|\baas\b/.test(
            normalize(item.descricao ?? ""),
          )
        )
          exclusions.push({
            procedureId: id,
            item: item.numeroItem,
            description: String(item.descricao).slice(0, 2000),
            reason: identified.reason!,
            url: itemsUrl,
          });
        continue;
      }
      p.matchedCount++;
      const resultsUrl = `${base}/pncp/v1/orgaos/${cnpj}/compras/${p.year}/${p.sequence}/itens/${item.numeroItem}/resultados`;
      if (!item.temResultado) {
        exclusions.push({
          procedureId: id,
          item: item.numeroItem,
          description: item.descricao,
          reason: "Sem resultado homologado publicado",
          url: itemsUrl,
        });
        continue;
      }
      const result = await official(resultsUrl);
      if (result.data != null && !Array.isArray(result.data))
        throw new Error(`Unexpected result schema: ${resultsUrl}`);
      for (const award of result.data ?? []) {
        const date = String(award.dataResultado ?? "").slice(0, 10);
        const quantity = finite(award.quantidadeHomologada);
        const price = finite(award.valorUnitarioHomologado);
        const supplier = String(award.niFornecedor ?? "").replace(/\D/g, "");
        let reason = "";
        if (award.dataCancelamento || award.situacaoCompraItemResultadoId === 2)
          reason = "Resultado cancelado";
        else if (award.tipoPessoa !== "PJ" || !/^\d{14}$/.test(supplier))
          reason = "Fornecedor sem CNPJ empresarial verificável";
        else if (
          !/^202[45]-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date))
        )
          reason = "Data do resultado ausente ou fora de 2024/2025";
        else if (
          !(quantity !== null && quantity > 0 && price !== null && price > 0)
        )
          reason = "Preço ou quantidade inválidos";
        if (reason) {
          exclusions.push({
            procedureId: id,
            item: item.numeroItem,
            description: item.descricao,
            reason,
            url: resultsUrl,
          });
          continue;
        }
        const total = finite(award.valorTotalHomologado);
        const delta = total === null ? 0 : Math.abs(total - quantity! * price!);
        const precisionNote =
          delta > 0.011
            ? delta <= quantity! * 0.005 + 0.011
              ? "O total difere de quantidade × preço unitário publicado; diferença compatível com arredondamento do preço a centavos. Valores originais preservados."
              : "Divergência entre total, quantidade e preço unitário. Excluído da referência analítica até conferência."
            : null;
        const obs: Observation = {
          id: `${id}:${item.numeroItem}:${award.sequencialResultado}`,
          procedureId: id,
          municipalityId: municipality.id,
          agencyId: `${cnpj}:${p.unitCode}`,
          productId: identified.product.id,
          product: identified.product.name,
          description: String(item.descricao).slice(0, 2000),
          item: item.numeroItem,
          result: award.sequencialResultado,
          supplierId: supplier,
          supplier: String(award.nomeRazaoSocialFornecedor).slice(0, 300),
          date,
          year: Number(date.slice(0, 4)),
          quantity: quantity!,
          unitPrice: price!,
          total,
          originalUnit: item.unidadeMedida,
          originalQuantity: quantity!,
          originalPrice: price!,
          conversion: 1,
          source: result.source,
          itemSource: items.source,
          precisionNote,
        };
        observations.push(obs);
      }
    }
      if (items.data.length < 500) break;
    if (page === 100) throw new Error("Item pagination budget exceeded");
  }
  if (p.matchedCount || !state) procedures.push(p);
  if (index % 10 === 0 || index === unique.length - 1)
    console.log(`Items ${index + 1}/${unique.length}: ${p.municipality}`);
});

function finite(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
const obs = [...new Map(observations.map((o) => [o.id, o])).values()].sort(
  (a, b) => a.id.localeCompare(b.id),
);
const ps = procedures.sort((a, b) => a.id.localeCompare(b.id));
exclusions.sort((a, b) =>
  `${a.procedureId}:${a.item}:${a.reason}`.localeCompare(
    `${b.procedureId}:${b.item}:${b.reason}`,
  ),
);
const version = `${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}-${scope}-${hash(JSON.stringify(obs)).slice(0, 8)}`;
const dataset: Dataset = {
  municipalities,
  regions,
  procedures: ps,
  observations: obs,
  exclusions,
  manifest: {
    version,
    collectedAt: new Date().toISOString(),
    scope,
    years: [2024, 2025],
    modalities: [6],
    scopeDescription: state
      ? "Piauí · pregões eletrônicos publicados em 2024/2025, ano do procedimento 2024/2025, objeto mencionando medicamento/farmácia; quatro especificações de comprimidos; resultados de 2024/2025. Cobertura parcial."
      : "Piloto · três procedimentos oficiais em Pimenteiras, Gilbués e Milton Brandão; quatro especificações de comprimidos; resultados de 2024/2025.",
    metadataScanned: scanned,
    medicineCandidates: unique.length,
    municipalitiesWithData: new Set(ps.map((p) => p.municipalityId)).size,
    procedures: ps.length,
    observations: obs.length,
    suppliers: new Set(obs.map((o) => o.supplierId)).size,
    sourceRequests: requests,
    sourceFailures: failures,
    datasetSha256: hash(
      JSON.stringify({
        municipalities,
        regions,
        procedures: ps,
        observations: obs,
        exclusions,
      }),
    ),
    neo4j: { verified: false },
  },
};
if (!obs.length || failures) throw new Error("Empty or incomplete release");
await writeFile(`data/staging/${scope}.json`, JSON.stringify(dataset));
await writeFile(
  `data/staging/${scope}-sources.json`,
  JSON.stringify([...sourceManifest.values()], null, 2),
);
console.log(JSON.stringify(dataset.manifest, null, 2));
