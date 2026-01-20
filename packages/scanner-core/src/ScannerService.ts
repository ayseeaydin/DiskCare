import { FileSystemAnalyzer } from "./analyzers/FileSystemAnalyzer.js";
import type { BaseScanner } from "./scanners/BaseScanner.js";
import type { ScanTarget } from "./types/ScanTarget.js";
import { pathExists } from "./utils/pathExists.js";

export class ScannerService {
  private readonly analyzer = new FileSystemAnalyzer();

  constructor(private readonly scanners: BaseScanner[]) {}

  async scanAll(): Promise<ScanTarget[]> {
    const targets: ScanTarget[] = [];

    for (const scanner of this.scanners) {
      const found = await scanner.scan();
      targets.push(...found);
    }

    // Deterministic output order for CLI/logs
    targets.sort((a, b) => a.id.localeCompare(b.id));

    // Enrich without mutating original objects
    const enriched: ScanTarget[] = [];

    for (const t of targets) {
      const exists = await pathExists(t.path);
      const metrics = await this.analyzer.analyze(t.path);

      enriched.push({
        ...t,
        exists,
        metrics,
      });
    }

    return enriched;
  }
}
