import { NextRequest, NextResponse } from "next/server";
import { getGraph } from "@/lib/data";
import { neighborhood } from "@/lib/graph";
export async function GET(req: NextRequest) {
  const center = (req.nextUrl.searchParams.get("center") ?? "").slice(0, 120);
  const depth = Math.min(
    2,
    Math.max(1, Number(req.nextUrl.searchParams.get("depth")) || 1),
  );
  const year = ["2024", "2025"].includes(
    req.nextUrl.searchParams.get("y") ?? "",
  )
    ? Number(req.nextUrl.searchParams.get("y"))
    : undefined;
  const { graph } = await getGraph();
  const result = neighborhood(graph, center, depth, year);
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=3600",
      "X-Graph-Backend": graph.backend,
    },
  });
}
