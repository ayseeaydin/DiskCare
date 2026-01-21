import os from "node:os";
import type { DiscoveredTarget } from "../types/ScanTarget.js";
import type { Scanner } from "./BaseScanner.js";

export class OsTempScanner implements Scanner {
  private readonly tmpdir: string;

  constructor(deps?: { tmpdir?: string }) {
    this.tmpdir = deps?.tmpdir ?? os.tmpdir();
  }

  async scan(): Promise<DiscoveredTarget[]> {
    const tempPath = this.tmpdir;

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
