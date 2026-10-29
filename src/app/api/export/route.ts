import { NextRequest } from "next/server";
import { filtersFrom, getData, selectData } from "@/lib/data";
import { compare, safeCsv } from "@/lib/analysis";
export async function GET(req: NextRequest) {
  const { data } = await getData();
  const id = req.nextUrl.searchParams.get("observation");
  const selected = id
    ? data.observations
        .filter((o) => o.id === id)
        .flatMap((o) => [o, ...compare(o, data.observations).references])
    : selectData(data, filtersFrom(req.nextUrl.searchParams)).observations;
  const rows = selected.map((o) => ({
    carga: data.manifest.version,
    contratacao: o.procedureId,
    municipio_ibge: o.municipalityId,
    item: o.item,
    produto: o.product,
    descricao_original: o.description,
    fornecedor: o.supplier,
    cnpj: o.supplierId,
    data_resultado: o.date,
    quantidade_comprimidos: o.quantity,
    preco_unitario_homologado: o.unitPrice,
    valor_total_homologado: o.total,
    estagio: "resultado_homologado_nao_pagamento",
    nota_precisao: o.precisionNote,
    fonte: o.source.url,
    captura: o.source.capturedAt,
    sha256: o.source.sha256,
  }));
  return new Response(safeCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="piauigraph-evidencias.csv"',
      "Cache-Control": "no-store",
    },
  });
}
