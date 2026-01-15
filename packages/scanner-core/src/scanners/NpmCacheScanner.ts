import os from "node:os";
import path from "node:path";
import type { ScanTarget } from "../types/ScanTarget.js";
import { BaseScanner } from "./BaseScanner.js";

export class NpmCacheScanner extends BaseScanner {
  async scan(): Promise<ScanTarget[]> {
    const homeDir = os.homedir();
    const npmCachePath = path.join(homeDir, ".npm");

    return [
      {
        id: "npm-cache",
        kind: "npm-cache",
        path: npmCachePath,
        displayName: "npm Cache Directory",
      },
    ];
  }
}
