import os from "node:os";
import type { DiscoveredTarget } from "../types/ScanTarget.js";
import { BaseScanner } from "./BaseScanner.js";

export class OsTempScanner extends BaseScanner {
  async scan(): Promise<DiscoveredTarget[]> {
    const tempPath = os.tmpdir();

    return [
      {
        id: "os-temp",
        kind: "os-temp",
        path: tempPath,
        displayName: "OS Temp Directory",
      },
    ];
  }
}
