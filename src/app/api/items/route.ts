import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/data";
import { liveOfficial } from "@/lib/live-official";
const numeric = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const string = (v: unknown) => (typeof v === "string" ? v : null);
export async function GET(req: NextRequest) {
  const { data } = await getData();
  const p = data.procedures.find(
    (p) => p.id === req.nextUrl.searchParams.get("id"),
  );
  if (!p)
    return NextResponse.json(
      { error: "Compra não encontrada." },
      { status: 404 },
    );
  const page = Math.max(
    1,
    Math.min(
      1000,
      Math.floor(Number(req.nextUrl.searchParams.get("page")) || 1),
    ),
  );
  const item = req.nextUrl.searchParams.get("item");
  if (item && !/^\d{1,9}$/.test(item))
    return NextResponse.json(
      { error: "Número de item inválido." },
      { status: 400 },
    );
  const base = `https://pncp.gov.br/api/pncp/v1/orgaos/${p.cnpj}/compras/${p.year}/${p.sequence}/itens`;
  try {
    const r = await liveOfficial(
      item
        ? `${base}/${Number(item)}/resultados`
        : `${base}?pagina=${page}&tamanhoPagina=50`,
    );
    const raw = r.data.filter(
      (x) => x && typeof x === "object" && !Array.isArray(x),
    );
    const rows = item
      ? raw
          .slice(0, 500)
          .map((x) => ({
            id: numeric(x.sequencialResultado),
            date: string(x.dataResultado),
            quantity: numeric(x.quantidadeHomologada),
            unitPrice: numeric(x.valorUnitarioHomologado),
            total: numeric(x.valorTotalHomologado),
            supplier:
              x.tipoPessoa === "PJ"
                ? (string(x.nomeRazaoSocialFornecedor) ?? "Nome não informado")
                : "Pessoa física ou fornecedor sem CNPJ publicado",
            supplierId:
              x.tipoPessoa === "PJ" &&
              /^\d{14}$/.test(String(x.niFornecedor ?? "").replace(/\D/g, ""))
                ? String(x.niFornecedor).replace(/\D/g, "")
                : null,
            cancelled:
              !!x.dataCancelamento || x.situacaoCompraItemResultadoId === 2,
          }))
      : raw.map((x) => ({
          id: numeric(x.numeroItem),
          description: String(x.descricao ?? "Descrição não informada").slice(
            0,
            3000,
          ),
          unit: string(x.unidadeMedida),
          quantity: numeric(x.quantidade),
          unitPrice: numeric(x.valorUnitarioEstimado),
          total: numeric(x.valorTotal),
          hasResult: x.temResultado === true,
          status: string(x.situacaoCompraItemNome),
        }));
    return NextResponse.json(
      {
        rows,
        page,
        hasNext: !item && r.data.length === 50,
        truncated: !!item && r.data.length > 500,
        source: r.source,
        stale: !!r.stale,
      },
      { headers: { "Cache-Control": "public, s-maxage=3600" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "O PNCP não respondeu agora. Você pode tentar novamente ou abrir a fonte oficial.",
        officialUrl: p.officialUrl,
      },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }
}
