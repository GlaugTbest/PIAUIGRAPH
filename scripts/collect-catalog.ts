import { readFile, mkdir, writeFile } from "node:fs/promises";
import { official, pool, digest, sources, counters } from "./official-client";
import type { Dataset, Procedure } from "../src/lib/model";
import { readReleaseFile } from "../src/lib/release";
type Raw = Record<string, any>;
const active = JSON.parse(await readFile("data/active.json", "utf8"));
const previous: Dataset = process.argv.includes("--medicine-stage")
  ? JSON.parse(await readFile("data/staging/state.json", "utf8"))
  : await readReleaseFile(`data/releases/${active.version}`, "dataset");
const municipalities = previous.municipalities;
const old = new Map(previous.procedures.map((p) => [p.id, p]));
const records = new Map<string, Procedure>();
const modalities = [
  6, 4, 8, 9, 5, 7, 12, 1, 2, 3, 10, 11, 13, 14, 15, 16, 17, 18, 19,
];
let scanned = 0;
const coverage: {
  modality: number;
  year: number;
  month: number;
  records: number;
}[] = [];
await mkdir("data/staging", { recursive: true });
for (const modality of modalities) {
  await pool(
    [2024, 2025].flatMap((year) =>
      [6,4,8,9].includes(modality)
        ? Array.from({ length: 12 }, (_, m) => ({ year, month: m + 1 }))
        : [{year,month:0}],
    ),
    async ({ year, month }) => {
      const from = month ? `${year}${String(month).padStart(2, "0")}01` : `${year}0101`;
      const to = month ? `${year}${String(month).padStart(2, "0")}${new Date(Date.UTC(year, month, 0)).getUTCDate()}` : `${year}1231`;
      let count = 0;
      const monthCounts = new Map<number,number>();
      for (let page = 1; page <= 400; page++) {
        const result = await official(
          `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${from}&dataFinal=${to}&codigoModalidadeContratacao=${modality}&uf=PI&pagina=${page}&tamanhoPagina=50`,
        );
        const rows: Raw[] = result.data?.data ?? [];
        if (!Array.isArray(rows))
          throw Error("Unexpected PNCP publication schema");
        count += rows.length;
        scanned += rows.length;
        for (const r of rows) {
          const publishedMonth = Number(String(r.dataPublicacaoPncp ?? "").slice(5,7));
          if(!month && !(publishedMonth >= 1 && publishedMonth <= 12)) throw Error("Invalid publication month");
          monthCounts.set(publishedMonth,(monthCounts.get(publishedMonth)??0)+1);
          const municipality = municipalities.find(
            (m) => m.id === String(r.unidadeOrgao?.codigoIbge),
          );
          if (!municipality || ![2024, 2025].includes(r.anoCompra)) continue;
          const cnpj = String(r.orgaoEntidade?.cnpj ?? "");
          if (
            !/^\d{14}$/.test(cnpj) ||
            !r.numeroControlePNCP ||
            r.unidadeOrgao?.codigoUnidade == null
          )
            throw Error("Invalid PNCP identity");
          const prior = old.get(r.numeroControlePNCP);
          records.set(r.numeroControlePNCP, {
            id: r.numeroControlePNCP,
            cnpj,
            agency: String(
              r.orgaoEntidade.razaoSocial ?? "Órgão não informado",
            ),
            unit: String(r.unidadeOrgao.nomeUnidade ?? "Unidade não informada"),
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
            source: result.source,
            itemCount: prior?.itemCount ?? 0,
            matchedCount: prior?.matchedCount ?? 0,
            modalityId: r.modalidadeId,
            status: r.situacaoCompraNome ?? "Não informado",
            statusId: r.situacaoCompraId,
            sphere: r.orgaoEntidade.esferaId,
          });
        }
        if (!rows.length || page >= result.data.totalPaginas) break;
        if (page === 400)
          throw Error("Publication pagination exceeded safety budget");
      }
      if(month)coverage.push({ modality, year, month, records: count });
      else for(let m=1;m<=12;m++)coverage.push({modality,year,month:m,records:monthCounts.get(m)??0});
      console.log(
        `Catálogo modalidade ${modality} · ${year}-${String(month).padStart(2, "0")}: ${count} · ${records.size} únicos`,
      );
    },
  );
}
function finite(x: unknown) {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null;
}
const procedures = [...records.values()].sort((a, b) =>
  a.id.localeCompare(b.id),
);
for (const observation of previous.observations)
  if (!records.has(observation.procedureId))
    throw Error(
      `Verified observation missing from expanded catalog: ${observation.procedureId}`,
    );
const version = `${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}-catalog-${digest(JSON.stringify(procedures)).slice(0, 8)}`;
const dataset: Dataset = {
  ...previous,
  procedures,
  contracts: [],
  manifest: {
    ...previous.manifest,
    version,
    collectedAt: new Date().toISOString(),
    scope: "state",
    modalities,
    scopeDescription:
      "Piauí · publicações de 2024 e 2025 no PNCP, procedimentos de 2024/2025, todas as modalidades consultadas, sem filtro de assunto. Itens e resultados detalhados têm cobertura própria; valores não são pagamentos.",
    metadataScanned: scanned,
    medicineCandidates: 0,
    municipalitiesWithData: new Set(procedures.map((p) => p.municipalityId))
      .size,
    procedures: procedures.length,
    sourceRequests: counters.requests,
    sourceFailures: counters.failures,
    datasetSha256: "",
    neo4j: { verified: false },
    catalogCoverage: coverage,
  },
};
await writeFile("data/staging/catalog.json", JSON.stringify(dataset));
await writeFile(
  "data/staging/catalog-sources.json",
  JSON.stringify([...sources.values()], null, 2),
);
console.log(
  JSON.stringify({
    version,
    procedures: procedures.length,
    municipalities: dataset.manifest.municipalitiesWithData,
    scanned,
    requests: counters.requests,
  }),
);
