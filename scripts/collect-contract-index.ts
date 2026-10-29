import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { digest, pool } from "./official-client";
import { publicText } from "../src/lib/text";
import type { Dataset, PublicContract, Source } from "../src/lib/model";

// The anonymous PNCP portal uses this public search endpoint. Monthly windows
// avoid its result-window limit; every page and reported count must agree.
const run = promisify(execFile);
const d: Dataset = JSON.parse(
  await readFile("data/staging/catalog.json", "utf8"),
);
const sourceList: Source[] = JSON.parse(
  await readFile("data/staging/catalog-sources.json", "utf8"),
);
const contracts = new Map<string, PublicContract>();
const procedures = new Set(d.procedures.map((p) => p.id));
const municipalities = new Map(d.municipalities.map((m) => [m.id, m]));
const coverage: {
  year: number;
  month: number;
  reported: number;
  captured: number;
  included: number;
}[] = [];
let next = 0;
await mkdir(".cache/official", { recursive: true });
async function search(url: string): Promise<{ data: any; source: Source }> {
  const path = `.cache/official/${digest(url)}.json`;
  if (!process.argv.includes("--refresh"))
    try {
      const cached = JSON.parse(await readFile(path, "utf8"));
      const now = new Date();
      if (
        Date.parse(cached.source.capturedAt) >=
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      )
        return cached;
    } catch {
      /* Only complete current-month captures can be reused. */
    }
  for (let attempt = 0; attempt < 8; attempt++) {
    const at = Math.max(next, Date.now());
    next = at + 1200;
    await new Promise((r) => setTimeout(r, Math.max(0, at - Date.now())));
    try {
      const { stdout } = await run(
        process.platform === "win32" ? "curl.exe" : "curl",
        [
          "--silent",
          "--show-error",
          "--max-time",
          "30",
          "--user-agent",
          "PIAUIGRAPH/0.2 (public transparency portfolio)",
          "--header",
          "Accept: application/json",
          "--output",
          `${path}.download`,
          "--write-out",
          "%{http_code}",
          url,
        ],
        { maxBuffer: 8_000_000, windowsHide: true },
      );
      const status = Number(stdout.trim());
      if (status === 401 || status === 403)
        throw new Error(`Access denied ${status}`);
      if (status !== 200) throw new Error(`HTTP ${status}`);
      const raw = await readFile(`${path}.download`, "utf8"),
        data = JSON.parse(raw);
      if (!Array.isArray(data.items) || !Number.isSafeInteger(data.total))
        throw Error("Unexpected PNCP search schema");
      const result = {
        data,
        raw,
        source: {
          url,
          capturedAt: new Date().toISOString(),
          sha256: digest(raw),
        },
      };
      await writeFile(path, JSON.stringify(result));
      await unlink(`${path}.download`);
      return result;
    } catch (e) {
      if (String(e).includes("Access denied") || attempt === 7) throw e;
      await new Promise((r) =>
        setTimeout(r, Math.min(30000, 2000 * 2 ** attempt)),
      );
    }
  }
  throw Error("Unreachable");
}
const finite = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
await pool(
  [2024, 2025].flatMap((year) =>
    Array.from({ length: 12 }, (_, m) => ({ year, month: m + 1 })),
  ),
  async ({ year, month }) => {
    const from = `${year}-${String(month).padStart(2, "0")}-01`,
      to = `${year}-${String(month).padStart(2, "0")}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`;
    const seen = new Set<string>();
    let reported = -1,
      included = 0;
    for (let page = 1; page <= 200; page++) {
      const url = `https://pncp.gov.br/api/search/?tipos_documento=contrato&ordenacao=-data&pagina=${page}&tam_pagina=50&status=todos&ufs=PI&data_publicacao_inicio=${from}&data_publicacao_fim=${to}`;
      const r = await search(url);
      sourceList.push(r.source);
      if (reported < 0) reported = r.data.total;
      if (reported >= 10000 || r.data.total !== reported)
        throw Error(`Unstable or over-limit monthly contract window ${from}`);
      for (const c of r.data.items) {
        const id = String(c.numero_controle_pncp ?? "");
        if (
          !/^\d{14}-2-\d{6}\/\d{4,6}$/.test(id) ||
          c.document_type !== "contrato" ||
          c.uf !== "PI" ||
          !String(c.data_publicacao_pncp).startsWith(from.slice(0, 7))
        )
          throw Error(`Contract search scope mismatch ${from}`);
        if (seen.has(id))
          throw Error(`Duplicate contract across pages ${from}`);
        seen.add(id);
        const m = municipalities.get(String(c.codigo_ibge)),
          y = Number(c.ano);
        if (!m || ![2024, 2025].includes(y)) continue;
        const cnpj = String(c.orgao_cnpj ?? "");
        if (!/^\d{14}$/.test(cnpj) || !c.unidade_codigo)
          throw Error("Invalid contract buyer");
        const supplier = String(c.fornecedor_ni ?? "").replace(/\D/g, "");
        const company =
          c.fornecedor_tipo_pessoa === "PJ" && /^\d{14}$/.test(supplier);
        const original = /^(\d{14})-1-(\d{6})\/(\d{4})$/.exec(
          String(c.numero_contratacao ?? ""),
        );
        contracts.set(id, {
          id,
          procedureId: procedures.has(c.numero_contratacao)
            ? c.numero_contratacao
            : null,
          sourceProcedureId: original ? c.numero_contratacao : null,
          sourceProcedureUrl: original
            ? `https://pncp.gov.br/app/editais/${original[1]}/${original[3]}/${Number(original[2])}`
            : null,
          cnpj,
          agencyId: `${cnpj}:${c.unidade_codigo}`,
          agency: publicText(String(c.orgao_nome ?? "Órgão não informado")),
          municipalityId: m.id,
          municipality: m.name,
          supplierId: company ? supplier : "",
          supplier: company
            ? publicText(
                String(c.fornecedor_nome ?? "Razão social não informada"),
              )
            : "Pessoa física ou fornecedor sem CNPJ publicado",
          object: publicText(String(c.description ?? "").slice(0, 12000)),
          year: y,
          signedAt: c.data_assinatura ?? "",
          publishedAt: c.data_publicacao_pncp ?? "",
          start: c.data_inicio_vigencia ?? "",
          end: c.data_fim_vigencia ?? "",
          initialValue: null,
          globalValue: finite(c.valor_global),
          kind: String(c.tipo_contrato_nome ?? "Instrumento não informado"),
          kindId: Number(c.tipo_contrato_id ?? 0),
          cancelled: c.cancelado === true,
          source: r.source,
          officialUrl: `https://pncp.gov.br/app/contratos/${cnpj}/${y}/${Number(c.numero_sequencial)}`,
        });
        included++;
      }
      if (seen.size === reported) break;
      if (!r.data.items.length || page === 200)
        throw Error(`Incomplete contract window ${from}`);
    }
    if (seen.size !== reported) throw Error(`Contract count mismatch ${from}`);
    coverage.push({ year, month, reported, captured: seen.size, included });
    console.log(
      `Contratos ${from.slice(0, 7)} · ${seen.size} respostas · ${included} no recorte`,
    );
  },
);
d.contracts = [...contracts.values()].sort((a, b) => a.id.localeCompare(b.id));
d.manifest.contractIndexCoverage = coverage.sort(
  (a, b) => a.year - b.year || a.month - b.month,
);
delete d.manifest.contractCoverage;
d.manifest.contracts = d.contracts.length;
d.manifest.suppliers = new Set([
  ...d.observations.map((o) => o.supplierId),
  ...d.contracts.map((c) => c.supplierId).filter(Boolean),
]).size;
await writeFile("data/staging/catalog.json", JSON.stringify(d));
await writeFile(
  "data/staging/catalog-sources.json",
  JSON.stringify(
    [...new Map(sourceList.map((s) => [s.url, s])).values()],
    null,
    2,
  ),
);
console.log(
  JSON.stringify({ contracts: d.contracts.length, windows: coverage.length }),
);
