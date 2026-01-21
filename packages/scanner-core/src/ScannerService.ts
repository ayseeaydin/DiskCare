import { FileSystemAnalyzer } from "./analyzers/FileSystemAnalyzer.js";
import type { BaseScanner } from "./scanners/BaseScanner.js";
import type { DiscoveredTarget, ScanTarget } from "./types/ScanTarget.js";
import type { ScanMetrics } from "./types/ScanMetrics.js";
import { pathExists } from "./utils/pathExists.js";

type Analyzer = {
  analyze: (rootPath: string) => Promise<ScanMetrics>;
};

type ScannerServiceDeps = {
  analyzer?: Analyzer;
  pathExists?: (p: string) => Promise<boolean>;
};

export class ScannerService {
  private readonly analyzer: Analyzer;
  private readonly pathExistsFn: (p: string) => Promise<boolean>;

  constructor(
    private readonly scanners: BaseScanner[],
    deps: ScannerServiceDeps = {},
  ) {
    this.analyzer = deps.analyzer ?? new FileSystemAnalyzer();
    this.pathExistsFn = deps.pathExists ?? pathExists;
  }

  async scanAll(): Promise<ScanTarget[]> {
    const targets: DiscoveredTarget[] = [];

    for (const scanner of this.scanners) {
      const found = await scanner.scan();
      targets.push(...found);
    }

    // Deterministic output order for CLI/logs
    targets.sort((a, b) => a.id.localeCompare(b.id));

    // Enrich without mutating original objects
    const enriched: ScanTarget[] = [];

    for (const t of targets) {
      const exists = await this.pathExistsFn(t.path);
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
