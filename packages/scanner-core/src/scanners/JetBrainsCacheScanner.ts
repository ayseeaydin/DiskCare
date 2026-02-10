/**
 * JetBrains IDEs cache scanner (IntelliJ IDEA, PyCharm, WebStorm, etc.)
 *
 * v2 SCAN-ONLY: Discovers JetBrains IDE caches but NEVER deletes them.
 * Action: scan-only
 * Risk: caution (IDE caches can be large but rebuilding is expensive)
 */

import os from "node:os";
import { PathResolver } from "@diskcare/shared-utils";
import type { Scanner } from "./BaseScanner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";

/**
 * Get JetBrains IDE cache directory by platform.
 * JetBrains IDEs store caches in system/caches under their config directory.
 */
function getJetBrainsCachePath(
  platform: NodeJS.Platform,
  homedir: string,
  env: NodeJS.ProcessEnv,
): string[] {
  const resolver = new PathResolver(platform);

  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA;
    if (!localAppData) return [];

    // Common JetBrains IDEs
    const ideNames = [
      "JetBrains/IntelliJIdea",
      "JetBrains/PyCharm",
      "JetBrains/WebStorm",
      "JetBrains/PhpStorm",
      "JetBrains/Rider",
      "JetBrains/CLion",
      "JetBrains/GoLand",
      "JetBrains/RubyMine",
      "JetBrains/DataGrip",
    ];

    return ideNames.map((ide) => resolver.join(localAppData, ide, "system", "caches"));
  }

  if (platform === "darwin") {
    // macOS: ~/Library/Caches/<product><version>
    return [resolver.join(homedir, "Library", "Caches", "JetBrains")];
  }

  if (platform === "linux") {
    // Linux: ~/.cache/JetBrains/<product><version>
    return [resolver.join(homedir, ".cache", "JetBrains")];
  }

  return [];
}

/**
 * JetBrains IDE cache scanner.
 */
export class JetBrainsCacheScanner implements Scanner {
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

    const paths = getJetBrainsCachePath(platform, homedir, env);

    return paths.map((path) => ({
      id: "jetbrains-caches",
      kind: "custom-path",
      path,
      displayName: "JetBrains IDE Caches",
      diagnostics: [
        "v2 scan-only: discovered but never auto-deleted",
        "Includes IntelliJ IDEA, PyCharm, WebStorm, etc.",
        "Rebuilding caches can be time-consuming",
      ],
    }));
  }
}
