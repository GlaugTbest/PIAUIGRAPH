import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
export async function readReleaseFile(root: string, name: string) {
  try {
    return JSON.parse(
      gunzipSync(await readFile(`${root}/${name}.json.gz`)).toString("utf8"),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  return JSON.parse(await readFile(`${root}/${name}.json`, "utf8"));
}
