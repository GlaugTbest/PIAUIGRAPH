import { NextRequest, NextResponse } from "next/server";
import { getData, summarize } from "@/lib/data";
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!/^\d{14}$/.test(id ?? ""))
    return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
  const { data } = await getData();
  const year = req.nextUrl.searchParams.get("y");
  const observations = data.observations.filter(
    (o) =>
      o.supplierId === id &&
      (!["2024", "2025"].includes(year ?? "") || o.year === Number(year)),
  );
  if (!observations.length)
    return NextResponse.json(
      { error: "Fornecedor sem resultados no período." },
      { status: 404 },
    );
  const ids = new Set(observations.map((o) => o.procedureId));
  const procedures = data.procedures.filter((p) => ids.has(p.id));
  const evolution = [2024, 2025].map((year) => ({
    year,
    ...summarize(
      observations.filter((o) => o.year === year),
      procedures.filter((p) =>
        observations.some((o) => o.procedureId === p.id && o.year === year),
      ),
    ),
  }));
  return NextResponse.json(
    {
      id,
      name: observations[0].supplier,
      summary: summarize(observations, procedures),
      procedures,
      evolution,
      observations,
      version: data.manifest.version,
    },
    { headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
