/** Omit personal document numbers embedded in public supplier names or prose. */
export function publicText(text: string) {
  return text.replace(
    /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g,
    "[documento pessoal omitido]",
  );
}
/** Display casing only; source wording stays available, with personal documents omitted. */
export function readableObject(text: string) {
  const clean = text
    .replace(/^\[(?:LICITANET|Portal de Compras P[uú]blicas)\]\s*-\s*/i, "")
    .trim();
  if (!clean) return "Objeto não informado na fonte";
  if (!/[A-ZÀ-Ý]/.test(clean) || clean !== clean.toUpperCase()) return clean;
  const lower = clean.toLocaleLowerCase("pt-BR");
  return (lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1)).replace(
    /\b(sus|samu|ubs|cras|creas|cnpj|fms|fme|pi|ifpi|ufpi|pncp|me\/epp)\b/gi,
    (s) => s.toUpperCase(),
  );
}
