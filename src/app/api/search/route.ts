import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/data";
import { normalize } from "@/lib/analysis";
export async function GET(req: NextRequest) {
  const q = normalize((req.nextUrl.searchParams.get("q") ?? "").slice(0, 120));
  if (q.length < 2) return NextResponse.json({ suppliers: [], procedures: [] });
  const { data } = await getData();
  const suppliers = [
    ...new Map(
      data.observations
        .filter((o) => normalize(`${o.supplier} ${o.supplierId}`).includes(q))
        .map((o) => [o.supplierId, { id: o.supplierId, name: o.supplier }]),
    ).values(),
  ].slice(0, 4);
  const procedures = data.procedures
    .filter((p) => normalize(`${p.id} ${p.object} ${p.agency}`).includes(q))
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      municipalityId: p.municipalityId,
      name: `${p.municipality} · ${p.sequence}/${p.year}`,
    }));
  return NextResponse.json(
    { suppliers, procedures },
    { headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
