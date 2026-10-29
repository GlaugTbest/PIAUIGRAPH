import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/data";
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^\d{14}$/.test(id))
    return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
  const y = req.nextUrl.searchParams.get("y");
  const { data } = await getData();
  const contracts = (data.contracts ?? []).filter(
    (c) =>
      c.supplierId === id &&
      (!["2024", "2025"].includes(y ?? "") || c.year === Number(y)),
  );
  const observations = data.observations.filter(
    (o) =>
      o.supplierId === id &&
      (!["2024", "2025"].includes(y ?? "") || o.year === Number(y)),
  );
  if (!contracts.length && !observations.length)
    return NextResponse.json(
      { error: "Este fornecedor não tem registros neste período da carga." },
      { status: 404 },
    );
  return NextResponse.json(
    {
      id,
      name: contracts[0]?.supplier ?? observations[0]?.supplier,
      contracts: contracts.toSorted((a, b) =>
        b.publishedAt.localeCompare(a.publishedAt),
      ),
      observations,
      municipalities: new Set([
        ...contracts.map((c) => c.municipalityId),
        ...observations.map((o) => o.municipalityId),
      ]).size,
      version: data.manifest.version,
    },
    { headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
