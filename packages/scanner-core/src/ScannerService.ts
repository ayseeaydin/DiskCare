import { FileSystemAnalyzer } from "./analyzers/FileSystemAnalyzer.js";
import type { Scanner } from "./scanners/BaseScanner.js";
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
    private readonly scanners: Scanner[],
    deps: ScannerServiceDeps = {},
  ) {
    this.analyzer = deps.analyzer ?? new FileSystemAnalyzer();
    this.pathExistsFn = deps.pathExists ?? pathExists;
  }

  async scanAll(): Promise<ScanTarget[]> {
    const discoveries = await Promise.all(this.scanners.map((s) => s.scan()));
    const targets: DiscoveredTarget[] = discoveries.flat();

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
