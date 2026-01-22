import fs from "node:fs/promises";

import { fromPromise } from "./result.js";

/**
 * Check if a path exists without throwing.
 */
export async function pathExists(p: string): Promise<boolean> {
  const r = await fromPromise(fs.access(p));
  return r.ok;
}
