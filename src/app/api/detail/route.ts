import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/data";
import { compare } from "@/lib/analysis";
export async function GET(req: NextRequest) {
  const { data } = await getData();
  const id = req.nextUrl.searchParams.get("id");
  const procedure = data.procedures.find((p) => p.id === id);
  if (!procedure)
    return NextResponse.json(
      { error: "Contratação não encontrada nesta carga." },
      { status: 404 },
    );
  const observations = data.observations
    .filter((o) => o.procedureId === id)
    .map((o) => compare(o, data.observations));
  return NextResponse.json(
    {
      procedure,
      observations,
      exclusions: data.exclusions.filter((e) => e.procedureId === id),
      version: data.manifest.version,
    },
    { headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
