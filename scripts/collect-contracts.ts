import { readFile, writeFile } from "node:fs/promises";
import { official, pool, sources, counters } from "./official-client";
import type { Dataset, PublicContract } from "../src/lib/model";
const data: Dataset = JSON.parse(
  await readFile("data/staging/catalog.json", "utf8"),
);
const previousSources = JSON.parse(
  await readFile("data/staging/catalog-sources.json", "utf8"),
);
const buyers = [...new Set(data.procedures.map((p) => p.cnpj))].sort();
const contracts = new Map<string, PublicContract>();
const procedureIds = new Set(data.procedures.map((p) => p.id));
const coverage: { cnpj: string; year: number; records: number }[] = [];
await pool(
  buyers.flatMap((cnpj) => [2024, 2025].map((year) => ({ cnpj, year }))),
  async ({ cnpj, year }, index) => {
    let count = 0;
    for (let page = 1; page <= 100; page++) {
      const r = await official(
        `https://pncp.gov.br/api/consulta/v1/contratos?dataInicial=${year}0101&dataFinal=${year}1231&cnpjOrgao=${cnpj}&pagina=${page}&tamanhoPagina=500`,
      );
      const rows = r.data?.data ?? [];
      if (!Array.isArray(rows)) throw Error("Unexpected contract schema");
      count += rows.length;
      for (const c of rows) {
        const m = data.municipalities.find(
          (x) => x.id === String(c.unidadeOrgao?.codigoIbge),
        );
        if (!m || c.receita === true || ![2024, 2025].includes(c.anoContrato))
          continue;
        if (!c.numeroControlePNCP || String(c.orgaoEntidade?.cnpj) !== cnpj)
          throw Error("Invalid contract identity");
        const company =
          c.tipoPessoa === "PJ" &&
          /^\d{14}$/.test(String(c.niFornecedor ?? "").replace(/\D/g, ""));
        contracts.set(c.numeroControlePNCP, {
          id: c.numeroControlePNCP,
          procedureId: procedureIds.has(c.numeroControlePncpCompra)
            ? c.numeroControlePncpCompra
            : null,
          cnpj,
          agencyId: `${cnpj}:${c.unidadeOrgao.codigoUnidade}`,
          agency: String(c.orgaoEntidade.razaoSocial ?? "Órgão não informado"),
          municipalityId: m.id,
          municipality: m.name,
          supplierId: company ? String(c.niFornecedor).replace(/\D/g, "") : "",
          supplier: company
            ? String(
                c.nomeRazaoSocialFornecedor ?? "Razão social não informada",
              )
            : "Pessoa física ou fornecedor sem CNPJ publicado",
          object: String(c.objetoContrato ?? "").slice(0, 12000),
          year: c.anoContrato,
          signedAt: c.dataAssinatura ?? "",
          publishedAt: c.dataPublicacaoPncp ?? "",
          start: c.dataVigenciaInicio ?? "",
          end: c.dataVigenciaFim ?? "",
          initialValue: finite(c.valorInicial),
          globalValue: finite(c.valorGlobal),
          kind: String(c.tipoContrato?.nome ?? "Instrumento não informado"),
          kindId: c.tipoContrato?.id ?? 0,
          source: r.source,
          officialUrl: `https://pncp.gov.br/app/contratos/${cnpj}/${c.anoContrato}/${c.sequencialContrato}`,
        });
      }
      if (!rows.length || page >= r.data.totalPaginas) break;
      if (page === 100) throw Error("Contract pagination exceeded budget");
    }
    coverage.push({ cnpj, year, records: count });
    if (index % 10 === 0 || index === buyers.length * 2 - 1)
      console.log(
        `Contratos ${index + 1}/${buyers.length * 2} · ${contracts.size} instrumentos`,
      );
  },
);
function finite(x: unknown) {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null;
}
data.contracts = [...contracts.values()].sort((a, b) =>
  a.id.localeCompare(b.id),
);
data.manifest.sourceRequests += counters.requests;
data.manifest.sourceFailures += counters.failures;
data.manifest.contractCoverage = coverage;
data.manifest.contracts = data.contracts.length;
data.manifest.suppliers = new Set([
  ...data.observations.map((o) => o.supplierId),
  ...data.contracts.map((c) => c.supplierId).filter(Boolean),
]).size;
await writeFile("data/staging/catalog.json", JSON.stringify(data));
await writeFile(
  "data/staging/catalog-sources.json",
  JSON.stringify(
    [
      ...new Map(
        [...previousSources, ...sources.values()].map((s) => [s.url, s]),
      ).values(),
    ],
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    contracts: data.contracts.length,
    buyers: buyers.length,
    failures: counters.failures,
  }),
);
