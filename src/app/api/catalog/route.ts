import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/data";
import { catalogExplore, catalogFilters, contractExplore } from "@/lib/catalog";
export async function GET(req: NextRequest) {
  const { data } = await getData();
  const f = catalogFilters(req.nextUrl.searchParams);
  return NextResponse.json(
    req.nextUrl.searchParams.get("kind") === "contracts"
      ? contractExplore(data, f)
      : catalogExplore(data, f),
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Data-Version": data.manifest.version,
      },
    },
  );
}
