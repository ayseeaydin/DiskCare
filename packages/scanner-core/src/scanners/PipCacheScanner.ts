/**
 * Python pip cache scanner
 *
 * v2 SCAN-ONLY: Discovers pip cache but NEVER deletes it.
 * Action: scan-only
 */

import os from "node:os";
import { PathResolver } from "@diskcare/shared-utils";
import type { Scanner } from "./BaseScanner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";

/**
 * Get pip cache directory by platform.
 * Default locations as per pip documentation:
 * - Windows: %LOCALAPPDATA%\pip\Cache
 * - macOS: ~/Library/Caches/pip
 * - Linux: ~/.cache/pip
 */
function getPipCachePath(
  platform: NodeJS.Platform,
  homedir: string,
  env: NodeJS.ProcessEnv,
): string | null {
  const resolver = new PathResolver(platform);

  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA;
    if (!localAppData) return null;
    return resolver.join(localAppData, "pip", "Cache");
  }

  if (platform === "darwin") {
    return resolver.join(homedir, "Library", "Caches", "pip");
  }

  if (platform === "linux") {
    return resolver.join(homedir, ".cache", "pip");
  }

  return null;
}

/**
 * Python pip cache scanner.
 */
export class PipCacheScanner implements Scanner {
  constructor(
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

    const path = getPipCachePath(platform, homedir, env);

    if (!path) {
      return [];
    }

    return [
      {
        id: "pip-cache",
        kind: "custom-path",
        path,
        displayName: "Python pip Cache",
        diagnostics: [
          "v2 scan-only: discovered but never auto-deleted",
          "pip caches downloaded packages for faster installs",
        ],
      },
    ];
  }
}
