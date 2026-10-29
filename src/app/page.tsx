import { Suspense } from "react";
import Explorer from "@/components/civic-explorer";
import { getData } from "@/lib/data";
export default async function Page() {
  const { data } = await getData();
  return (
    <Suspense
      fallback={<main className="page-loading">Carregando o Piauí…</main>}
    >
      <Explorer
        bootstrap={{
          municipalities: data.municipalities,
          regions: data.regions,
          manifest: {
            collectedAt: data.manifest.collectedAt,
            version: data.manifest.version,
          },
        }}
      />
    </Suspense>
  );
}
