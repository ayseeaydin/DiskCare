import fs from "node:fs/promises";
import path from "node:path";

import type { ScanTarget } from "../types/ScanTarget.js";
import { BaseScanner } from "./BaseScanner.js";

export class SandboxCacheScanner extends BaseScanner {
  async scan(): Promise<ScanTarget[]> {
    const sandboxPath = path.resolve(process.cwd(), ".sandbox-cache");

    const exists = await this.pathExists(sandboxPath);

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

  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.stat(p);
      return true;
    } catch {
      return false;
    }
  }
}
