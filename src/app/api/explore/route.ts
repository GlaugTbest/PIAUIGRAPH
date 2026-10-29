import { NextRequest, NextResponse } from "next/server";
import { getData, filtersFrom, explore } from "@/lib/data";
export async function GET(req: NextRequest) {
  const { data } = await getData();
  return NextResponse.json(
    explore(data, filtersFrom(req.nextUrl.searchParams)),
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Data-Version": data.manifest.version,
      },
    },
  );
}
