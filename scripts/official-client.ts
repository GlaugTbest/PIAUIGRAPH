import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Source } from "../src/lib/model";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const sources = new Map<string, Source>();
export const counters = { requests: 0, failures: 0 };
let next = 0;
export async function official(
  url: string,
): Promise<{ data: any; source: Source }> {
  if (!/^https:\/\/(pncp\.gov\.br|servicodados\.ibge\.gov\.br)\//.test(url))
    throw Error("Unapproved official origin");
  await mkdir(".cache/official", { recursive: true });
  const path = `.cache/official/${digest(url)}.json`;
  if (!process.argv.includes("--refresh")) {
    try {
      const cached = JSON.parse(await readFile(path, "utf8"));
      sources.set(url, cached.source);
      return cached;
    } catch {
      /* Resume only complete captures. */
    }
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const at = Math.max(Date.now(), next);
    next = at + 1500;
    await new Promise((r) => setTimeout(r, Math.max(0, at - Date.now())));
    try {
      counters.requests++;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        headers: {
          Accept: "application/json",
          "User-Agent": "PIAUIGRAPH/0.2 (public transparency portfolio)",
        },
      });
      if (response.status === 429) {
        next = Math.max(next, Date.now() + 30000);
        console.log("PNCP: aguardando limite de acesso (30s)");
        throw Error("HTTP 429");
      }
      if (!response.ok && response.status !== 204)
        throw Error(`HTTP ${response.status}: ${url}`);
      const raw = response.status === 204 ? "" : await response.text();
      const result = {
        data: raw ? JSON.parse(raw) : null,
        source: {
          url,
          capturedAt: new Date().toISOString(),
          sha256: digest(raw),
        },
        raw,
      };
      await writeFile(path, JSON.stringify(result));
      sources.set(url, result.source);
      return result;
    } catch (e) {
      if (attempt === 7) {
        counters.failures++;
        throw e;
      }
      await new Promise((r) =>
        setTimeout(r, Math.min(8000, 500 * 2 ** attempt)),
      );
    }
  }
  throw Error("Unreachable");
}
export async function pool<T>(
  rows: T[],
  fn: (row: T, index: number) => Promise<void>,
  concurrency = 3,
) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
      while (cursor < rows.length) {
        const i = cursor++;
        await fn(rows[i], i);
      }
    }),
  );
}
