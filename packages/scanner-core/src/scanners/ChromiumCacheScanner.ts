/**
 * Chromium-based browsers cache scanner (Chrome, Edge, Brave)
 *
 * v2 SCAN-ONLY: These scanners discover browser caches but NEVER delete them.
 * Action: scan-only
 */

import os from "node:os";
import { PathResolver } from "@diskcare/shared-utils";
import type { Scanner } from "./BaseScanner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";

type ChromiumBrowser = "chrome" | "edge" | "brave";

type ChromiumCacheType = "cache" | "code-cache" | "gpu-cache";

/**
 * Get Chromium cache directory patterns by platform.
 */
function getChromiumCachePaths(
  browser: ChromiumBrowser,
  cacheType: ChromiumCacheType,
  platform: NodeJS.Platform,
  homedir: string,
  env: NodeJS.ProcessEnv,
): string[] {
  const resolver = new PathResolver(platform);

  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA;
    if (!localAppData) return [];

    const browserPaths: Record<ChromiumBrowser, string> = {
      chrome: resolver.join(localAppData, "Google", "Chrome", "User Data", "Default"),
      edge: resolver.join(localAppData, "Microsoft", "Edge", "User Data", "Default"),
      brave: resolver.join(localAppData, "BraveSoftware", "Brave-Browser", "User Data", "Default"),
    };

    const basePath = browserPaths[browser];
    const cacheSubPaths: Record<ChromiumCacheType, string> = {
      cache: resolver.join(basePath, "Cache", "Cache_Data"),
      "code-cache": resolver.join(basePath, "Code Cache"),
      "gpu-cache": resolver.join(basePath, "GPUCache"),
    };

    return [cacheSubPaths[cacheType]];
  }

  if (platform === "darwin") {
    const browserPaths: Record<ChromiumBrowser, string> = {
      chrome: resolver.join(homedir, "Library", "Caches", "Google", "Chrome", "Default"),
      edge: resolver.join(homedir, "Library", "Caches", "Microsoft Edge", "Default"),
      brave: resolver.join(homedir, "Library", "Caches", "BraveSoftware", "Brave-Browser", "Default"),
    };

    const basePath = browserPaths[browser];
    const cacheSubPaths: Record<ChromiumCacheType, string> = {
      cache: resolver.join(basePath, "Cache", "Cache_Data"),
      "code-cache": resolver.join(basePath, "Code Cache"),
      "gpu-cache": resolver.join(basePath, "GPUCache"),
    };

    return [cacheSubPaths[cacheType]];
  }

  if (platform === "linux") {
    const browserPaths: Record<ChromiumBrowser, string> = {
      chrome: resolver.join(homedir, ".cache", "google-chrome", "Default"),
      edge: resolver.join(homedir, ".cache", "microsoft-edge", "Default"),
      brave: resolver.join(homedir, ".cache", "BraveSoftware", "Brave-Browser", "Default"),
    };

    const basePath = browserPaths[browser];
    const cacheSubPaths: Record<ChromiumCacheType, string> = {
      cache: resolver.join(basePath, "Cache", "Cache_Data"),
      "code-cache": resolver.join(basePath, "Code Cache"),
      "gpu-cache": resolver.join(basePath, "GPUCache"),
    };

    return [cacheSubPaths[cacheType]];
  }

  return [];
}

/**
 * Generic Chromium cache scanner.
 */
export class ChromiumCacheScanner implements Scanner {
  constructor(
    private readonly browser: ChromiumBrowser,
    private readonly cacheType: ChromiumCacheType,
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

    const paths = getChromiumCachePaths(this.browser, this.cacheType, platform, homedir, env);

    const targets: DiscoveredTarget[] = paths.map((path) => ({
      id: `${this.browser}-${this.cacheType}`,
      kind: "custom-path",
      path,
      displayName: `${this.capitalize(this.browser)} ${this.capitalize(this.cacheType)}`,
      diagnostics: ["v2 scan-only: discovered but never auto-deleted"],
    }));

    return targets;
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

/**
 * Convenience factory for Chrome Cache scanner.
 */
export function createChromeCacheScanner(deps?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}): Scanner {
  return new ChromiumCacheScanner("chrome", "cache", deps);
}

/**
 * Convenience factory for Chrome Code Cache scanner.
 */
export function createChromeCodeCacheScanner(deps?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}): Scanner {
  return new ChromiumCacheScanner("chrome", "code-cache", deps);
}

/**
 * Convenience factory for Chrome GPU Cache scanner.
 */
export function createChromeGPUCacheScanner(deps?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}): Scanner {
  return new ChromiumCacheScanner("chrome", "gpu-cache", deps);
}

/**
 * Convenience factory for Edge Cache scanner.
 */
export function createEdgeCacheScanner(deps?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}): Scanner {
  return new ChromiumCacheScanner("edge", "cache", deps);
}

/**
 * Convenience factory for Brave Cache scanner.
 */
export function createBraveCacheScanner(deps?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}): Scanner {
  return new ChromiumCacheScanner("brave", "cache", deps);
}
