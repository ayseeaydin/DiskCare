import type { ScanTarget } from "./types/ScanTarget.js";
import type { BaseScanner } from "./scanners/BaseScanner.js";

export class ScannerService {
  constructor(private readonly scanners: BaseScanner[]) {}

  async scanAll(): Promise<ScanTarget[]> {
    const targets: ScanTarget[] = [];

    for (const scanner of this.scanners) {
      const found = await scanner.scan();
      targets.push(...found);
    }

    // ensure deterministic output order for CLI/logs
    targets.sort((a, b) => a.id.localeCompare(b.id));

    return targets;
  }
}
