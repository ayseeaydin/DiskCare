import path from "node:path";

import type { DiscoveredTarget } from "../types/ScanTarget.js";
import type { Scanner } from "./BaseScanner.js";

export class SandboxCacheScanner implements Scanner {
  constructor(private readonly deps?: { cwd?: string }) {}

  async scan(): Promise<DiscoveredTarget[]> {
    const cwd = this.deps?.cwd ?? process.cwd();
    const sandboxPath = path.resolve(cwd, ".sandbox-cache");

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
