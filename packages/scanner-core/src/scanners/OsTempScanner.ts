import os from "node:os";
import type { DiscoveredTarget } from "../types/ScanTarget.js";
import type { Scanner } from "./BaseScanner.js";

export class OsTempScanner implements Scanner {
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
