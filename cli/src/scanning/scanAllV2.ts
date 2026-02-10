/**
 * v2 Scanner orchestration
 *
 * Discovers all artifacts using both v1 and v2 scanners.
 * Integrates with scanner registry for extensibility.
 */

import type { CommandContext } from "../types/CommandContext.js";
import type { ScanTarget, DiscoveredTarget } from "@diskcare/scanner-core";
import { FileSystemAnalyzer } from "@diskcare/scanner-core";

// v1 scanners
import { OsTempScanner, NpmCacheScanner } from "@diskcare/scanner-core";

// v2 scanners
import {
  createChromeCacheScanner,
  createChromeCodeCacheScanner,
  createChromeGPUCacheScanner,
  FirefoxCacheScanner,
  createVSCodeCacheScanner,
  createVSCodeCachedDataScanner,
  createVSCodeGPUCacheScanner,
  JetBrainsCacheScanner,
  PipCacheScanner,
  RepoLocalCacheScanner,
} from "@diskcare/scanner-core";

/**
 * Scan all artifacts (v1 + v2).
 * v2 scanners are scan-only by default.
 */
export async function scanAllV2(context: CommandContext): Promise<ScanTarget[]> {
  const scanners = [
    // V1 scanners (cleanable)
    new OsTempScanner(),
    new NpmCacheScanner(),

    // V2 scanners (scan-only)
    createChromeCacheScanner(),
    createChromeCodeCacheScanner(),
    createChromeGPUCacheScanner(),
    new FirefoxCacheScanner(),
    createVSCodeCacheScanner(),
    createVSCodeCachedDataScanner(),
    createVSCodeGPUCacheScanner(),
    new JetBrainsCacheScanner(),
    new PipCacheScanner(),
    
    // Repo-local scanners (require --cwd, so they return empty for now)
    new RepoLocalCacheScanner({ cwd: context.cwd }),
  ];

  const discoveredTargets: DiscoveredTarget[] = [];

  // Run all scanners in parallel
  const results = await Promise.allSettled(
    scanners.map(async (scanner) => scanner.scan()),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      discoveredTargets.push(...result.value);
    } else {
      // Log error but continue (partial results acceptable)
      console.warn("[scanAllV2] Scanner failed:", result.reason);
    }
  }

  // Enrich with filesystem analysis
  const analyzer = new FileSystemAnalyzer();
  const enrichedTargets = await Promise.all(
    discoveredTargets.map(async (discovered) => {
      const metrics = await analyzer.analyze(discovered.path);
      
      // exists = metrics has no error (skipped=false means path is accessible)
      const exists = metrics.error === undefined;
      
      return {
        ...discovered,
        exists,
        metrics,
      };
    }),
  );

  return enrichedTargets;
}
