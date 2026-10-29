import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/data";
import { topicOf, valueCheck } from "@/lib/catalog";
import { compare } from "@/lib/analysis";
export async function GET(req: NextRequest) {
  const { data } = await getData();
  const id = req.nextUrl.searchParams.get("id");
  const p = data.procedures.find((p) => p.id === id);
  if (p)
    return NextResponse.json(
      {
        kind: "procedure",
        record: p,
        topic: topicOf(p.object).name,
        check: valueCheck(p),
        contracts: (data.contracts ?? []).filter((c) => c.procedureId === id),
        comparisons: data.observations
          .filter((o) => o.procedureId === id)
          .map((o) => compare(o, data.observations)),
        exclusions: data.exclusions.filter((e) => e.procedureId === id),
        version: data.manifest.version,
      },
      { headers: { "Cache-Control": "public, s-maxage=3600" } },
    );
  const c = data.contracts?.find((c) => c.id === id);
  if (c)
    return NextResponse.json(
      {
        kind: "contract",
        record: c,
        procedure: c.procedureId
          ? data.procedures.find((p) => p.id === c.procedureId)
          : null,
        topic: topicOf(c.object).name,
        version: data.manifest.version,
      },
      { headers: { "Cache-Control": "public, s-maxage=3600" } },
    );
  return NextResponse.json(
    { error: "Registro não encontrado nesta publicação." },
    { status: 404 },
  );
}
