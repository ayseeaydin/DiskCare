import path from "node:path";

import type { ScanTarget } from "../types/ScanTarget.js";
import { BaseScanner } from "./BaseScanner.js";
import { pathExists } from "../utils/pathExists.js";

export class SandboxCacheScanner extends BaseScanner {
  async scan(): Promise<ScanTarget[]> {
    const sandboxPath = path.resolve(process.cwd(), ".sandbox-cache");

    const exists = await pathExists(sandboxPath);

    return [
      {
        id: "sandbox-cache",
        kind: "sandbox-cache",
        path: sandboxPath,
        displayName: "Sandbox Cache (Test Target)",
        exists,
      },
    ];
  }
}
