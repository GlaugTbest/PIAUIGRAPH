import { normalize } from "./analysis";
import type { Dataset, Procedure } from "./model";

export const TOPICS = [
  {
    id: "obras",
    name: "Obras e infraestrutura",
    pattern:
      /\b(obra|obras|pavimenta|construc|reforma|engenharia|drenagem|saneamento|urbaniza|iluminacao publica)/,
  },
  {
    id: "saude",
    name: "Saúde",
    pattern:
      /\b(saude|medicamento|hospital|farmac|odontol|enferm|medico|medica|cirurg|ambulan)/,
  },
  {
    id: "educacao",
    name: "Educação",
    pattern: /\b(escola|escolar|educac|ensino|creche|pedagog|didatic)/,
  },
  {
    id: "alimentacao",
    name: "Alimentação",
    pattern:
      /\b(alimento|alimentic|alimentac|merenda|refeic|cesta basica|generos)/,
  },
  {
    id: "transporte",
    name: "Transporte e combustível",
    pattern:
      /\b(transporte|combustiv|gasolina|diesel|veiculo|veiculos|pneu|pneus|frota|lubrific)/,
  },
  {
    id: "tecnologia",
    name: "Tecnologia",
    pattern:
      /\b(informatic|software|computador|computadores|internet|tecnologia|licenca|impressora|telecom)/,
  },
  {
    id: "servicos",
    name: "Serviços",
    pattern:
      /\b(servico|servicos|assessoria|consultoria|locacao|manutencao|limpeza|vigilancia|seguranca)/,
  },
  { id: "outros", name: "Compras e outros", pattern: /$^/ },
] as const;
export function topicOf(object: string) {
  const text = normalize(object);
  return TOPICS.find((t) => t.pattern.test(text)) ?? TOPICS[TOPICS.length - 1];
}
export function valueCheck(p: Procedure) {
  const eligible =
    p.statusId === 1 &&
    p.estimated !== null &&
    p.estimated > 0 &&
    p.homologated !== null &&
    p.homologated > 0;
  const difference = eligible
    ? Math.round((p.homologated! - p.estimated!) * 100) / 100
    : null;
  return {
    eligible,
    difference,
    percent: eligible ? (p.homologated! / p.estimated! - 1) * 100 : null,
    above: eligible && difference! > 0.01,
  };
}
type CatalogFilters = {
  q: string;
  m: string;
  r: string;
  y: string;
  topic: string;
  mode: string;
  signal: string;
  sort: string;
  page: number;
};
export function catalogFilters(s: URLSearchParams): CatalogFilters {
  return {
    q: (s.get("q") ?? "").trim().slice(0, 160),
    m: /^22\d{5}$/.test(s.get("m") ?? "") ? s.get("m")! : "",
    r: /^22\d{4}$/.test(s.get("r") ?? "") ? s.get("r")! : "",
    y: ["2024", "2025"].includes(s.get("y") ?? "") ? s.get("y")! : "",
    topic: TOPICS.some((t) => t.id === s.get("topic")) ? s.get("topic")! : "",
    mode: /^\d{1,2}$/.test(s.get("mode") ?? "") ? s.get("mode")! : "",
    signal: s.get("signal") === "above" ? "above" : "",
    sort: ["value", "difference"].includes(s.get("sort") ?? "")
      ? s.get("sort")!
      : "recent",
    page: Math.max(1, Math.min(10000, Math.floor(Number(s.get("page")) || 1))),
  };
}
const indexes = new WeakMap<
  Dataset,
  {
    procedures: Map<string, { text: string; topic: string }>;
    contracts: Map<string, string>;
  }
>();
function index(data: Dataset) {
  let i = indexes.get(data);
  if (i) return i;
  i = {
    procedures: new Map(
      data.procedures.map((p) => [
        p.id,
        {
          text: normalize(
            `${p.object} ${p.municipality} ${p.agency} ${p.unit} ${p.cnpj} ${p.id}`,
          ),
          topic: topicOf(p.object).id,
        },
      ]),
    ),
    contracts: new Map(
      (data.contracts ?? []).map((c) => [
        c.id,
        normalize(
          `${c.object} ${c.municipality} ${c.agency} ${c.supplier} ${c.supplierId} ${c.id}`,
        ),
      ]),
    ),
  };
  indexes.set(data, i);
  return i;
}
export function selectCatalog(data: Dataset, f: CatalogFilters) {
  const i = index(data);
  const digits = f.q.replace(/\D/g, "");
  const words =
    /^[\d .\/-]+$/.test(f.q) && digits.length === 14
      ? [digits]
      : normalize(f.q).split(" ").filter(Boolean);
  const municipalityIds = new Set(
    data.municipalities
      .filter((m) => (!f.m || m.id === f.m) && (!f.r || m.regionId === f.r))
      .map((m) => m.id),
  );
  const supplierProcedureIds = new Set(
    (data.contracts ?? [])
      .filter(
        (c) =>
          words.length &&
          words.every((w) => i.contracts.get(c.id)!.includes(w)),
      )
      .map((c) => c.procedureId)
      .filter(Boolean),
  );
  const procedures = data.procedures.filter(
    (p) =>
      municipalityIds.has(p.municipalityId) &&
      (!f.y || p.year === Number(f.y)) &&
      (!f.topic || i.procedures.get(p.id)!.topic === f.topic) &&
      (!f.mode || p.modalityId === Number(f.mode)) &&
      (!f.signal || valueCheck(p).above) &&
      (!words.length ||
        words.every((w) => i.procedures.get(p.id)!.text.includes(w)) ||
        supplierProcedureIds.has(p.id)),
  );
  const ids = new Set(procedures.map((p) => p.id));
  const contracts = (data.contracts ?? []).filter(
    (c) =>
      municipalityIds.has(c.municipalityId) &&
      (!f.y || c.year === Number(f.y)) &&
      (!f.topic || topicOf(c.object).id === f.topic) &&
      (!(f.mode || f.signal) || ids.has(c.procedureId ?? "")) &&
      words.every((w) => i.contracts.get(c.id)!.includes(w)),
  );
  return { procedures, contracts };
}
export function catalogExplore(data: Dataset, f: CatalogFilters) {
  const { procedures, contracts } = selectCatalog(data, f);
  const sorted = procedures.toSorted((a, b) =>
    f.sort === "value"
      ? (b.estimated ?? -1) - (a.estimated ?? -1) || a.id.localeCompare(b.id)
      : f.sort === "difference"
        ? (valueCheck(b).difference ?? -Infinity) -
            (valueCheck(a).difference ?? -Infinity) || a.id.localeCompare(b.id)
        : b.publishedAt.localeCompare(a.publishedAt) ||
          a.id.localeCompare(b.id),
  );
  const page = Math.min(f.page, Math.max(1, Math.ceil(sorted.length / 20)));
  const counts = new Map<string, number>();
  for (const p of procedures)
    counts.set(p.municipalityId, (counts.get(p.municipalityId) ?? 0) + 1);
  const topics = TOPICS.map((t) => {
    const rows = procedures.filter(
      (p) => index(data).procedures.get(p.id)!.topic === t.id,
    );
    const values = rows.filter((p) => p.estimated !== null && p.estimated > 0);
    return {
      id: t.id,
      name: t.name,
      count: rows.length,
      withEstimate: values.length,
      estimated: values.length
        ? values.reduce((sum, p) => sum + p.estimated!, 0)
        : null,
    };
  });
  const months = [2024, 2025].flatMap((year) =>
    Array.from({ length: 12 }, (_, m) => ({
      month: `${year}-${String(m + 1).padStart(2, "0")}`,
      count: 0,
    })),
  );
  for (const p of procedures) {
    const month = months.find((m) => m.month === p.publishedAt.slice(0, 7));
    if (month) month.count++;
  }
  const flagged = procedures.filter((p) => valueCheck(p).above);
  const candidates = procedures.filter((p) => valueCheck(p).eligible);
  return {
    version: data.manifest.version,
    total: procedures.length,
    page,
    pages: Math.max(1, Math.ceil(sorted.length / 20)),
    rows: sorted.slice((page - 1) * 20, page * 20).map((p) => ({
      ...p,
      topic: topicOf(p.object).name,
      check: valueCheck(p),
      contracts: contracts.filter((c) => c.procedureId === p.id).length,
    })),
    summary: {
      procedures: procedures.length,
      municipalities: counts.size,
      contracts: contracts.length,
      suppliers: new Set(contracts.map((c) => c.supplierId).filter(Boolean))
        .size,
      estimated: procedures.some((p) => p.estimated !== null)
        ? procedures.reduce((sum, p) => sum + (p.estimated ?? 0), 0)
        : null,
      above: flagged.length,
      comparable: candidates.length,
      missingEstimate: procedures.filter((p) => p.estimated === null).length,
    },
    territory: data.municipalities.map((m) => ({
      id: m.id,
      count: counts.get(m.id) ?? 0,
    })),
    topics,
    modes: [
      ...new Map(
        data.procedures
          .filter((p) => p.modalityId)
          .map((p) => [p.modalityId!, { id: p.modalityId!, name: p.mode }]),
      ).values(),
    ].sort((a, b) => a.id - b.id),
    months,
    coverage: {
      all: data.procedures.length,
      contracts: data.contracts?.length ?? 0,
      municipalities: data.manifest.municipalitiesWithData,
      modalities: data.manifest.modalities.length,
      capturedAt: data.manifest.collectedAt,
      broad: !!data.manifest.catalogCoverage,
    },
  };
}
export function contractExplore(data: Dataset, f: CatalogFilters) {
  const rows = selectCatalog(data, f).contracts.toSorted((a, b) =>
    f.sort === "value"
      ? (b.globalValue ?? b.initialValue ?? -1) -
        (a.globalValue ?? a.initialValue ?? -1)
      : b.publishedAt.localeCompare(a.publishedAt),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const page = Math.min(f.page, pages);
  const counts = new Map<string, number>();
  for (const c of rows)
    counts.set(c.municipalityId, (counts.get(c.municipalityId) ?? 0) + 1);
  return {
    version: data.manifest.version,
    rows: rows.slice((page - 1) * 20, page * 20),
    total: rows.length,
    pages,
    page,
    municipalities: counts.size,
    territory: data.municipalities.map((m) => ({
      id: m.id,
      count: counts.get(m.id) ?? 0,
    })),
  };
}
