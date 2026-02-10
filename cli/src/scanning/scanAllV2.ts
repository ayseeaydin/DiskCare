/**
 * v2 Scanner orchestration
 *
 * Discovers all artifacts using both v1 and v2 scanners.
 * Integrates with scanner registry for extensibility.
 */

import type { CommandContext } from "../types/CommandContext.js";
import type { ScanTarget } from "@diskcare/scanner-core";
import { FileSystemAnalyzer, ScannerRegistry } from "@diskcare/scanner-core";
import { loadScannerConfig } from "@diskcare/shared-utils";
import { getArtifactById } from "@diskcare/scanner-core";

// v1 scanners
import { OsTempScanner, NpmCacheScanner } from "@diskcare/scanner-core";

// v2 scanners
import {
  createChromeCacheScanner,
  createChromeCodeCacheScanner,
  createChromeGPUCacheScanner,
  createEdgeCacheScanner,
  createEdgeCodeCacheScanner,
  createEdgeGPUCacheScanner,
  createBraveCacheScanner,
  createBraveCodeCacheScanner,
  createBraveGPUCacheScanner,
  FirefoxCacheScanner,
  createVSCodeCacheScanner,
  createVSCodeCachedDataScanner,
  createVSCodeGPUCacheScanner,
  JetBrainsCacheScanner,
  PipCacheScanner,
  RepoLocalCacheScanner,
} from "@diskcare/scanner-core";

/**
 * Register all available scanners to the registry.
 */
function registerAllScanners(registry: ScannerRegistry): void {
  // v1 scanners (cleanable)
  registry.register({
    id: "os-temp",
    artifacts: [getArtifactById("os-temp")].filter(Boolean) as any[],
    factory: () => new OsTempScanner(),
    enabled: true,
  });

  registry.register({
    id: "npm-cache",
    artifacts: [getArtifactById("npm-cache")].filter(Boolean) as any[],
    factory: () => new NpmCacheScanner(),
    enabled: true,
  });

  // v2 browser scanners
  const chromeBrowsers = [
    ["chrome-cache", createChromeCacheScanner],
    ["chrome-code-cache", createChromeCodeCacheScanner],
    ["chrome-gpu-cache", createChromeGPUCacheScanner],
    ["edge-cache", createEdgeCacheScanner],
    ["edge-code-cache", createEdgeCodeCacheScanner],
    ["edge-gpu-cache", createEdgeGPUCacheScanner],
    ["brave-cache", createBraveCacheScanner],
    ["brave-code-cache", createBraveCodeCacheScanner],
    ["brave-gpu-cache", createBraveGPUCacheScanner],
  ] as const;

  for (const [id, factory] of chromeBrowsers) {
    registry.register({
      id,
      artifacts: [getArtifactById(id)].filter(Boolean) as any[],
      factory,
      enabled: true,
    });
  }

  registry.register({
    id: "firefox-cache",
    artifacts: [getArtifactById("firefox-cache")].filter(Boolean) as any[],
    factory: () => new FirefoxCacheScanner(),
    enabled: true,
  });

  // v2 IDE scanners
  const vscodeCache = [
    ["vscode-cache", createVSCodeCacheScanner],
    ["vscode-cached-data", createVSCodeCachedDataScanner],
    ["vscode-gpu-cache", createVSCodeGPUCacheScanner],
  ] as const;

  for (const [id, factory] of vscodeCache) {
    registry.register({
      id,
      artifacts: [getArtifactById(id)].filter(Boolean) as any[],
      factory,
      enabled: true,
    });
  }

  // JetBrains IDEs (single scanner handles all IDEs)
  registry.register({
    id: "jetbrains-caches",
    artifacts: [
      "intellij",
      "pycharm",
      "webstorm",
      "phpstorm",
      "rider",
      "clion",
      "goland",
      "rubymine",
      "datagrip",
    ]
      .map((ide) => getArtifactById(`jetbrains-${ide}`))
      .filter(Boolean) as any[],
    factory: () => new JetBrainsCacheScanner(),
    enabled: true,
  });

  // Language cache scanners
  registry.register({
    id: "pip-cache",
    artifacts: [getArtifactById("pip-cache")].filter(Boolean) as any[],
    factory: () => new PipCacheScanner(),
    enabled: true,
  });

  // Repo-local scanners (single scanner handles all patterns)
  registry.register({
    id: "repo-local-caches",
    artifacts: ["nextjs", "turbo", "vite", "parcel"]
      .map((tool) => getArtifactById(`repo-local-${tool}`))
      .filter(Boolean) as any[],
    factory: (deps) => new RepoLocalCacheScanner(deps),
    enabled: true,
  });
}

/**
 * Scan all artifacts (v1 + v2).
 * v2 scanners are scan-only by default.
 * Respects user configuration for enabling/disabling scanners.
 */
export async function scanAllV2(context: CommandContext): Promise<ScanTarget[]> {
  // Load scanner configuration
  const config = loadScannerConfig();

  // Create and configure registry
  const registry = new ScannerRegistry();
  registerAllScanners(registry);

  // Apply user configuration
  registry.applyConfig(config);

  // Run all enabled scanners
  const discoveredTargets = await registry.scanAll({ cwd: context.cwd });

  // Enrich with filesystem analysis
  const analyzer = new FileSystemAnalyzer();
  const enrichedTargets = await Promise.all(
    discoveredTargets.map(async (discovered) => {
      const metrics = await analyzer.analyze(discovered.path);
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
