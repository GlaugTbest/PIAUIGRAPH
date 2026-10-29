import type { Observation } from "./model";

export const RULE = {
  id: "unit-price-v1",
  minReferences: 5,
  minAgencies: 3,
  minSuppliers: 2,
  days: 180,
  quantityRatio: 2,
  threshold: 30,
} as const;
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
export const median = (numbers: number[]): number | null => {
  if (!numbers.length) return null;
  const n = [...numbers].sort((a, b) => a - b);
  const i = Math.floor(n.length / 2);
  return n.length % 2 ? n[i] : (n[i - 1] + n[i]) / 2;
};
export const percentDifference = (
  price: number,
  reference: number,
): number | null =>
  reference > 0 &&
  price >= 0 &&
  Number.isFinite(price) &&
  Number.isFinite(reference)
    ? (price / reference - 1) * 100
    : null;

export function compare(observed: Observation, universe: Observation[]) {
  const reasons: Record<string, number> = {};
  const validObserved =
    observed.unitPrice > 0 &&
    observed.quantity > 0 &&
    Number.isFinite(observed.unitPrice) &&
    Number.isFinite(observed.quantity) &&
    Number.isFinite(Date.parse(observed.date)) &&
    !observed.precisionNote?.startsWith("Divergência");
  if (!validObserved)
    reasons["Registro observado inválido ou com divergência material"] = 1;
  const seen = new Set<string>();
  const references = universe
    .toSorted((a, b) => a.id.localeCompare(b.id))
    .filter((row) => {
      let reason = "";
      if (row.productId !== observed.productId || row.year !== observed.year)
        return false;
      if (row.procedureId === observed.procedureId)
        reason = "Mesma contratação ou próprio registro";
      else if (
        !(row.unitPrice > 0 && row.quantity > 0) ||
        !Number.isFinite(row.unitPrice) ||
        !Number.isFinite(row.quantity) ||
        !Number.isFinite(Date.parse(row.date)) ||
        row.precisionNote?.startsWith("Divergência")
      )
        reason = "Preço ou quantidade inválidos ou divergentes";
      else if (
        Math.abs(Date.parse(row.date) - Date.parse(observed.date)) >
        RULE.days * 86400000
      )
        reason = "Fora da janela de 180 dias";
      else if (
        row.quantity / observed.quantity < 1 / RULE.quantityRatio ||
        row.quantity / observed.quantity > RULE.quantityRatio
      )
        reason = "Quantidade fora da faixa de metade a dobro";
      else if (seen.has(row.procedureId))
        reason = "Observação dependente da mesma contratação";
      if (reason) {
        reasons[reason] = (reasons[reason] ?? 0) + 1;
        return false;
      }
      seen.add(row.procedureId);
      return true;
    });
  const referenceMedian = median(references.map((r) => r.unitPrice));
  const agencies = new Set(references.map((r) => r.agencyId)).size;
  const suppliers = new Set(references.map((r) => r.supplierId)).size;
  const sufficient =
    validObserved &&
    references.length >= RULE.minReferences &&
    agencies >= RULE.minAgencies &&
    suppliers >= RULE.minSuppliers &&
    referenceMedian !== null &&
    referenceMedian > 0;
  const difference =
    validObserved && referenceMedian !== null
      ? percentDifference(observed.unitPrice, referenceMedian)
      : null;
  return {
    rule: RULE,
    observed,
    references,
    referenceMedian,
    difference,
    agencies,
    suppliers,
    validObserved,
    sufficient,
    alert: sufficient && difference !== null && difference > RULE.threshold,
    reasons,
  };
}

export const PRODUCTS = [
  {
    id: "ivermectina-6mg",
    name: "Ivermectina 6 mg",
    drug: /\bivermectina\b/,
    dose: /\b0?6\s*mg\b/,
  },
  {
    id: "espironolactona-25mg",
    name: "Espironolactona 25 mg",
    drug: /\bespironolactona\b/,
    dose: /\b25\s*mg\b/,
  },
  {
    id: "acido-folico-5mg",
    name: "Ácido fólico 5 mg",
    drug: /\bacido folico\b/,
    dose: /\b0?5\s*mg\b/,
  },
  {
    id: "aas-100mg",
    name: "Ácido acetilsalicílico 100 mg",
    drug: /\b(aas|acido acetilsalicilico|acido acetil infan)\b/,
    dose: /\b100\s*mg\b/,
  },
];

export function identifyProduct(description: string, unit: string) {
  const text = normalize(description);
  const product = PRODUCTS.find((p) => p.drug.test(text) && p.dose.test(text));
  if (!product)
    return {
      product: null,
      conversion: 1,
      reason: "Fora das quatro especificações padronizadas",
    };
  const u = normalize(unit).replace(/[.\s]/g, "");
  if (
    /^(cmp|cpr|cp|comp|comprimido|comprimidos)$/.test(u) &&
    !/subling|libera[çc]ao|retard|associa|\+|\b(cx|caixas?|cartelas?|frascos?)\b/.test(text)
  )
    return { product, conversion: 1, reason: null };
  return {
    product: null,
    conversion: 1,
    reason:
      "Unidade, forma ou apresentação não comprovadas como comprimido simples",
  };
}

export function safeCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "\ufeffsem_registros\r\n";
  const keys = Object.keys(rows[0]);
  const cell = (value: unknown) => {
    let s = value == null ? "" : String(value);
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return (
    "\ufeff" +
    [
      keys.map(cell).join(";"),
      ...rows.map((r) => keys.map((k) => cell(r[k])).join(";")),
    ].join("\r\n")
  );
}
