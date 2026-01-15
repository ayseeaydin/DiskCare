import os from "node:os";
import type { ScanTarget } from "../types/ScanTarget.js";
import { BaseScanner } from "./BaseScanner.js";

export class OsTempScanner extends BaseScanner {
  async scan(): Promise<ScanTarget[]> {
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
