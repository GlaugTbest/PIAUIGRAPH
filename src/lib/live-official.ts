import { createHash } from "node:crypto";
type Captured = {
  data: Record<string, unknown>[];
  source: { url: string; sha256: string; capturedAt: string };
  stale?: boolean;
};
const cached = new Map<string, { at: number; value: Captured }>();
const pending = new Map<string, Promise<Captured>>();
export async function liveOfficial(url: string): Promise<Captured> {
  if (!url.startsWith("https://pncp.gov.br/api/pncp/v1/orgaos/"))
    throw Error("Invalid official origin");
  const old = cached.get(url);
  if (old && Date.now() - old.at < 3600000) return old.value;
  if (pending.has(url)) return pending.get(url)!;
  const request = (async () => {
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!r.ok && r.status !== 204) throw Error(`PNCP HTTP ${r.status}`);
      const raw = r.status === 204 ? "" : await r.text();
      if (raw.length > 8000000) throw Error("Official response too large");
      const value = {
        data: raw ? JSON.parse(raw) : [],
        source: {
          url,
          sha256: createHash("sha256").update(raw).digest("hex"),
          capturedAt: new Date().toISOString(),
        },
      };
      if (!Array.isArray(value.data)) throw Error("Unexpected official schema");
      if (cached.size >= 40) cached.delete(cached.keys().next().value!);
      cached.set(url, { at: Date.now(), value });
      return value;
    } catch (e) {
      if (old) return { ...old.value, stale: true };
      throw e;
    } finally {
      pending.delete(url);
    }
  })();
  pending.set(url, request);
  return request;
}
