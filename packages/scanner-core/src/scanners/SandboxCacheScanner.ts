import path from "node:path";

import type { DiscoveredTarget } from "../types/ScanTarget.js";
import type { Scanner } from "./BaseScanner.js";

export class SandboxCacheScanner implements Scanner {
  async scan(): Promise<DiscoveredTarget[]> {
    const sandboxPath = path.resolve(process.cwd(), ".sandbox-cache");

    return [
      {
        id: "sandbox-cache",
        kind: "sandbox-cache",
        path: sandboxPath,
        displayName: "Sandbox Cache (Test Target)",
      },
    ];
  }
}
