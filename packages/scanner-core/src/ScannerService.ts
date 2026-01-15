import type { ScanTarget } from "./types/ScanTarget.js";
import type { BaseScanner } from "./scanners/BaseScanner.js";
import { FileSystemAnalyzer } from "./analyzers/FileSystemAnalyzer.js";

export class ScannerService {
  private readonly analyzer = new FileSystemAnalyzer();
  constructor(private readonly scanners: BaseScanner[]) {}

  async scanAll(): Promise<ScanTarget[]> {
    const targets: ScanTarget[] = [];

    for (const scanner of this.scanners) {
      const found = await scanner.scan();
      targets.push(...found);
    }

    // ensure deterministic output order for CLI/logs
    targets.sort((a, b) => a.id.localeCompare(b.id));

    for (const target of targets) {
      target.metrics = await this.analyzer.analyze(target.path);
    }

    return targets;
  }
}
