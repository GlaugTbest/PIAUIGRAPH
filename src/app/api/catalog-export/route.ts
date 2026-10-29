import { NextRequest } from "next/server";
import { getData } from "@/lib/data";
import { catalogFilters, selectCatalog, topicOf } from "@/lib/catalog";
import { safeCsv } from "@/lib/analysis";
export async function GET(req: NextRequest) {
  const { data } = await getData();
  const selected = selectCatalog(
    data,
    catalogFilters(req.nextUrl.searchParams),
  );
  const contracts = req.nextUrl.searchParams.get("kind") === "contracts";
  const offset = Math.max(
    0,
    Math.min(
      100000,
      Math.floor(Number(req.nextUrl.searchParams.get("offset")) || 0),
    ),
  );
  const rows = contracts
    ? selected.contracts
        .slice(offset, offset + 1000)
        .map((c) => ({
          id: c.id,
          municipio: c.municipality,
          orgao: c.agency,
          objeto: c.object,
          fornecedor: c.supplier,
          cnpj: c.supplierId,
          valor_inicial: c.initialValue,
          valor_global: c.globalValue,
          tipo: c.kind,
          estagio: "instrumento_publicado_nao_pagamento",
          fonte: c.source.url,
          captura: c.source.capturedAt,
          sha256: c.source.sha256,
        }))
    : selected.procedures
        .slice(offset, offset + 1000)
        .map((p) => ({
          id: p.id,
          municipio: p.municipality,
          orgao: p.agency,
          objeto: p.object,
          tema_sugerido: topicOf(p.object).name,
          modalidade: p.mode,
          ano: p.year,
          valor_estimado: p.estimated,
          valor_homologado: p.homologated,
          estagio: "licitacao_nao_pagamento",
          fonte: p.source.url,
          captura: p.source.capturedAt,
          sha256: p.source.sha256,
        }));
  return new Response(safeCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="piauigraph-compras-publicas.csv"',
      "Cache-Control": "no-store",
    },
  });
}
