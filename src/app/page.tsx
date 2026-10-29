import { Suspense } from "react";
import Explorer from "@/components/explorer";
import { getData } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ data }, params] = await Promise.all([getData(), searchParams]);
  const query = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  ).toString();
  return (
    <Suspense
      fallback={<main className="page-loading">Carregando o Piauí…</main>}
    >
      <Explorer
        bootstrap={{
          municipalities: data.municipalities,
          regions: data.regions,
          manifest: data.manifest,
        }}
        initialQuery={query ? `?${query}` : ""}
      />
    </Suspense>
  );
}
