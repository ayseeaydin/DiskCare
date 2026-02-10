/**
 * VS Code cache scanners
 *
 * v2 SCAN-ONLY: Discovers VS Code runtime caches but NEVER deletes them.
 * Action: scan-only
 */

import os from "node:os";
import { PathResolver } from "@diskcare/shared-utils";
import type { Scanner } from "./BaseScanner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";

type VSCodeCacheType = "cache" | "cached-data" | "gpu-cache";

/**
 * Get VS Code cache directory by type and platform.
 */
function getVSCodeCachePath(
  cacheType: VSCodeCacheType,
  platform: NodeJS.Platform,
  homedir: string,
  env: NodeJS.ProcessEnv,
): string | null {
  const resolver = new PathResolver(platform);

  if (platform === "win32") {
    const appData = env.APPDATA;
    if (!appData) return null;

    const basePath = resolver.join(appData, "Code");

    const cachePaths: Record<VSCodeCacheType, string> = {
      cache: resolver.join(basePath, "Cache", "Cache_Data"),
      "cached-data": resolver.join(basePath, "CachedData"),
      "gpu-cache": resolver.join(basePath, "GPUCache"),
    };

    return cachePaths[cacheType];
  }

  if (platform === "darwin") {
    const basePath = resolver.join(homedir, "Library", "Application Support", "Code");

    const cachePaths: Record<VSCodeCacheType, string> = {
      cache: resolver.join(basePath, "Cache", "Cache_Data"),
      "cached-data": resolver.join(basePath, "CachedData"),
      "gpu-cache": resolver.join(basePath, "GPUCache"),
    };

    return cachePaths[cacheType];
  }

  if (platform === "linux") {
    const basePath = resolver.join(homedir, ".config", "Code");

    const cachePaths: Record<VSCodeCacheType, string> = {
      cache: resolver.join(basePath, "Cache", "Cache_Data"),
      "cached-data": resolver.join(basePath, "CachedData"),
      "gpu-cache": resolver.join(basePath, "GPUCache"),
    };

    return cachePaths[cacheType];
  }

  return null;
}

/**
 * Generic VS Code cache scanner.
 */
export class VSCodeCacheScanner implements Scanner {
  constructor(
    private readonly cacheType: VSCodeCacheType,
    private readonly deps?: {
      platform?: NodeJS.Platform;
      env?: NodeJS.ProcessEnv;
      homedir?: string;
    },
  ) {}

  async scan(): Promise<DiscoveredTarget[]> {
    const platform = this.deps?.platform ?? process.platform;
    const env = this.deps?.env ?? process.env;
    const homedir = this.deps?.homedir ?? os.homedir();

    const path = getVSCodeCachePath(this.cacheType, platform, homedir, env);

    if (!path) {
      return [];
    }

    const displayNames: Record<VSCodeCacheType, string> = {
      cache: "VS Code Cache",
      "cached-data": "VS Code CachedData (V8 bytecode)",
      "gpu-cache": "VS Code GPU Cache",
    };

    return [
      {
        id: `vscode-${this.cacheType}`,
        kind: "custom-path",
        path,
        displayName: displayNames[this.cacheType],
        diagnostics: ["v2 scan-only: discovered but never auto-deleted"],
      },
    ];
  }
}

/**
 * Convenience factory for VS Code Cache scanner.
 */
export function createVSCodeCacheScanner(deps?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}): Scanner {
  return new VSCodeCacheScanner("cache", deps);
}

/**
 * Convenience factory for VS Code CachedData scanner.
 */
export function createVSCodeCachedDataScanner(deps?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}): Scanner {
  return new VSCodeCacheScanner("cached-data", deps);
}

/**
 * Convenience factory for VS Code GPU Cache scanner.
 */
export function createVSCodeGPUCacheScanner(deps?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}): Scanner {
  return new VSCodeCacheScanner("gpu-cache", deps);
}
