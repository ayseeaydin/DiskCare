/**
 * Firefox cache scanner
 *
 * v2 SCAN-ONLY: Discovers Firefox browser cache but NEVER deletes it.
 * Action: scan-only
 */

import os from "node:os";
import { PathResolver } from "@diskcare/shared-utils";
import type { Scanner } from "./BaseScanner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";

/**
 * Get Firefox cache directory by platform.
 */
function getFirefoxCachePath(
  platform: NodeJS.Platform,
  homedir: string,
  env: NodeJS.ProcessEnv,
): string | null {
  const resolver = new PathResolver(platform);

  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA;
    if (!localAppData) return null;
    return resolver.join(localAppData, "Mozilla", "Firefox", "Profiles");
  }

  if (platform === "darwin") {
    return resolver.join(homedir, "Library", "Caches", "Firefox", "Profiles");
  }

  if (platform === "linux") {
    return resolver.join(homedir, ".cache", "mozilla", "firefox");
  }

  return null;
}

/**
 * Firefox cache scanner.
 */
export class FirefoxCacheScanner implements Scanner {
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

    const path = getFirefoxCachePath(platform, homedir, env);

    if (!path) {
      return [];
    }

    return [
      {
        id: "firefox-cache",
        kind: "custom-path",
        path,
        displayName: "Firefox Cache (cache2)",
        diagnostics: [
          "v2 scan-only: discovered but never auto-deleted",
          "Firefox uses cache2 storage format",
        ],
      },
    ];
  }
}
