import path from "node:path";

import type { DiscoveredTarget } from "../../types/ScanTarget.js";
import type { Scanner } from "../../scanners/BaseScanner.js";

/**
 * Test-only scanner used to keep fixtures deterministic.
 */
export class SandboxCacheScanner implements Scanner {
  private readonly cwd: string;

  constructor(deps?: { cwd?: string }) {
    this.cwd = deps?.cwd ?? process.cwd();
  }

  async scan(): Promise<DiscoveredTarget[]> {
    const sandboxPath = path.resolve(this.cwd, ".sandbox-cache");

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
